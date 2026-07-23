"use client";

import { useState, useMemo, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Download } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { AnimatedNumber } from "@/components/tool/AnimatedNumber";
import { MotionList, MotionItem } from "@/components/motion/MotionList";
import { GigCard, type GigRow } from "./GigCard";
import { GigStatusQuickEdit } from "./GigStatusQuickEdit";
import { forecastIncomeAction } from "@/app/actions/gigs/incomeAi";
import { exportIncomeCsv } from "@/app/actions/gigs/exportIncomeCsv";
import { UpgradeModal } from "@/components/upgrade/UpgradeModal";

type FilterChip = "all" | "paid" | "pending" | "this_month" | "last_month" | "this_year";
type SortKey = "delivery_date" | "amount" | "status";

type Props = { gigs: GigRow[]; locale: "ar" | "en" };

type ForecastState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "upgrade" }
  | {
      status: "done";
      narrative_ar: string;
      narrative_en: string;
      factors_ar: string[];
      factors_en: string[];
      current_month_projection: number;
      next_month_projection: number;
      confidence_low: number;
      confidence_high: number;
    }
  | { status: "error" };

function getMonthRange(offset: number): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  return { start, end };
}

function fmtPrice(n: number, locale: "ar" | "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  }).format(n);
}

export function IncomeListClient({ gigs, locale }: Props) {
  const t = useTranslations("Income.list");
  const tAi = useTranslations("Income.ai");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [filter, setFilter] = useState<FilterChip>("all");
  const [sort, setSort] = useState<SortKey>("delivery_date");
  const [, startTransition] = useTransition();

  const [forecast, setForecast] = useState<ForecastState>({ status: "idle" });

  // CSV export state
  const [csvState, setCsvState] = useState<"idle" | "loading" | "upgrade" | "error">("idle");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<"ai_feature" | "gigs">("ai_feature");
  const [, startCsvTransition] = useTransition();

  const filtered = useMemo(() => {
    let list = [...gigs];

    if (filter === "paid") {
      list = list.filter((g) => g.status === "paid");
    } else if (filter === "pending") {
      list = list.filter((g) => ["pending", "deposit_paid", "in_progress", "delivered", "overdue"].includes(g.status));
    } else if (filter === "this_month") {
      const { start, end } = getMonthRange(0);
      list = list.filter((g) => {
        if (!g.delivery_date) return false;
        const d = new Date(g.delivery_date);
        return d >= start && d <= end;
      });
    } else if (filter === "last_month") {
      const { start, end } = getMonthRange(-1);
      list = list.filter((g) => {
        if (!g.delivery_date) return false;
        const d = new Date(g.delivery_date);
        return d >= start && d <= end;
      });
    } else if (filter === "this_year") {
      const year = new Date().getFullYear();
      list = list.filter((g) => {
        if (!g.delivery_date) return false;
        return new Date(g.delivery_date).getFullYear() === year;
      });
    }

    if (sort === "delivery_date") {
      list.sort((a, b) => {
        if (!a.delivery_date && !b.delivery_date) return 0;
        if (!a.delivery_date) return 1;
        if (!b.delivery_date) return -1;
        return new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime();
      });
    } else if (sort === "amount") {
      list.sort((a, b) => b.amount_sar - a.amount_sar);
    } else if (sort === "status") {
      const order = ["overdue", "in_progress", "delivered", "deposit_paid", "pending", "paid", "cancelled"];
      list.sort((a, b) => (order.indexOf(a.status) - order.indexOf(b.status)));
    }

    return list;
  }, [gigs, filter, sort]);

  // Board stat band + monthly bars (Wahaj DC income screen), computed from gigs.
  const stats = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const sameMonth = (d: Date, off: number) => {
      const t = new Date(y, now.getMonth() + off, 1);
      return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth();
    };
    let thisMonth = 0, lastMonth = 0, thisYear = 0, yearCount = 0;
    const monthly = Array(6).fill(0) as number[];
    for (const g of gigs) {
      if (!g.delivery_date) continue;
      const d = new Date(g.delivery_date);
      const amt = g.amount_sar || 0;
      if (sameMonth(d, 0)) thisMonth += amt;
      if (sameMonth(d, -1)) lastMonth += amt;
      if (d.getFullYear() === y) { thisYear += amt; yearCount++; }
      for (let i = 0; i < 6; i++) if (sameMonth(d, -(5 - i))) monthly[i] += amt;
    }
    const monthFmt = new Intl.DateTimeFormat(isAr ? "ar-SA-u-ca-gregory" : "en-US", { month: "short" });
    const labels = Array.from({ length: 6 }, (_, i) => monthFmt.format(new Date(y, now.getMonth() - (5 - i), 1)));
    const avg = Math.round(thisYear / (now.getMonth() + 1));
    const changePct = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;
    const max = Math.max(1, ...monthly);
    return { thisMonth, thisYear, avg, yearCount, monthly, labels, changePct, max, year: y };
  }, [gigs, isAr]);

  const chips: Array<{ key: FilterChip; label: string }> = [
    { key: "all", label: t("filterAll") },
    { key: "paid", label: t("filterPaid") },
    { key: "pending", label: t("filterPending") },
    { key: "this_month", label: t("filterThisMonth") },
    { key: "last_month", label: t("filterLastMonth") },
    { key: "this_year", label: t("filterThisYear") },
  ];

  const sorts: Array<{ key: SortKey; label: string }> = [
    { key: "delivery_date", label: t("sortDeliveryDate") },
    { key: "amount", label: t("sortAmount") },
    { key: "status", label: t("sortStatus") },
  ];

  function handleExportCsv() {
    setCsvState("loading");
    startCsvTransition(async () => {
      try {
        const result = await exportIncomeCsv();
        if (!result.ok) {
          if (result.code === "upgrade") {
            setCsvState("upgrade");
            setUpgradeReason("ai_feature");
            setShowUpgradeModal(true);
          } else {
            setCsvState("error");
          }
          return;
        }
        // Trigger browser download
        const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = result.filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        setCsvState("idle");
      } catch {
        setCsvState("error");
      }
    });
  }

  function handleGenerateForecast() {
    setForecast({ status: "loading" });
    startTransition(async () => {
      try {
        const result = await forecastIncomeAction();
        if (!result.ok) {
          if (result.code === "upgrade") {
            setForecast({ status: "upgrade" });
            setUpgradeReason("ai_feature");
            setShowUpgradeModal(true);
          } else {
            setForecast({ status: "error" });
          }
          return;
        }
        setForecast({
          status: "done",
          narrative_ar: result.narrative_ar,
          narrative_en: result.narrative_en,
          factors_ar: result.factors_ar,
          factors_en: result.factors_en,
          current_month_projection: result.current_month_projection,
          next_month_projection: result.next_month_projection,
          confidence_low: result.confidence_low,
          confidence_high: result.confidence_high,
        });
      } catch {
        setForecast({ status: "error" });
      }
    });
  }

  return (
    <>
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        locale={locale}
        reason={upgradeReason}
      />
    <div className="space-y-4 pb-20">
      {/* ── Board stat band + monthly bars (Wahaj DC income screen) ───────── */}
      <section dir={dir} className="space-y-[18px]">
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
          <div className="nm-raised rounded-[20px] bg-[var(--raised)] p-5">
            <div className={`mb-2 text-[11px] font-medium text-[var(--content-muted)] ${font}`}>{isAr ? "دخل هذا الشهر" : "This month"}</div>
            <div className="flex items-baseline gap-1.5">
              <span className="aurora-text tabular font-sans text-[34px] font-bold leading-none">
                <AnimatedNumber value={stats.thisMonth} locale={locale} duration={1.1} />
              </span>
              <span className={`text-xs text-[var(--content-muted)] ${font}`}>{isAr ? "ريال" : "SAR"}</span>
            </div>
            {stats.changePct !== null && (
              <div className={`mt-1 text-[10px] text-[var(--acc)] ${font}`}>
                {stats.changePct >= 0 ? "+" : ""}{stats.changePct}% {isAr ? "عن الشهر الماضي" : "vs last month"}
              </div>
            )}
          </div>
          <div className="nm-raised rounded-[20px] bg-[var(--raised)] p-5">
            <div className={`mb-2 text-[11px] font-medium text-[var(--content-muted)] ${font}`}>{isAr ? "دخل هذا العام" : "This year"}</div>
            <div className="flex items-baseline gap-1.5">
              <span className="tabular font-sans text-[34px] font-bold leading-none text-[var(--content)]">
                <AnimatedNumber value={stats.thisYear} locale={locale} duration={1.1} />
              </span>
              <span className={`text-xs text-[var(--content-muted)] ${font}`}>{isAr ? "ريال" : "SAR"}</span>
            </div>
            <div className={`mt-1 text-[10px] text-[var(--content-faint)] ${font}`}>{fmtPrice(stats.yearCount, locale)} {isAr ? "عملًا" : "gigs"}</div>
          </div>
          <div className="nm-raised rounded-[20px] bg-[var(--raised)] p-5">
            <div className={`mb-2 text-[11px] font-medium text-[var(--content-muted)] ${font}`}>{isAr ? "المتوسّط الشهريّ" : "Monthly average"}</div>
            <div className="flex items-baseline gap-1.5">
              <span className="tabular font-sans text-[34px] font-bold leading-none text-[var(--content)]">
                <AnimatedNumber value={stats.avg} locale={locale} duration={1.1} />
              </span>
              <span className={`text-xs text-[var(--content-muted)] ${font}`}>{isAr ? "ريال" : "SAR"}</span>
            </div>
            <div className={`mt-1 text-[10px] text-[var(--content-faint)] ${font}`}>{isAr ? "هذا العام" : "this year"}</div>
          </div>
        </div>
        <div className="nm-raised rounded-[20px] bg-[var(--raised)] px-[22px] py-5">
          <div className={`mb-4 text-xs font-semibold text-[var(--content)] ${font}`}>
            {isAr ? "الدخل الشهريّ" : "Monthly income"} · {stats.year}
          </div>
          <div className="flex h-[150px] items-end gap-3.5">
            {stats.monthly.map((v, i) => {
              const h = Math.max(4, Math.round((v / stats.max) * 100));
              const latest = i === stats.monthly.length - 1;
              return (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div
                    className="w-full rounded-t-lg transition-[height] duration-700"
                    style={{
                      height: `${h}%`,
                      background: latest ? "var(--fill)" : "var(--track)",
                      boxShadow: latest ? "0 0 22px -4px rgba(52,230,168,.6)" : "none",
                    }}
                  />
                  <span className={`text-[9px] ${latest ? "font-semibold text-[var(--acc)]" : "text-[var(--content-faint)]"} ${font}`}>
                    {stats.labels[i]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Filter chips */}
      <div dir={dir} className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setFilter(c.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
              filter === c.key
                ? "aurora-fill"
                : "nm-raised-sm bg-[var(--raised)] text-[var(--content-2)] hover:text-[var(--acc)]"
            } ${font}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div dir={dir} className={`flex items-center gap-2 ${font}`}>
        <span className="text-xs text-rizq-ink-soft/60">{t("sortLabel")}</span>
        <select
          value={sort}
          aria-label={t("sortLabel")}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className={`rounded-lg border border-rizq-gold/30 bg-rizq-cream/60 px-3 py-1.5 text-sm text-rizq-ink focus:outline-none focus-visible:ring-1 focus-visible:ring-rizq-green/40 focus:border-rizq-green transition-colors appearance-none ${font}`}
        >
          {sorts.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* ── CSV Export (Pro) ──────────────────────────────────────────────── */}
      <div dir={dir} className={`flex flex-wrap items-center gap-3 ${font}`}>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={csvState === "loading"}
          className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-2 text-sm font-medium text-rizq-ink-soft hover:border-rizq-green/40 hover:text-rizq-green transition-all disabled:opacity-60 ${font}`}
        >
          {csvState === "loading" ? (
            <><Loader2 size={14} className="animate-spin" /> {isAr ? "جارٍ التصدير…" : "Exporting…"}</>
          ) : (
            <><Download size={14} /> {isAr ? "تصدير CSV (احترافي)" : "Export CSV (Pro)"}</>
          )}
        </button>
        {csvState === "upgrade" && (
          <p className={`text-sm text-[var(--warn)] ${font}`}>
            {tAi("upgradeHint")}
          </p>
        )}
        {csvState === "error" && (
          <p className={`text-sm text-[var(--over)] ${font}`}>
            {isAr ? "حدث خطأ. حاول مرة أخرى." : "Something went wrong. Try again."}
          </p>
        )}
      </div>

      {/* ── AI Forecast section ─────────────────────────────────────────── */}
      <div dir={dir} className={`rounded-2xl border border-rizq-gold/20 bg-[var(--panel)] px-5 py-4 space-y-3 ${font}`}>
        {/* Generate button */}
        {(forecast.status === "idle" || forecast.status === "error") && (
          <button
            type="button"
            onClick={handleGenerateForecast}
            className={`inline-flex items-center gap-2 rounded-full border border-rizq-green/40 bg-rizq-green/8 px-4 py-2 text-sm font-medium text-rizq-green hover:bg-rizq-green/15 transition-colors ${font}`}
          >
            {forecast.status === "error"
              ? (isAr ? "أعد المحاولة" : "Try again")
              : (isAr ? tAi("generateForecast") : tAi("generateForecast"))}
          </button>
        )}

        {/* Loading */}
        {forecast.status === "loading" && (
          <div className={`flex items-center gap-2 text-sm text-rizq-ink-soft ${font}`}>
            <Loader2 size={14} className="animate-spin text-rizq-green" />
            <span>{isAr ? "جارٍ توليد الإسقاط…" : "Generating forecast…"}</span>
          </div>
        )}

        {/* Upgrade hint */}
        {forecast.status === "upgrade" && (
          <p className={`text-sm text-[var(--warn)] ${font}`}>
            {tAi("upgradeHint")}
          </p>
        )}

        {/* Forecast result */}
        {forecast.status === "done" && (
          <div className="space-y-3">
            {/* Projection numbers */}
            <div dir={dir} className="flex flex-wrap gap-4">
              <div>
                <p className="text-xs text-rizq-ink-soft/60 mb-0.5">
                  {isAr ? "هذا الشهر (متوقع)" : "This month (projected)"}
                </p>
                <p className="tabular font-sans text-base font-semibold text-rizq-green">
                  {fmtPrice(forecast.current_month_projection, locale)}{" "}
                  <span className={`text-xs text-rizq-ink-soft/60 font-normal ${font}`}>
                    {isAr ? "ريال" : "SAR"}
                  </span>
                </p>
                <p className="text-xs text-rizq-ink-soft/50">
                  {fmtPrice(forecast.confidence_low, locale)} {locale === "ar" ? "إلى" : "to"} {fmtPrice(forecast.confidence_high, locale)}
                </p>
              </div>
              <div>
                <p className="text-xs text-rizq-ink-soft/60 mb-0.5">
                  {isAr ? "الشهر القادم (متوقع)" : "Next month (projected)"}
                </p>
                <p className="tabular font-sans text-base font-semibold text-rizq-ink">
                  {fmtPrice(forecast.next_month_projection, locale)}{" "}
                  <span className={`text-xs text-rizq-ink-soft/60 font-normal ${font}`}>
                    {isAr ? "ريال" : "SAR"}
                  </span>
                </p>
              </div>
            </div>

            {/* Narrative */}
            <div className={`rounded-xl bg-rizq-green/5 border border-rizq-green/15 px-4 py-3 space-y-1 ${font}`}>
              <p className="text-xs text-rizq-green/70 font-medium uppercase tracking-wide">
                {tAi("forecastNarrativeLabel")}
              </p>
              <p className={`text-sm text-rizq-ink leading-relaxed ${font}`}>
                {isAr ? forecast.narrative_ar : forecast.narrative_en}
              </p>
              {/* Factor bullets */}
              {(isAr ? forecast.factors_ar : forecast.factors_en).length > 0 && (
                <ul className={`mt-2 space-y-0.5 ${font}`}>
                  {(isAr ? forecast.factors_ar : forecast.factors_en).map((f, i) => (
                    <li key={i} className="text-xs text-rizq-ink-soft flex items-start gap-1.5">
                      <span className="text-rizq-green mt-0.5">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Re-generate button */}
            <button
              type="button"
              onClick={handleGenerateForecast}
              className={`text-xs text-rizq-ink-soft/50 hover:text-rizq-green transition-colors ${font}`}
            >
              {isAr ? "تحديث" : "Refresh"}
            </button>
          </div>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className={`text-sm text-rizq-ink-soft/70 py-8 text-center ${font}`}>{t("noResults")}</p>
      ) : (
        <MotionList className="space-y-3">
          {filtered.map((gig) => (
            <MotionItem key={gig.id}>
              {/* Status quick-edit replaces the card's static status badge in-place. */}
              <GigCard
                gig={gig}
                locale={locale}
                statusSlot={<GigStatusQuickEdit gigId={gig.id} current={gig.status} locale={locale} />}
              />
            </MotionItem>
          ))}
        </MotionList>
      )}

    </div>
    </>
  );
}
