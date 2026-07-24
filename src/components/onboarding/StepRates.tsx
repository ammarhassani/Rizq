"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { saveOnboardingStep } from "@/app/actions/onboarding/saveOnboardingStep";
import { OnboardingPricePreview } from "./OnboardingPricePreview";
import { NumberStepper } from "./NumberStepper";
import { MonthlyGoalWheel } from "./MonthlyGoalWheel";
import type { StepProps } from "./types";
import { useAutosave } from "./useAutosave";

export function StepRates({ locale, profile, onNext, onBack, onSkip, autosave, onSaveError }: StepProps) {
  const t = useTranslations("Onboarding.v2.steps.rates");
  const tv2 = useTranslations("Onboarding.v2");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const [hourlyRate, setHourlyRate] = useState(profile.current_hourly_rate_sar?.toString() ?? "");
  const [projectMin, setProjectMin] = useState(
    profile.current_project_rate_range?.min?.toString() ?? ""
  );
  const [monthlyGoal, setMonthlyGoal] = useState(
    profile.income_goal_monthly_sar?.toString() ?? ""
  );
  const [rateConfidence, setRateConfidence] = useState<"exact" | "approximate" | "estimate">(
    profile.rate_confidence ?? "approximate"
  );
  const [error, setError] = useState<string | null>(null);
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
        income_goal_monthly_sar: monthlyGoal ? parseFloat(monthlyGoal) : null,
        rate_confidence: rateConfidence,
      });
      if (result.ok) {
        onNext(result.completeness);
      } else {
        setError(tv2("errorSave"));
        onSaveError?.();
      }
    });
  };

  // Settings → Profile: save on change (debounced), no Save button.
  useAutosave(!!autosave, handleSave, [hourlyRate, projectMin, monthlyGoal, rateConfidence]);

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
      <OnboardingPricePreview
        locale={locale}
        userRate={projectMin ? parseFloat(projectMin) : null}
      />

      {/* Hourly rate + min/floor project rate (daily is derived = hourly × 8). */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>{t("hourlyRate")}</label>
          <NumberStepper
            locale={locale}
            value={hourlyRate}
            onChange={setHourlyRate}
            placeholder={t("hourlyRatePlaceholder")}
            step={10}
            ariaLabel={t("hourlyRate")}
          />
        </div>
        <div>
          <label className={labelCls}>{t("projectRateMin")}</label>
          <NumberStepper
            locale={locale}
            value={projectMin}
            onChange={setProjectMin}
            step={250}
            ariaLabel={t("projectRateMin")}
          />
        </div>
      </div>

      {/* Monthly income goal — compact open wheel scroller (SAR). */}
      <MonthlyGoalWheel value={monthlyGoal} onChange={setMonthlyGoal} locale={locale} />

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
        <p role="alert" className={`text-sm text-[var(--over)] ${font}`}>
          {error}
        </p>
      )}

      {autosave ? (
        isPending && (
          <p className={`flex items-center gap-2 text-xs text-rizq-ink-soft ${font}`}>
            <Loader2 size={13} className="animate-spin" />
            {tv2("saving")}
          </p>
        )
      ) : (
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
      )}
    </motion.div>
  );
}
