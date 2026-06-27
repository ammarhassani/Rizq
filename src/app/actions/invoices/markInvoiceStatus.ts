"use server";

/**
 * markInvoiceStatus — Phase-4 task P4.3.
 *
 * Owner-scoped invoice status transitions with validation.
 *
 * Allowed transitions:
 *   draft    → sent | cancelled
 *   sent     → viewed | paid | overdue | cancelled
 *   viewed   → paid | overdue | cancelled
 *   overdue  → paid | cancelled
 *   paid     → (terminal — no transitions)
 *   cancelled→ (terminal — no transitions)
 *
 * Side-effects:
 *   - →sent:  set sent_at=now(); bump clients.last_contacted_at (best-effort)
 *             insert client_timeline 'invoice_sent' (best-effort)
 *   - →paid:  set paid_at=now()
 *             insert client_timeline 'invoice_paid' (best-effort)
 *   - Rebuilds artifact_json (status changed) (best-effort)
 *
 * Does NOT touch ai_reminder_* columns (P4.6 owns those).
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assembleArtifactJson } from "./_artifact";
import type { InvoiceRowForArtifact } from "./_artifact";
import { contributeBenchmarkFromProject } from "@/app/actions/pricing/contributeBenchmark";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "paid"
  | "overdue"
  | "cancelled";

const ALLOWED_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "paid",
  "overdue",
  "cancelled",
] as const;

// Allowed transitions map
const TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["viewed", "paid", "overdue", "cancelled"],
  viewed: ["paid", "overdue", "cancelled"],
  overdue: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const InputSchema = z.object({
  invoice_id: z.string().uuid(),
  status: z.enum(ALLOWED_STATUSES),
  // When true, the normal forward-only transition guard is skipped so a status
  // change can be reversed (powers the "Marked … · Undo" toast). This still
  // never lets you undo INTO a terminal state you weren't in — the caller
  // captures the exact prior status and passes it back, so the only effect is
  // allowing an otherwise-disallowed backward step (e.g. sent → draft).
  allow_reverse: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type MarkInvoiceStatusResult =
  | { ok: true; status: InvoiceStatus }
  | {
      ok: false;
      code:
        | "unauthorized"
        | "invalid"
        | "not_found"
        | "invalid_transition"
        | "error";
    };

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function markInvoiceStatus(
  rawInput: unknown
): Promise<MarkInvoiceStatusResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { invoice_id, status: targetStatus, allow_reverse } = parsed.data;

  const supabase = await createClient();

  // Auth guard
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Load invoice (owner-scoped)
  const { data: invoice, error: fetchErr } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, status, description, items, fees, subtotal_sar, vat_pct, vat_sar, total_sar, payment_method, payment_details, due_date, created_at, client_id, gig_id"
    )
    .eq("id", invoice_id)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !invoice) return { ok: false, code: "not_found" };

  const currentStatus = invoice.status as InvoiceStatus;

  // Validate transition (forward-only) unless an explicit reverse/undo is requested.
  if (!allow_reverse) {
    const allowed = TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(targetStatus)) {
      return { ok: false, code: "invalid_transition" };
    }
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    status: targetStatus,
  };

  if (targetStatus === "sent") {
    updatePayload["sent_at"] = new Date().toISOString();
  }
  if (targetStatus === "paid") {
    updatePayload["paid_at"] = new Date().toISOString();
  }

  const { error: updateErr } = await supabase
    .from("invoices")
    .update(updatePayload)
    .eq("id", invoice_id)
    .eq("user_id", userId);

  if (updateErr) {
    console.error("[markInvoiceStatus] update failed", {
      code: updateErr.code,
      message: updateErr.message,
    });
    return { ok: false, code: "error" };
  }

  // ── client_timeline side-effects (best-effort) ──────────────────────────
  const clientId = invoice.client_id as string | null;

  if (clientId) {
    if (targetStatus === "sent") {
      try {
        await supabase.from("client_timeline").insert({
          client_id: clientId,
          user_id: userId,
          event_type: "invoice_sent",
          event_data: {
            invoice_id,
            invoice_number: invoice.invoice_number,
            total_sar: Number(invoice.total_sar),
          },
        });
      } catch (err) {
        console.warn("[markInvoiceStatus] client_timeline insert (sent) failed", err);
      }

      // Bump last_contacted_at on the client
      try {
        await supabase
          .from("clients")
          .update({ last_contacted_at: new Date().toISOString() })
          .eq("id", clientId)
          .eq("user_id", userId);
      } catch (err) {
        console.warn("[markInvoiceStatus] clients.last_contacted_at update failed", err);
      }
    }

    if (targetStatus === "paid") {
      try {
        await supabase.from("client_timeline").insert({
          client_id: clientId,
          user_id: userId,
          event_type: "invoice_paid",
          event_data: {
            invoice_id,
            invoice_number: invoice.invoice_number,
            total_sar: Number(invoice.total_sar),
          },
        });
      } catch (err) {
        console.warn("[markInvoiceStatus] client_timeline insert (paid) failed", err);
      }
    }
  }

  // ── Close the loop: paying the invoice marks its linked gig paid too, so the
  // Income Ledger reflects reality without a second manual step. Forward-only
  // and idempotent — reversing an invoice does NOT un-pay the gig (the gig may
  // have been settled independently), and a gig already paid/cancelled is left
  // untouched. Best-effort: a failure here never blocks the invoice update.
  const gigId = invoice.gig_id as string | null;
  if (targetStatus === "paid" && gigId) {
    try {
      const { data: gig } = await supabase
        .from("gigs")
        .select("status, completed_date, project_id")
        .eq("id", gigId)
        .eq("user_id", userId)
        .single();

      if (gig && gig.status !== "paid" && gig.status !== "cancelled") {
        const nowIso = new Date().toISOString();
        const gigUpdate: Record<string, unknown> = {
          status: "paid",
          final_paid_at: nowIso,
          updated_at: nowIso,
        };
        if (!gig.completed_date) gigUpdate.completed_date = nowIso.split("T")[0];

        await supabase
          .from("gigs")
          .update(gigUpdate)
          .eq("id", gigId)
          .eq("user_id", userId);
      }

      // Feed the benchmark flywheel: a paid project is ground-truth price data.
      // Consent + k-anonymity are enforced server-side; best-effort, never blocks.
      const projectId = (gig?.project_id as string | null) ?? null;
      if (projectId) await contributeBenchmarkFromProject(projectId);
    } catch (err) {
      console.warn("[markInvoiceStatus] gig paid-sync / benchmark contribution failed", err);
    }
  }

  // ── Rebuild artifact_json (status changed) ───────────────────────────────
  const artifactRow: InvoiceRowForArtifact = {
    id: invoice_id,
    invoice_number: invoice.invoice_number as string,
    status: targetStatus,
    description: invoice.description as string | null,
    items: invoice.items,
    fees: invoice.fees,
    subtotal_sar: Number(invoice.subtotal_sar),
    vat_pct: Number(invoice.vat_pct),
    vat_sar: Number(invoice.vat_sar),
    total_sar: Number(invoice.total_sar),
    payment_method: invoice.payment_method as string,
    payment_details: invoice.payment_details as string | null,
    due_date: invoice.due_date as string | null,
    created_at: invoice.created_at as string,
    client_id: clientId,
  };

  try {
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
  } catch (err) {
    console.warn("[markInvoiceStatus] artifact_json rebuild failed", err);
  }

  revalidatePath("/[locale]/invoices", "page");
  revalidatePath("/[locale]/invoices/[id]", "page");
  // A linked gig may have flipped to paid above — refresh the Income Ledger too.
  if (targetStatus === "paid" && gigId) {
    revalidatePath("/[locale]/income", "page");
    revalidatePath(`/[locale]/income/${gigId}`, "page");
  }

  return { ok: true, status: targetStatus };
}
