"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { BadgeCheck, MapPin, Briefcase, Coins, Palette, Target } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { setPreferredLanguage } from "@/app/actions/onboarding/setPreferredLanguage";
import type { StepProps } from "./types";

// A quick preview of the journey — so the welcome isn't a dead end.
const JOURNEY = [
  { code: "identity", Icon: BadgeCheck, ar: "هويتك", en: "Your identity" },
  { code: "location", Icon: MapPin, ar: "مدينتك", en: "Your city" },
  { code: "professional", Icon: Briefcase, ar: "تخصصك وخبرتك", en: "Specialty & experience" },
  { code: "rates", Icon: Coins, ar: "أسعارك", en: "Your rates" },
  { code: "brand", Icon: Palette, ar: "علامتك", en: "Your brand" },
  { code: "goals", Icon: Target, ar: "أهدافك", en: "Your goals" },
];

export function StepWelcome({ locale, onNext }: StepProps) {
  const t = useTranslations("Onboarding.v2.steps.welcome");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const langs = [
    { code: "ar" as const, label: "العربية", sub: "Arabic" },
    { code: "en" as const, label: "English", sub: "الإنجليزية" },
  ];

  const choose = (code: "ar" | "en") => {
    // Persist the choice; switch the URL locale (flips the whole app + RTL) only
    // when it actually changes — next-intl re-renders onboarding in that language.
    startTransition(() => {
      void setPreferredLanguage(code);
      if (code !== locale) router.replace(pathname, { locale: code });
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={`flex flex-col gap-6 py-2 ${font}`}
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Row 1 — preferred language */}
      <div className="space-y-3">
        <p className={`text-sm font-semibold text-rizq-ink ${font}`}>
          {isAr ? "أولًا، اختر لغتك المفضلة" : "First, choose your preferred language"}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {langs.map((l) => {
            const active = l.code === locale;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => choose(l.code)}
                aria-pressed={active}
                className={`rounded-2xl border px-4 py-3 text-center transition-all ${
                  active
                    ? "border-rizq-green bg-rizq-green/[0.06] ring-1 ring-rizq-green/40"
                    : "border-rizq-gold/30 bg-rizq-cream/40 hover:border-rizq-green/40"
                }`}
              >
                <span
                  className={`block text-base font-bold text-rizq-ink ${
                    l.code === "ar" ? "font-arabic" : "font-sans"
                  }`}
                >
                  {l.label}
                </span>
                <span className="block text-[11px] text-rizq-ink-soft mt-0.5">{l.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-rizq-gold/20" />

      {/* Row 2 — welcome hero + what we'll set up */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <h2 className={`text-2xl font-bold text-rizq-ink ${font}`}>{t("title")}</h2>
          <p className={`text-sm text-rizq-ink-soft leading-relaxed ${font}`}>{t("description")}</p>
        </div>

        {/* Preview the journey — answers "what comes next" */}
        <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {JOURNEY.map((s) => (
            <li key={s.code} className={`flex items-center gap-2 text-sm text-rizq-ink ${font}`}>
              <s.Icon size={16} className="text-rizq-green shrink-0" strokeWidth={1.75} />
              <span>{isAr ? s.ar : s.en}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => onNext()}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-8 py-3.5 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all"
        >
          <span>{t("cta")}</span>
          <span className={isAr ? "rotate-180" : ""}>→</span>
        </button>
      </div>
    </motion.div>
  );
}
