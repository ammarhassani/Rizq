"use client";

/**
 * P5.10 — OnboardingWizard: config-driven 11-step wizard.
 * - Resumes from users.onboarding_step (passed as initialStep prop).
 * - Progress bar + step indicator + estimated time.
 * - Per-step save via saveOnboardingStep action.
 * - completeOnboarding on step 11 review.
 * - Framer Motion AnimatePresence for transitions.
 * - Mobile-first, RTL.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence } from "framer-motion";
import type { ProfileSnapshot, OnboardingStep } from "./types";

import { StepWelcome } from "./StepWelcome";
import { StepIdentity } from "./StepIdentity";
import { StepLocation } from "./StepLocation";
import { StepProfessional } from "./StepProfessional";
import { StepRates } from "./StepRates";
import { StepPlatforms } from "./StepPlatforms";
import { StepPortfolio } from "./StepPortfolio";
import { StepBrand } from "./StepBrand";
import { StepDefaults } from "./StepDefaults";
import { StepGoals } from "./StepGoals";
import { StepReview } from "./StepReview";

const TOTAL_STEPS = 11;

// Config order (1-based index matches step.id)
const STEP_KEYS = [
  "welcome",
  "identity",
  "location",
  "professional",
  "rates",
  "platforms",
  "portfolio",
  "brand",
  "defaults",
  "goals",
  "review",
] as const;

type Props = {
  locale: "ar" | "en";
  /** Current profile from DB (may be partial for new users). */
  profile: ProfileSnapshot;
  /** Step to resume from (0 = start from welcome). */
  initialStep: number;
  /** Config rows from onboarding_steps table. */
  steps: OnboardingStep[];
};

export function OnboardingWizard({ locale, profile: initialProfile, initialStep, steps }: Props) {
  const tv2 = useTranslations("Onboarding.v2");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  // Current step index (0-based, so step 1 = index 0 = welcome)
  const [currentIdx, setCurrentIdx] = useState<number>(
    Math.max(0, Math.min(initialStep - 1, TOTAL_STEPS - 1))
  );
  const [profile, setProfile] = useState<ProfileSnapshot>(initialProfile);

  const stepNum = currentIdx + 1; // 1-based for display
  const stepKey = STEP_KEYS[currentIdx];
  const stepConfig = steps.find((s) => s.step_key === stepKey);
  const estimatedSecs = stepConfig?.estimated_seconds ?? null;

  const goNext = (completeness?: number) => {
    if (completeness !== undefined) {
      setProfile((prev) => ({ ...prev, profile_completeness_pct: completeness }));
    }
    setCurrentIdx((idx) => Math.min(idx + 1, TOTAL_STEPS - 1));
  };

  const goBack = () => {
    setCurrentIdx((idx) => Math.max(idx - 1, 0));
  };

  const goSkip = () => {
    setCurrentIdx((idx) => Math.min(idx + 1, TOTAL_STEPS - 1));
  };

  const stepProps = {
    locale,
    profile,
    onNext: goNext,
    onBack: goBack,
    onSkip: goSkip,
  };

  const progressPct = Math.round((currentIdx / (TOTAL_STEPS - 1)) * 100);

  return (
    <div className={`w-full space-y-6 ${font}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-rizq-ink-soft">
          <span>
            {tv2("progressStep", { current: stepNum, total: TOTAL_STEPS })}
          </span>
          {estimatedSecs && (
            <span>{tv2("estimatedTime", { secs: estimatedSecs })}</span>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-rizq-gold/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-rizq-green transition-all duration-400"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Step title */}
        {stepConfig && (
          <div>
            <h2 className={`text-lg font-bold text-rizq-ink ${font}`}>
              {isAr ? stepConfig.title_ar : stepConfig.title_en}
            </h2>
            {stepConfig.step_key !== "welcome" && (
              <p className="text-xs text-rizq-ink-soft mt-0.5">
                {tv2("completeness", { pct: profile.profile_completeness_pct })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Step content with AnimatePresence for transitions */}
      <AnimatePresence mode="wait">
        <div key={stepKey}>
          {stepKey === "welcome" && <StepWelcome {...stepProps} />}
          {stepKey === "identity" && <StepIdentity {...stepProps} />}
          {stepKey === "location" && <StepLocation {...stepProps} />}
          {stepKey === "professional" && <StepProfessional {...stepProps} />}
          {stepKey === "rates" && <StepRates {...stepProps} />}
          {stepKey === "platforms" && <StepPlatforms {...stepProps} />}
          {stepKey === "portfolio" && <StepPortfolio {...stepProps} />}
          {stepKey === "brand" && <StepBrand {...stepProps} />}
          {stepKey === "defaults" && <StepDefaults {...stepProps} />}
          {stepKey === "goals" && <StepGoals {...stepProps} />}
          {stepKey === "review" && <StepReview {...stepProps} />}
        </div>
      </AnimatePresence>
    </div>
  );
}
