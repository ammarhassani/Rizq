"use server";

/**
 * deleteInvoice — Phase-4 task P4.3.
 *
 * Owner-scoped invoice deletion.
 * First nulls out any gigs.invoice_id pointing at this invoice (owner-scoped)
 * so the gig detaches cleanly before the invoice row is removed.
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const InputSchema = z.object({
  invoice_id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type DeleteInvoiceResult =
  | { ok: true }
  | {
      ok: false;
      code: "unauthorized" | "invalid" | "not_found" | "error";
    };

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function deleteInvoice(
  rawInput: unknown
): Promise<DeleteInvoiceResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { invoice_id } = parsed.data;

  const supabase = await createClient();

  // Auth guard
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Verify invoice ownership before touching related rows
  const { data: invoice, error: fetchErr } = await supabase
    .from("invoices")
    .select("id")
    .eq("id", invoice_id)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !invoice) return { ok: false, code: "not_found" };

  // Detach any gig pointing at this invoice (owner-scoped update)
  // The gigs.invoice_id FK has ON DELETE SET NULL, but we also null it
  // proactively here so the gig's state is consistent without waiting
  // for the cascade (and to keep it owner-scoped).
  await supabase
    .from("gigs")
    .update({ invoice_id: null })
    .eq("invoice_id", invoice_id)
    .eq("user_id", userId);

  // Delete the invoice (RLS enforces user_id; eq is a belt-and-suspenders guard)
  const { error: deleteErr } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoice_id)
    .eq("user_id", userId);

  if (deleteErr) {
    console.error("[deleteInvoice] delete failed", {
      code: deleteErr.code,
      message: deleteErr.message,
    });
    return { ok: false, code: "error" };
  }

  revalidatePath("/[locale]/invoices", "page");
  revalidatePath("/[locale]/invoices/[id]", "page");
  revalidatePath("/[locale]/income/[id]", "page");

  return { ok: true };
}
