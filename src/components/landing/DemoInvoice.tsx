"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

type Props = { locale: "ar" | "en" };

type Status = "draft" | "sent" | "paid";
const ORDER: Status[] = ["draft", "sent", "paid"];

// Representative invoice (demo only, no backend).
const INVOICE_NO = "INV-2026-014";
const BRAND_AR = "استوديو نون";
const BRAND_EN = "Noon Studio";
const CLIENT_AR = "شركة نخبة";
const CLIENT_EN = "Nukhba Co.";
const SUBTOTAL = 4800;

// Mirror InvoiceArtifact's status badge palette (GigCard-derived).
const STATUS_STYLES: Record<Status, string> = {
  draft: "border-rizq-ink/15 bg-rizq-ink/8 text-rizq-ink-soft",
  sent: "border-blue-500/30 bg-blue-50 text-blue-700",
  paid: "border-emerald-500/30 bg-emerald-50 text-emerald-700",
};

const STATUS_LABEL_KEY: Record<Status, string> = {
  draft: "demos.statusDraft",
  sent: "demos.statusSent",
  paid: "demos.statusPaid",
};

export function DemoInvoice({ locale }: Props) {
  const t = useTranslations("Landing");
  const reduce = useReducedMotion();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const [index, setIndex] = useState(0);
  const status = ORDER[index];
  const isPaid = status === "paid";

  const nf = new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  });
  const currency = t("sar");
  const brand = isAr ? BRAND_AR : BRAND_EN;
  const client = isAr ? CLIENT_AR : CLIENT_EN;

  const atEnd = index === ORDER.length - 1;
  const advance = () => setIndex((i) => (i + 1) % ORDER.length);

  return (
    <div className="flex flex-col gap-5">
      {/* Mini invoice — mirrors InvoiceArtifact's structure */}
      <div className="overflow-hidden rounded-2xl border border-rizq-gold/20 bg-rizq-cream">
        {/* Brand header with accent + status badge */}
        <div
          className="flex items-center justify-between gap-3 border-s-[3px] border-rizq-green bg-rizq-cream/40 px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rizq-green font-arabic text-base font-bold text-rizq-cream"
            >
              {brand.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className={`truncate text-sm font-bold text-rizq-green leading-tight ${font}`}>
                {brand}
              </p>
              <p className="text-[0.65rem] tabular text-rizq-ink-soft/70">{INVOICE_NO}</p>
            </div>
          </div>

          {/* Status badge — color AND label flip together */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold ${STATUS_STYLES[status]} ${font}`}
          >
            <CheckDraw show={isPaid} reduce={!!reduce} />
            <span>{t(STATUS_LABEL_KEY[status])}</span>
          </span>
        </div>

        {/* Bill-to + line item */}
        <div className="px-4 py-3">
          <p className={`text-[0.65rem] tracking-[0.16em] uppercase text-rizq-gold-deep ${font}`}>
            {t("demos.invoiceClientLabel")}
          </p>
          <p className={`text-sm font-semibold text-rizq-ink ${font}`}>{client}</p>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-rizq-gold/15 pt-3">
            <span className={`text-xs text-rizq-ink-soft leading-snug ${font}`}>
              {t("demos.invoiceLineLabel")}
            </span>
            <span className="shrink-0 text-xs font-medium text-rizq-ink tabular">
              {nf.format(SUBTOTAL)} {currency}
            </span>
          </div>
        </div>

        {/* Total */}
        <div className="flex items-baseline justify-between border-t border-rizq-gold/20 bg-rizq-cream/30 px-4 py-3">
          <span className={`text-xs font-semibold text-rizq-ink ${font}`}>
            {t("demos.invoiceTotalLabel")}
          </span>
          <span className="tabular font-sans text-xl font-bold text-rizq-green leading-none">
            {nf.format(SUBTOTAL)}
            <span className={`ms-1.5 text-xs font-normal text-rizq-ink-soft ${font}`}>
              {currency}
            </span>
          </span>
        </div>
      </div>

      {/* Advance / restart control */}
      <button
        type="button"
        onClick={advance}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-rizq-green/25 bg-rizq-green/8 px-4 py-2.5 text-sm font-semibold text-rizq-green transition-colors hover:bg-rizq-green/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green focus-visible:ring-offset-2 min-h-[44px] ${font}`}
      >
        <span>{atEnd ? t("demos.invoiceReset") : t("demos.invoiceAdvance")}</span>
        <span className={atEnd ? "" : "rtl:rotate-180"} aria-hidden>
          {atEnd ? "↺" : "→"}
        </span>
      </button>
    </div>
  );
}

/**
 * Animated checkmark that draws its stroke on "paid". Under reduced motion it
 * renders the final check with no draw animation. Uses a small inline SVG so
 * we control the path-draw precisely.
 */
function CheckDraw({ show, reduce }: { show: boolean; reduce: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.svg
          key="check"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="inline-flex"
        >
          <motion.path
            d="M4 12.5 L9.5 18 L20 6.5"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          />
        </motion.svg>
      )}
    </AnimatePresence>
  );
}
