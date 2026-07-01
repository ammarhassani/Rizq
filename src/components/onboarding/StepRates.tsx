"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { saveOnboardingStep } from "@/app/actions/onboarding/saveOnboardingStep";
import { OnboardingPricePreview } from "./OnboardingPricePreview";
import { NumberStepper } from "./NumberStepper";
import { MonthlyGoalWheel } from "./MonthlyGoalWheel";
import { SUPPORTED_CURRENCIES, isCurrency, type CurrencyCode } from "@/lib/currency/currencies";
import type { StepProps } from "./types";

export function StepRates({ locale, profile, onNext, onBack, onSkip }: StepProps) {
  const t = useTranslations("Onboarding.v2.steps.rates");
  const tv2 = useTranslations("Onboarding.v2");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const [hourlyRate, setHourlyRate] = useState(profile.current_hourly_rate_sar?.toString() ?? "");
  const [projectMin, setProjectMin] = useState(
    profile.current_project_rate_range?.min?.toString() ?? ""
  );
  const [prevYearIncome, setPrevYearIncome] = useState(
    profile.previous_year_income_sar?.toString() ?? ""
  );
  const [monthlyGoal, setMonthlyGoal] = useState(
    profile.income_goal_monthly_sar?.toString() ?? ""
  );
  const [rateConfidence, setRateConfidence] = useState<"exact" | "approximate" | "estimate">(
    profile.rate_confidence ?? "approximate"
  );
  const [currency, setCurrency] = useState<CurrencyCode>(
    isCurrency(profile.rate_currency) ? profile.rate_currency : "SAR"
  );
  const [error, setError] = useState<string | null>(null);

  // Labels bake "(SAR)"; the field now carries the chosen currency, so strip the
  // trailing parenthetical and let the NumberStepper suffix show it.
  const lbl = (s: string) => s.replace(/\s*[(（][^)）]*[)）]\s*$/u, "");
  const [isPending, startTransition] = useTransition();

  const inputCls = `w-full rounded-xl border border-[#8f7e48] bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus:border-rizq-green transition-colors ${font}`;
  const labelCls = `block text-sm font-medium text-rizq-ink mb-1.5 ${font}`;

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const hourly = hourlyRate ? parseFloat(hourlyRate) : null;
      const min = projectMin ? parseFloat(projectMin) : null;
      const result = await saveOnboardingStep("rates", {
        current_hourly_rate_sar: hourly,
        // Daily rate is derived from hourly (× 8h day) — we don't ask for it.
        current_daily_rate_sar: hourly != null ? hourly * 8 : null,
        // Only the min/floor project rate is asked; store it as the range (max = min).
        current_project_rate_range: min != null ? { min, max: min } : null,
        previous_year_income_sar: prevYearIncome ? parseFloat(prevYearIncome) : null,
        income_goal_monthly_sar: monthlyGoal ? parseFloat(monthlyGoal) : null,
        rate_confidence: rateConfidence,
        rate_currency: currency,
      });
      if (result.ok) {
        onNext(result.completeness);
      } else {
        setError(tv2("errorSave"));
      }
    });
  };

  const confidenceOptions: Array<{ value: "exact" | "approximate" | "estimate"; label: string }> = [
    { value: "exact", label: t("rateConfidenceExact") },
    { value: "approximate", label: t("rateConfidenceApproximate") },
    { value: "estimate", label: t("rateConfidenceEstimate") },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: isAr ? -24 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isAr ? 24 : -24 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      dir={isAr ? "rtl" : "ltr"}
      className={`space-y-5 ${font}`}
    >
      {/* Live market-rate preview (feature 006) — the freelancer sees what the
          engine derives from their specialty/city/experience while setting their
          own rate. Ephemeral; cites provenance. */}
      <OnboardingPricePreview locale={locale} />

      {/* Preferred currency — used app-wide (feature 007) */}
      <div>
        <label className={labelCls}>{isAr ? "عملتك المفضّلة" : "Your preferred currency"}</label>
        <p className={`-mt-1 mb-2 text-xs text-rizq-ink-soft ${font}`}>
          {isAr
            ? "تُستخدم في كل مكان — التسعير والعروض والفواتير ولوحة المعلومات."
            : "Used across the app — pricing, proposals, invoices, and your dashboard."}
        </p>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCurrency(c.code)}
              aria-pressed={currency === c.code}
              className={`rounded-2xl border px-3.5 py-2 text-sm transition-all ${
                currency === c.code
                  ? "border-rizq-green bg-rizq-green/10 text-rizq-green font-semibold"
                  : "border-[#8f7e48] bg-rizq-cream/60 text-rizq-ink hover:border-rizq-green/40"
              } ${font}`}
            >
              {c.code}
              <span className="text-rizq-ink-soft/70 ms-1">{c.symbol}</span>
            </button>
          ))}
        </div>
        {currency !== "SAR" && (
          <p className={`mt-1.5 text-xs text-rizq-ink-soft ${font}`}>
            {isAr
              ? "السوق المرجعي بالريال؛ نحوّل سعرك للريال داخليًا مع توضيح المصدر."
              : "The market benchmark stays in SAR; we convert your rate to SAR internally and show the source."}
          </p>
        )}
      </div>

      {/* Hourly rate + min/floor project rate (daily is derived = hourly × 8). */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>{lbl(t("hourlyRate"))}</label>
          <NumberStepper
            locale={locale}
            value={hourlyRate}
            onChange={setHourlyRate}
            placeholder={t("hourlyRatePlaceholder")}
            step={10}
            ariaLabel={t("hourlyRate")}
            suffix={currency}
          />
        </div>
        <div>
          <label className={labelCls}>{lbl(t("projectRateMin"))}</label>
          <NumberStepper
            locale={locale}
            value={projectMin}
            onChange={setProjectMin}
            step={250}
            ariaLabel={t("projectRateMin")}
            suffix={currency}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>{lbl(t("prevYearIncome"))}</label>
        <NumberStepper
          locale={locale}
          value={prevYearIncome}
          onChange={setPrevYearIncome}
          placeholder={t("prevYearIncomePlaceholder")}
          step={1000}
          ariaLabel={t("prevYearIncome")}
          suffix={currency}
        />
      </div>

      {/* Monthly income goal — compact open wheel scroller (feature 007). */}
      <MonthlyGoalWheel
        value={monthlyGoal}
        onChange={setMonthlyGoal}
        locale={locale}
        currency={currency}
      />

      {/* Rate confidence pills */}
      <div>
        <p className={labelCls}>{t("rateConfidence")}</p>
        <div className="flex flex-wrap gap-2">
          {confidenceOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRateConfidence(opt.value)}
              aria-pressed={rateConfidence === opt.value}
              className={`rounded-2xl border px-4 py-2 text-sm transition-all ${
                rateConfidence === opt.value
                  ? "border-rizq-green bg-rizq-green/10 text-rizq-green"
                  : "border-[#8f7e48] bg-rizq-cream/60 text-rizq-ink hover:border-rizq-green/40"
              } ${font}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className={`text-sm text-red-700 ${font}`}>
          {error}
        </p>
      )}

      <div className={`flex items-center justify-between gap-3 pt-2 ${font}`}>
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className="text-sm text-rizq-ink-soft hover:text-rizq-green transition-colors disabled:opacity-50"
        >
          {tv2("back")}
        </button>
        <div className="flex items-center gap-3 ms-auto">
          <button
            type="button"
            onClick={onSkip}
            disabled={isPending}
            className="text-sm text-rizq-ink-soft hover:text-rizq-green transition-colors disabled:opacity-50"
          >
            {tv2("skipStep")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isPending ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>{tv2("saving")}</span>
              </>
            ) : (
              <span>{tv2("save")}</span>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
