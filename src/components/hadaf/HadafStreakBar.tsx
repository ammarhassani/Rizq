"use client";

/**
 * Animated 3-segment HADAF streak progress bar.
 * Filled segments = qualifying months. Uses Framer Motion.
 */

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

type Props = {
  streak: number;
  required: number;
  locale: "ar" | "en";
};

export function HadafStreakBar({ streak, required, locale }: Props) {
  const t = useTranslations("Hadaf");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const segments = Array.from({ length: required }, (_, i) => i < streak);

  return (
    <div dir={dir} className={`space-y-2 ${font}`}>
      {/* Segment bar */}
      <div className="flex gap-1.5" role="progressbar" aria-valuenow={streak} aria-valuemax={required}>
        {segments.map((filled, i) => (
          <motion.div
            key={i}
            className={`h-3 flex-1 rounded-full ${
              filled ? "bg-rizq-green" : "bg-rizq-gold/20"
            }`}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: i * 0.12, duration: 0.4, ease: "easeOut" }}
            style={{ originX: isAr ? 1 : 0 }}
          />
        ))}
      </div>
      {/* Label */}
      <p className={`text-xs text-rizq-ink-soft ${font}`}>
        {t("streakLabel", { current: streak, required })}
      </p>
    </div>
  );
}
