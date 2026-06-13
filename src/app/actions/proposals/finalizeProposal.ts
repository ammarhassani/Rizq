"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const InputSchema = z.object({
  proposal_id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type FinalizeProposalResult =
  | { ok: true }
  | {
      ok: false;
      code: "unauthorized" | "invalid" | "not_found" | "error";
    };

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

/**
 * Transitions a proposal from `draft` → `final`, sets finalized_at = now(),
 * and expires_at = now() + 30 days.
 *
 * Owner-gated via auth.getUser() + RLS (proposals_owner_all policy).
 */
export async function finalizeProposal(
  rawInput: unknown
): Promise<FinalizeProposalResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { proposal_id } = parsed.data;

  const supabase = await createClient();

  // Auth guard
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };

  // Verify the proposal exists and belongs to this user
  const { data: proposal, error: fetchErr } = await supabase
    .from("proposals")
    .select("id, status")
    .eq("id", proposal_id)
    .eq("user_id", userResult.user.id)
    .single();

  if (fetchErr || !proposal) return { ok: false, code: "not_found" };

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { error: updateErr } = await supabase
    .from("proposals")
    .update({
      status: "final",
      finalized_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", proposal_id)
    .eq("user_id", userResult.user.id);

  if (updateErr) {
    console.error("[finalizeProposal] update failed", {
      code: updateErr.code,
      message: updateErr.message,
    });
    return { ok: false, code: "error" };
  }

  return { ok: true };
}
