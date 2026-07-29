"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Globe, HandCoins, Lock, RotateCcw, FileText, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { AnimatedNumber } from "./AnimatedNumber";
import { toggleShare, getMarketTrendNarrative } from "@/app/actions/tool/calculate";
import { track } from "@/lib/analytics/track";
import type { BenchmarkProvenance } from "@/lib/pricing/collectors/types";
import type { MarketTrend, TrendScope } from "@/lib/pricing/trend";
import { statedRatePosition } from "@/lib/pricing/statedRatePosition";

/**
 * Name the market a trend describes. The direction is often computed nationally because
 * no single (specialty, city, tier) cell carries enough dated rows — so the sentence says
 * which market moved rather than letting the reader assume it was theirs.
 */
function trendScopeLabelAr(scope: TrendScope, city: string | undefined): string {
  if (scope === "national") return "السوق على مستوى السعودية";
  if (scope === "region") return city ? `السوق في منطقة ${city}` : "السوق في منطقتك";
  return city ? `السوق في ${city}` : "السوق";
}

function trendScopeLabelEn(scope: TrendScope, city: string | undefined): string {
  if (scope === "national") return "The market across Saudi Arabia";
  if (scope === "region") return city ? `The market in the ${city} region` : "The market in your region";
  return city ? `The market in ${city}` : "The market";
}

/** Maps dominant provenance kind to the corresponding methodology section anchor. */
function methodologyFragment(kind: BenchmarkProvenance | undefined): string {
  switch (kind) {
    case "reasoned":
    case "founder":
      return "#reasoned-priors";
    case "published_ref":
      return "#published-references";
    case "ingested":
    case "partner":
      return "#open-data";
    default:
      return "#weighted-percentile";
  }
}

type Props = {
  locale: "ar" | "en";
  query_id: string;
  min: number;
  median: number;
  max: number;
  sample_size: number;
  fallback_used: boolean;
  fallback_kind: "none" | "size";
  comparison_percent_below: number;
  provenanceLabel?: string;     // pre-localized dominant-provenance label for the badge
  provenanceCitation?: string;  // pre-localized full citation sentence
  confidenceScore?: number;     // 0..1 — stored, no longer displayed
  /** agreed · disagreement · insufficient. Governs what this card is allowed to claim. */
  bandKind?: "agreed" | "disagreement" | "insufficient";
  /** Which bodies of evidence produced the band. Drives whether this is a measurement or an estimate. */
  families?: Array<{ family: string; adjusted: number; sourceCount: number }>;
  /** What the freelancer said they charge, from their profile. Absent for most accounts. */
  statedRange?: { min: number; max: number } | null;
  /** Raw dominant provenance kind — used to deep-link the methodology page */
  provenanceKind?: BenchmarkProvenance;
  /** Computed market-trend signal (M4), or null if data too thin to show one. */
  trend?: MarketTrend | null;
  /** Localized specialty/city names — fed to the trend AI narrative. */
  specialtyName?: string;
  cityName?: string;
  // Whether the user is authenticated and can toggle share (anon = readonly)
  canShare: boolean;
  // Whether public_share is already on (e.g. when revisiting the result)
  initiallyShared?: boolean;
  // Whether the viewer is authenticated — used to route the proposal CTA
  isAuthed: boolean;
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
  provenanceLabel,
  provenanceCitation,
  confidenceScore,
  bandKind,
  families,
  statedRange,
  provenanceKind,
  trend,
  specialtyName,
  cityName,
  canShare,
  initiallyShared = false,
  isAuthed,
  onReset,
}: Props) {
  const t = useTranslations("Tool.result");
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const methodologyHref = `/methodology${methodologyFragment(provenanceKind)}`;

  // AI interpretation of the computed trend — best-effort, non-blocking. The
  // computed line renders immediately; this only enriches it when it arrives.
  const [trendNarrative, setTrendNarrative] = useState<{ ar: string; en: string } | null>(null);
  useEffect(() => {
    if (!trend) return;
    let alive = true;
    getMarketTrendNarrative({
      trend,
      specialty_name: specialtyName ?? "",
      city_name: cityName ?? "",
    })
      .then((res) => {
        if (alive && res.ok) setTrendNarrative(res.narrative);
      })
      .catch(() => {
        /* graceful — keep the computed line only */
      });
    return () => {
      alive = false;
    };
  }, [trend, specialtyName, cityName]);

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
      className="relative card-wahaj backdrop-blur-sm p-7 sm:p-10 shadow-[0_30px_60px_-30px_rgba(26,95,63,0.18)] animate-fade-in"
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

      {/* Prices are national until a city earns its own figures from 3 local contributors.
          No cited source distinguishes Saudi cities, so claiming otherwise would be inventing
          a difference the evidence does not contain. */}
      <p className={`mb-4 text-xs text-rizq-ink-soft/80 ${font}`}>{t("nationalScope")}</p>

      {/* Sample size + comparison + fallback note */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 mb-8">
        <p className={`text-sm text-rizq-ink ${font}`}>
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full bg-rizq-green me-2 align-middle"
          />
          {/* `n` stays a raw number so the ICU plural picks the right Arabic category;
              `count` carries the digits, because ICU formats `#` with plain "ar" — which
              CLDR now resolves to Latin digits, next to this page's ar-SA Arabic-Indic. */}
          {t("sampleSize", { n: sample_size, count: numberFmt.format(sample_size) })}
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
            {t("fallbackSize")}
          </p>
        )}
        {provenanceLabel && (
          <p className={`sm:col-span-2 flex flex-wrap items-center gap-2 text-sm text-rizq-ink ${font}`}>
            <span className="inline-flex items-center gap-1 rounded-full border border-rizq-green/30 bg-rizq-green/10 px-2.5 py-0.5 text-xs text-rizq-green">
              {provenanceLabel}
            </span>
            {bandKind === "disagreement" && (
              <span className="text-xs text-rizq-ink-soft/70">{t("evidence.disagreement")}</span>
            )}
          </p>
        )}
        {(() => {
          // A band is information; where the freelancer sits inside it is a decision.
          // Rendered only when the profile actually holds a stated rate — no rate, no line.
          const pos = statedRatePosition({ min, anchor: median, max }, statedRange);
          if (!pos) return null;
          // "50% from the median" without a side is not a decision — inside the band the
          // sentence still has to say which way.
          const key =
            pos.position === "within"
              ? pos.percent_vs_anchor >= 0
                ? "withinAbove"
                : "withinBelow"
              : pos.position;
          return (
            <p className={`sm:col-span-2 text-sm text-rizq-ink ${font}`}>
              {t(`statedRate.${key}`, {
                stated: numberFmt.format(pos.stated),
                percent: numberFmt.format(Math.abs(pos.percent_vs_anchor)),
              })}
            </p>
          );
        })()}
        {provenanceCitation && (
          <p className={`sm:col-span-2 text-xs text-rizq-ink-soft italic ${font}`}>
            {provenanceCitation}
          </p>
        )}
        <Link
          href={methodologyHref as "/methodology"}
          className={`sm:col-span-2 inline-flex items-center gap-1 text-xs text-rizq-gold-dark hover:text-rizq-green transition-colors ${font}`}
        >
          <span>{t("methodologyLink")}</span>
          <span className="inline-block rtl:rotate-180">→</span>
        </Link>
      </div>

      {/* Market trend — computed signal (cited), optionally AI-interpreted.
          Only rendered when the data was thick enough to support a direction. */}
      {trend && (
        <div className="mb-8 rounded-2xl border border-rizq-gold/20 bg-rizq-cream/40 p-4">
          <p className={`flex items-center gap-2 text-sm text-rizq-ink ${font}`}>
            {trend.direction === "rising" ? (
              <TrendingUp size={16} className="text-rizq-green shrink-0" aria-hidden />
            ) : trend.direction === "falling" ? (
              <TrendingDown size={16} className="text-[var(--warn)] shrink-0" aria-hidden />
            ) : (
              <Minus size={16} className="text-rizq-ink-soft shrink-0" aria-hidden />
            )}
            <span>
              {/* The signal may come from a wider row set than this lookup's city (see
                  resolveTrend): no (specialty, city, tier) cell in the corpus holds the 8
                  dated rows a direction needs. So the line NAMES the market it describes —
                  a nationwide move must never read as "your city moved". */}
              {locale === "ar"
                ? `تحرّك ${trendScopeLabelAr(trend.scope, cityName)} ${trend.clamped ? "أكثر من " : ""}${trend.percent > 0 ? "+" : ""}${numberFmt.format(Math.abs(trend.percent))}% خلال ${numberFmt.format(trend.span_months)} أشهر تقريبًا (بناءً على ${numberFmt.format(trend.sample_size)} سجل).`
                : `${trendScopeLabelEn(trend.scope, cityName)} moved ${trend.clamped ? "over " : ""}${trend.percent > 0 ? "+" : ""}${numberFmt.format(Math.abs(trend.percent))}% over ~${numberFmt.format(trend.span_months)} months (based on ${numberFmt.format(trend.sample_size)} records).`}
            </span>
          </p>
          {trendNarrative && (
            <p className={`mt-2 text-sm text-rizq-ink-soft ${font}`}>
              <span className="font-semibold text-rizq-green">
                {locale === "ar" ? "تحليل رِزق — " : "Rizq Insight — "}
              </span>
              {locale === "ar" ? trendNarrative.ar : trendNarrative.en}
            </p>
          )}
        </div>
      )}

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

      {/* Contribute CTA — quiet, editorial. Only for authed users
          (anons would hit a login-required wall on the submit page). */}
      {canShare && (
        <div className="mt-6 pt-5 border-t border-rizq-gold/15">
          <Link
            href="/submit"
            className={`group inline-flex items-center gap-2 text-sm text-rizq-gold-dark hover:text-rizq-green transition-colors ${font}`}
          >
            <HandCoins size={14} strokeWidth={1.8} />
            <span>{t("contributeYourPrice")}</span>
            <span className="inline-block rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
              →
            </span>
          </Link>
        </div>
      )}

      {/* Proposal CTA — prominent, shown to all users.
          Authed → /proposals/new; anon → /signup?next=/proposals/new */}
      <div className="mt-6 pt-5 border-t border-rizq-gold/15">
        <Link
          href={
            isAuthed
              ? "/proposals/new"
              : `/signup?next=/proposals/new`
          }
          onClick={() => track("proposal_cta_clicked", { authed: isAuthed })}
          className={`group inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
        >
          <FileText size={14} strokeWidth={1.8} />
          <span>{t("createProposal")}</span>
          <span className="inline-block rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
            →
          </span>
        </Link>
      </div>
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
