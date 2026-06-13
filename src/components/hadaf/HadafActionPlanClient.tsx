"use client";

/**
 * Client island for the HADAF AI action plan card.
 * Triggered by user click → generateHadafActionPlanAction.
 * Always labeled "خطة مقترحة — ليست نصيحة مالية".
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { generateHadafActionPlanAction } from "@/app/actions/hadaf/actionPlan";

type Props = {
  locale: "ar" | "en";
  initialAr: string | null;
  initialEn: string | null;
};

function parseBullets(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("•") || l.startsWith("-") || l.startsWith("·"))
    .map((l) => l.replace(/^[•\-·]\s*/, "").trim())
    .filter(Boolean);
}

export function HadafActionPlanClient({ locale, initialAr, initialEn }: Props) {
  const t = useTranslations("Hadaf");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [ar, setAr] = useState(initialAr);
  const [en, setEn] = useState(initialEn);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const planText = isAr ? ar : en;
  const bullets = planText ? parseBullets(planText) : [];

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const result = await generateHadafActionPlanAction();
      if (result.ok) {
        setAr(result.ar);
        setEn(result.en);
        setExpanded(true);
      } else if (result.code === "not_applicable") {
        setError(t("actionPlanNotApplicable"));
      } else {
        setError(t("actionPlanError"));
      }
    } catch {
      setError(t("actionPlanError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir={dir}
      className={`rounded-2xl border border-rizq-gold/25 bg-rizq-cream/85 p-5 sm:p-6 ${font}`}
    >
      {/* Card header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-rizq-green/10 text-rizq-green">
            <Sparkles size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-rizq-ink">{t("actionPlanTitle")}</p>
            <p className="text-xs text-rizq-ink-soft/60">{t("actionPlanLabel")}</p>
          </div>
        </div>
        {planText && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-rizq-ink-soft/60 hover:text-rizq-ink transition-colors"
            aria-label={expanded ? t("collapse") : t("expand")}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {/* Bullets */}
      {planText && expanded && bullets.length > 0 && (
        <ul className="space-y-2 mb-4">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex gap-2 items-start">
              <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-rizq-green" />
              <span className="text-sm text-rizq-ink leading-relaxed">{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Raw text fallback if no bullets parsed */}
      {planText && expanded && bullets.length === 0 && (
        <p className="text-sm text-rizq-ink leading-relaxed whitespace-pre-line mb-4">
          {planText}
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}

      {/* Generate button */}
      {!planText && (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-2.5 text-sm font-medium hover:bg-rizq-green-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${font}`}
        >
          <Sparkles size={14} />
          {loading ? t("actionPlanGenerating") : t("actionPlanGenerate")}
        </button>
      )}

      {/* Refresh button when plan exists */}
      {planText && (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className={`mt-2 inline-flex items-center gap-2 rounded-full border border-rizq-gold/30 px-4 py-2 text-xs text-rizq-ink-soft hover:text-rizq-ink hover:border-rizq-gold/50 transition-colors disabled:opacity-50 ${font}`}
        >
          <Sparkles size={12} />
          {loading ? t("actionPlanGenerating") : t("actionPlanRefresh")}
        </button>
      )}
    </div>
  );
}
