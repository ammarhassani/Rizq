"use server";

/**
 * createInvoiceFromGig — Phase-4 task P4.3.
 *
 * One-tap invoice creation from an existing gig.
 * Pre-fills invoice fields from the gig row; sets gigs.invoice_id back-link;
 * builds and stores artifact_json. Handles quota error (errcode 53400).
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
  gig_id: z.string().uuid(),
  /**
   * Which slice of the agreed money this invoice bills.
   *  - "full"      the whole amount (default; unchanged behaviour)
   *  - "deposit"   just the up-front deposit the proposal agreed
   *  - "balance"   the amount left after the deposit
   * The project screen already shows a deposit/final split; billing 100% up front
   * contradicted the payment plan the client agreed to on the proposal.
   */
  portion: z.enum(["full", "deposit", "balance"]).optional(),
});

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type CreateInvoiceFromGigResult =
  | { ok: true; invoice_id: string }
  | {
      ok: false;
      code:
        | "unauthorized"
        | "invalid"
        | "not_found"
        | "quota_exhausted"
        | "error";
    };

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function createInvoiceFromGig(
  rawInput: unknown
): Promise<CreateInvoiceFromGigResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { gig_id, portion = "full" } = parsed.data;

  const supabase = await createClient();

  // Auth guard
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Load the gig (owner-scoped via RLS + explicit eq)
  const { data: gig, error: gigErr } = await supabase
    .from("gigs")
    .select(
      "id, title, amount_sar, deposit_sar, remaining_sar, client_id, proposal_id, project_id, delivery_date, payment_method"
    )
    .eq("id", gig_id)
    .eq("user_id", userId)
    .single();

  if (gigErr || !gig) return { ok: false, code: "not_found" };

  const gigTitle = gig.title as string;
  const fullAmount = Number(gig.amount_sar);
  const depositAmount = Number(gig.deposit_sar ?? 0);
  const balanceAmount = Number(gig.remaining_sar ?? fullAmount - depositAmount);
  // Fall back to the full amount when the requested slice isn't defined, so this
  // can never produce a zero-value invoice.
  const subtotalSar =
    portion === "deposit" && depositAmount > 0
      ? depositAmount
      : portion === "balance" && balanceAmount > 0
        ? balanceAmount
        : fullAmount;
  const lineDescription =
    subtotalSar === fullAmount
      ? gigTitle
      : portion === "deposit"
        ? `${gigTitle} — دفعة مقدمة / Deposit`
        : `${gigTitle} — الدفعة النهائية / Balance`;
  const clientId = (gig.client_id as string | null) ?? null;
  const proposalId = (gig.proposal_id as string | null) ?? null;
  // Inherit the gig's project so the invoice is discoverable by project-scoped queries
  // (e.g. the dashboard lifecycle list). Without this the invoice is orphaned from its
  // project and the lifecycle stays stuck at "create invoice" even after it's paid.
  const projectId = (gig.project_id as string | null) ?? null;

  // feature 006 — the invoice inherits the freelancer's profile: VAT defaults to
  // KSA 15% when they're VAT-registered, and payment terms default from settings.
  const { data: prof } = await supabase
    .from("users")
    .select("vat_registered, default_payment_method, default_payment_details")
    .eq("id", userId)
    .maybeSingle();
  const vatPct = prof?.vat_registered ? 15 : 0;
  const paymentMethod =
    (gig.payment_method as string | null) ??
    (prof?.default_payment_method as string | null) ??
    "bank_transfer";
  const paymentDetails = (prof?.default_payment_details as string | null) ?? null;

  // Compute due_date: delivery_date + 15 days, or today + 15 days
  const baseDate = gig.delivery_date
    ? new Date(gig.delivery_date as string)
    : new Date();
  baseDate.setDate(baseDate.getDate() + 15);
  const dueDate = baseDate.toISOString().slice(0, 10);

  // Synthesise items from gig title + amount
  const items = [
    {
      description: lineDescription,
      quantity: 1,
      unit_price_sar: subtotalSar,
      total_sar: subtotalSar,
    },
  ];

  // Insert invoice — OMIT invoice_number/invoice_sequence (assigned by trigger)
  const { data: invoiceData, error: insertErr } = await supabase
    .from("invoices")
    .insert({
      user_id: userId,
      client_id: clientId,
      gig_id,
      proposal_id: proposalId,
      project_id: projectId,
      description: lineDescription,
      items,
      subtotal_sar: subtotalSar,
      vat_pct: vatPct,
      payment_method: paymentMethod,
      payment_details: paymentDetails,
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
    console.error("[createInvoiceFromGig] insert failed", {
      code: insertErr?.code,
      message: insertErr?.message,
    });
    return { ok: false, code: "error" };
  }

  const invoiceId = invoiceData.id as string;

  // Set gigs.invoice_id back-link (owner-scoped)
  await supabase
    .from("gigs")
    .update({ invoice_id: invoiceId })
    .eq("id", gig_id)
    .eq("user_id", userId);

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
  revalidatePath("/[locale]/income/[id]", "page");

  return { ok: true, invoice_id: invoiceId };
}
