"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Globe, Lock, RotateCcw } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { toggleShare } from "@/app/actions/tool/calculate";

type Props = {
  locale: "ar" | "en";
  query_id: string;
  min: number;
  median: number;
  max: number;
  sample_size: number;
  fallback_used: boolean;
  fallback_kind: "none" | "region" | "specialty";
  comparison_percent_below: number;
  // Whether the user is authenticated and can toggle share (anon = readonly)
  canShare: boolean;
  // Whether public_share is already on (e.g. when revisiting the result)
  initiallyShared?: boolean;
  onReset: () => void;
};

export function ResultCard({
  locale,
  query_id,
  min,
  median,
  max,
  sample_size,
  fallback_used,
  fallback_kind,
  comparison_percent_below,
  canShare,
  initiallyShared = false,
  onReset,
}: Props) {
  const t = useTranslations("Tool.result");
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const [isShared, setIsShared] = useState(initiallyShared);
  const [shareUrl, setShareUrl] = useState<string | null>(
    initiallyShared ? buildShareUrl(query_id, locale) : null
  );
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onToggleShare = () => {
    if (!canShare) return;
    const next = !isShared;
    startTransition(async () => {
      const res = await toggleShare({ query_id, share: next });
      if (res.ok) {
        setIsShared(next);
        setShareUrl(next ? buildShareUrl(query_id, locale) : null);
      }
    });
  };

  const onCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* no-op */
    }
  };

  // Locale-aware number formatter for inline stats (sample size, %).
  const numberFmt = new Intl.NumberFormat(
    locale === "ar" ? "ar-SA" : "en-US",
    { maximumFractionDigits: 0 }
  );

  // Confidence band: visualises the spread between min/median/max as a bar
  const range = max - min;
  const medianPct = range > 0 ? ((median - min) / range) * 100 : 50;

  return (
    <article
      className="relative rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 backdrop-blur-sm p-7 sm:p-10 shadow-[0_30px_60px_-30px_rgba(26,95,63,0.18)] animate-fade-in"
    >
      <p className="eyebrow mb-4">{t("eyebrow")}</p>

      {/* Three big numbers */}
      <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
        <PriceColumn
          locale={locale}
          label={t("min")}
          value={min}
          dim
        />
        <PriceColumn
          locale={locale}
          label={t("median")}
          value={median}
          big
        />
        <PriceColumn
          locale={locale}
          label={t("max")}
          value={max}
          dim
        />
      </div>

      {/* Confidence band */}
      <div className="mb-8 sm:mb-10">
        <div className="relative h-2 rounded-full bg-rizq-gold/15 overflow-hidden">
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-rizq-gold/30 via-rizq-green/40 to-rizq-gold/30 rounded-full animate-fade-in"
          />
          <span
            aria-hidden
            className="absolute top-1/2 -translate-y-1/2 h-4 w-1 bg-rizq-green rounded-full shadow-[0_0_0_3px_rgba(250,245,236,0.9)] transition-[left] duration-1000 ease-out"
            style={{ left: `${medianPct}%`, transform: "translate(-50%, -50%)" }}
          />
        </div>
      </div>

      {/* Sample size + comparison + fallback note */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 mb-8">
        <p className={`text-sm text-rizq-ink ${font}`}>
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full bg-rizq-green me-2 align-middle"
          />
          {t("sampleSize", { n: numberFmt.format(sample_size) })}
        </p>
        <p className={`text-sm text-rizq-ink ${font}`}>
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full bg-rizq-gold me-2 align-middle"
          />
          {t("comparison", { percent: numberFmt.format(comparison_percent_below) })}
        </p>
        {fallback_used && (
          <p
            className={`sm:col-span-2 text-xs text-rizq-ink-soft italic ${font}`}
          >
            {fallback_kind === "region"
              ? t("fallbackRegion")
              : t("fallbackSpecialty")}
          </p>
        )}
      </div>

      {/* Share row */}
      <div className="border-t border-rizq-gold/20 pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {canShare ? (
            <button
              type="button"
              onClick={onToggleShare}
              disabled={isPending}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all disabled:opacity-60 ${
                isShared
                  ? "border-rizq-green/40 bg-rizq-green/10 text-rizq-green"
                  : "border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink hover:border-rizq-green/40"
              } ${font}`}
            >
              {isShared ? (
                <Globe size={14} strokeWidth={1.8} />
              ) : (
                <Lock size={14} strokeWidth={1.8} />
              )}
              <span>{isShared ? t("shareToggleOff") : t("shareToggleOn")}</span>
            </button>
          ) : null}

          {isShared && shareUrl ? (
            <button
              type="button"
              onClick={onCopy}
              className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-4 py-2 text-sm hover:bg-rizq-green-dark transition-all ${font}`}
            >
              {copied ? (
                <Check size={14} strokeWidth={2.2} />
              ) : (
                <Copy size={14} strokeWidth={1.8} />
              )}
              <span>{copied ? t("shareCopied") : t("shareCopy")}</span>
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onReset}
          className={`inline-flex items-center gap-2 text-sm text-rizq-ink-soft hover:text-rizq-green transition-colors ${font}`}
        >
          <RotateCcw size={14} strokeWidth={1.8} />
          <span>{t("again")}</span>
        </button>
      </div>

      {canShare && (
        <p className={`mt-3 text-xs text-rizq-ink-soft/65 ${font}`}>
          {isShared ? t("shareNotePublic") : t("shareNotePrivate")}
        </p>
      )}
    </article>
  );
}

function PriceColumn({
  locale,
  label,
  value,
  big = false,
  dim = false,
}: {
  locale: "ar" | "en";
  label: string;
  value: number;
  big?: boolean;
  dim?: boolean;
}) {
  const t = useTranslations("Tool.result");
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  return (
    <div className="flex flex-col items-center text-center">
      <span
        className={`text-xs sm:text-sm tracking-[0.18em] uppercase mb-1 ${
          dim ? "text-rizq-ink-soft/60" : "text-rizq-gold-dark"
        } ${font}`}
      >
        {label}
      </span>
      <span
        className={`tabular font-sans leading-none ${
          big
            ? "text-5xl sm:text-7xl text-rizq-green font-semibold"
            : "text-2xl sm:text-3xl text-rizq-ink/70 font-medium"
        }`}
      >
        <AnimatedNumber value={value} duration={big ? 1.4 : 1.0} locale={locale} />
      </span>
      <span
        className={`mt-1 text-[10px] sm:text-xs tracking-wider uppercase ${
          dim ? "text-rizq-ink-soft/50" : "text-rizq-ink-soft/70"
        } ${font}`}
      >
        {t("currency")}
      </span>
    </div>
  );
}

function buildShareUrl(query_id: string, locale: "ar" | "en"): string {
  const path = `/${locale}/r/${query_id}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}
