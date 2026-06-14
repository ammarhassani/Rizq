"use server";

/**
 * Invoice AI server actions — spec M6.4.
 *
 * A. generateInvoiceDescriptionAction — generates a professional bilingual
 *    description from gig/invoice data and stores it back into invoices.description,
 *    then rebuilds artifact_json. FREE for all authenticated users.
 *
 * B. generatePaymentReminderAction — drafts a Saudi-polite Arabic WhatsApp-ready
 *    payment reminder. Gated: only for invoices ≥7 days overdue with status in
 *    ('sent','viewed','overdue'). FREE for all authenticated users.
 *
 * No Pro gate on either action (monetization §IV.2 — copy helpers are free).
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateInvoiceDescription } from "@/lib/ai/invoiceDescription";
import type { InvoiceDescriptionCtx } from "@/lib/ai/invoiceDescription";
import { draftPaymentReminder } from "@/lib/ai/paymentReminder";
import { daysOverdue } from "@/lib/invoices/overdue";
import { assembleArtifactJson } from "./_artifact";
import type { InvoiceRowForArtifact } from "./_artifact";

// ---------------------------------------------------------------------------
// Shared auth helper
// ---------------------------------------------------------------------------

async function getAuthContext() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  return { supabase, userId: userData.user.id };
}

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export type GenerateDescriptionResult =
  | { ok: true; ar: string; en: string }
  | { ok: false; code: "unauthorized" | "not_found" | "ai_error" | "error" };

export type GenerateReminderResult =
  | { ok: true; draft: string }
  | {
      ok: false;
      code: "unauthorized" | "not_found" | "not_overdue" | "ai_error" | "error";
    };

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const InvoiceIdSchema = z.object({ invoice_id: z.string().uuid() });

// ---------------------------------------------------------------------------
// A. generateInvoiceDescriptionAction
// ---------------------------------------------------------------------------

/**
 * Generates a professional bilingual invoice description from gig/invoice data.
 * Stores the Arabic text into invoices.description and rebuilds artifact_json.
 * FREE — no Pro gate.
 */
export async function generateInvoiceDescriptionAction(
  input: unknown
): Promise<GenerateDescriptionResult> {
  const parsed = InvoiceIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "error" };
  const { invoice_id } = parsed.data;

  const auth = await getAuthContext();
  if (!auth) return { ok: false, code: "unauthorized" };
  const { supabase, userId } = auth;

  // Load invoice (owner-scoped) — include gig_id to pull richer context
  const { data: invoice, error: fetchErr } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, status, description, items, fees, subtotal_sar, vat_pct, vat_sar, total_sar, payment_method, payment_details, due_date, created_at, client_id, gig_id"
    )
    .eq("id", invoice_id)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !invoice) return { ok: false, code: "not_found" };

  // Build the AI context — prefer gig data for richer description
  let gigTitle = "خدمة احترافية";
  let gigDescription: string | null = null;

  if (invoice.gig_id) {
    const { data: gig } = await supabase
      .from("gigs")
      .select("title, description")
      .eq("id", invoice.gig_id as string)
      .eq("user_id", userId)
      .single();

    if (gig) {
      gigTitle = (gig.title as string) ?? gigTitle;
      gigDescription = (gig.description as string | null) ?? null;
    }
  } else if (invoice.description) {
    // Fall back to existing invoice description as context
    gigTitle = (invoice.description as string) ?? gigTitle;
  }

  // Load client name/company if applicable
  let clientName: string | null = null;
  let clientCompany: string | null = null;

  if (invoice.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("name, name_en, company")
      .eq("id", invoice.client_id as string)
      .eq("user_id", userId)
      .single();

    if (client) {
      clientName =
        (client.name as string | null) ?? (client.name_en as string | null) ?? null;
      clientCompany = (client.company as string | null) ?? null;
    }
  }

  const ctx: InvoiceDescriptionCtx = {
    gigTitle,
    gigDescription,
    amountSar: Number(invoice.total_sar) || 0,
    clientName,
    clientCompany,
  };

  const result = await generateInvoiceDescription(ctx);
  if (!result) return { ok: false, code: "ai_error" };

  const { ar, en } = result;

  // Persist: store Arabic description into invoices.description
  const { data: updatedInvoice, error: updateErr } = await supabase
    .from("invoices")
    .update({ description: ar })
    .eq("id", invoice_id)
    .eq("user_id", userId)
    .select(
      "id, invoice_number, status, description, items, fees, subtotal_sar, vat_pct, vat_sar, total_sar, payment_method, payment_details, due_date, created_at, client_id"
    )
    .single();

  if (updateErr || !updatedInvoice) {
    console.error("[generateInvoiceDescriptionAction] update failed", updateErr);
    return { ok: false, code: "error" };
  }

  // Rebuild artifact_json to keep it in sync with the new description
  const artifactRow: InvoiceRowForArtifact = {
    id: invoice_id,
    invoice_number: updatedInvoice.invoice_number as string,
    status: updatedInvoice.status as string,
    description: updatedInvoice.description as string | null,
    items: updatedInvoice.items,
    fees: updatedInvoice.fees,
    subtotal_sar: Number(updatedInvoice.subtotal_sar),
    vat_pct: Number(updatedInvoice.vat_pct),
    vat_sar: Number(updatedInvoice.vat_sar),
    total_sar: Number(updatedInvoice.total_sar),
    payment_method: updatedInvoice.payment_method as string,
    payment_details: updatedInvoice.payment_details as string | null,
    due_date: updatedInvoice.due_date as string | null,
    created_at: updatedInvoice.created_at as string,
    client_id: updatedInvoice.client_id as string | null,
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
      .eq("id", invoice_id)
      .eq("user_id", userId);
  }

  revalidatePath("/[locale]/invoices", "page");
  revalidatePath("/[locale]/invoices/[id]", "page");

  return { ok: true, ar, en };
}

// ---------------------------------------------------------------------------
// B. generatePaymentReminderAction
// ---------------------------------------------------------------------------

// Statuses that indicate the invoice has been delivered to the client
const OVERDUE_ELIGIBLE_STATUSES = new Set(["sent", "viewed", "overdue"]);
const MIN_DAYS_OVERDUE = 7;

/**
 * Drafts a Saudi-polite payment reminder for an overdue invoice.
 * Gate: daysOverdue ≥ 7 AND status in ('sent','viewed','overdue').
 * Stores ai_reminder_text_ar + ai_reminder_drafted_at. FREE — no Pro gate.
 */
export async function generatePaymentReminderAction(
  input: unknown
): Promise<GenerateReminderResult> {
  const parsed = InvoiceIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "error" };
  const { invoice_id } = parsed.data;

  const auth = await getAuthContext();
  if (!auth) return { ok: false, code: "unauthorized" };
  const { supabase, userId } = auth;

  // Load invoice (owner-scoped)
  const { data: invoice, error: fetchErr } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, total_sar, due_date, status, client_id, payment_details"
    )
    .eq("id", invoice_id)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !invoice) return { ok: false, code: "not_found" };

  // Gate: status must be sent/viewed/overdue
  const status = invoice.status as string;
  if (!OVERDUE_ELIGIBLE_STATUSES.has(status)) {
    return { ok: false, code: "not_overdue" };
  }

  // Gate: compute days overdue (≥7 required)
  const days = daysOverdue(invoice.due_date as string | null, new Date());
  if (days < MIN_DAYS_OVERDUE) {
    return { ok: false, code: "not_overdue" };
  }

  // Load client name/company for personalisation
  let clientName: string | null = null;
  let clientCompany: string | null = null;

  if (invoice.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("name, name_en, company")
      .eq("id", invoice.client_id as string)
      .eq("user_id", userId)
      .single();

    if (client) {
      clientName =
        (client.name as string | null) ?? (client.name_en as string | null) ?? null;
      clientCompany = (client.company as string | null) ?? null;
    }
  }

  // Fetch preferred_tone from users (M8 column — exists as of migration 20260613230814).
  const VALID_TONES = new Set<string>(["formal", "balanced", "friendly"]);
  const { data: toneRow } = await supabase
    .from("users")
    .select("preferred_tone")
    .eq("id", userId)
    .single();
  const rawTone = toneRow?.preferred_tone as string | null | undefined;
  const reminderTone: "formal" | "balanced" | "friendly" =
    rawTone && VALID_TONES.has(rawTone)
      ? (rawTone as "formal" | "balanced" | "friendly")
      : "balanced";

  const draft = await draftPaymentReminder({
    invoiceNumber: invoice.invoice_number as string,
    totalSar: Number(invoice.total_sar) || 0,
    dueDate: invoice.due_date as string | null,
    daysOverdue: days,
    clientName,
    clientCompany,
    paymentDetails: invoice.payment_details as string | null,
    tone: reminderTone,
  });

  if (!draft) return { ok: false, code: "ai_error" };

  // Persist: only this action writes ai_reminder_* columns
  const { error: updateErr } = await supabase
    .from("invoices")
    .update({
      ai_reminder_text_ar: draft,
      ai_reminder_drafted_at: new Date().toISOString(),
    })
    .eq("id", invoice_id)
    .eq("user_id", userId);

  if (updateErr) {
    console.error("[generatePaymentReminderAction] persist failed", updateErr);
    return { ok: false, code: "error" };
  }

  revalidatePath("/[locale]/invoices/[id]", "page");

  return { ok: true, draft };
}
