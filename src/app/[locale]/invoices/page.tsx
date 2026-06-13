/**
 * /[locale]/invoices — Invoice list page. Phase-4 task P4.4.
 * Server component. Auth-gated. Mirrors income/page.tsx exactly in structure.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/nav/SiteNav";
import { InvoiceListClient } from "@/components/invoices/InvoiceListClient";
import { isOverdue } from "@/lib/invoices/overdue";
import type { InvoiceRow } from "@/components/invoices/InvoiceCard";

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Invoices.list" });
  return { title: `${t("title")} — رِزق` };
}

export default async function InvoicesPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const loginPath = getPathname({ href: "/login", locale: locale as "ar" | "en" });
    redirect(loginPath);
  }

  const t = await getTranslations({ locale, namespace: "Invoices.list" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";

  // Fetch invoices with optional client name join
  const { data: rawInvoices } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, status, total_sar, due_date, created_at, client_id, clients(name)"
    )
    .order("created_at", { ascending: false });

  // Flatten join
  const invoices: InvoiceRow[] = (rawInvoices ?? []).map((inv) => ({
    id: inv.id as string,
    invoice_number: inv.invoice_number as string,
    status: inv.status as string,
    total_sar: Number(inv.total_sar),
    due_date: (inv.due_date as string | null) ?? null,
    created_at: inv.created_at as string,
    client_id: (inv.client_id as string | null) ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client_name: (inv.clients as any)?.name ?? null,
  }));

  // Compute current-month summary from rows (server reads clock — fine)
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const thisMonthInvoices = invoices.filter((inv) => {
    const d = new Date(inv.created_at);
    return d >= monthStart;
  });

  const issuedTotal = thisMonthInvoices.reduce((sum, inv) => sum + inv.total_sar, 0);
  const paidTotal = thisMonthInvoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.total_sar, 0);

  const overdueInvoices = thisMonthInvoices.filter((inv) =>
    isOverdue(inv.status, inv.due_date, today)
  );
  const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + inv.total_sar, 0);
  const overdueCount = overdueInvoices.length;

  const summary = { issuedTotal, paidTotal, overdueTotal, overdueCount };

  return (
    <div className="relative min-h-screen flex flex-col bg-paper">
      {/* Dot-grid background — mirrors income page */}
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
        className="relative z-10 flex-1 mx-auto w-full max-w-3xl px-6 sm:px-10 lg:px-16 py-12 sm:py-16 lg:py-20 pb-28"
        dir={dir}
      >
        {/* Page header */}
        <div className="mb-8 sm:mb-10">
          <p className="eyebrow mb-3">{t("eyebrow")}</p>
          <h1 className={`display-2 text-rizq-ink ${font}`}>{t("title")}</h1>
          <p className={`mt-2 text-base text-rizq-ink-soft max-w-md ${font}`}>
            {t("subtitle")}
          </p>
        </div>

        {/* Empty state */}
        {invoices.length === 0 ? (
          <div
            dir={dir}
            className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-10 text-center ${font}`}
          >
            <div
              aria-hidden
              className="mx-auto mb-6 h-16 w-16 rounded-2xl border-2 border-rizq-gold/30 bg-rizq-green/8 flex items-center justify-center"
            >
              <span className="font-arabic text-2xl font-bold text-rizq-green leading-none">
                ف
              </span>
            </div>
            <h2 className={`text-xl font-semibold text-rizq-ink mb-2 ${font}`}>
              {t("emptyTitle")}
            </h2>
            <p className={`text-sm text-rizq-ink-soft mb-6 max-w-sm mx-auto ${font}`}>
              {t("emptyBody")}
            </p>
            <Link
              href="/invoices/new"
              className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-7 py-3.5 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
            >
              {t("emptyCta")}
              <span className="inline-block rtl:rotate-180">→</span>
            </Link>
          </div>
        ) : (
          <InvoiceListClient
            invoices={invoices}
            summary={summary}
            locale={locale as "ar" | "en"}
          />
        )}
      </main>
    </div>
  );
}
