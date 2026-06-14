/**
 * /[locale]/income/[id] — Gig detail page. Phase-3 task 3.7.
 * Server component. Auth-gated.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { GigDetailActions } from "@/components/income/GigDetailActions";
import type { LinkedInvoice } from "@/components/income/GigDetailActions";

type Params = { locale: string; id: string };

function fmtPrice(n: number | null, locale: "ar" | "en"): string {
  if (n == null || !isFinite(n)) return "—";
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }).format(n);
}

function fmtDate(iso: string | null | undefined, locale: "ar" | "en"): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    }).format(new Date(iso.includes("T") ? iso : iso + "T00:00:00"));
  } catch { return iso; }
}

function fmtDateTime(iso: string | null | undefined, locale: "ar" | "en"): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch { return iso; }
}

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  deposit_paid: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  delivered: "bg-blue-50 text-blue-700",
  overdue: "bg-red-50 text-red-700",
  cancelled: "bg-rizq-ink/8 text-rizq-ink-soft",
};

const STATUS_LABELS_AR: Record<string, string> = {
  paid: "مدفوع", pending: "قيد الانتظار", deposit_paid: "دفعة مقدمة",
  in_progress: "جاري", delivered: "مُسلَّم", overdue: "متأخر", cancelled: "ملغى",
};

const STATUS_LABELS_EN: Record<string, string> = {
  paid: "Paid", pending: "Pending", deposit_paid: "Deposit paid",
  in_progress: "In progress", delivered: "Delivered", overdue: "Overdue", cancelled: "Cancelled",
};

const PAYMENT_METHOD_AR: Record<string, string> = {
  bank_transfer: "تحويل بنكي",
  stc_pay: "STC Pay",
  cash: "نقد",
  other: "أخرى",
};

const PAYMENT_METHOD_EN: Record<string, string> = {
  bank_transfer: "Bank transfer",
  stc_pay: "STC Pay",
  cash: "Cash",
  other: "Other",
};

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  return { title: "مشروع — رِزق" };
}

export default async function GigDetailPage({ params }: { params: Promise<Params> }) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const loginPath = getPathname({ href: "/login", locale: locale as "ar" | "en" });
    redirect(loginPath);
  }

  const t = await getTranslations({ locale, namespace: "Income.detail" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";

  // Fetch gig (RLS owner-only) — include invoice_id back-link
  const { data: gig, error: gigErr } = await supabase
    .from("gigs")
    .select("*, clients(id, name)")
    .eq("id", id)
    .single();

  if (gigErr || !gig) notFound();

  // If the gig already has a linked invoice, fetch its number + status for the chip
  let linkedInvoice: LinkedInvoice | null = null;
  const gigInvoiceId = (gig.invoice_id as string | null) ?? null;
  if (gigInvoiceId) {
    const { data: invRow } = await supabase
      .from("invoices")
      .select("id, invoice_number, status")
      .eq("id", gigInvoiceId)
      .eq("user_id", userData.user.id)
      .single();
    if (invRow) {
      linkedInvoice = {
        id: invRow.id as string,
        invoice_number: invRow.invoice_number as string,
        status: invRow.status as string,
      };
    }
  }

  // Fetch user's clients for the edit form picker
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const clientOptions = (clients ?? []).map((c: { id: string; name: string }) => ({
    id: c.id,
    name: c.name,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientName = (gig.clients as any)?.name ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientId = (gig.clients as any)?.id ?? gig.client_id ?? null;

  const statusLabel = isAr ? STATUS_LABELS_AR[gig.status] ?? gig.status : STATUS_LABELS_EN[gig.status] ?? gig.status;
  const statusStyle = STATUS_STYLES[gig.status] ?? STATUS_STYLES.pending;
  const paymentMethodLabel = isAr
    ? PAYMENT_METHOD_AR[gig.payment_method] ?? gig.payment_method
    : PAYMENT_METHOD_EN[gig.payment_method] ?? gig.payment_method;

  return (
    <AppShell locale={locale as "ar" | "en"} title={gig.title as string}>
      <div
        className="mx-auto w-full max-w-3xl px-6 sm:px-10 lg:px-16 py-12 sm:py-16 lg:py-20"
        dir={dir}
      >
        {/* Back */}
        <Link
          href="/income"
          className={`inline-flex items-center gap-1.5 text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors mb-8 ${font}`}
        >
          <span className="inline-block ltr:rotate-180">→</span>
          {isAr ? "دفتر الدخل" : "Income Ledger"}
        </Link>

        {/* Anomaly banner */}
        {gig.ai_anomaly_flag && gig.ai_anomaly_reason && (
          <div dir={dir} className={`rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 mb-6 flex items-start gap-3 ${font}`}>
            <span className="text-amber-500 text-lg mt-0.5" aria-hidden>❗</span>
            <div>
              <p className={`text-sm font-semibold text-amber-900 mb-0.5 ${font}`}>{t("anomalyTitle")}</p>
              <p className={`text-sm text-amber-800 ${font}`}>{gig.ai_anomaly_reason}</p>
            </div>
          </div>
        )}

        {/* Header card */}
        <div className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-7 sm:p-10 mb-6 ${font}`}>
          <div dir={dir} className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className={`text-2xl font-bold text-rizq-ink leading-snug ${font}`}>{gig.title}</h1>
              {gig.description && (
                <p className={`mt-1.5 text-sm text-rizq-ink-soft ${font}`}>{gig.description}</p>
              )}
            </div>
            <div className="shrink-0 text-end flex flex-col items-end gap-2">
              <p className="tabular font-sans text-2xl font-bold text-rizq-green leading-none">
                {fmtPrice(gig.amount_sar, locale as "ar" | "en")}
              </p>
              <p className={`text-xs text-rizq-ink-soft/60 ${font}`}>{isAr ? "ريال" : "SAR"}</p>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle} ${font}`}>
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Category + payment method */}
          <div dir={dir} className="mt-5 pt-4 border-t border-rizq-gold/20 flex flex-wrap gap-4">
            {gig.category && (
              <div>
                <p className="text-xs text-rizq-ink-soft/60 mb-0.5">{t("category")}</p>
                <p className={`text-sm font-medium text-rizq-ink ${font}`}>{gig.category}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-rizq-ink-soft/60 mb-0.5">{t("paymentMethod")}</p>
              <p className={`text-sm font-medium text-rizq-ink ${font}`}>{paymentMethodLabel}</p>
            </div>
            {gig.delivery_date && (
              <div>
                <p className="text-xs text-rizq-ink-soft/60 mb-0.5">{t("deliveryDate")}</p>
                <p className={`text-sm font-medium text-rizq-ink ${font}`}>{fmtDate(gig.delivery_date, locale as "ar" | "en")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment timeline */}
        <section className="mb-6">
          <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{t("paymentTimeline")}</h2>
          <div className={`rounded-2xl border border-rizq-gold/20 bg-white/70 p-5 space-y-4 ${font}`}>
            {/* Deposit */}
            <div dir={dir} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm ${
                  gig.status !== "pending" ? "bg-emerald-100 text-emerald-700" : "bg-rizq-gold/15 text-rizq-ink-soft"
                }`}>
                  {gig.status !== "pending" ? "✓" : "○"}
                </span>
                <div>
                  <p className={`text-sm font-medium text-rizq-ink ${font}`}>{t("depositLabel")}</p>
                  {gig.deposit_paid_at && (
                    <p className="text-xs text-rizq-ink-soft/60">{fmtDateTime(gig.deposit_paid_at, locale as "ar" | "en")}</p>
                  )}
                </div>
              </div>
              <div className="text-end">
                <p className="tabular font-sans text-sm font-semibold text-rizq-ink">{fmtPrice(gig.deposit_sar ?? null, locale as "ar" | "en")}</p>
                <p className={`text-xs text-rizq-ink-soft/60 ${font}`}>{isAr ? "ريال" : "SAR"}</p>
              </div>
            </div>

            {/* Divider line */}
            <div className="border-l-2 border-dashed border-rizq-gold/25 ms-4 h-4" aria-hidden />

            {/* Final payment */}
            <div dir={dir} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm ${
                  gig.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-rizq-gold/15 text-rizq-ink-soft"
                }`}>
                  {gig.status === "paid" ? "✓" : "○"}
                </span>
                <div>
                  <p className={`text-sm font-medium text-rizq-ink ${font}`}>{t("finalPaymentLabel")}</p>
                  {gig.final_paid_at && (
                    <p className="text-xs text-rizq-ink-soft/60">{fmtDateTime(gig.final_paid_at, locale as "ar" | "en")}</p>
                  )}
                </div>
              </div>
              <div className="text-end">
                <p className="tabular font-sans text-sm font-semibold text-rizq-ink">{fmtPrice(gig.remaining_sar ?? null, locale as "ar" | "en")}</p>
                <p className={`text-xs text-rizq-ink-soft/60 ${font}`}>{isAr ? "ريال" : "SAR"}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Linked client */}
        {clientName && clientId && (
          <section className="mb-6">
            <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{t("linkedClient")}</h2>
            <Link
              href={`/clients/${clientId}` as `/clients/${string}`}
              className={`flex items-center justify-between gap-3 rounded-xl border border-rizq-gold/15 bg-white/60 px-4 py-3 hover:border-rizq-green/30 hover:bg-rizq-cream/80 transition-all ${font}`}
            >
              <span className={`text-sm font-medium text-rizq-ink ${font}`}>{clientName}</span>
              <span className="text-sm text-rizq-ink-soft/60">→</span>
            </Link>
          </section>
        )}

        {/* Linked proposal */}
        {gig.proposal_id && (
          <section className="mb-6">
            <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{t("linkedProposal")}</h2>
            <Link
              href={`/proposals/${gig.proposal_id}` as `/proposals/${string}`}
              className={`flex items-center justify-between gap-3 rounded-xl border border-rizq-gold/15 bg-white/60 px-4 py-3 hover:border-rizq-green/30 hover:bg-rizq-cream/80 transition-all ${font}`}
            >
              <span className={`text-sm font-medium text-rizq-ink ${font}`}>{isAr ? "عرض تقديمي مرتبط" : "Linked proposal"}</span>
              <span className="text-sm text-rizq-ink-soft/60">→</span>
            </Link>
          </section>
        )}

        {/* Payment notes */}
        {gig.payment_notes && (
          <section className="mb-6">
            <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{t("paymentNotes")}</h2>
            <div className={`rounded-2xl border border-rizq-gold/20 bg-white/60 px-5 py-4 text-sm text-rizq-ink whitespace-pre-wrap ${font}`}>
              {gig.payment_notes}
            </div>
          </section>
        )}

        {/* Actions island */}
        <div className="mt-8">
          <GigDetailActions
            locale={locale as "ar" | "en"}
            gig={{
              id: gig.id,
              title: gig.title,
              amount_sar: gig.amount_sar,
              deposit_sar: gig.deposit_sar ?? null,
              remaining_sar: gig.remaining_sar ?? null,
              status: gig.status,
              delivery_date: gig.delivery_date ?? null,
              ai_anomaly_flag: gig.ai_anomaly_flag ?? null,
              client_id: clientId,
              client_name: clientName,
              category: gig.category ?? null,
              description: gig.description ?? null,
              payment_method: gig.payment_method ?? null,
              payment_notes: gig.payment_notes ?? null,
            }}
            clients={clientOptions}
            linkedInvoice={linkedInvoice}
          />
        </div>
      </div>
    </AppShell>
  );
}
