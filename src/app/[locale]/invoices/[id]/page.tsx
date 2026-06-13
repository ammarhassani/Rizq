/**
 * /[locale]/invoices/[id] — Invoice detail page. Phase-4 task P4.4.
 * Server component. Auth-gated. Renders InvoiceArtifact + InvoiceDetailActions.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/nav/SiteNav";
import { InvoiceArtifact } from "@/components/invoices/InvoiceArtifact";
import { InvoiceDetailActions } from "@/components/invoices/InvoiceDetailActions";
import type { InvoiceArtifactData } from "@/lib/invoices/artifact";

type Params = { locale: string; id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  return { title: "فاتورة — رِزق" };
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, id } = await params;
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
      "id, invoice_number, status, total_sar, due_date, created_at, artifact_json, client_id, clients(name)"
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

  return (
    <div className="relative min-h-screen flex flex-col bg-paper">
      {/* Dot-grid background */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.45] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(200, 169, 81, 0.18) 1px, transparent 1.6px)",
          backgroundSize: "30px 30px",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      />
      <SiteNav locale={locale as "ar" | "en"} />
      <main
        className="relative z-10 flex-1 mx-auto w-full max-w-3xl px-6 sm:px-10 lg:px-16 py-12 sm:py-16 lg:py-20"
        dir={dir}
      >
        {/* Back link */}
        <Link
          href="/invoices"
          className={`inline-flex items-center gap-1.5 text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors mb-8 ${font}`}
        >
          <span className="inline-block ltr:rotate-180">→</span>
          {isAr ? "الفواتير" : "Invoices"}
        </Link>

        {/* Invoice header summary strip */}
        <div
          dir={dir}
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rizq-gold/20 bg-rizq-cream/85 px-6 py-4 mb-6 ${font}`}
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
              {new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
                maximumFractionDigits: 0,
              }).format(Number(invoice.total_sar))}
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
        <div className="mt-8">
          <InvoiceDetailActions
            locale={locale as "ar" | "en"}
            invoiceId={invoice.id as string}
            status={status}
          />
        </div>
      </main>
    </div>
  );
}
