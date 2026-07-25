/**
 * /[locale]/income — Income Ledger list page. Phase-3 task 3.7.
 * Server component. Auth-gated.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { IncomeListClient } from "@/components/income/IncomeListClient";
import { AnimatedNumber } from "@/components/tool/AnimatedNumber";
import { TrendChart } from "@/components/charts/TrendChart";
import type { GigRow } from "@/components/income/GigCard";

type Params = { locale: string };

type MonthlyIncomeRow = {
  month: string | null;
  gig_count: number | null;
  total_sar: number | null;
  paid_sar: number | null;
  pending_sar: number | null;
  overdue_sar: number | null;
  paid_count: number | null;
  pending_count: number | null;
};

function fmtPrice(n: number | null, locale: "ar" | "en"): string {
  if (n == null || !isFinite(n)) return "٠";
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }).format(n);
}

function fmtMonth(iso: string | null, locale: "ar" | "en"): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US", {
      year: "numeric",
      month: "long",
    }).format(new Date(iso));
  } catch { return iso; }
}

function calcChange(current: number | null, prev: number | null): number | null {
  if (!prev || prev === 0 || current == null) return null;
  return Math.round(((current - prev) / prev) * 100);
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Income.list" });
  return { title: `${t("title")} · رِزق` };
}

export default async function IncomePage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const loginPath = getPathname({ href: "/login", locale: locale as "ar" | "en" });
    redirect(loginPath);
  }

  const t = await getTranslations({ locale, namespace: "Income.list" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";

  // Fetch gigs with optional client name join (ordered by delivery_date desc)
  const { data: gigsRaw } = await supabase
    .from("gigs")
    .select("id, title, amount_sar, deposit_sar, remaining_sar, status, delivery_date, ai_anomaly_flag, client_id, project_id, clients(name)")
    .order("delivery_date", { ascending: false });

  // Flatten the join
  const gigs: GigRow[] = (gigsRaw ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    amount_sar: g.amount_sar,
    deposit_sar: g.deposit_sar ?? null,
    remaining_sar: g.remaining_sar ?? null,
    status: g.status,
    delivery_date: g.delivery_date ?? null,
    ai_anomaly_flag: g.ai_anomaly_flag ?? null,
    client_id: g.client_id ?? null,
    project_id: g.project_id ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client_name: (g.clients as any)?.name ?? null,
  }));

  // Fetch monthly_income for the trailing 12 months (covers current + previous
  // for the summary cards, and feeds the trend sparkline).
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const trailingStart = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();

  const { data: monthlyRows } = await supabase
    .from("monthly_income")
    .select("month, gig_count, total_sar, paid_sar, pending_sar, overdue_sar, paid_count, pending_count")
    .gte("month", trailingStart)
    .order("month", { ascending: false });

  const allMonthly = (monthlyRows ?? []) as MonthlyIncomeRow[];

  // Trend series: calendar order (oldest → newest), short month labels, last 6.
  const monthShortFmt = new Intl.DateTimeFormat(isAr ? "ar-SA-u-ca-gregory" : "en-US", {
    month: "short",
  });
  const incomeTrend = allMonthly
    .filter((r) => r.month)
    .map((r) => ({ d: new Date(r.month as string), value: Number(r.total_sar ?? 0) }))
    .sort((a, b) => a.d.getTime() - b.d.getTime())
    .slice(-6)
    .map((r) => ({ label: monthShortFmt.format(r.d), value: r.value }));

  // Find current and previous month rows
  const currentMonthRow = allMonthly.find((r) => {
    if (!r.month) return false;
    const d = new Date(r.month);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }) ?? null;

  const prevMonthRow = allMonthly.find((r) => {
    if (!r.month) return false;
    const d = new Date(r.month);
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth();
  }) ?? null;

  // AI projection (read-only, no AI call here)
  const { data: projectionRow } = await supabase
    .from("income_projections")
    .select("current_month_projection, next_month_projection, confidence_low, confidence_high, generated_at")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const changePercent = calcChange(currentMonthRow?.total_sar ?? null, prevMonthRow?.total_sar ?? null);
  const currentMonthLabel = fmtMonth(currentMonthStart, locale as "ar" | "en");
  const totalSar = currentMonthRow?.total_sar ?? 0;
  const gigCount = currentMonthRow?.gig_count ?? 0;
  const pendingCount = currentMonthRow?.pending_count ?? 0;

  return (
    <AppShell locale={locale as "ar" | "en"} title={t("eyebrow")} maxWidth="wide">
      <div dir={dir}>
        {/* Page header — primary action top-start, consistent with the other
            list pages (Projects/Proposals/Clients/Invoices). (Audit P2) */}
        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">{t("eyebrow")}</p>
            <h1 className={`display-2 text-rizq-ink ${font}`}>{t("title")}</h1>
            <p className={`mt-2 text-base text-rizq-ink-soft max-w-md ${font}`}>{t("subtitle")}</p>
          </div>
          {gigs.length > 0 && (
            <Link
              href="/income/new"
              className={`shrink-0 inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-3 text-sm font-medium hover:bg-rizq-green-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 ${font}`}
            >
              <span className="text-lg leading-none">+</span>
              {t("logGig")}
            </Link>
          )}
        </div>

        {/* Month summary card */}
        <div className={`card-wahaj p-6 sm:p-8 mb-8 ${font}`}>
          <div dir={dir} className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs text-rizq-ink-soft/60 uppercase tracking-wide mb-1">{currentMonthLabel}</p>
              <p className="tabular font-sans text-3xl font-bold text-rizq-green leading-none">
                <AnimatedNumber value={totalSar} locale={locale as "ar" | "en"} duration={0.9} />
              </p>
              <p className={`mt-1.5 text-sm text-rizq-ink-soft ${font}`}>
                {t("summaryLine", { total: fmtPrice(totalSar, locale as "ar" | "en"), n: String(gigCount), pending: String(pendingCount) })}
              </p>
            </div>
            {/* Month-over-month change */}
            {changePercent !== null && (
              <div className={`shrink-0 ${font}`}>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold tabular ${
                  changePercent >= 0
                    ? "status-positive"
                    : "status-overdue"
                }`}>
                  {changePercent >= 0 ? "↑" : "↓"}
                  {Math.abs(changePercent)}%
                  <span className={`font-normal text-xs opacity-80 ${font}`}>{t("vsLastMonth")}</span>
                </span>
              </div>
            )}
          </div>

          {/* Paid / Pending / Overdue breakdown */}
          {(currentMonthRow) && (
            <div dir={dir} className="mt-4 pt-4 border-t border-rizq-gold/20 flex flex-wrap gap-4">
              <div>
                <p className="text-xs text-rizq-ink-soft/60 mb-0.5">{t("paid")}</p>
                <p className="tabular font-sans text-base font-semibold text-[var(--acc)]">
                  {fmtPrice(currentMonthRow.paid_sar ?? 0, locale as "ar" | "en")}
                </p>
              </div>
              <div>
                <p className="text-xs text-rizq-ink-soft/60 mb-0.5">{t("pending")}</p>
                <p className="tabular font-sans text-base font-semibold text-[var(--warn)]">
                  {fmtPrice(currentMonthRow.pending_sar ?? 0, locale as "ar" | "en")}
                </p>
              </div>
              {(currentMonthRow.overdue_sar ?? 0) > 0 && (
                <div>
                  <p className="text-xs text-rizq-ink-soft/60 mb-0.5">{t("overdue")}</p>
                  <p className="tabular font-sans text-base font-semibold text-[var(--over)]">
                    {fmtPrice(currentMonthRow.overdue_sar ?? 0, locale as "ar" | "en")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* AI projection chip (read-only — placeholder until AI fills it) */}
          {projectionRow?.current_month_projection != null && (
            <div dir={dir} className={`mt-4 pt-4 border-t border-rizq-gold/20 flex items-center gap-2 ${font}`}>
              <span className="text-xs text-rizq-ink-soft/50 tracking-wide uppercase">{t("projectionLabel")}</span>
              <span className="tabular font-sans text-sm font-semibold text-rizq-ink-soft">
                {fmtPrice(projectionRow.current_month_projection, locale as "ar" | "en")} {t("sar")}
              </span>
              {projectionRow.confidence_low != null && projectionRow.confidence_high != null && (
                <span className="text-xs text-rizq-ink-soft/50">
                  ({fmtPrice(projectionRow.confidence_low, locale as "ar" | "en")} {locale === "ar" ? "إلى" : "to"} {fmtPrice(projectionRow.confidence_high, locale as "ar" | "en")})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Monthly income trend */}
        {incomeTrend.length >= 2 && (
          <div className={`rounded-3xl border border-rizq-gold/25 bg-[var(--raised)] p-6 sm:p-7 mb-8 ${font}`} dir={dir}>
            <p className="eyebrow mb-4">{t("incomeTrend")}</p>
            <TrendChart points={incomeTrend} locale={locale as "ar" | "en"} height={140} />
          </div>
        )}

        {/* Previous month summary (compact) */}
        {prevMonthRow && (prevMonthRow.total_sar ?? 0) > 0 && (
          <div className={`rounded-2xl border border-rizq-gold/15 bg-[var(--raised)] px-5 py-4 mb-6 flex flex-wrap items-center justify-between gap-3 ${font}`} dir={dir}>
            <p className={`text-sm text-rizq-ink-soft ${font}`}>
              {fmtMonth(prevMonthStart, locale as "ar" | "en")}
            </p>
            <p className="tabular font-sans text-sm font-semibold text-rizq-ink">
              {fmtPrice(prevMonthRow.total_sar ?? 0, locale as "ar" | "en")} <span className={`text-xs text-rizq-ink-soft/60 ${font}`}>{t("sar")}</span>
            </p>
          </div>
        )}

        {/* Gig list or empty state */}
        {gigs.length === 0 ? (
          <div dir={dir} className={`card-wahaj p-10 text-center ${font}`}>
            <div aria-hidden className="mx-auto mb-6 h-16 w-16 rounded-2xl border-2 border-rizq-gold/30 bg-rizq-green/8 flex items-center justify-center">
              <span className="font-arabic text-2xl font-bold text-rizq-green leading-none">ر</span>
            </div>
            <h2 className={`text-xl font-semibold text-rizq-ink mb-2 ${font}`}>{t("emptyTitle")}</h2>
            <p className={`text-sm text-rizq-ink-soft mb-6 max-w-sm mx-auto ${font}`}>{t("emptyBody")}</p>
            <Link
              href="/income/new"
              className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-7 py-3.5 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
            >
              {t("emptyCta")}
              <span className="inline-block rtl:rotate-180">→</span>
            </Link>
          </div>
        ) : (
          <>
            <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{t("transactionsTitle")}</h2>
            <IncomeListClient gigs={gigs} locale={locale as "ar" | "en"} />
          </>
        )}
      </div>
    </AppShell>
  );
}
