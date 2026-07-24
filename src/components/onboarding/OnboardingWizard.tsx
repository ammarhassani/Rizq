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

// Per-step PAYOFF (feature 006) — what completing this step unlocks in the app,
// so the freelancer feels their data feeding every module. Bilingual, RTL-safe.
const STEP_PAYOFF: Record<string, { ar: string; en: string }> = {
  identity: { ar: "يجعل عروضك وفواتيرك رسمية باسمك", en: "Makes your proposals & invoices official, in your name" },
  location: { ar: "تسعير دقيق حسب سوق مدينتك", en: "Unlocks accurate pricing for your city's market" },
  professional: { ar: "تخصصك وخبرتك يحددان كل سعر", en: "Your specialty & experience drive every price" },
  rates: { ar: "التسعير يعكس سعرك من أول عرض", en: "Pricing reflects your own rate from proposal #1" },
  platforms: { ar: "روابط منصّاتك تعزّز مصداقيتك", en: "Your platform links boost proposal credibility" },
  portfolio: { ar: "يبرز أعمالك التي تكسب العملاء", en: "Showcases the work that wins clients" },
  brand: { ar: "اسمك وشعارك وألوانك على كل عرض وفاتورة", en: "Your name, logo & colors on every proposal & invoice" },
  defaults: { ar: "فواتير أسرع بشروطك المعتادة", en: "Faster invoices with your standard terms" },
  goals: { ar: "تتبّع تقدّمك نحو هدف دخلك", en: "Tracks your progress toward your income goal" },
};

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

        {/* Step title + payoff (welcome renders its own hero, so skip it here) */}
        {stepConfig && stepKey !== "welcome" && (
          <div>
            <h2 className={`text-lg font-bold text-rizq-ink ${font}`}>
              {isAr ? stepConfig.title_ar : stepConfig.title_en}
            </h2>
            {STEP_PAYOFF[stepKey] && (
              <p className={`text-xs text-rizq-green/90 mt-1 flex items-center gap-1 ${font}`}>
                <span aria-hidden>✦</span>
                {isAr ? STEP_PAYOFF[stepKey].ar : STEP_PAYOFF[stepKey].en}
              </p>
            )}
          </div>
        )}

        {/* Profile-strength meter (feature 006) — fills as the profile gets richer,
            distinct from the step-position bar above. */}
        {stepKey !== "welcome" && (
          <div className="pt-1">
            <div className={`flex items-center justify-between text-[11px] text-rizq-ink-soft/70 mb-1 ${font}`}>
              <span>{isAr ? "قوة ملفك" : "Profile strength"}</span>
              <span className="tabular font-semibold text-rizq-green">{profile.profile_completeness_pct}%</span>
            </div>
            <div className="h-1 rounded-full bg-rizq-gold/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rizq-green to-rizq-gold transition-all duration-700"
                style={{ width: `${Math.max(0, Math.min(100, profile.profile_completeness_pct))}%` }}
              />
            </div>
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
