"use client";

/**
 * InvoiceListClient — client island for the invoices list page.
 * Phase-4 task P4.4. Mirrors IncomeListClient in structure and pattern.
 */

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AnimatedNumber } from "@/components/tool/AnimatedNumber";
import { MotionList, MotionItem } from "@/components/motion/MotionList";
import { InvoiceCard, type InvoiceRow } from "./InvoiceCard";
import { InvoiceStatusQuickEdit } from "./InvoiceStatusQuickEdit";
import { isOverdue } from "@/lib/invoices/overdue";

type FilterChip = "all" | "draft" | "sent" | "paid" | "overdue";

type InvoiceSummary = {
  issuedTotal: number;
  paidTotal: number;
  overdueTotal: number;
  overdueCount: number;
};

type Props = {
  invoices: InvoiceRow[];
  summary: InvoiceSummary;
  locale: "ar" | "en";
};

function fmtMoney(n: number, locale: "ar" | "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  }).format(n);
}

export function InvoiceListClient({ invoices, summary, locale }: Props) {
  const t = useTranslations("Invoices.list");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [filter, setFilter] = useState<FilterChip>("all");

  const today = new Date();

  const filtered = useMemo(() => {
    let list = [...invoices];

    if (filter === "draft") {
      list = list.filter((inv) => inv.status === "draft");
    } else if (filter === "sent") {
      list = list.filter((inv) => inv.status === "sent" || inv.status === "viewed");
    } else if (filter === "paid") {
      list = list.filter((inv) => inv.status === "paid");
    } else if (filter === "overdue") {
      list = list.filter((inv) => isOverdue(inv.status, inv.due_date, today));
    }

    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, filter]);

  const chips: Array<{ key: FilterChip; label: string }> = [
    { key: "all", label: t("filterAll") },
    { key: "draft", label: t("filterDraft") },
    { key: "sent", label: t("filterSent") },
    { key: "paid", label: t("filterPaid") },
    { key: "overdue", label: t("filterOverdue") },
  ];

  return (
    <div className="space-y-4 pb-20">
      {/* Month summary card */}
      <div
        className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-6 sm:p-8 ${font}`}
        dir={dir}
      >
        <div className="flex flex-wrap gap-6">
          <div>
            <p className={`text-xs text-rizq-ink-soft/60 mb-0.5 ${font}`}>
              {t("summaryIssued")}
            </p>
            <p className="tabular font-sans text-xl font-bold text-rizq-ink leading-none">
              <AnimatedNumber value={summary.issuedTotal} locale={locale} duration={0.9} />
              <span className={`ms-1.5 text-xs font-normal text-rizq-ink-soft/60 ${font}`}>
                {isAr ? "ر.س" : "SAR"}
              </span>
            </p>
          </div>
          <div>
            <p className={`text-xs text-rizq-ink-soft/60 mb-0.5 ${font}`}>
              {t("summaryPaid")}
            </p>
            <p className="tabular font-sans text-xl font-bold text-[var(--acc)] leading-none">
              <AnimatedNumber value={summary.paidTotal} locale={locale} duration={0.9} />
              <span className={`ms-1.5 text-xs font-normal text-[var(--acc)]/60 ${font}`}>
                {isAr ? "ر.س" : "SAR"}
              </span>
            </p>
          </div>
          {summary.overdueTotal > 0 && (
            <div>
              <p className={`text-xs text-rizq-ink-soft/60 mb-0.5 ${font}`}>
                {t("summaryOverdue")}
                {summary.overdueCount > 0 && (
                  <span className={`ms-1 text-[var(--over)] font-semibold ${font}`}>
                    ({summary.overdueCount})
                  </span>
                )}
              </p>
              <p className="tabular font-sans text-xl font-bold text-[var(--over)] leading-none">
                {fmtMoney(summary.overdueTotal, locale)}
                <span className={`ms-1.5 text-xs font-normal text-[var(--over)]/60 ${font}`}>
                  {isAr ? "ر.س" : "SAR"}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div dir={dir} className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setFilter(c.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
              filter === c.key
                ? "bg-rizq-green text-rizq-cream"
                : "border border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink hover:border-rizq-green/40"
            } ${font}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className={`text-sm text-rizq-ink-soft/70 py-8 text-center ${font}`}>
          {t("noResults")}
        </p>
      ) : (
        <MotionList className="space-y-3">
          {filtered.map((invoice) => (
            <MotionItem key={invoice.id}>
              {/* The status quick-edit replaces the card's static status badge
                  (in-place), so there's exactly one status control, no overlap. */}
              <InvoiceCard
                invoice={invoice}
                locale={locale}
                statusSlot={
                  <InvoiceStatusQuickEdit invoiceId={invoice.id} current={invoice.status} locale={locale} />
                }
              />
            </MotionItem>
          ))}
        </MotionList>
      )}

    </div>
  );
}
