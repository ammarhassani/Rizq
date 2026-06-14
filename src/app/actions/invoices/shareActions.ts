"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assembleArtifactJson, type InvoiceRowForArtifact } from "./_artifact";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ShareChannel = "link" | "whatsapp" | "email" | "pdf_download";

// ---------------------------------------------------------------------------
// setInvoiceShare
// ---------------------------------------------------------------------------

const SetShareSchema = z.object({
  invoice_id: z.string().uuid(),
  share: z.boolean(),
});

type SetShareResult =
  | { ok: true; token?: string }
  | { ok: false; code: "unauthorized" | "not_found" | "error" };

/**
 * Owner-gated toggle for public_share on an invoice.
 *
 * - On enable: generates a url-safe share_token if absent, sets public_share = true,
 *   and bumps status from 'draft' → 'sent' (an invoice must be non-draft to be
 *   publicly fetchable via get_shared_invoice RPC). Sets sent_at = now() when bumping.
 * - On disable: sets public_share = false (token is preserved for re-enable).
 * - Best-effort: inserts 'invoice_sent' client_timeline event + bumps last_contacted_at.
 * - Returns { ok, token? } — token is returned when share is being enabled.
 */
export async function setInvoiceShare(
  rawInput: unknown
): Promise<SetShareResult> {
  const parsed = SetShareSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "error" };
  const { invoice_id, share } = parsed.data;

  const supabase = await createClient();

  // Auth check — owner-scoped (RLS enforces too; the explicit eq is defense-in-depth
  // and matches every other action in this module).
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Load the existing invoice to check share_token + status + client linkage.
  const { data: invoice, error: fetchErr } = await supabase
    .from("invoices")
    .select("id, share_token, status, public_share, client_id, invoice_number, total_sar")
    .eq("id", invoice_id)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !invoice) return { ok: false, code: "not_found" };

  let token = (invoice.share_token as string | null) ?? undefined;

  const update: Record<string, unknown> = {
    public_share: share,
    updated_at: new Date().toISOString(),
  };

  let statusBumped = false;
  if (share) {
    // Generate a new token if absent.
    if (!token) {
      // 18 bytes → 24 url-safe base64 characters, no padding.
      const bytes = new Uint8Array(18);
      crypto.getRandomValues(bytes);
      token = btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
      update["share_token"] = token;
    }

    // Bump status: draft → sent, so the invoice is publicly fetchable.
    // Don't touch sent/viewed/paid/overdue/cancelled.
    const currentStatus = invoice.status as string | null;
    if (currentStatus === "draft") {
      update["status"] = "sent";
      update["sent_at"] = new Date().toISOString();
      statusBumped = true;
    }
  }

  const { error: updateErr } = await supabase
    .from("invoices")
    .update(update)
    .eq("id", invoice_id)
    .eq("user_id", userId);

  if (updateErr) {
    console.error("[setInvoiceShare] update failed", updateErr);
    return { ok: false, code: "error" };
  }

  // If we bumped draft → sent, the stored artifact_json still carries the old
  // 'draft' status — and BOTH the public share page and the detail page render
  // the status badge from artifact_json.invoice_meta.status. Rebuild it so a
  // share-from-draft doesn't display a stale "Draft" badge publicly.
  if (statusBumped) {
    const { data: freshRow } = await supabase
      .from("invoices")
      .select(
        "id, invoice_number, status, description, items, fees, subtotal_sar, vat_pct, vat_sar, total_sar, payment_method, payment_details, due_date, created_at, client_id"
      )
      .eq("id", invoice_id)
      .eq("user_id", userId)
      .single();

    if (freshRow) {
      const artifactRow: InvoiceRowForArtifact = {
        id: freshRow.id as string,
        invoice_number: freshRow.invoice_number as string,
        status: freshRow.status as string,
        description: (freshRow.description as string | null) ?? null,
        items: freshRow.items,
        fees: freshRow.fees,
        subtotal_sar: Number(freshRow.subtotal_sar),
        vat_pct: Number(freshRow.vat_pct),
        vat_sar: Number(freshRow.vat_sar),
        total_sar: Number(freshRow.total_sar),
        payment_method: freshRow.payment_method as string,
        payment_details: (freshRow.payment_details as string | null) ?? null,
        due_date: (freshRow.due_date as string | null) ?? null,
        created_at: freshRow.created_at as string,
        client_id: (freshRow.client_id as string | null) ?? null,
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
    }
  }

  // Revalidate the invoice detail page so the server component reflects the change.
  revalidatePath(`/ar/invoices/${invoice_id}`);
  revalidatePath(`/en/invoices/${invoice_id}`);

  // Best-effort: insert 'invoice_sent' timeline event and bump last_contacted_at.
  const clientId = invoice.client_id as string | null;
  if (share && clientId) {
    const invoiceNumber = invoice.invoice_number as string | null;
    const totalSar = invoice.total_sar as number | null;
    try {
      await supabase.from("client_timeline").insert({
        client_id: clientId,
        user_id: userId,
        event_type: "invoice_sent",
        event_data: {
          invoice_id,
          invoice_number: invoiceNumber ?? invoice_id,
          total_sar: totalSar ?? 0,
        },
      });

      // Bump last_contacted_at
      await supabase
        .from("clients")
        .update({
          last_contacted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId)
        .eq("user_id", userId);
    } catch (err) {
      console.warn("[setInvoiceShare] client_timeline insert failed", err);
    }
  }

  return share ? { ok: true, token } : { ok: true };
}

// ---------------------------------------------------------------------------
// logInvoiceView  (best-effort, anon-callable)
// ---------------------------------------------------------------------------

/**
 * Calls the anon-accessible RPC log_invoice_view.
 * Best-effort — errors are silently swallowed.
 * Used by LogInvoiceView client component on share page mount.
 */
export async function logInvoiceView(token: string): Promise<void> {
  if (!token) return;

  try {
    const supabase = await createClient();
    const h = await headers();
    const ua = h.get("user-agent") ?? null;

    await supabase.rpc("log_invoice_view", {
      p_token: token,
      p_channel: "link" satisfies ShareChannel,
      p_agent: ua,
    });
  } catch {
    /* best-effort */
  }
}

// ---------------------------------------------------------------------------
// logInvoiceShareChannel  (best-effort)
// ---------------------------------------------------------------------------

const LogChannelSchema = z.object({
  token: z.string().min(1),
  channel: z.enum(["whatsapp", "pdf_download"]),
});

/**
 * Log when a viewer uses the WhatsApp share or PDF download button.
 * Best-effort — errors are silently swallowed.
 */
export async function logInvoiceShareChannel(rawInput: unknown): Promise<void> {
  const parsed = LogChannelSchema.safeParse(rawInput);
  if (!parsed.success) return;
  const { token, channel } = parsed.data;

  try {
    const supabase = await createClient();
    const h = await headers();
    const ua = h.get("user-agent") ?? null;

    await supabase.rpc("log_invoice_view", {
      p_token: token,
      p_channel: channel satisfies ShareChannel,
      p_agent: ua,
    });
  } catch {
    /* best-effort */
  }
}

// ---------------------------------------------------------------------------
// buildWhatsappInvoiceText helper
// ---------------------------------------------------------------------------

/**
 * One-line bilingual summary for WhatsApp sharing of an invoice.
 * e.g. "فاتورة من رِزق — https://rizq.sa/ar/i/abc123"
 * No client PII — only the public link is included.
 */
export async function buildWhatsappInvoiceText(
  token: string,
  locale: "ar" | "en",
  origin: string
): Promise<string> {
  const url = `${origin}/${locale}/i/${token}`;
  if (locale === "ar") {
    return `فاتورة احترافية من رِزق — سعّر بثقة، اقبض رزقك.\n${url}`;
  }
  return `A professional invoice from Rizq — Price with confidence, earn your rizq.\n${url}`;
}
