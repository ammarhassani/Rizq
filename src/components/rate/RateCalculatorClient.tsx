"use client";

/**
 * RateCalculatorClient — spec M10.
 * Client-side form + results for the rate calculator.
 * On change: calls computeRateAction (server action) → shows rate math.
 * AI button: calls getRatePositioningAction → shows labeled narrative.
 * Save button: calls saveRateDefaultsAction.
 */

import { useState, useTransition, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Loader2, TrendingUp, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { computeRateAction } from "@/app/actions/rate/computeRate";
import {
  getRatePositioningAction,
  saveRateDefaultsAction,
} from "@/app/actions/rate/getRatePositioning";
import { Combobox } from "@/components/ui/Combobox";
import { BandMeter } from "@/components/charts/BandMeter";
import type { RateCalculatorOutput, MarketBand } from "@/lib/rate/calculate";
import type { RatePositioning } from "@/lib/ai/ratePositioning";
import type {
  SpecialtyOption,
  CityOption,
  TierOption,
  RateDefaults,
} from "@/app/[locale]/rate-calculator/page";

type Props = {
  locale: "ar" | "en";
  specialties: SpecialtyOption[];
  cities: CityOption[];
  tiers: TierOption[];
  defaults: RateDefaults;
  avg3moIncome: number | null;
};

function fmtSAR(n: number, locale: "ar" | "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtInt(n: number, locale: "ar" | "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  }).format(n);
}

export function RateCalculatorClient({
  locale,
  specialties,
  cities,
  tiers,
  defaults,
  avg3moIncome,
}: Props) {
  const t = useTranslations("RateCalculator");
  const tCommon = useTranslations("Common");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  // ── Form state ─────────────────────────────────────────────────────────────
  const [monthlyTarget, setMonthlyTarget] = useState(
    defaults.monthly_target_sar?.toString() ?? ""
  );
  const [workingDays, setWorkingDays] = useState(
    defaults.working_days_per_month.toString()
  );
  const [hoursPerDay, setHoursPerDay] = useState(
    defaults.hours_per_day.toString()
  );
  const [projectsPerMonth, setProjectsPerMonth] = useState(
    defaults.projects_per_month_target?.toString() ?? ""
  );
  const [specialtyId, setSpecialtyId] = useState(defaults.specialty_id ?? "");
  const [cityId, setCityId] = useState(defaults.city_id ?? "");
  const [tierId, setTierId] = useState(defaults.experience_tier_id ?? "");

  // ── Results state ──────────────────────────────────────────────────────────
  const [output, setOutput] = useState<RateCalculatorOutput | null>(null);
  const [market, setMarket] = useState<MarketBand | null>(null);
  const [marketUnavailable, setMarketUnavailable] = useState(false);

  // ── AI state ───────────────────────────────────────────────────────────────
  const [aiNarrative, setAiNarrative] = useState<RatePositioning | null>(null);
  const [aiError, setAiError] = useState(false);

  // ── Save state ─────────────────────────────────────────────────────────────
  const [savedMsg, setSavedMsg] = useState<"ok" | "error" | null>(null);

  // ── Transitions ────────────────────────────────────────────────────────────
  const [isCalculating, startCalculating] = useTransition();
  const [isAiLoading, startAi] = useTransition();
  const [isSaving, startSaving] = useTransition();

  // Resolve slug from id for actions
  function specialtySlug(): string {
    return specialties.find((s) => s.id === specialtyId)?.slug ?? "";
  }
  function citySlug(): string {
    return cities.find((c) => c.id === cityId)?.slug ?? "";
  }
  function tierSlug(): string {
    return tiers.find((t) => t.id === tierId)?.slug ?? "";
  }

  const handleCalculate = useCallback(() => {
    const mt = parseFloat(monthlyTarget);
    const wd = parseInt(workingDays, 10);
    const hpd = parseInt(hoursPerDay, 10);
    const ppm = parseInt(projectsPerMonth, 10) || 0;

    if (!Number.isFinite(mt) || mt <= 0) return;
    if (!Number.isFinite(wd) || wd <= 0) return;
    if (!Number.isFinite(hpd) || hpd <= 0) return;

    setAiNarrative(null);
    setAiError(false);
    setSavedMsg(null);

    startCalculating(async () => {
      const result = await computeRateAction({
        monthly_target_sar: mt,
        working_days_per_month: wd,
        hours_per_day: hpd,
        projects_per_month_target: ppm,
        specialty_slug: specialtySlug(),
        city_slug: citySlug(),
        experience_tier_slug: tierSlug(),
      });

      if (result.ok) {
        setOutput(result.output);
        setMarket(result.market);
        setMarketUnavailable(result.market_unavailable);
      }
    });
  }, [monthlyTarget, workingDays, hoursPerDay, projectsPerMonth, specialtyId, cityId, tierId]);

  const handleAiAnalysis = useCallback(() => {
    if (!output?.per_project_rate) return;
    setAiError(false);

    startAi(async () => {
      const result = await getRatePositioningAction({
        target_rate: output.per_project_rate ?? 0,
        specialty_slug: specialtySlug(),
        city_slug: citySlug(),
        experience_tier_slug: tierSlug(),
      });

      if (result.ok) {
        setAiNarrative(result.narrative);
      } else {
        setAiError(true);
      }
    });
  }, [output, specialtyId, cityId, tierId]);

  const handleSave = useCallback(() => {
    setSavedMsg(null);
    startSaving(async () => {
      const result = await saveRateDefaultsAction({
        monthly_target_sar: parseFloat(monthlyTarget) || null,
        working_days_per_month: parseInt(workingDays, 10) || 22,
        hours_per_day: parseInt(hoursPerDay, 10) || 6,
        projects_per_month_target: parseInt(projectsPerMonth, 10) || null,
        specialty_id: specialtyId || null,
        city_id: cityId || null,
        experience_tier_id: tierId || null,
      });
      setSavedMsg(result.ok ? "ok" : "error");
    });
  }, [monthlyTarget, workingDays, hoursPerDay, projectsPerMonth, specialtyId, cityId, tierId]);

  const inputClass = `w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream px-4 py-3 text-sm text-rizq-ink placeholder:text-rizq-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-rizq-green/30 tabular-nums ${font}`;
  const labelClass = `block text-xs font-medium text-rizq-ink-soft mb-1.5 ${font}`;

  return (
    <div className="space-y-6">
      {/* ── 3mo income calibration note ──────────────────────────────────── */}
      {avg3moIncome != null && (
        <div className="rounded-2xl border border-rizq-gold/20 bg-rizq-cream/60 px-4 py-3 text-sm text-rizq-ink-soft">
          {t("currentEarningNote", { avg: fmtSAR(avg3moIncome, locale) })}
        </div>
      )}

      {/* ── Inputs ────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-rizq-gold/20 bg-white/70 p-6 space-y-5">
        <h2 className={`text-base font-semibold text-rizq-ink ${font}`}>
          {t("inputsTitle")}
        </h2>

        {/* Monthly target */}
        <div>
          <label className={labelClass}>{t("monthlyTargetLabel")}</label>
          <input
            type="number"
            min={0}
            step={500}
            value={monthlyTarget}
            onChange={(e) => setMonthlyTarget(e.target.value)}
            placeholder={t("monthlyTargetPlaceholder")}
            className={inputClass}
          />
        </div>

        {/* Working days + hours in a row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{t("workingDaysLabel")}</label>
            <input
              type="number"
              min={1}
              max={31}
              value={workingDays}
              onChange={(e) => setWorkingDays(e.target.value)}
              placeholder={t("workingDaysPlaceholder")}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t("hoursPerDayLabel")}</label>
            <input
              type="number"
              min={1}
              max={24}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(e.target.value)}
              placeholder={t("hoursPerDayPlaceholder")}
              className={inputClass}
            />
          </div>
        </div>

        {/* Projects per month */}
        <div>
          <label className={labelClass}>{t("projectsPerMonthLabel")}</label>
          <input
            type="number"
            min={0}
            step={1}
            value={projectsPerMonth}
            onChange={(e) => setProjectsPerMonth(e.target.value)}
            placeholder={t("projectsPerMonthPlaceholder")}
            className={inputClass}
          />
        </div>

        {/* Specialty select */}
        <div>
          <label className={labelClass}>{t("specialtyLabel")}</label>
          <Combobox
            locale={locale}
            value={specialtyId || null}
            onChange={(v) => setSpecialtyId(v ?? "")}
            options={specialties.map((s) => ({
              value: s.id,
              label: isAr ? s.name_ar : s.name_en,
            }))}
            placeholder={t("specialtyPlaceholder")}
            searchPlaceholder={tCommon("combobox.searchPlaceholder")}
            emptyText={tCommon("combobox.noResults")}
            allowClear
          />
        </div>

        {/* City + Tier selects */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{t("cityLabel")}</label>
            <Combobox
              locale={locale}
              value={cityId || null}
              onChange={(v) => setCityId(v ?? "")}
              options={cities.map((c) => ({
                value: c.id,
                label: isAr ? c.name_ar : c.name_en,
              }))}
              placeholder={t("cityPlaceholder")}
              searchPlaceholder={tCommon("combobox.searchPlaceholder")}
              emptyText={tCommon("combobox.noResults")}
              allowClear
            />
          </div>
          <div>
            <label className={labelClass}>{t("tierLabel")}</label>
            <Combobox
              locale={locale}
              value={tierId || null}
              onChange={(v) => setTierId(v ?? "")}
              options={tiers.map((tr) => ({
                value: tr.id,
                label: isAr ? tr.name_ar : tr.name_en,
              }))}
              placeholder={t("tierPlaceholder")}
              searchPlaceholder={tCommon("combobox.searchPlaceholder")}
              emptyText={tCommon("combobox.noResults")}
              allowClear
            />
          </div>
        </div>

        {/* Calculate button */}
        <button
          type="button"
          disabled={isCalculating || !monthlyTarget}
          onClick={handleCalculate}
          className={`w-full flex items-center justify-center gap-2 rounded-xl bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium transition-colors hover:bg-rizq-green-dark disabled:opacity-60 ${font}`}
        >
          {isCalculating && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("calculateButton")}
        </button>
      </div>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {output && (
        <div className="space-y-4">
          {/* Market unavailable notice */}
          {marketUnavailable && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className={font}>{t("marketUnavailable")}</span>
            </div>
          )}

          {/* Rate cards */}
          <div className="rounded-2xl border border-rizq-gold/20 bg-white/70 p-6">
            <h2 className={`text-base font-semibold text-rizq-ink mb-5 ${font}`}>
              {t("resultsTitle")}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Hourly */}
              <div className="rounded-xl bg-rizq-cream/80 border border-rizq-gold/20 p-4 text-center">
                <p className={`text-xs text-rizq-ink-soft mb-1 ${font}`}>
                  {t("hourlyRateLabel")}
                </p>
                <p className="text-2xl font-bold tabular-nums text-rizq-green">
                  {fmtSAR(output.hourly_rate, locale)}
                </p>
                <p className={`text-xs text-rizq-ink-soft mt-0.5 ${font}`}>
                  {t("perHour")}
                </p>
              </div>

              {/* Daily */}
              <div className="rounded-xl bg-rizq-cream/80 border border-rizq-gold/20 p-4 text-center">
                <p className={`text-xs text-rizq-ink-soft mb-1 ${font}`}>
                  {t("dailyRateLabel")}
                </p>
                <p className="text-2xl font-bold tabular-nums text-rizq-green">
                  {fmtSAR(output.daily_rate, locale)}
                </p>
                <p className={`text-xs text-rizq-ink-soft mt-0.5 ${font}`}>
                  {t("perDay")}
                </p>
              </div>

              {/* Per project */}
              <div className="rounded-xl bg-rizq-cream/80 border border-rizq-gold/20 p-4 text-center">
                <p className={`text-xs text-rizq-ink-soft mb-1 ${font}`}>
                  {t("perProjectRateLabel")}
                </p>
                {output.per_project_rate != null ? (
                  <>
                    <p className="text-2xl font-bold tabular-nums text-rizq-green">
                      {fmtSAR(output.per_project_rate, locale)}
                    </p>
                    <p className={`text-xs text-rizq-ink-soft mt-0.5 ${font}`}>
                      {t("perProject")}
                    </p>
                  </>
                ) : (
                  <p className={`text-xs text-rizq-ink-soft mt-2 ${font}`}>
                    {t("noPerProjectNote")}
                  </p>
                )}
              </div>
            </div>

            {/* Projects needed at market anchor */}
            {output.projects_needed_per_month != null && market && (
              <div className="mt-4 rounded-xl bg-rizq-cream/50 border border-rizq-gold/15 px-4 py-3 flex items-center justify-between gap-2">
                <span className={`text-xs text-rizq-ink-soft ${font}`}>
                  {t("projectsNeededLabel")}
                </span>
                <span className="text-sm font-semibold tabular-nums text-rizq-ink">
                  {fmtInt(output.projects_needed_per_month, locale)}
                </span>
              </div>
            )}

            {/* Sample size */}
            {market && (
              <p className={`text-xs text-rizq-ink-soft mt-3 ${font}`}>
                {t("sampleSizeNote", { n: fmtInt(market.sample_size, locale) })}
              </p>
            )}
          </div>

          {/* Market band meter — where the user's rate sits min→max */}
          {market && (market.min > 0 || market.max > 0) && (
            <div className="rounded-2xl border border-rizq-gold/20 bg-white/70 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-rizq-green" />
                <span className={`text-sm font-medium text-rizq-ink ${font}`}>
                  {t("marketBandLabel")}
                </span>
              </div>
              <BandMeter
                min={market.min}
                anchor={market.anchor}
                max={market.max}
                value={output.per_project_rate}
                locale={locale}
              />
            </div>
          )}

          {/* Market percentile bar */}
          {output.market_percentile != null && (
            <div className="rounded-2xl border border-rizq-gold/20 bg-white/70 p-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-rizq-green" />
                <span className={`text-sm font-medium text-rizq-ink ${font}`}>
                  {t("marketPercentileLabel")}
                </span>
              </div>

              {/* Bar */}
              <div className="relative h-3 rounded-full bg-rizq-cream border border-rizq-gold/20 overflow-hidden mb-2">
                <div
                  className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-e from-rizq-green to-rizq-gold transition-all duration-500"
                  style={{ width: `${output.market_percentile}%` }}
                />
              </div>

              <div className={`flex justify-between text-xs text-rizq-ink-soft ${font}`}>
                <span>P10</span>
                <span className="font-medium text-rizq-ink">
                  {output.market_percentile}%
                </span>
                <span>P90</span>
              </div>

              {/* Context message */}
              <p className={`mt-3 text-sm text-rizq-ink leading-relaxed ${font}`}>
                {isAr ? output.market_context_ar : output.market_context_en}
              </p>
            </div>
          )}

          {/* is_realistic banner */}
          {output.is_realistic != null && (
            <div
              className={`rounded-2xl border p-4 flex items-start gap-3 ${
                output.is_realistic
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              {output.is_realistic ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className={`text-sm font-medium ${
                    output.is_realistic ? "text-emerald-800" : "text-amber-800"
                  } ${font}`}
                >
                  {output.is_realistic
                    ? t("realisticBannerTitle")
                    : t("notRealisticBannerTitle")}
                </p>
                <p
                  className={`text-xs mt-0.5 ${
                    output.is_realistic ? "text-emerald-700" : "text-amber-700"
                  } ${font}`}
                >
                  {output.is_realistic
                    ? t("realisticBannerBody")
                    : t("notRealisticBannerBody")}
                </p>
              </div>
            </div>
          )}

          {/* Rule-based suggestion */}
          <div className="rounded-2xl border border-rizq-gold/20 bg-white/70 px-5 py-4 text-sm text-rizq-ink leading-relaxed">
            {isAr ? output.suggestion_ar : output.suggestion_en}
          </div>

          {/* AI positioning narrative */}
          <div className="rounded-2xl border border-rizq-green/20 bg-rizq-green/5 p-5">
            {!aiNarrative && !isAiLoading && (
              <button
                type="button"
                disabled={isAiLoading || !output.per_project_rate}
                onClick={handleAiAnalysis}
                className={`w-full flex items-center justify-center gap-2 rounded-xl border border-rizq-green/30 bg-white/60 text-rizq-green px-5 py-3 text-sm font-medium hover:bg-rizq-green/5 transition-colors disabled:opacity-60 ${font}`}
              >
                <Sparkles className="h-4 w-4" />
                {t("aiAnalysisButton")}
              </button>
            )}

            {isAiLoading && (
              <div className="flex items-center justify-center gap-2 text-sm text-rizq-ink-soft py-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className={font}>{t("aiAnalysisLoading")}</span>
              </div>
            )}

            {aiError && !isAiLoading && (
              <p className={`text-sm text-red-600 ${font}`}>{t("aiAnalysisError")}</p>
            )}

            {aiNarrative && !isAiLoading && (
              <div className="space-y-2">
                <p className={`text-xs font-semibold text-rizq-green uppercase tracking-wider ${font}`}>
                  {t("aiAnalysisLabel")}
                </p>
                <p className={`text-sm text-rizq-ink leading-relaxed ${font}`}>
                  {isAr ? aiNarrative.ar : aiNarrative.en}
                </p>
                <button
                  type="button"
                  disabled={isAiLoading}
                  onClick={handleAiAnalysis}
                  className={`mt-2 text-xs text-rizq-ink-soft hover:text-rizq-green underline underline-offset-2 transition-colors ${font}`}
                >
                  {t("aiAnalysisButton")}
                </button>
              </div>
            )}
          </div>

          {/* Save defaults */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className={`inline-flex items-center gap-2 rounded-xl border border-rizq-gold/30 bg-white/70 text-rizq-ink px-5 py-2.5 text-sm hover:bg-rizq-cream/80 transition-colors disabled:opacity-60 ${font}`}
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isSaving ? t("saveDefaultsLoading") : t("saveDefaultsButton")}
            </button>

            {savedMsg === "ok" && (
              <span className={`text-sm text-emerald-600 ${font}`}>
                {t("saveDefaultsSuccess")}
              </span>
            )}
            {savedMsg === "error" && (
              <span className={`text-sm text-red-600 ${font}`}>
                {t("saveDefaultsError")}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
