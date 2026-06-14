"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Quote } from "lucide-react";

type Props = { locale: "ar" | "en" };

type Tone = "formal" | "balanced" | "friendly";
const TONES: Tone[] = ["formal", "balanced", "friendly"];

const TONE_LABEL_KEY: Record<Tone, string> = {
  formal: "demos.toneFormal",
  balanced: "demos.toneBalanced",
  friendly: "demos.toneFriendly",
};

const TONE_SAMPLE_KEY: Record<Tone, string> = {
  formal: "demos.toneSample_formal",
  balanced: "demos.toneSample_balanced",
  friendly: "demos.toneSample_friendly",
};

export function DemoTone({ locale }: Props) {
  const t = useTranslations("Landing");
  const reduce = useReducedMotion();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const [tone, setTone] = useState<Tone>("balanced");
  const sample = t(TONE_SAMPLE_KEY[tone]);

  return (
    <div className="flex flex-col gap-5">
      {/* Tone pills */}
      <div role="group" aria-label={t("demos.toneTitle")} className="flex flex-wrap gap-2">
        {TONES.map((option) => {
          const selected = option === tone;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setTone(option)}
              aria-pressed={selected}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green focus-visible:ring-offset-2 ${font} ${
                selected
                  ? "border-rizq-green bg-rizq-green text-rizq-cream"
                  : "border-rizq-gold/30 bg-white text-rizq-ink-soft hover:border-rizq-green/40 hover:text-rizq-ink"
              }`}
            >
              {t(TONE_LABEL_KEY[option])}
            </button>
          );
        })}
      </div>

      {/* Proposal snippet card — mirrors the artifact's accented section shell */}
      <div className="relative overflow-hidden rounded-2xl border border-rizq-gold/20 border-s-[3px] border-s-rizq-green bg-white p-5">
        {/* watermark quote glyph */}
        <Quote
          size={56}
          strokeWidth={1}
          aria-hidden
          className="pointer-events-none absolute -top-2 end-2 text-rizq-gold/10 rtl:-scale-x-100"
        />

        <p className={`mb-2 text-[0.65rem] tracking-[0.16em] uppercase text-rizq-gold-deep ${font}`}>
          {t("demos.toneSnippetLabel")}
        </p>

        <div className="relative min-h-[5.5rem]">
          {reduce ? (
            <p
              className={`text-sm leading-relaxed text-rizq-ink ${font}`}
              aria-live="polite"
            >
              {sample}
            </p>
          ) : (
            <AnimatePresence mode="wait">
              <motion.p
                key={tone}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className={`text-sm leading-relaxed text-rizq-ink ${font}`}
                aria-live="polite"
              >
                {sample}
              </motion.p>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
