"use server";

/**
 * PDPL Phase 6.11 — Account deletion action.
 * Requires the user to type a confirmation phrase (حذف / DELETE).
 * Calls the delete_my_account() RPC (security definer, scoped to auth.uid()).
 * On success, the client must sign out and redirect to /.
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ── Constants ────────────────────────────────────────────────────────────────

/** Both phrases are accepted (locale-agnostic). */
const CONFIRM_PHRASES = ["حذف", "DELETE"] as const;

// ── Schema ───────────────────────────────────────────────────────────────────

const DeleteAccountSchema = z.object({
  confirm: z.string(),
});

// ── Return type ──────────────────────────────────────────────────────────────

export type DeleteMyAccountResult =
  | { ok: true }
  | { ok: false; code: "unauthorized" | "confirm_mismatch" | "error" };

// ── Action ───────────────────────────────────────────────────────────────────

/**
 * deleteMyAccountAction — validates the confirm phrase, then calls the
 * delete_my_account() RPC which cascades all owned data and removes the
 * auth user. The client must sign out + redirect after ok:true.
 */
export async function deleteMyAccountAction(
  input: { confirm: string }
): Promise<DeleteMyAccountResult> {
  // Validate input shape
  const parsed = DeleteAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "confirm_mismatch" };
  }

  const { confirm } = parsed.data;

  // Require one of the known confirmation phrases (trim whitespace)
  if (
    !CONFIRM_PHRASES.includes(confirm.trim() as (typeof CONFIRM_PHRASES)[number])
  ) {
    return { ok: false, code: "confirm_mismatch" };
  }

  const supabase = await createClient();

  // Auth guard
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  // Call the PDPL erasure RPC (security definer, scoped to auth.uid())
  const { error } = await supabase.rpc("delete_my_account");

  if (error) {
    console.error("[deleteMyAccount] RPC error", {
      code: error.code,
      message: error.message,
    });
    return { ok: false, code: "error" };
  }

  return { ok: true };
}
