"use server";

/**
 * Email an invoice to its client (M6 delivery).
 *
 * Reuses the existing share machinery rather than inventing a second delivery
 * path: enabling the share mints the 144-bit token and bumps draft → sent, and
 * the email simply carries that public link. Nothing about the invoice is
 * embedded beyond what the link already shows the recipient.
 *
 * Owner-gated (RLS + an explicit user_id predicate, like every action here).
 */

import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { setInvoiceShare } from "./shareActions";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";

const InputSchema = z.object({
  invoice_id: z.string().uuid(),
  locale: z.enum(["ar", "en"]).default("ar"),
});

export type SendInvoiceEmailResult =
  | { ok: true; sent_to: string }
  | {
      ok: false;
      code: "unauthorized" | "not_found" | "no_client_email" | "not_configured" | "error";
    };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendInvoiceEmail(rawInput: unknown): Promise<SendInvoiceEmailResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "error" };
  const { invoice_id, locale } = parsed.data;

  // Fail before mutating anything if email isn't wired up in this runtime.
  if (!isEmailConfigured()) return { ok: false, code: "not_configured" };

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  const { data: invoice, error: fetchErr } = await supabase
    .from("invoices")
    .select("id, invoice_number, total_sar, due_date, client_id")
    .eq("id", invoice_id)
    .eq("user_id", userId)
    .single();
  if (fetchErr || !invoice) return { ok: false, code: "not_found" };

  // Recipient + a reply-to that reaches the freelancer, not a no-reply void.
  const [{ data: client }, { data: profile }] = await Promise.all([
    invoice.client_id
      ? supabase
          .from("clients")
          .select("name, email")
          .eq("id", invoice.client_id)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("users")
      .select("brand_name, brand_name_ar, full_name_ar, contact_email")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const to = (client?.email as string | null)?.trim();
  if (!to) return { ok: false, code: "no_client_email" };

  // Enabling the share mints the token (and bumps draft → sent) so the link works.
  const shared = await setInvoiceShare({ invoice_id, share: true });
  if (!shared.ok || !shared.token) return { ok: false, code: "error" };

  const tI18n = await getTranslations({ locale: locale as "ar" | "en", namespace: "Invoices.list" });
  const isAr = locale === "ar";
  const senderName =
    (isAr ? (profile?.brand_name_ar as string | null) : (profile?.brand_name as string | null)) ??
    (profile?.full_name_ar as string | null) ??
    (profile?.brand_name as string | null) ??
    "Rizq";

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const link = `${baseUrl}/${locale}/i/${shared.token}`;
  const number = String(invoice.invoice_number ?? "");
  const amount = new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
    maximumFractionDigits: 2,
  }).format(Number(invoice.total_sar ?? 0));

  const subject = isAr
    ? `فاتورة ${number} من ${senderName}`
    : `Invoice ${number} from ${senderName}`;

  const dir = isAr ? "rtl" : "ltr";
  const html = `<!doctype html>
<html lang="${locale}" dir="${dir}">
  <body style="margin:0;padding:24px;background:#FAF5EC;font-family:${
    isAr ? "Tajawal," : ""
  }Inter,Arial,sans-serif;color:#1A1A1A;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid rgba(200,169,81,.3);border-radius:16px;padding:28px;">
      <p style="margin:0 0 16px;font-size:14px;color:#5b5b5b;">${escapeHtml(
        isAr ? `مرحباً ${client?.name ?? ""}،` : `Hello ${client?.name ?? ""},`
      )}</p>
      <h1 style="margin:0 0 12px;font-size:20px;color:#1A5F3F;">${escapeHtml(subject)}</h1>
      <p style="margin:0 0 8px;font-size:15px;">${
        tI18n("amountDue")
      }: <strong>${escapeHtml(amount)} ${tI18n("sar")}</strong></p>
      ${
        invoice.due_date
          ? `<p style="margin:0 0 20px;font-size:14px;color:#5b5b5b;">${
              tI18n("dueDate")
            }: ${escapeHtml(String(invoice.due_date))}</p>`
          : ""
      }
      <p style="margin:24px 0;">
        <a href="${escapeHtml(link)}"
           style="display:inline-block;background:#1A5F3F;color:#FAF5EC;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:15px;">
          ${tI18n("viewInvoice")}
        </a>
      </p>
      <p style="margin:0;font-size:12px;color:#8a8a8a;">${escapeHtml(
        isAr ? `أُرسلت عبر رِزق نيابةً عن ${senderName}` : `Sent via Rizq on behalf of ${senderName}`
      )}</p>
    </div>
  </body>
</html>`;

  const result = await sendEmail({
    to,
    subject,
    html,
    replyTo: (profile?.contact_email as string | null) ?? undefined,
  });
  if (!result.ok) {
    // Delivery failed, so the invoice was NOT sent — undo the draft → sent bump we
    // made to mint the link. Leaving it as "sent" fakes a delivery that never
    // happened and silently starts the overdue clock.
    if (shared.statusBumped) {
      await supabase
        .from("invoices")
        .update({ status: "draft", sent_at: null, public_share: false, updated_at: new Date().toISOString() })
        .eq("id", invoice_id)
        .eq("user_id", userId);
    }
    return { ok: false, code: result.code === "not_configured" ? "not_configured" : "error" };
  }

  return { ok: true, sent_to: to };
}
