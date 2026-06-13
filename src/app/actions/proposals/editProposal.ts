"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { summarizeChange } from "@/lib/ai/changeSummary";
import { buildArtifactData } from "@/lib/proposals/artifact";
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
 *   3. Applies scope_patch (shallow merge) and clamps price_anchor into
 *      [price_min, price_max].
 *   4. Rebuilds artifact_json from the patched scope + new anchor via
 *      buildArtifactData so the artifact and share page reflect the change.
 *
 * Owner-gated via auth.getUser() + user_id filter.
 * Only allowed when status is `final` or `sent`.
 */
export async function editProposal(
  rawInput: unknown
): Promise<EditProposalResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { proposal_id, scope_patch, price_anchor } = parsed.data;

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

  // Clamp price_anchor into [price_min, price_max]
  const priceMin = Number(proposal["price_min"]);
  const priceMax = Number(proposal["price_max"]);
  const currentAnchor = Number(proposal["price_anchor"]);

  const newPriceAnchor =
    price_anchor !== undefined
      ? Math.max(priceMin, Math.min(priceMax, price_anchor))
      : currentAnchor;

  // Fetch user profile for freelancer name (non-fatal)
  const { data: userProfile } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", userId)
    .single();

  const freelancerName =
    (userProfile?.name as string | null) ??
    userResult.user.email ??
    "مستقل / Freelancer";
  const contactEmail =
    (userProfile?.email as string | null) ?? userResult.user.email ?? null;

  // Rebuild artifact_json from patched scope + new anchor so the artifact
  // and share page reflect the change (spec: edit must be visible everywhere).
  // Pull all required fields from the existing proposal row; fall back to
  // sane defaults for fields that may not be set (brand, dates, etc.).
  const oldArtifact = (proposal["artifact_json"] as ArtifactData | null) ?? null;

  // Derive ip_terms from scope (same logic as generateProposal)
  const scopeIpTransfer = newScope.ip_transfer;
  const ipTerms: "full_transfer" | "license" | "per_project" =
    scopeIpTransfer === "full_transfer"
      ? "full_transfer"
      : scopeIpTransfer === "license"
        ? "license"
        : "full_transfer";

  // Attempt to re-read validityDays + depositPct from existing artifact terms_footer/milestones
  let validityDays = 30;
  let depositPct = 50;
  if (oldArtifact) {
    const termsSection = oldArtifact.sections?.find(
      (s) => s.id === "terms_footer"
    );
    if (typeof termsSection?.content?.validityDays === "number") {
      validityDays = termsSection.content.validityDays as number;
    }
    const milestonesSection = oldArtifact.sections?.find(
      (s) => s.id === "milestones"
    );
    if (Array.isArray(milestonesSection?.content?.milestones)) {
      const milestones = milestonesSection.content.milestones as Array<{
        pct: number;
        trigger: string;
      }>;
      const deposit = milestones.find((m) => m.trigger === "deposit");
      if (deposit && typeof deposit.pct === "number") {
        depositPct = deposit.pct;
      }
    }
  }

  // Description is stored in scope_json.extras.description (set by the edit form).
  // When scope_patch provides extras, use that; else fall back to existing extras.
  const patchExtras = scope_patch?.["extras"] as Record<string, unknown> | undefined;
  const oldExtras = oldScope.extras as Record<string, unknown> | undefined;
  const projectDescriptionAr =
    patchExtras?.["description"] !== undefined
      ? (patchExtras["description"] as string | null)
      : (oldExtras?.["description"] as string | null) ?? null;

  const newArtifact = buildArtifactData({
    locale: "ar", // proposals default to Arabic; artifact locale preserved via sections
    proposalId: proposal_id,
    freelancerName,
    brandNameAr: null,
    taglineAr: null,
    logoUrl: null,
    brandColors: null,
    contact: { email: contactEmail, phone: null, whatsapp: null },
    clientName: (proposal["client_name"] as string | null) ?? null,
    deliverables: (newScope.deliverables as string[]) ?? [],
    projectDescriptionAr,
    revisions:
      typeof newScope.revisions === "number" ? newScope.revisions : null,
    priceMin,
    priceAnchor: newPriceAnchor,
    priceMax,
    provenanceCitation: (proposal["provenance_citation"] as string) ?? "",
    depositPct,
    ipTerms,
    startDate: null,
    deliveryDate: null,
    validityDays,
  });

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

  // Apply patch to the proposal row (artifact rebuilt from scratch above)
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
