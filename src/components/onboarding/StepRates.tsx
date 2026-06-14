"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { saveOnboardingStep } from "@/app/actions/onboarding/saveOnboardingStep";
import type { StepProps } from "./types";

export function StepRates({ locale, profile, onNext, onBack, onSkip }: StepProps) {
  const t = useTranslations("Onboarding.v2.steps.rates");
  const tv2 = useTranslations("Onboarding.v2");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const [hourlyRate, setHourlyRate] = useState(profile.current_hourly_rate_sar?.toString() ?? "");
  const [dailyRate, setDailyRate] = useState(profile.current_daily_rate_sar?.toString() ?? "");
  const [projectMin, setProjectMin] = useState(
    profile.current_project_rate_range?.min?.toString() ?? ""
  );
  const [projectMax, setProjectMax] = useState(
    profile.current_project_rate_range?.max?.toString() ?? ""
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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const inputCls = `w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus:border-rizq-green transition-colors ${font}`;
  const labelCls = `block text-sm font-medium text-rizq-ink mb-1.5 ${font}`;

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveOnboardingStep("rates", {
        current_hourly_rate_sar: hourlyRate ? parseFloat(hourlyRate) : null,
        current_daily_rate_sar: dailyRate ? parseFloat(dailyRate) : null,
        current_project_rate_range:
          projectMin && projectMax
            ? { min: parseFloat(projectMin), max: parseFloat(projectMax) }
            : null,
        previous_year_income_sar: prevYearIncome ? parseFloat(prevYearIncome) : null,
        income_goal_monthly_sar: monthlyGoal ? parseFloat(monthlyGoal) : null,
        rate_confidence: rateConfidence,
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>{t("hourlyRate")}</label>
          <input
            type="number"
            min={0}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder={t("hourlyRatePlaceholder")}
            className={inputCls}
            dir="ltr"
          />
        </div>
        <div>
          <label className={labelCls}>{t("dailyRate")}</label>
          <input
            type="number"
            min={0}
            value={dailyRate}
            onChange={(e) => setDailyRate(e.target.value)}
            placeholder={t("dailyRatePlaceholder")}
            className={inputCls}
            dir="ltr"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>{t("projectRateMin")}</label>
          <input
            type="number"
            min={0}
            value={projectMin}
            onChange={(e) => setProjectMin(e.target.value)}
            className={inputCls}
            dir="ltr"
          />
        </div>
        <div>
          <label className={labelCls}>{t("projectRateMax")}</label>
          <input
            type="number"
            min={0}
            value={projectMax}
            onChange={(e) => setProjectMax(e.target.value)}
            className={inputCls}
            dir="ltr"
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>{t("prevYearIncome")}</label>
        <input
          type="number"
          min={0}
          value={prevYearIncome}
          onChange={(e) => setPrevYearIncome(e.target.value)}
          placeholder={t("prevYearIncomePlaceholder")}
          className={inputCls}
          dir="ltr"
        />
      </div>

      <div>
        <label className={labelCls}>{t("monthlyGoal")}</label>
        <input
          type="number"
          min={0}
          value={monthlyGoal}
          onChange={(e) => setMonthlyGoal(e.target.value)}
          placeholder={t("monthlyGoalPlaceholder")}
          className={inputCls}
          dir="ltr"
        />
      </div>

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
                  : "border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink hover:border-rizq-green/40"
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
