"use client";

import { useId, useMemo, useState } from "react";
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
  const currency = isAr ? "ريال" : "SAR";

  const figures: { labelKey: string; value: number }[] = [
    { labelKey: "demos.rateHourly", value: result.hourly_rate },
    { labelKey: "demos.rateDaily", value: result.daily_rate },
    { labelKey: "demos.ratePerProject", value: result.per_project_rate ?? 0 },
  ];

  // is_realistic is true when the per-project rate sits within the market band
  // (percentile <= 90). null only when there's no band/per-project rate, which
  // can't happen here — but we guard anyway.
  const realistic = result.is_realistic !== false;

  return (
    <div className="flex flex-col gap-6">
      {/* Slider control */}
      <div className="flex flex-col gap-3">
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

      {/* Three computed figures */}
      <div className="grid grid-cols-3 gap-3">
        {figures.map(({ labelKey, value }) => (
          <div
            key={labelKey}
            className="flex flex-col items-center gap-1 rounded-xl border border-rizq-gold/20 bg-rizq-cream/50 px-2 py-3 text-center"
          >
            <span className="text-lg sm:text-xl font-bold text-rizq-green tabular leading-none">
              <AnimatedNumber value={value} duration={0.6} locale={locale} />
            </span>
            <span className={`text-[0.7rem] text-rizq-ink-soft leading-tight ${font}`}>
              {t(labelKey)}
            </span>
          </div>
        ))}
      </div>

      {/* Realistic / ambitious hint from the real output */}
      <p
        className={`flex items-start gap-2 text-sm leading-relaxed ${font} ${
          realistic ? "text-rizq-green" : "text-rizq-gold-deep"
        }`}
        aria-live="polite"
      >
        <span aria-hidden className="mt-px">
          {realistic ? "✓" : "!"}
        </span>
        <span>
          {realistic ? t("demos.rateRealistic") : t("demos.rateAmbitious")}
        </span>
      </p>
    </div>
  );
}
