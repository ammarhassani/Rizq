"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { saveOnboardingStep } from "@/app/actions/onboarding/saveOnboardingStep";
import { SPECIALTIES } from "@/lib/refData";
import { Combobox } from "@/components/ui/Combobox";
import type { StepProps } from "./types";

const EXPERIENCE_TIERS_AR = [
  { label: "مبتدئ (أقل من سنتين)", value: "beginner" },
  { label: "متوسط (٢-٥ سنوات)", value: "intermediate" },
  { label: "متقدم (٥-١٠ سنوات)", value: "advanced" },
  { label: "خبير (أكثر من ١٠ سنوات)", value: "expert" },
];
const EXPERIENCE_TIERS_EN = [
  { label: "Beginner (under 2 years)", value: "beginner" },
  { label: "Intermediate (2 to 5 years)", value: "intermediate" },
  { label: "Advanced (5 to 10 years)", value: "advanced" },
  { label: "Expert (10+ years)", value: "expert" },
];

export function StepProfessional({ locale, profile, onNext, onBack, onSkip }: StepProps) {
  const t = useTranslations("Onboarding.v2.steps.professional");
  const tv2 = useTranslations("Onboarding.v2");
  const tCommon = useTranslations("Common");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const [primarySpecialtySlug, setPrimarySpecialtySlug] = useState(
    profile.specialties?.[0] ?? ""
  );
  const [yearsExperience, setYearsExperience] = useState(
    profile.years_experience?.toString() ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Experience level is DERIVED from years — a single source of truth, never a
  // second input that can disagree with it. (The pricing engine derives the real
  // tier the same way.)
  const tiers = isAr ? EXPERIENCE_TIERS_AR : EXPERIENCE_TIERS_EN;
  const yrs = yearsExperience === "" ? null : parseInt(yearsExperience, 10);
  const derivedTier =
    yrs == null || Number.isNaN(yrs)
      ? null
      : yrs < 2
        ? tiers[0]
        : yrs < 5
          ? tiers[1]
          : yrs < 10
            ? tiers[2]
            : tiers[3];
  const inputCls = `w-full rounded-xl border border-[#8f7e48] bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus:border-rizq-green transition-colors appearance-none ${font}`;
  const labelCls = `block text-sm font-medium text-rizq-ink mb-1.5 ${font}`;

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      // Language was chosen on the welcome step — don't ask again. Keep what's
      // there, else default to Arabic (+ English when the app is in English).
      const langs =
        profile.languages && profile.languages.length > 0
          ? profile.languages
          : Array.from(new Set(["ar", locale]));

      const result = await saveOnboardingStep("professional", {
        specialties: primarySpecialtySlug ? [primarySpecialtySlug] : [],
        years_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
        languages: langs,
      });
      if (result.ok) {
        onNext(result.completeness);
      } else {
        setError(tv2("errorSave"));
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: isAr ? -24 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isAr ? 24 : -24 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      dir={isAr ? "rtl" : "ltr"}
      className={`grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 ${font}`}
    >
      {/* Primary specialty */}
      <div>
        <label className={labelCls}>{t("primarySpecialty")}</label>
        <Combobox
          locale={locale}
          value={primarySpecialtySlug || null}
          onChange={(v) => setPrimarySpecialtySlug(v ?? "")}
          options={SPECIALTIES.map((s) => ({ value: s.slug, label: s[locale] }))}
          placeholder={t("primarySpecialtyPlaceholder")}
          searchPlaceholder={tCommon("combobox.searchPlaceholder")}
          emptyText={tCommon("combobox.noResults")}
          allowClear
        />
      </div>

      {/* Years experience */}
      <div>
        <label className={labelCls}>{t("yearsExperience")}</label>
        <input
          type="number"
          min={0}
          max={60}
          value={yearsExperience}
          onChange={(e) => setYearsExperience(e.target.value.replace(/\D/g, "").slice(0, 2))}
          placeholder={t("yearsExperiencePlaceholder")}
          className={inputCls}
          dir="ltr"
          inputMode="numeric"
        />
      </div>

      {/* Experience level — DERIVED from years (read-only, can't contradict it) */}
      <div className="sm:col-span-2">
        <label className={labelCls}>{t("experienceTier")}</label>
        <div className="flex items-center min-h-[48px] rounded-xl border border-dashed border-[#8f7e48] bg-rizq-cream/40 px-4 py-3">
          {derivedTier ? (
            <span className={`text-sm font-medium text-rizq-green ${font}`}>{derivedTier.label}</span>
          ) : (
            <span className={`text-sm text-rizq-ink-soft ${font}`}>
              {isAr ? "أدخل سنوات خبرتك لتحديد مستواك تلقائيًا" : "Enter your years to set your level automatically"}
            </span>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className={`sm:col-span-2 text-sm text-red-700 ${font}`}>
          {error}
        </p>
      )}

      <div className={`sm:col-span-2 flex items-center justify-between gap-3 pt-2 ${font}`}>
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
