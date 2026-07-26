"use client";

/**
 * Client component so the count can be re-rendered from the pricing action's returned
 * allowance the moment a lookup finishes — a server-rendered badge kept showing the
 * page-load value while the enforced number had already moved.
 */

import { useTranslations } from "next-intl";

type Props = {
  locale: "ar" | "en";
  mode: "anon" | "free" | "pro" | "admin";
  remaining: number | "unlimited";
  /**
   * Required: a default here was a second place for the free-tier size to live, and it
   * drifted (it still said 3 long after the enforced allowance became 5).
   */
  limit: number;
};

export function QuotaBadge({ locale, mode, remaining, limit }: Props) {
  const t = useTranslations("Tool.quota");
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const fmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US");
  let label: string;
  let tone: "neutral" | "warn" | "good" = "neutral";
  if (mode === "pro" || mode === "admin" || remaining === "unlimited") {
    label = t("pro");
    tone = "good";
  } else if (mode === "anon") {
    label = t("anonRemaining");
    tone = remaining === 0 ? "warn" : "neutral";
  } else {
    label = t("freeRemaining", {
      remaining: fmt.format(remaining),
      limit: fmt.format(limit),
    });
    tone = remaining === 0 ? "warn" : remaining === 1 ? "neutral" : "good";
  }

  const toneClass =
    tone === "good"
      ? "border-rizq-green/30 bg-rizq-green/5 text-rizq-green"
      : tone === "warn"
        ? "border-[var(--warn-line)] bg-[var(--warn-soft)] text-amber-800"
        : "border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs tracking-wide ${toneClass} ${font}`}
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      <span>{label}</span>
    </span>
  );
}
