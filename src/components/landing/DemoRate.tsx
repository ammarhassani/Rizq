"use client";

import { useId, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { calculateRate, type MarketBand } from "@/lib/rate/calculate";
import { AnimatedNumber } from "@/components/tool/AnimatedNumber";

type Props = { locale: "ar" | "en" };

const MIN_TARGET = 3000;
const MAX_TARGET = 30000;
const STEP = 500;
const DEFAULT_TARGET = 12000;

/**
 * Representative per-project market band for the demo only (mid-tier Saudi
 * specialty). The pricing logic itself is REAL — this band stands in for what
 * `resolvePrice` would return in the live tool. min -> anchor -> max maps to
 * the 10th / 50th / 90th percentile landmarks inside calculate.ts.
 */
const SEEDED_BAND: MarketBand = {
  min: 1500,
  anchor: 3500,
  max: 6500,
  sample_size: 47,
};

// Fixed working assumptions for the demo (matches the brief).
const WORKING_DAYS = 22;
const HOURS_PER_DAY = 6;
const PROJECTS_PER_MONTH = 4;

export function DemoRate({ locale }: Props) {
  const t = useTranslations("Landing");
  const reduce = useReducedMotion();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const sliderId = useId();

  const [target, setTarget] = useState(DEFAULT_TARGET);

  // REAL pure calculator — same function the live rate tool uses.
  const result = useMemo(
    () =>
      calculateRate(
        {
          monthly_target_sar: target,
          working_days_per_month: WORKING_DAYS,
          hours_per_day: HOURS_PER_DAY,
          projects_per_month_target: PROJECTS_PER_MONTH,
        },
        SEEDED_BAND
      ),
    [target]
  );

  const nf = new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  });
  const currency = t("demos.rateCurrency");

  const perProject = result.per_project_rate ?? SEEDED_BAND.anchor;
  const percentile = result.market_percentile ?? 50;
  const topPercent = Math.max(1, 100 - percentile); // "top X%"
  const realistic = result.is_realistic !== false;

  // Marker position: where the per-project rate sits within [min..max] of the
  // band, clamped to the visible track (6%..94% so the dot never clips).
  const { min, max } = SEEDED_BAND;
  const rawPct = max > min ? ((perProject - min) / (max - min)) * 100 : 50;
  const markerPct = Math.min(94, Math.max(6, rawPct));

  const figures: { labelKey: string; value: number }[] = [
    { labelKey: "demos.rateHourly", value: result.hourly_rate },
    { labelKey: "demos.rateDaily", value: result.daily_rate },
    { labelKey: "demos.ratePerProject", value: perProject },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Slider control */}
      <div className="flex flex-col gap-2.5">
        <label
          htmlFor={sliderId}
          className={`flex items-baseline justify-between gap-3 text-sm font-medium text-rizq-ink ${font}`}
        >
          <span>{t("demos.rateTargetLabel")}</span>
          <span className="tabular text-rizq-green font-semibold" aria-hidden>
            {nf.format(target)} {currency}
          </span>
        </label>
        <input
          id={sliderId}
          type="range"
          min={MIN_TARGET}
          max={MAX_TARGET}
          step={STEP}
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          aria-label={t("demos.rateTargetLabel")}
          aria-valuetext={`${nf.format(target)} ${currency}`}
          className="w-full h-2 cursor-pointer appearance-none rounded-full bg-rizq-green/15 accent-rizq-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green focus-visible:ring-offset-2"
        />
      </div>

      {/* Hero result panel — mirrors the real ResultCard */}
      <div className="card-wahaj-sm p-5">
        {/* Big anchor number */}
        <div className="flex flex-col items-center text-center">
          <span className={`text-[0.7rem] tracking-[0.16em] uppercase text-rizq-gold-deep ${font}`}>
            {t("demos.rateAnchorLabel")}
          </span>
          <span className="mt-1 tabular font-sans text-4xl sm:text-5xl font-bold text-rizq-green leading-none">
            <AnimatedNumber value={perProject} duration={0.7} locale={locale} />
          </span>
          <span className={`mt-1 text-[0.7rem] tracking-wider uppercase text-rizq-ink-soft/70 ${font}`}>
            {currency}
          </span>
        </div>

        {/* Range bar: min — marker — max */}
        <div className="mt-5">
          <div className="relative h-2 rounded-full bg-rizq-gold/15">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-gradient-to-r from-rizq-gold/25 via-rizq-green/35 to-rizq-gold/25"
            />
            {/* Animated marker */}
            {reduce ? (
              <span
                aria-hidden
                className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rizq-green shadow-[0_0_0_3px_rgba(250,245,236,0.95)]"
                style={{ insetInlineStart: `${markerPct}%` }}
              />
            ) : (
              <motion.span
                aria-hidden
                className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rizq-green shadow-[0_0_0_3px_rgba(250,245,236,0.95)]"
                initial={false}
                animate={{ insetInlineStart: `${markerPct}%` }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
              >
                {/* gentle live pulse ring */}
                <motion.span
                  className="absolute inset-0 rounded-full bg-rizq-green/40"
                  animate={{ scale: [1, 2.4, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                />
              </motion.span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-[0.7rem] text-rizq-ink-soft/70 tabular ${font}`}>
              {t("demos.rateRangeMin")} · {nf.format(min)}
            </span>
            <span className={`text-[0.7rem] text-rizq-ink-soft/70 tabular ${font}`}>
              {nf.format(max)} · {t("demos.rateRangeMax")}
            </span>
          </div>
        </div>

        {/* "Top X% of the market" pill */}
        <div className="mt-4 flex justify-center" aria-live="polite">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${font} ${
              realistic
                ? "border-rizq-green/30 bg-rizq-green/10 text-rizq-green"
                : "border-rizq-gold/40 bg-rizq-gold/10 text-rizq-gold-deep"
            }`}
          >
            <span aria-hidden>{realistic ? "▲" : "!"}</span>
            <span>{t("demos.ratePercentile", { percent: nf.format(topPercent) })}</span>
          </span>
        </div>
      </div>

      {/* Three computed figures */}
      <div className="grid grid-cols-3 gap-2.5">
        {figures.map(({ labelKey, value }) => (
          <div
            key={labelKey}
            className="flex flex-col items-center gap-1 rounded-xl border border-rizq-gold/20 bg-white px-2 py-2.5 text-center"
          >
            <span className="text-base sm:text-lg font-bold text-rizq-ink tabular leading-none">
              <AnimatedNumber value={value} duration={0.6} locale={locale} />
            </span>
            <span className={`text-[0.65rem] text-rizq-ink-soft leading-tight ${font}`}>
              {t(labelKey)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
