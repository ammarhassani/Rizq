"use client";

/**
 * Live price preview (feature 006) — calls the real resolver via previewPrice
 * and shows the freelancer's market-rate band + provenance, ephemerally. The
 * "feel your data feeding the engine" moment. Persists nothing.
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { previewPrice, type PricePreview } from "@/app/actions/pricing/previewPrice";

function fmt(n: number, locale: "ar" | "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }).format(n);
}

export function OnboardingPricePreview({
  locale,
  projectMin,
  hourlyRate,
}: {
  locale: "ar" | "en";
  /**
   * The freelancer's minimum PROJECT price. The resolver returns a project band, so this is
   * the only figure that can honestly be compared to it.
   */
  projectMin?: number | null;
  /**
   * The hourly rate, used only to decide whether to prompt for the missing project figure.
   * It is never converted into a project price — there is no honest hours-per-project
   * constant, and a verdict on an invented number is a verdict on nothing.
   */
  hourlyRate?: number | null;
}) {
  const tI18n = useTranslations("Onboarding.v2");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const [state, setState] = useState<PricePreview | "loading">("loading");

  useEffect(() => {
    let alive = true;
    previewPrice()
      .then((r) => alive && setState(r))
      .catch(() => alive && setState({ status: "insufficient_data" }));
    return () => {
      alive = false;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="rounded-2xl border border-rizq-gold/25 bg-[var(--raised)] p-4 animate-pulse">
        <div className="h-3 w-28 bg-rizq-gold/20 rounded mb-3" />
        <div className="h-6 w-44 bg-rizq-green/15 rounded" />
      </div>
    );
  }

  if (state.status !== "ok") {
    return (
      <div className={`rounded-2xl border border-rizq-gold/25 bg-rizq-cream/40 p-4 text-xs text-rizq-ink-soft ${font}`}>
        {isAr
          ? "أكمل تخصصك ومدينتك وخبرتك لرؤية نطاق سعرك في السوق."
          : "Add your specialty, city & experience to see your market rate."}
      </div>
    );
  }

  const citation = isAr ? state.citation_ar : state.citation_en;

  // Rate reality check (spec M8 step-5): where the freelancer's own floor sits relative to
  // the cited band. The verdict NAMES the figure it judged, because judging one number and
  // reporting on "your rate" reads as a verdict on everything they typed.
  let reality: { tone: "below" | "within" | "above" | "prompt"; text: string } | null = null;

  if (typeof projectMin === "number" && projectMin > 0) {
    const rate = fmt(projectMin, locale);
    if (projectMin < state.min) {
      reality = { tone: "below", text: tI18n("rateVerdictBelow", { rate }) };
    } else if (projectMin > state.max) {
      reality = { tone: "above", text: tI18n("rateVerdictAbove", { rate }) };
    } else {
      reality = { tone: "within", text: tI18n("rateVerdictWithin", { rate }) };
    }
  } else if (typeof hourlyRate === "number" && hourlyRate > 0) {
    // Silence here read as "your rate checks out". Say what is missing instead.
    reality = { tone: "prompt", text: tI18n("rateVerdictNeedsProjectMin") };
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-rizq-green/25 bg-rizq-green/[0.03] overflow-hidden"
    >
      <div className="h-1.5 bg-gradient-to-r from-rizq-green to-rizq-gold" />
      <div className="p-4">
        <p className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-rizq-green mb-2 ${font}`}>
          <Sparkles size={13} aria-hidden />
          {tI18n("marketRatePreview")}
        </p>
        <div className="flex items-baseline gap-2" dir="ltr">
          <span className="tabular text-sm text-rizq-ink-soft">{fmt(state.min, locale)}</span>
          <span className="text-rizq-ink-soft/50">–</span>
          <span className="tabular text-2xl font-bold text-rizq-green">{fmt(state.anchor, locale)}</span>
          <span className="text-rizq-ink-soft/50">–</span>
          <span className="tabular text-sm text-rizq-ink-soft">{fmt(state.max, locale)}</span>
          <span className={`text-xs text-rizq-ink-soft ms-1 ${font}`}>{tI18n("sar")}</span>
        </div>
        {citation && <p className={`text-[11px] text-rizq-ink-soft/70 mt-2 ${font}`}>{citation}</p>}
        {reality && (
          <p
            className={`text-xs mt-2 ${font} ${
              reality.tone === "below"
                ? "text-[var(--warn)]"
                : reality.tone === "above"
                  ? "text-rizq-gold-dark"
                  : reality.tone === "prompt"
                    ? "text-rizq-ink-soft"
                    : "text-rizq-green"
            }`}
          >
            {reality.text}
          </p>
        )}
      </div>
    </motion.div>
  );
}
