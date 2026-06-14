"use server";

/**
 * createInvoice — Phase-4 task P4.3.
 *
 * Manual invoice creation. Accepts either a line-items array (subtotal
 * computed via computeTotals) or a bare subtotal_sar + description.
 * Optional client_id / gig_id / proposal_id — verified for ownership
 * but silently ignored if not owned (mirrors generateProposal pattern).
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { computeTotals } from "@/lib/invoices/items";
import type { InvoiceLineItem, InvoiceFee } from "@/lib/invoices/items";
import { assembleArtifactJson } from "./_artifact";
import type { InvoiceRowForArtifact } from "./_artifact";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const LineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price_sar: z.number().nonnegative(),
  total_sar: z.number().nonnegative(),
});

const FeeSchema = z.object({
  name: z.string().min(1),
  category: z.string().nullable().optional(),
  amount_sar: z.number().nonnegative(),
});

const PaymentMethodEnum = z.enum(["bank_transfer", "stc_pay", "cash", "other"]);

// Client + at least one line item are REQUIRED (founder directive). VAT is
// fixed at 15% (toggle on) or 0% (off) at the UI; the schema just bounds it.
const InputSchema = z.object({
  client_id: z.string().uuid(),
  gig_id: z.string().uuid().optional(),
  proposal_id: z.string().uuid().optional(),
  items: z.array(LineItemSchema).min(1),
  fees: z.array(FeeSchema).default([]),
  description: z.string().optional(),
  vat_pct: z.number().nonnegative().max(100).default(0),
  // payment
  payment_method: PaymentMethodEnum.default("bank_transfer"),
  payment_details: z.string().optional(),
  due_date: z.string().optional(), // ISO date yyyy-mm-dd
});

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type CreateInvoiceResult =
  | { ok: true; invoice_id: string }
  | {
      ok: false;
      code:
        | "unauthorized"
        | "invalid"
        | "quota_exhausted"
        | "error";
    };

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function createInvoice(
  rawInput: unknown
): Promise<CreateInvoiceResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const data = parsed.data;

  const supabase = await createClient();

  // Auth guard
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Client is REQUIRED. Verify ownership — fail loud if it isn't the user's
  // (don't silently drop it; a clientless invoice would violate the contract).
  const resolvedClientId: string = data.client_id;
  {
    const { data: clientCheck } = await supabase
      .from("clients")
      .select("id")
      .eq("id", resolvedClientId)
      .eq("user_id", userId)
      .single();
    if (!clientCheck) return { ok: false, code: "invalid" };
  }

  // Verify optional gig_id ownership (ignore silently if not owned)
  let resolvedGigId: string | null = data.gig_id ?? null;
  if (resolvedGigId) {
    const { data: gigCheck } = await supabase
      .from("gigs")
      .select("id")
      .eq("id", resolvedGigId)
      .eq("user_id", userId)
      .single();
    if (!gigCheck) resolvedGigId = null;
  }

  // Verify optional proposal_id ownership (ignore silently if not owned)
  let resolvedProposalId: string | null = data.proposal_id ?? null;
  if (resolvedProposalId) {
    const { data: proposalCheck } = await supabase
      .from("proposals")
      .select("id")
      .eq("id", resolvedProposalId)
      .eq("user_id", userId)
      .single();
    if (!proposalCheck) resolvedProposalId = null;
  }

  // Compute the items subtotal (authoritative — the DB trigger then adds fees
  // into the VAT base and the grand total).
  const items: InvoiceLineItem[] = data.items as InvoiceLineItem[];
  const fees: InvoiceFee[] = data.fees.map((f) => ({
    name: f.name,
    category: f.category ?? null,
    amount_sar: f.amount_sar,
  }));
  const subtotalSar = computeTotals(items, data.vat_pct).subtotal_sar;

  // Resolve due_date — use provided or default to today + 15 days
  let dueDate: string;
  if (data.due_date) {
    dueDate = data.due_date;
  } else {
    const base = new Date();
    base.setDate(base.getDate() + 15);
    dueDate = base.toISOString().slice(0, 10);
  }

  // Insert invoice — OMIT invoice_number/invoice_sequence (assigned by trigger)
  const { data: invoiceData, error: insertErr } = await supabase
    .from("invoices")
    .insert({
      user_id: userId,
      client_id: resolvedClientId,
      gig_id: resolvedGigId,
      proposal_id: resolvedProposalId,
      description: data.description ?? null,
      items,
      fees,
      subtotal_sar: subtotalSar,
      vat_pct: data.vat_pct,
      payment_method: data.payment_method,
      payment_details: data.payment_details ?? null,
      due_date: dueDate,
      status: "draft",
    })
    .select(
      "id, invoice_number, status, description, items, fees, subtotal_sar, vat_pct, vat_sar, total_sar, payment_method, payment_details, due_date, created_at, client_id"
    )
    .single();

  if (insertErr || !invoiceData) {
    if (insertErr?.code === "53400") {
      return { ok: false, code: "quota_exhausted" };
    }
    console.error("[createInvoice] insert failed", {
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
    fees: invoiceData.fees,
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
