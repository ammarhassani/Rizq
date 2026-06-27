/**
 * /[locale]/invoices/[id] — Invoice detail page. Phase-4 task P4.4.
 * Server component. Auth-gated. Renders InvoiceArtifact + InvoiceDetailActions.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { ContextualBackLink } from "@/components/nav/ContextualBackLink";
import { parseOrigin } from "@/lib/nav/origin";
import { InvoiceArtifact } from "@/components/invoices/InvoiceArtifact";
import { InvoiceDetailActions } from "@/components/invoices/InvoiceDetailActions";
import { AnimatedNumber } from "@/components/tool/AnimatedNumber";
import type { InvoiceArtifactData } from "@/lib/invoices/artifact";
import { daysOverdue } from "@/lib/invoices/overdue";

type Params = { locale: string; id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  return { title: "فاتورة · رِزق" };
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ from?: string; guided?: string }>;
}) {
  const { locale, id } = await params;
  const sp = await searchParams;
  const origin = parseOrigin(sp);
  const guided = sp.guided === "1";
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const loginPath = getPathname({ href: "/login", locale: locale as "ar" | "en" });
    redirect(loginPath);
  }

  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  // Fetch invoice (owner-scoped via RLS + explicit eq)
  const { data: invoice, error: invoiceErr } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, status, total_sar, due_date, created_at, artifact_json, client_id, public_share, share_token, clients(name)"
    )
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .single();

  if (invoiceErr || !invoice) notFound();

  // Parse artifact_json — always set by P4.3 actions; null guard renders notice
  const artifactData = invoice.artifact_json as InvoiceArtifactData | null;

  const statusLabels: Record<string, { ar: string; en: string }> = {
    draft:     { ar: "مسودة",        en: "Draft" },
    sent:      { ar: "مُرسَلة",       en: "Sent" },
    viewed:    { ar: "مُطَّلَع عليها", en: "Viewed" },
    paid:      { ar: "مدفوعة",       en: "Paid" },
    overdue:   { ar: "متأخرة",       en: "Overdue" },
    cancelled: { ar: "ملغاة",        en: "Cancelled" },
  };

  const status = invoice.status as string;
  const statusEntry = statusLabels[status];
  const statusLabel = statusEntry
    ? (isAr ? statusEntry.ar : statusEntry.en)
    : status;

  const STATUS_STYLES: Record<string, string> = {
    draft:     "bg-rizq-ink/8 text-rizq-ink-soft",
    sent:      "bg-blue-50 text-blue-700",
    viewed:    "bg-blue-50 text-blue-700",
    paid:      "bg-emerald-50 text-emerald-700",
    overdue:   "bg-red-50 text-red-700",
    cancelled: "bg-rizq-ink/8 text-rizq-ink-soft",
  };
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.draft;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientName = (invoice.clients as any)?.name ?? null;

  // Show the AI payment-reminder button only when the reminder action will
  // actually fire: status is sent/viewed/overdue AND ≥7 days past due
  // (matches the gate in generatePaymentReminderAction).
  const looksOverdue =
    (status === "sent" || status === "viewed" || status === "overdue") &&
    daysOverdue(invoice.due_date as string | null, new Date()) >= 7;

  return (
    <AppShell locale={locale as "ar" | "en"} title={invoice.invoice_number as string} maxWidth="reading">
      <div dir={dir}>
        {/* Back link — returns to the project pane when opened in a project context */}
        <ContextualBackLink
          locale={locale as "ar" | "en"}
          origin={origin}
          fallbackHref="/invoices"
          fallbackKey="invoices"
          guided={guided}
        />

        {/* Invoice header summary strip */}
        <div
          dir={dir}
          className={`print:hidden flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rizq-gold/20 bg-rizq-cream/85 px-6 py-4 mb-6 ${font}`}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span className="tabular font-sans text-lg font-bold text-rizq-ink">
              {invoice.invoice_number as string}
            </span>
            {clientName && (
              <span className={`text-sm text-rizq-ink-soft ${font}`}>{clientName}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="tabular font-sans text-lg font-bold text-rizq-green">
              <AnimatedNumber value={Number(invoice.total_sar)} locale={locale as "ar" | "en"} duration={0.9} />
              <span className={`ms-1 text-sm font-normal text-rizq-ink-soft/60 ${font}`}>
                {isAr ? "ر.س" : "SAR"}
              </span>
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle} ${font}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Artifact or fallback notice */}
        {artifactData ? (
          <InvoiceArtifact data={artifactData} locale={locale as "ar" | "en"} />
        ) : (
          <div
            dir={dir}
            className={`rounded-2xl border border-rizq-gold/20 bg-white/60 p-8 text-center ${font}`}
          >
            <p className={`text-sm text-rizq-ink-soft ${font}`}>
              {isAr
                ? "تعذّر تحميل بيانات الفاتورة. يرجى المحاولة لاحقًا."
                : "Invoice data could not be loaded. Please try again later."}
            </p>
          </div>
        )}

        {/* Actions island */}
        <div className="mt-8 print:hidden">
          <InvoiceDetailActions
            locale={locale as "ar" | "en"}
            invoiceId={invoice.id as string}
            status={status}
            publicShare={(invoice.public_share as boolean | null) ?? false}
            shareToken={(invoice.share_token as string | null) ?? null}
            looksOverdue={looksOverdue}
          />
        </div>
      </div>
    </AppShell>
  );
}
