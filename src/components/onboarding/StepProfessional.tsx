"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { saveOnboardingStep } from "@/app/actions/onboarding/saveOnboardingStep";
import { SPECIALTIES } from "@/lib/refData";
import type { StepProps } from "./types";

const EXPERIENCE_TIERS_AR = [
  { label: "مبتدئ (أقل من سنتين)", value: "beginner" },
  { label: "متوسط (٢-٥ سنوات)", value: "intermediate" },
  { label: "متقدم (٥-١٠ سنوات)", value: "advanced" },
  { label: "خبير (أكثر من ١٠ سنوات)", value: "expert" },
];
const EXPERIENCE_TIERS_EN = [
  { label: "Beginner (under 2 years)", value: "beginner" },
  { label: "Intermediate (2–5 years)", value: "intermediate" },
  { label: "Advanced (5–10 years)", value: "advanced" },
  { label: "Expert (10+ years)", value: "expert" },
];

export function StepProfessional({ locale, profile, onNext, onBack, onSkip }: StepProps) {
  const t = useTranslations("Onboarding.v2.steps.professional");
  const tv2 = useTranslations("Onboarding.v2");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const [primarySpecialtySlug, setPrimarySpecialtySlug] = useState(
    profile.specialties?.[0] ?? ""
  );
  const [yearsExperience, setYearsExperience] = useState(
    profile.years_experience?.toString() ?? ""
  );
  const [tierValue, setTierValue] = useState("");
  const [languageAr, setLanguageAr] = useState(
    profile.languages?.includes("ar") ?? true
  );
  const [languageEn, setLanguageEn] = useState(
    profile.languages?.includes("en") ?? false
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const tiers = isAr ? EXPERIENCE_TIERS_AR : EXPERIENCE_TIERS_EN;
  const inputCls = `w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus:border-rizq-green transition-colors appearance-none ${font}`;
  const labelCls = `block text-sm font-medium text-rizq-ink mb-1.5 ${font}`;

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const langs: string[] = [];
      if (languageAr) langs.push("ar");
      if (languageEn) langs.push("en");

      const result = await saveOnboardingStep("professional", {
        specialties: primarySpecialtySlug ? [primarySpecialtySlug] : [],
        years_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
        languages: langs.length > 0 ? langs : ["ar"],
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
      className={`space-y-5 ${font}`}
    >
      {/* Primary specialty */}
      <div>
        <label className={labelCls}>{t("primarySpecialty")}</label>
        <select
          value={primarySpecialtySlug}
          onChange={(e) => setPrimarySpecialtySlug(e.target.value)}
          className={inputCls}
        >
          <option value="">{t("primarySpecialtyPlaceholder")}</option>
          {SPECIALTIES.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s[locale]}
            </option>
          ))}
        </select>
      </div>

      {/* Experience tier */}
      <div>
        <label className={labelCls}>{t("experienceTier")}</label>
        <select
          value={tierValue}
          onChange={(e) => setTierValue(e.target.value)}
          className={inputCls}
        >
          <option value="">{t("experienceTierPlaceholder")}</option>
          {tiers.map((tier) => (
            <option key={tier.value} value={tier.value}>
              {tier.label}
            </option>
          ))}
        </select>
      </div>

      {/* Years experience */}
      <div>
        <label className={labelCls}>{t("yearsExperience")}</label>
        <input
          type="number"
          min={0}
          max={60}
          value={yearsExperience}
          onChange={(e) => setYearsExperience(e.target.value)}
          placeholder={t("yearsExperiencePlaceholder")}
          className={inputCls}
          dir="ltr"
        />
      </div>

      {/* Languages */}
      <div>
        <p className={labelCls}>{t("languages")}</p>
        <div className="flex gap-3 flex-wrap">
          {(
            [
              { key: "ar", label: t("langAr"), state: languageAr, set: setLanguageAr },
              { key: "en", label: t("langEn"), state: languageEn, set: setLanguageEn },
            ] as const
          ).map(({ key, label, state, set }) => (
            <button
              key={key}
              type="button"
              onClick={() => set(!state)}
              className={`rounded-2xl border px-4 py-2 text-sm transition-all ${
                state
                  ? "border-rizq-green bg-rizq-green/10 text-rizq-green"
                  : "border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink hover:border-rizq-green/40"
              } ${font}`}
              aria-pressed={state}
            >
              {label}
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
