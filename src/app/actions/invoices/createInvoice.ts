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
import type { InvoiceLineItem } from "@/lib/invoices/items";
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

const PaymentMethodEnum = z.enum(["bank_transfer", "stc_pay", "cash", "other"]);

const InputSchema = z
  .object({
    // optional linkage
    client_id: z.string().uuid().optional(),
    gig_id: z.string().uuid().optional(),
    proposal_id: z.string().uuid().optional(),
    // content — either items array OR subtotal+description
    items: z.array(LineItemSchema).min(1).optional(),
    subtotal_sar: z.number().nonnegative().optional(),
    description: z.string().optional(),
    vat_pct: z.number().nonnegative().default(0),
    // payment
    payment_method: PaymentMethodEnum.default("bank_transfer"),
    payment_details: z.string().optional(),
    due_date: z.string().optional(), // ISO date yyyy-mm-dd
  })
  .refine(
    (d) =>
      (d.items !== undefined && d.items.length > 0) ||
      d.subtotal_sar !== undefined,
    { message: "Provide either items (≥1) or subtotal_sar" }
  );

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

  // Verify optional client_id ownership (ignore silently if not owned)
  let resolvedClientId: string | null = data.client_id ?? null;
  if (resolvedClientId) {
    const { data: clientCheck } = await supabase
      .from("clients")
      .select("id")
      .eq("id", resolvedClientId)
      .eq("user_id", userId)
      .single();
    if (!clientCheck) resolvedClientId = null;
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

  // Compute subtotal and build items array
  let items: InvoiceLineItem[];
  let subtotalSar: number;

  if (data.items && data.items.length > 0) {
    items = data.items as InvoiceLineItem[];
    const totals = computeTotals(items, data.vat_pct);
    subtotalSar = totals.subtotal_sar;
  } else {
    subtotalSar = data.subtotal_sar ?? 0;
    const desc = data.description ?? "خدمة";
    items = [
      {
        description: desc,
        quantity: 1,
        unit_price_sar: subtotalSar,
        total_sar: subtotalSar,
      },
    ];
  }

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
      subtotal_sar: subtotalSar,
      vat_pct: data.vat_pct,
      payment_method: data.payment_method,
      payment_details: data.payment_details ?? null,
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
