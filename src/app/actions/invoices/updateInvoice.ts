"use server";

/**
 * updateInvoice — Phase-4 task P4.3.
 *
 * Editable fields: items, description, vat_pct, payment_method, payment_details,
 * due_date, client_id. Only allowed while status is 'draft' or 'sent' —
 * paid/cancelled invoices are locked.
 *
 * Recomputes subtotal from items when items are provided, then rebuilds
 * artifact_json to keep it in sync.
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

const InputSchema = z.object({
  invoice_id: z.string().uuid(),
  // editable fields — all optional; only provided fields are updated
  items: z.array(LineItemSchema).min(1).optional(),
  fees: z.array(FeeSchema).optional(),
  description: z.string().optional(),
  vat_pct: z.number().nonnegative().max(100).optional(),
  payment_method: PaymentMethodEnum.optional(),
  payment_details: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(), // ISO date yyyy-mm-dd or null
  client_id: z.string().uuid().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type UpdateInvoiceResult =
  | { ok: true; invoice_id: string }
  | {
      ok: false;
      code:
        | "unauthorized"
        | "invalid"
        | "not_found"
        | "locked"
        | "error";
    };

// Statuses that allow editing
const EDITABLE_STATUSES = new Set(["draft", "sent"]);

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function updateInvoice(
  rawInput: unknown
): Promise<UpdateInvoiceResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { invoice_id, ...editable } = parsed.data;

  const supabase = await createClient();

  // Auth guard
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Load current invoice (owner-scoped)
  const { data: existing, error: fetchErr } = await supabase
    .from("invoices")
    .select(
      "id, status, description, items, subtotal_sar, vat_pct, vat_sar, total_sar, payment_method, payment_details, due_date, created_at, client_id, invoice_number"
    )
    .eq("id", invoice_id)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !existing) return { ok: false, code: "not_found" };

  // Guard: locked if paid or cancelled
  if (!EDITABLE_STATUSES.has(existing.status as string)) {
    return { ok: false, code: "locked" };
  }

  // Build the update payload
  const updatePayload: Record<string, unknown> = {};

  // Items — recompute subtotal when provided
  let resolvedItems: InvoiceLineItem[] | null = null;
  let resolvedSubtotal: number = Number(existing.subtotal_sar);
  const resolvedVatPct: number =
    editable.vat_pct !== undefined ? editable.vat_pct : Number(existing.vat_pct);

  if (editable.items !== undefined) {
    resolvedItems = editable.items as InvoiceLineItem[];
    const totals = computeTotals(resolvedItems, resolvedVatPct);
    resolvedSubtotal = totals.subtotal_sar;
    updatePayload["items"] = resolvedItems;
    updatePayload["subtotal_sar"] = resolvedSubtotal;
  }

  if (editable.vat_pct !== undefined) {
    updatePayload["vat_pct"] = editable.vat_pct;
    // If items weren't provided, recompute subtotal is unchanged but vat updates
    // via the DB trigger; we still set it so TypeScript artifact stays in sync.
  }

  if (editable.fees !== undefined) {
    // Normalize to the stored shape; the DB trigger recomputes vat/total.
    updatePayload["fees"] = editable.fees.map((f) => ({
      name: f.name,
      category: f.category ?? null,
      amount_sar: f.amount_sar,
    })) satisfies InvoiceFee[];
  }

  if (editable.description !== undefined) {
    updatePayload["description"] = editable.description;
  }

  if (editable.payment_method !== undefined) {
    updatePayload["payment_method"] = editable.payment_method;
  }

  if (editable.payment_details !== undefined) {
    updatePayload["payment_details"] = editable.payment_details;
  }

  if (editable.due_date !== undefined) {
    updatePayload["due_date"] = editable.due_date;
  }

  if (editable.client_id !== undefined) {
    updatePayload["client_id"] = editable.client_id;
  }

  if (Object.keys(updatePayload).length === 0) {
    // Nothing to update — treat as success
    return { ok: true, invoice_id };
  }

  const { data: updatedData, error: updateErr } = await supabase
    .from("invoices")
    .update(updatePayload)
    .eq("id", invoice_id)
    .eq("user_id", userId)
    .select(
      "id, invoice_number, status, description, items, fees, subtotal_sar, vat_pct, vat_sar, total_sar, payment_method, payment_details, due_date, created_at, client_id"
    )
    .single();

  if (updateErr || !updatedData) {
    console.error("[updateInvoice] update failed", {
      code: updateErr?.code,
      message: updateErr?.message,
    });
    return { ok: false, code: "error" };
  }

  // Rebuild artifact_json with updated data
  const artifactRow: InvoiceRowForArtifact = {
    id: invoice_id,
    invoice_number: updatedData.invoice_number as string,
    status: updatedData.status as string,
    description: updatedData.description as string | null,
    items: updatedData.items,
    fees: updatedData.fees,
    subtotal_sar: Number(updatedData.subtotal_sar),
    vat_pct: Number(updatedData.vat_pct),
    vat_sar: Number(updatedData.vat_sar),
    total_sar: Number(updatedData.total_sar),
    payment_method: updatedData.payment_method as string,
    payment_details: updatedData.payment_details as string | null,
    due_date: updatedData.due_date as string | null,
    created_at: updatedData.created_at as string,
    client_id: updatedData.client_id as string | null,
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

  return { ok: true, invoice_id };
}
