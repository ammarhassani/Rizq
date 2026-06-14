"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

type Props = { locale: "ar" | "en" };

type Status = "draft" | "sent" | "paid";
const ORDER: Status[] = ["draft", "sent", "paid"];

// Representative invoice (demo only, no backend).
const INVOICE_NO = "INV-2026-014";
const CLIENT_AR = "شركة نخبة";
const CLIENT_EN = "Nukhba Co.";
const TOTAL = 4800;

const STATUS_STYLES: Record<Status, string> = {
  draft: "border-rizq-ink/15 bg-rizq-ink/8 text-rizq-ink-soft",
  sent: "border-blue-500/30 bg-blue-500/10 text-blue-700",
  paid: "border-rizq-green/30 bg-rizq-green/10 text-rizq-green",
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
  const currency = isAr ? "ريال" : "SAR";
  const client = isAr ? CLIENT_AR : CLIENT_EN;

  const advance = () => setIndex((i) => (i + 1) % ORDER.length);

  return (
    <div className="flex flex-col gap-5">
      {/* Mini invoice card */}
      <div className="rounded-2xl border border-rizq-gold/20 bg-rizq-cream/50 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-rizq-ink-soft tabular">
              {INVOICE_NO}
            </span>
            <span className={`text-sm font-medium text-rizq-ink ${font}`}>
              {client}
            </span>
          </div>

          {/* Status badge — color AND label change together */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]} ${font}`}
          >
            {/* Check appears at paid. Animation gated behind reduced-motion. */}
            <AnimatePresence>
              {isPaid &&
                (reduce ? (
                  <Check size={13} strokeWidth={2.5} aria-hidden />
                ) : (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="inline-flex"
                  >
                    <Check size={13} strokeWidth={2.5} aria-hidden />
                  </motion.span>
                ))}
            </AnimatePresence>
            <span>{t(STATUS_LABEL_KEY[status])}</span>
          </span>
        </div>

        {/* Total */}
        <div className="mt-5 flex items-baseline justify-between">
          <span className={`text-xs text-rizq-ink-soft ${font}`}>
            {isAr ? "الإجمالي" : "Total"}
          </span>
          <span className="text-2xl font-bold text-rizq-ink tabular">
            {nf.format(TOTAL)}{" "}
            <span className={`text-sm font-medium text-rizq-ink-soft ${font}`}>
              {currency}
            </span>
          </span>
        </div>
      </div>

      {/* Advance button */}
      <button
        type="button"
        onClick={advance}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-rizq-green/25 bg-rizq-green/8 px-4 py-2.5 text-sm font-semibold text-rizq-green transition-colors hover:bg-rizq-green/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green focus-visible:ring-offset-2 min-h-[44px] ${font}`}
      >
        <span>{t("demos.invoiceAdvance")}</span>
        <span className="rtl:rotate-180" aria-hidden>
          →
        </span>
      </button>
    </div>
  );
}
