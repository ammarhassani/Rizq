"use client";

/**
 * UpgradeModal — Phase-6 P6.7
 *
 * Reusable modal shown on quota exhaustion or when a Pro-gated feature is hit.
 * Props:
 *   open      — controls visibility
 *   onClose   — dismiss callback
 *   locale    — "ar" | "en" for RTL / copy
 *   reason    — which quota was hit; controls headline + benefit copy
 *
 * Pattern mirrors ShareModal.tsx (overlay, RTL, Escape to close, focus-trap).
 * The "Upgrade" button navigates to /[locale]/upgrade.
 */

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { X, Check, ArrowUpRight } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UpgradeReason =
  | "proposals"
  | "clients"
  | "gigs"
  | "invoices"
  | "documents"
  | "ai_feature";

type Props = {
  open: boolean;
  onClose: () => void;
  locale: "ar" | "en";
  reason: UpgradeReason;
};

// ─── Per-reason copy map ──────────────────────────────────────────────────────
// Using top-level t() to satisfy next-intl's static-analysis requirements.
// Keys are fully qualified so the extractor can find them.

type ReasonCopy = {
  headlineKey: string;
  benefit1Key: string;
  benefit2Key: string;
  benefit3Key: string;
  benefit4Key: string;
};

const REASON_KEYS: Record<UpgradeReason, ReasonCopy> = {
  proposals: {
    headlineKey: "modal.proposals.headline",
    benefit1Key: "modal.proposals.benefit1",
    benefit2Key: "modal.proposals.benefit2",
    benefit3Key: "modal.proposals.benefit3",
    benefit4Key: "modal.proposals.benefit4",
  },
  clients: {
    headlineKey: "modal.clients.headline",
    benefit1Key: "modal.clients.benefit1",
    benefit2Key: "modal.clients.benefit2",
    benefit3Key: "modal.clients.benefit3",
    benefit4Key: "modal.clients.benefit4",
  },
  gigs: {
    headlineKey: "modal.gigs.headline",
    benefit1Key: "modal.gigs.benefit1",
    benefit2Key: "modal.gigs.benefit2",
    benefit3Key: "modal.gigs.benefit3",
    benefit4Key: "modal.gigs.benefit4",
  },
  invoices: {
    headlineKey: "modal.invoices.headline",
    benefit1Key: "modal.invoices.benefit1",
    benefit2Key: "modal.invoices.benefit2",
    benefit3Key: "modal.invoices.benefit3",
    benefit4Key: "modal.invoices.benefit4",
  },
  documents: {
    headlineKey: "modal.documents.headline",
    benefit1Key: "modal.documents.benefit1",
    benefit2Key: "modal.documents.benefit2",
    benefit3Key: "modal.documents.benefit3",
    benefit4Key: "modal.documents.benefit4",
  },
  ai_feature: {
    headlineKey: "modal.ai_feature.headline",
    benefit1Key: "modal.ai_feature.benefit1",
    benefit2Key: "modal.ai_feature.benefit2",
    benefit3Key: "modal.ai_feature.benefit3",
    benefit4Key: "modal.ai_feature.benefit4",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function UpgradeModal({ open, onClose, locale, reason }: Props) {
  const t = useTranslations("Upgrade");
  const router = useRouter();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus close button on open
  useEffect(() => {
    if (open) {
      closeRef.current?.focus();
    }
  }, [open]);

  // Escape key dismiss
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Resolve copy keys for the reason
  const keys = REASON_KEYS[reason];

  // We use type assertion here because next-intl's generic expects a literal
  // key union — the runtime value is always one of the defined keys above.
  type UpgradeKeys = Parameters<typeof t>[0];
  const headline = t(keys.headlineKey as UpgradeKeys);
  const benefits = [
    t(keys.benefit1Key as UpgradeKeys),
    t(keys.benefit2Key as UpgradeKeys),
    t(keys.benefit3Key as UpgradeKeys),
    t(keys.benefit4Key as UpgradeKeys),
  ];

  function handleUpgrade() {
    onClose();
    router.push("/upgrade" as "/upgrade");
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-rizq-ink/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — bottom sheet on mobile, centered modal on sm+ */}
      <div
        dir={dir}
        className={`relative w-full sm:max-w-md mx-4 sm:mx-auto rounded-t-3xl sm:card-wahaj shadow-xl p-6 sm:p-8 animate-fade-in ${font}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            {/* Pro badge */}
            <span
              className={`inline-block rounded-full bg-rizq-green/10 text-rizq-green text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 mb-2 ${font}`}
            >
              {t("proPlanName")}
            </span>
            <h2 className={`text-base font-semibold text-rizq-ink leading-snug ${font}`}>
              {headline}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-rizq-ink-soft hover:text-rizq-ink hover:bg-rizq-ink/8 transition-colors"
            aria-label={isAr ? "إغلاق" : "Close"}
          >
            <X size={18} />
          </button>
        </div>

        {/* Benefit bullets */}
        <ul className="space-y-2.5 mb-6">
          {benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <Check
                size={15}
                className="text-rizq-green mt-0.5 shrink-0"
                strokeWidth={2.5}
              />
              <span className={`text-sm text-rizq-ink ${font}`}>{b}</span>
            </li>
          ))}
        </ul>

        {/* Pricing note */}
        <p className={`text-xs text-rizq-ink-soft/60 mb-5 ${font}`}>
          {t("halalNote")}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleUpgrade}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
          >
            {t("modal.cta")}
            <ArrowUpRight size={15} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 inline-flex items-center justify-center rounded-full border border-rizq-gold/30 bg-transparent text-rizq-ink-soft hover:text-rizq-ink hover:border-rizq-ink/30 px-6 py-3 text-sm transition-all ${font}`}
          >
            {t("modal.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
