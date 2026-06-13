"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { summarizeChange } from "@/lib/ai/changeSummary";
import type { Scope } from "@/lib/ai/scope";
import type { ArtifactData } from "@/lib/proposals/artifact";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const InputSchema = z.object({
  proposal_id: z.string().uuid(),
  scope_patch: z.record(z.string(), z.unknown()).optional(),
  artifact_patch: z.record(z.string(), z.unknown()).optional(),
  price_anchor: z.number().positive().optional(),
});

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type EditProposalResult =
  | { ok: true; version: number }
  | {
      ok: false;
      code:
        | "unauthorized"
        | "invalid"
        | "not_found"
        | "status_not_editable"
        | "error";
    };

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

/**
 * Edits a `final` or `sent` proposal:
 *   1. Bumps the version counter.
 *   2. Inserts a proposal_versions row with the OLD state (before the edit)
 *      and an AI-generated change_summary (Arabic, 1 sentence).
 *   3. Applies scope_patch / artifact_patch (shallow merge) and clamps
 *      price_anchor into [price_min, price_max].
 *
 * Owner-gated via auth.getUser() + user_id filter.
 * Only allowed when status is `final` or `sent`.
 */
export async function editProposal(
  rawInput: unknown
): Promise<EditProposalResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { proposal_id, scope_patch, artifact_patch, price_anchor } = parsed.data;

  const supabase = await createClient();

  // Auth guard
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Load the current proposal (RLS scopes to owner)
  const { data: rawProposal, error: fetchErr } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", proposal_id)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !rawProposal) return { ok: false, code: "not_found" };
  const proposal = rawProposal as Record<string, unknown>;

  // Only allow edits on final or sent proposals
  const status = proposal["status"] as string;
  if (status !== "final" && status !== "sent") {
    return { ok: false, code: "status_not_editable" };
  }

  const oldScope = proposal["scope_json"] as Scope;
  const oldVersion = Number(proposal["version"]);
  const newVersion = oldVersion + 1;

  // Build updated scope (merge patch)
  const newScope: Scope = scope_patch
    ? ({ ...oldScope, ...scope_patch } as Scope)
    : oldScope;

  // Build updated artifact (shallow merge)
  const oldArtifact = ((proposal["artifact_json"] as ArtifactData | null) ?? {}) as ArtifactData;
  const newArtifact: ArtifactData = artifact_patch
    ? ({ ...oldArtifact, ...artifact_patch } as ArtifactData)
    : oldArtifact;

  // Clamp price_anchor into [price_min, price_max]
  const priceMin = Number(proposal["price_min"]);
  const priceMax = Number(proposal["price_max"]);
  const currentAnchor = Number(proposal["price_anchor"]);

  const newPriceAnchor =
    price_anchor !== undefined
      ? Math.max(priceMin, Math.min(priceMax, price_anchor))
      : currentAnchor;

  // Generate AI change summary (non-fatal — null on failure)
  const changeSummary = await summarizeChange(oldScope, newScope);

  // Insert version row (old state snapshot)
  const { error: versionErr } = await supabase
    .from("proposal_versions")
    .insert({
      proposal_id,
      user_id: userId,
      version: oldVersion,
      scope_json: oldScope,
      price_min: priceMin,
      price_anchor: currentAnchor,
      price_max: priceMax,
      changed_by: userId,
      change_summary: changeSummary,
    });

  if (versionErr) {
    console.error("[editProposal] version insert failed", {
      code: versionErr.code,
      message: versionErr.message,
    });
    return { ok: false, code: "error" };
  }

  // Apply patch to the proposal row
  const { error: updateErr } = await supabase
    .from("proposals")
    .update({
      scope_json: newScope,
      artifact_json: newArtifact,
      price_anchor: newPriceAnchor,
      version: newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposal_id)
    .eq("user_id", userId);

  if (updateErr) {
    console.error("[editProposal] update failed", {
      code: updateErr.code,
      message: updateErr.message,
    });
    return { ok: false, code: "error" };
  }

  return { ok: true, version: newVersion };
}
