"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const ALLOWED_STATUSES = ["sent", "viewed", "accepted", "declined"] as const;
type TransitionStatus = (typeof ALLOWED_STATUSES)[number];

const InputSchema = z.object({
  proposal_id: z.string().uuid(),
  status: z.enum(ALLOWED_STATUSES),
  reason: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type MarkStatusResult =
  | { ok: true }
  | {
      ok: false;
      code: "unauthorized" | "invalid" | "not_found" | "error";
    };

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

/**
 * Owner-gated status transition for a proposal.
 * Allowed transitions: sent | viewed | accepted | declined.
 *
 * Gig/invoice creation hooks (Phase 3/4) are deferred — this action
 * records the status only. If `reason` is provided with a `declined`
 * status, it is stored in the proposal's scope_comparison_json under
 * a `decline_reason` key (no dedicated column yet).
 */
export async function markStatus(
  rawInput: unknown
): Promise<MarkStatusResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { proposal_id, status, reason } = parsed.data;

  const supabase = await createClient();

  // Auth guard
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Verify proposal ownership (RLS also enforces this)
  const { data: proposal, error: fetchErr } = await supabase
    .from("proposals")
    .select("id, scope_comparison_json")
    .eq("id", proposal_id)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !proposal) return { ok: false, code: "not_found" };

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    status: status satisfies TransitionStatus,
    updated_at: new Date().toISOString(),
  };

  // Store decline reason in scope_comparison_json (jsonb notes field)
  if (status === "declined" && reason) {
    const existing =
      (proposal.scope_comparison_json as Record<string, unknown> | null) ?? {};
    updatePayload["scope_comparison_json"] = {
      ...existing,
      decline_reason: reason,
      declined_at: new Date().toISOString(),
    };
  }

  const { error: updateErr } = await supabase
    .from("proposals")
    .update(updatePayload)
    .eq("id", proposal_id)
    .eq("user_id", userId);

  if (updateErr) {
    console.error("[markStatus] update failed", {
      code: updateErr.code,
      message: updateErr.message,
    });
    return { ok: false, code: "error" };
  }

  return { ok: true };
}
