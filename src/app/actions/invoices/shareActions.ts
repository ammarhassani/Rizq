"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  // Auth check — must be the owner (RLS will also enforce this on the UPDATE).
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };

  // Load the existing invoice to check share_token + status + client linkage.
  const { data: invoice, error: fetchErr } = await supabase
    .from("invoices")
    .select("id, share_token, status, public_share, client_id, invoice_number, total_sar")
    .eq("id", invoice_id)
    .single();

  if (fetchErr || !invoice) return { ok: false, code: "not_found" };

  let token = (invoice.share_token as string | null) ?? undefined;

  const update: Record<string, unknown> = {
    public_share: share,
    updated_at: new Date().toISOString(),
  };

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
    }
  }

  const { error: updateErr } = await supabase
    .from("invoices")
    .update(update)
    .eq("id", invoice_id);

  if (updateErr) {
    console.error("[setInvoiceShare] update failed", updateErr);
    return { ok: false, code: "error" };
  }

  // Revalidate the invoice detail page so the server component reflects the change.
  revalidatePath(`/ar/invoices/${invoice_id}`);
  revalidatePath(`/en/invoices/${invoice_id}`);

  // Best-effort: insert 'invoice_sent' timeline event and bump last_contacted_at.
  const userId = userResult.user.id;
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
