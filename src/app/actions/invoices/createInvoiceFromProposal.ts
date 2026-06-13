"use server";

/**
 * createInvoiceFromProposal — Phase-4 task P4.3.
 *
 * Creates a draft invoice from an accepted proposal.
 * Rejects if the proposal is not in 'accepted' status.
 * Does NOT set gigs.invoice_id (no gig is created here).
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assembleArtifactJson } from "./_artifact";
import type { InvoiceRowForArtifact } from "./_artifact";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const InputSchema = z.object({
  proposal_id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type CreateInvoiceFromProposalResult =
  | { ok: true; invoice_id: string }
  | {
      ok: false;
      code:
        | "unauthorized"
        | "invalid"
        | "not_found"
        | "not_accepted"
        | "quota_exhausted"
        | "error";
    };

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function createInvoiceFromProposal(
  rawInput: unknown
): Promise<CreateInvoiceFromProposalResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { proposal_id } = parsed.data;

  const supabase = await createClient();

  // Auth guard
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Load the proposal (owner-scoped via RLS + explicit eq)
  const { data: proposal, error: fetchErr } = await supabase
    .from("proposals")
    .select("id, client_id, price_anchor, status")
    .eq("id", proposal_id)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !proposal) return { ok: false, code: "not_found" };

  // Guard: only accepted proposals can be invoiced
  if ((proposal.status as string) !== "accepted") {
    return { ok: false, code: "not_accepted" };
  }

  const subtotalSar = Number(proposal.price_anchor);
  const clientId = (proposal.client_id as string | null) ?? null;

  // Build a description — generic since proposals don't have a client_name column
  const description = "عرض مقبول";

  // due_date = today + 15 days
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 15);
  const dueDate = baseDate.toISOString().slice(0, 10);

  // Insert invoice — OMIT invoice_number/invoice_sequence (assigned by trigger)
  const { data: invoiceData, error: insertErr } = await supabase
    .from("invoices")
    .insert({
      user_id: userId,
      client_id: clientId,
      proposal_id,
      description,
      items: [],
      subtotal_sar: subtotalSar,
      vat_pct: 0,
      payment_method: "bank_transfer",
      payment_details: null,
      due_date: dueDate,
      status: "draft",
    })
    .select(
      "id, invoice_number, status, description, items, subtotal_sar, vat_pct, vat_sar, total_sar, payment_method, payment_details, due_date, created_at, client_id"
    )
    .single();

  if (insertErr || !invoiceData) {
    if (insertErr?.code === "53400") {
      return { ok: false, code: "quota_exhausted" };
    }
    console.error("[createInvoiceFromProposal] insert failed", {
      code: insertErr?.code,
      message: insertErr?.message,
    });
    return { ok: false, code: "error" };
  }

  const invoiceId = invoiceData.id as string;

  // Build and store artifact_json
  const artifactRow: InvoiceRowForArtifact = {
    id: invoiceId,
    invoice_number: invoiceData.invoice_number as string,
    status: invoiceData.status as string,
    description: invoiceData.description as string | null,
    items: invoiceData.items,
    subtotal_sar: Number(invoiceData.subtotal_sar),
    vat_pct: Number(invoiceData.vat_pct),
    vat_sar: Number(invoiceData.vat_sar),
    total_sar: Number(invoiceData.total_sar),
    payment_method: invoiceData.payment_method as string,
    payment_details: invoiceData.payment_details as string | null,
    due_date: invoiceData.due_date as string | null,
    created_at: invoiceData.created_at as string,
    client_id: invoiceData.client_id as string | null,
  };

  const artifactJson = await assembleArtifactJson({
    supabase,
    userId,
    invoice: artifactRow,
  });

  if (artifactJson) {
    await supabase
      .from("invoices")
      .update({ artifact_json: artifactJson })
      .eq("id", invoiceId)
      .eq("user_id", userId);
  }

  revalidatePath("/[locale]/invoices", "page");
  revalidatePath("/[locale]/invoices/[id]", "page");

  return { ok: true, invoice_id: invoiceId };
}
