"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import type { StepProps } from "./types";

export function StepWelcome({ locale, onNext }: StepProps) {
  const t = useTranslations("Onboarding.v2.steps.welcome");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={`flex flex-col items-center text-center gap-6 py-4 ${font}`}
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Brand mark */}
      <div className="w-16 h-16 rounded-full bg-rizq-green/10 flex items-center justify-center">
        <span className="text-3xl font-bold text-rizq-green font-arabic">ر</span>
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-rizq-ink">{t("title")}</h2>
        <p className="text-base text-rizq-ink-soft leading-relaxed max-w-sm mx-auto">
          {t("description")}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onNext()}
        className="inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-8 py-3.5 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all"
      >
        <span>{t("cta")}</span>
        <span className={isAr ? "rotate-180" : ""}>→</span>
      </button>
    </motion.div>
  );
}
