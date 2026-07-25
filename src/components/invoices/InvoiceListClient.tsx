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

  const counts = useMemo(() => {
    let paid = 0, sent = 0;
    for (const inv of invoices) {
      if (inv.status === "paid") paid++;
      else if (inv.status === "sent" || inv.status === "viewed") sent++;
    }
    return { paid, sent };
  }, [invoices]);
  const outstanding = Math.max(0, summary.issuedTotal - summary.paidTotal);

  const chips: Array<{ key: FilterChip; label: string }> = [
    { key: "all", label: t("filterAll") },
    { key: "draft", label: t("filterDraft") },
    { key: "sent", label: t("filterSent") },
    { key: "paid", label: t("filterPaid") },
    { key: "overdue", label: t("filterOverdue") },
  ];

  return (
    <div className="space-y-4 pb-20">
      {/* ── Board summary tiles (Wahaj DC invoices) ─────────────────────── */}
      <div dir={dir} className="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
        <div className="nm-raised rounded-[20px] bg-[var(--raised)] p-[18px]">
          <div className={`mb-2 flex items-center gap-1.5 text-[11px] font-medium text-[var(--content-muted)] ${font}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--acc)" }} />
            {t("summaryPaid")}
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--content)]">
            <AnimatedNumber value={summary.paidTotal} locale={locale} duration={0.9} />
          </div>
          <div className={`mt-0.5 text-[10px] text-[var(--content-faint)] ${font}`}>
            {fmtMoney(counts.paid, locale)} {t("invoices")}
          </div>
        </div>
        <div className="nm-raised rounded-[20px] bg-[var(--raised)] p-[18px]">
          <div className={`mb-2 flex items-center gap-1.5 text-[11px] font-medium text-[var(--content-muted)] ${font}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--warn)" }} />
            {t("filterSent")}
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--content)]">
            <AnimatedNumber value={outstanding} locale={locale} duration={0.9} />
          </div>
          <div className={`mt-0.5 text-[10px] text-[var(--content-faint)] ${font}`}>
            {fmtMoney(counts.sent, locale)} {t("invoices")}
          </div>
        </div>
        <div className="nm-raised rounded-[20px] bg-[var(--raised)] p-[18px]">
          <div className={`mb-2 flex items-center gap-1.5 text-[11px] font-medium text-[var(--content-muted)] ${font}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--over)" }} />
            {t("summaryOverdue")}
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--over)]">
            {fmtMoney(summary.overdueTotal, locale)}
          </div>
          <div className={`mt-0.5 text-[10px] text-[var(--content-faint)] ${font}`}>
            {summary.overdueCount > 0
              ? `${fmtMoney(summary.overdueCount, locale)} ${t("invoices")}`
              : t("none")}
          </div>
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
                ? "aurora-fill"
                : "nm-raised-sm bg-[var(--raised)] text-[var(--content-2)] hover:text-[var(--acc)]"
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
