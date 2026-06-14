/**
 * /[locale]/hadaf — HADAF Eligibility module (M5). Phase-5 task P5.8.
 * Server component. Auth-gated. Informational only — NOT a government service.
 */

import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { getHadafStatusAction } from "@/app/actions/hadaf/status";
import { HadafStreakBar } from "@/components/hadaf/HadafStreakBar";
import { HadafActionPlanClient } from "@/components/hadaf/HadafActionPlanClient";
import { AnimatedNumber } from "@/components/tool/AnimatedNumber";
import { CheckCircle2, XCircle, ExternalLink, AlertTriangle } from "lucide-react";

type Params = { locale: string };

function fmtSAR(n: number, locale: "ar" | "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtMonth(ym: string, locale: "ar" | "en"): string {
  try {
    const [y, m] = ym.split("-").map(Number);
    return new Intl.DateTimeFormat(
      locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US",
      { year: "numeric", month: "long" }
    ).format(new Date(y, m - 1, 1));
  } catch {
    return ym;
  }
}

function daysRemainingInMonth(today: Date): number {
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return Math.max(0, lastDay - today.getDate());
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Hadaf" });
  return { title: `${t("pageTitle")} · رِزق` };
}

export default async function HadafPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // ── Auth gate ─────────────────────────────────────────────────────────────
  const loginPath = getPathname({ href: "/login", locale: locale as "ar" | "en" });
  // We'll check auth via the action result
  const result = await getHadafStatusAction();

  if (!result.ok) {
    if (result.code === "unauthorized") {
      redirect(loginPath);
    }
    // For no_rules or error, show a generic error (handled below)
  }

  const t = await getTranslations({ locale, namespace: "Hadaf" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";
  const today = new Date();
  const daysLeft = daysRemainingInMonth(today);

  // ── Error / no rules state ────────────────────────────────────────────────
  if (!result.ok) {
    return (
      <AppShell locale={locale as "ar" | "en"} title={isAr ? "هدف" : "HADAF"} maxWidth="reading">
        <div className={font} dir={dir}>
          <p className="text-sm text-rizq-ink-soft">{t("loadError")}</p>
        </div>
      </AppShell>
    );
  }

  const { status, rules, disclaimer, ai_action_plan_ar, ai_action_plan_en } = result;

  return (
    <AppShell locale={locale as "ar" | "en"} title={isAr ? "أهلية هدف" : "HADAF Eligibility"} maxWidth="reading">
      <div dir={dir} className={font}>
        {/* Page header */}
        <div className="mb-6 sm:mb-8">
          <p className="eyebrow mb-3">{t("eyebrow")}</p>
          <h1 className={`display-2 text-rizq-ink ${font}`}>{t("pageTitle")}</h1>
          <p className={`mt-2 text-base text-rizq-ink-soft max-w-xl ${font}`}>
            {t("pageSubtitle")}
          </p>
        </div>

        {/* ── Status card ────────────────────────────────────────────────── */}
        {status.current_month_status === "no_data" ? (
          /* No-data state */
          <div className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-7 sm:p-9 mb-8 text-center ${font}`}>
            <div
              aria-hidden
              className="mx-auto mb-5 h-14 w-14 rounded-2xl border-2 border-rizq-gold/30 bg-rizq-green/8 flex items-center justify-center"
            >
              <AlertTriangle size={24} className="text-rizq-gold" />
            </div>
            <h2 className={`text-lg font-semibold text-rizq-ink mb-2 ${font}`}>
              {t("noDataTitle")}
            </h2>
            <p className={`text-sm text-rizq-ink-soft mb-6 max-w-sm mx-auto ${font}`}>
              {t("noDataBody")}
            </p>
            <Link
              href="/income/new"
              className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-7 py-3.5 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
            >
              {t("noDataCta")}
              <span className="inline-block rtl:rotate-180">→</span>
            </Link>
          </div>
        ) : status.current_streak >= rules.consecutive_months_required ? (
          /* Fully qualifying state */
          <div className={`rounded-3xl border border-emerald-200 bg-emerald-50/70 p-7 sm:p-9 mb-8 ${font}`}>
            <div className="flex items-start gap-4 mb-5">
              <CheckCircle2 size={28} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h2 className={`text-xl font-bold text-rizq-ink ${font}`}>
                  {t("qualifyingTitle", { n: status.current_streak })}
                </h2>
                <p className={`mt-1 text-sm text-rizq-ink-soft ${font}`}>
                  {t("qualifyingSubtitle")}
                </p>
              </div>
            </div>

            {/* Streak progress bar */}
            <div className="mb-5">
              <HadafStreakBar
                streak={status.current_streak}
                required={rules.consecutive_months_required}
                locale={locale as "ar" | "en"}
              />
            </div>

            {/* Current month income check */}
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <p className={`text-sm ${font}`}>
                {t("currentMonthIncome", {
                  income: fmtSAR(status.current_month_income, locale as "ar" | "en"),
                  target: fmtSAR(rules.minimum_monthly_income_sar, locale as "ar" | "en"),
                })}
              </p>
            </div>

            {/* Estimated subsidy */}
            {status.estimated_subsidy != null && (
              <div className={`mt-4 pt-4 border-t border-emerald-200 ${font}`}>
                <p className="text-xs text-rizq-ink-soft/60 mb-1">
                  {t("estimatedSubsidyLabel")}
                </p>
                <p className="tabular font-sans text-2xl font-bold text-emerald-700">
                  <AnimatedNumber value={status.estimated_subsidy} locale={locale as "ar" | "en"} duration={0.9} />{" "}
                  <span className={`text-sm font-normal ${font}`}>
                    {isAr ? "ريال/شهر" : "SAR/month"}
                  </span>
                </p>
                <p className={`text-xs text-rizq-ink-soft/50 mt-1 ${font}`}>
                  {t("subsidyNote", { pct: rules.subsidy_pct })}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Not-qualifying / in-progress streak state */
          <div className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-7 sm:p-9 mb-8 ${font}`}>
            <div className="flex items-start gap-4 mb-5">
              <XCircle size={26} className="text-rizq-gold shrink-0 mt-0.5" />
              <div>
                <h2 className={`text-xl font-bold text-rizq-ink ${font}`}>
                  {status.current_streak > 0
                    ? t("inProgressTitle", { n: status.current_streak })
                    : t("notQualifyingTitle")}
                </h2>
                <p className={`mt-1 text-sm text-rizq-ink-soft ${font}`}>
                  {t("monthsToQualify", { n: status.months_to_qualify })}
                </p>
              </div>
            </div>

            {/* Streak progress bar */}
            <div className="mb-5">
              <HadafStreakBar
                streak={status.current_streak}
                required={rules.consecutive_months_required}
                locale={locale as "ar" | "en"}
              />
            </div>

            {/* Current month income + gap */}
            <div className={`rounded-2xl bg-white/60 border border-rizq-gold/15 p-4 mb-5 ${font}`}>
              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="text-xs text-rizq-ink-soft/60 mb-0.5">{t("currentMonthLabel")}</p>
                  <p className="tabular font-sans text-lg font-bold text-rizq-ink">
                    {fmtSAR(status.current_month_income, locale as "ar" | "en")}
                    <span className={`text-xs font-normal ms-1 ${font}`}>
                      {isAr ? "ريال" : "SAR"}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-rizq-ink-soft/60 mb-0.5">{t("targetLabel")}</p>
                  <p className="tabular font-sans text-lg font-bold text-rizq-ink">
                    {fmtSAR(rules.minimum_monthly_income_sar, locale as "ar" | "en")}
                    <span className={`text-xs font-normal ms-1 ${font}`}>
                      {isAr ? "ريال" : "SAR"}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-rizq-ink-soft/60 mb-0.5">{t("daysRemainingLabel")}</p>
                  <p className={`text-lg font-bold text-rizq-ink ${font}`}>
                    {daysLeft} {isAr ? "يوم" : "days"}
                  </p>
                </div>
              </div>

              {/* Gap to target */}
              {status.current_month_income < rules.minimum_monthly_income_sar && (
                <div className="mt-3 pt-3 border-t border-rizq-gold/15">
                  <p className={`text-sm text-amber-700 ${font}`}>
                    {t("gapToTarget", {
                      gap: fmtSAR(
                        rules.minimum_monthly_income_sar - status.current_month_income,
                        locale as "ar" | "en"
                      ),
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Broken streak note */}
            {status.current_streak === 0 &&
              status.streak_history.some((h) => h.qualifying) && (
                <p className={`text-xs text-amber-700 mb-4 ${font}`}>
                  {t("streakBrokenNote")}
                </p>
              )}

            {/* AI action plan card */}
            <HadafActionPlanClient
              locale={locale as "ar" | "en"}
              initialAr={ai_action_plan_ar}
              initialEn={ai_action_plan_en}
            />
          </div>
        )}

        {/* ── Monthly history table ───────────────────────────────────────── */}
        {status.streak_history.length > 0 && (
          <div className={`rounded-3xl border border-rizq-gold/15 bg-white/50 p-5 sm:p-7 mb-8 ${font}`}>
            <h2 className={`text-base font-semibold text-rizq-ink mb-4 ${font}`}>
              {t("historyTitle")}
            </h2>
            <div className="overflow-x-auto">
              <table className={`w-full text-sm ${font}`} dir={dir}>
                <thead>
                  <tr className="border-b border-rizq-gold/15 text-rizq-ink-soft/60">
                    <th className={`py-2 font-medium text-start pe-4 ${isAr ? "text-right" : "text-left"}`}>
                      {t("historyColMonth")}
                    </th>
                    <th className={`py-2 font-medium text-end ${isAr ? "text-left" : "text-right"}`}>
                      {t("historyColIncome")}
                    </th>
                    <th className="py-2 font-medium text-center">
                      {t("historyColStatus")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...status.streak_history].reverse().map((row) => (
                    <tr
                      key={row.month}
                      className="border-b border-rizq-gold/10 last:border-0"
                    >
                      <td className="py-2 pe-4 text-rizq-ink-soft">
                        {fmtMonth(row.month, locale as "ar" | "en")}
                      </td>
                      <td className="py-2 tabular font-sans text-end text-rizq-ink">
                        {fmtSAR(row.income, locale as "ar" | "en")}
                      </td>
                      <td className="py-2 text-center">
                        {row.qualifying ? (
                          <span className="inline-flex items-center justify-center">
                            <CheckCircle2 size={15} className="text-emerald-600" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center">
                            <XCircle size={15} className="text-rizq-ink-soft/40" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Disclaimer (always visible, M5.3) ──────────────────────────── */}
        <div
          className={`rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6 mb-6 ${font}`}
          role="note"
          aria-label={isAr ? "إخلاء مسؤولية" : "Disclaimer"}
        >
          <p className={`text-sm text-amber-800 leading-relaxed mb-3 ${font}`}>
            {disclaimer}
          </p>
          <a
            href="https://hrdf.org.sa"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors ${font}`}
          >
            {t("hrdfLinkLabel")}
            <ExternalLink size={13} />
          </a>
        </div>

        {/* Small "not a government entity" note */}
        <p className={`text-xs text-rizq-ink-soft/50 text-center mb-8 ${font}`}>
          {t("notGovNote")}
        </p>
      </div>
    </AppShell>
  );
}
