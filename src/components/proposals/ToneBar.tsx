"use client";

/**
 * ToneBar — floating action bar for adjusting proposal tone.
 * Phase-2 task 2.9.
 *
 * Shows 4 tone buttons. On click → useTransition → adjustProposalTone.
 * On success, calls onApplied(updatedArtifact) so the parent can re-render
 * the ProposalArtifact with the new content.
 */

import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { adjustProposalTone } from "@/app/actions/proposals/adjustToneAction";
import type { ArtifactData } from "@/lib/proposals/artifact";

type Tone = "formal" | "balanced" | "friendly" | "persuasive";

type Props = {
  locale: "ar" | "en";
  proposalId: string;
  onApplied: (artifact: ArtifactData) => void;
};

const TONES: { value: Tone; labelAr: string; labelEn: string }[] = [
  { value: "formal",     labelAr: "رسمية",          labelEn: "Formal" },
  { value: "balanced",   labelAr: "متوازنة",         labelEn: "Balanced" },
  { value: "friendly",   labelAr: "ودّية",           labelEn: "Friendly" },
  { value: "persuasive", labelAr: "مقنعة للسعر",    labelEn: "Persuasive" },
];

export function ToneBar({ locale, proposalId, onApplied }: Props) {
  const [isPending, startTransition] = useTransition();
  const [activeTone, setActiveTone] = useState<Tone | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tI18n = useTranslations("Proposals.detail");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  function applyTone(tone: Tone) {
    if (isPending) return;
    setError(null);
    setActiveTone(tone);

    startTransition(async () => {
      const result = await adjustProposalTone({ proposal_id: proposalId, tone });
      if (!result.ok) {
        setError(
          result.code === "quota_exhausted"
            ? isAr
              ? "بلغت حدّ ٣ تعديلات للنبرة هذا الشهر. الترقية للاستخدام غير المحدود."
              : "You've reached 3 tone edits this month. Upgrade for unlimited."
            : isAr
              ? "تعذّر تطبيق النبرة. حاول مرة أخرى."
              : "Could not apply tone. Please try again."
        );
        setActiveTone(null);
        return;
      }
      onApplied(result.artifact_json);
    });
  }

  return (
    <div
      dir={dir}
      className={`rounded-2xl border border-rizq-gold/25 bg-rizq-cream/90 px-5 py-4 space-y-3 ${font}`}
    >
      {/* Label */}
      <p className="text-xs font-medium text-rizq-gold-dark tracking-wide uppercase">
        {tI18n("rizqInsightAdjustTone")}
      </p>

      {/* Tone buttons */}
      <div className="flex flex-wrap gap-2">
        {TONES.map((t) => {
          const label = isAr ? t.labelAr : t.labelEn;
          const isThis = activeTone === t.value;
          const isLoading = isPending && isThis;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => applyTone(t.value)}
              disabled={isPending}
              aria-pressed={isThis}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all disabled:opacity-60 ${
                isThis
                  ? "bg-rizq-green text-rizq-cream shadow-sm"
                  : "border border-rizq-gold/30 bg-[var(--raised)] text-rizq-ink hover:border-rizq-green/50 hover:bg-rizq-green/8"
              }`}
            >
              {isLoading && <Loader2 size={13} className="animate-spin shrink-0" />}
              {label}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="text-xs text-[var(--over)]">
          {error}
        </p>
      )}
    </div>
  );
}
