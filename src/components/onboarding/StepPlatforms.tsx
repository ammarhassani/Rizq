"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { saveOnboardingStep } from "@/app/actions/onboarding/saveOnboardingStep";
import { prefillFromUrl, type PrefillSuggestion } from "@/lib/profile/prefill";
import type { StepProps } from "./types";

export function StepPlatforms({ locale, profile, onNext, onBack, onSkip }: StepProps) {
  const t = useTranslations("Onboarding.v2.steps.platforms");
  const tv2 = useTranslations("Onboarding.v2");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const [bahr, setBahr] = useState(profile.bahr_profile_url ?? "");
  const [mostaql, setMostaql] = useState(profile.mostaql_profile_url ?? "");
  const [khamsat, setKhamsat] = useState(profile.khamsat_profile_url ?? "");
  const [linkedin, setLinkedin] = useState(profile.linkedin_url ?? "");
  const [behance, setBehance] = useState(profile.behance_url ?? "");
  const [website, setWebsite] = useState(profile.personal_website_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Smart prefill (feature 006) — paste any profile URL, we SUGGEST where it goes
  // (URL-only heuristic, no scraping). The freelancer confirms before it's filled.
  const [pasteUrl, setPasteUrl] = useState("");
  const [suggestion, setSuggestion] = useState<PrefillSuggestion | null>(null);
  const setterByField: Record<PrefillSuggestion["field"], (v: string) => void> = {
    bahr_profile_url: setBahr,
    mostaql_profile_url: setMostaql,
    khamsat_profile_url: setKhamsat,
    linkedin_url: setLinkedin,
    behance_url: setBehance,
    personal_website_url: setWebsite,
  };
  const platformLabel: Record<PrefillSuggestion["platform"], string> = {
    bahr: "بحر / Bahr",
    mostaql: "مستقل / Mostaql",
    khamsat: "خمسات / Khamsat",
    linkedin: "LinkedIn",
    behance: "Behance",
    website: isAr ? "موقعك الشخصي" : "your website",
  };
  const onPasteChange = (v: string) => {
    setPasteUrl(v);
    setSuggestion(prefillFromUrl(v));
  };
  const confirmSuggestion = () => {
    if (!suggestion) return;
    setterByField[suggestion.field](suggestion.url);
    setPasteUrl("");
    setSuggestion(null);
  };

  const inputCls = `w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus:border-rizq-green transition-colors ${font}`;
  const labelCls = `block text-sm font-medium text-rizq-ink mb-1.5 ${font}`;

  const fields = [
    { label: t("bahrUrl"), value: bahr, set: setBahr },
    { label: t("mostaqlUrl"), value: mostaql, set: setMostaql },
    { label: t("khamsatUrl"), value: khamsat, set: setKhamsat },
    { label: t("linkedinUrl"), value: linkedin, set: setLinkedin },
    { label: t("behanceUrl"), value: behance, set: setBehance },
    { label: t("websiteUrl"), value: website, set: setWebsite },
  ] as const;

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveOnboardingStep("platforms", {
        bahr_profile_url: bahr || "",
        mostaql_profile_url: mostaql || "",
        khamsat_profile_url: khamsat || "",
        linkedin_url: linkedin || "",
        behance_url: behance || "",
        personal_website_url: website || "",
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
      className={`space-y-4 ${font}`}
    >
      {/* Smart prefill — paste once, we suggest where it goes (feature 006) */}
      <div className="rounded-2xl border border-rizq-green/20 bg-rizq-green/[0.03] p-3 space-y-2">
        <label className={`flex items-center gap-1.5 text-sm font-medium text-rizq-green ${font}`}>
          <Sparkles size={14} aria-hidden />
          {isAr ? "الصق رابط ملفك ونقترح مكانه" : "Paste a profile link — we'll suggest where it goes"}
        </label>
        <input
          type="url"
          value={pasteUrl}
          onChange={(e) => onPasteChange(e.target.value)}
          placeholder="behance.net/you · linkedin.com/in/you · bahr.sa/u/you"
          className={inputCls}
          dir="ltr"
          maxLength={500}
        />
        {suggestion && (
          <div className={`flex flex-wrap items-center gap-2 text-xs text-rizq-ink-soft ${font}`}>
            <span>
              {isAr
                ? `يبدو أنه رابط ${platformLabel[suggestion.platform]} — اقتراح`
                : `Looks like your ${platformLabel[suggestion.platform]} link — suggestion`}
            </span>
            <button
              type="button"
              onClick={confirmSuggestion}
              className="inline-flex items-center rounded-full bg-rizq-green text-rizq-cream px-3 py-1 font-medium hover:bg-rizq-green-dark transition-colors"
            >
              {isAr ? "أضِفه" : "Add it"}
            </button>
          </div>
        )}
      </div>

      {fields.map(({ label, value, set }) => (
        <div key={label}>
          <label className={labelCls}>{label}</label>
          <input
            type="url"
            value={value}
            onChange={(e) => set(e.target.value)}
            placeholder={t("urlPlaceholder")}
            className={inputCls}
            dir="ltr"
            maxLength={500}
          />
        </div>
      ))}

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
