"use client";

/**
 * InvoiceListClient — client island for the invoices list page.
 * Phase-4 task P4.4. Mirrors IncomeListClient in structure and pattern.
 */

import { useState, useMemo, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { AnimatedNumber } from "@/components/tool/AnimatedNumber";
import { MotionList, MotionItem } from "@/components/motion/MotionList";
import { InvoiceCard, type InvoiceRow } from "./InvoiceCard";
import { markInvoiceStatus } from "@/app/actions/invoices/markInvoiceStatus";
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
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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

  function handleMarkPaid(invoiceId: string) {
    setMarkingId(invoiceId);
    startTransition(async () => {
      await markInvoiceStatus({ invoice_id: invoiceId, status: "paid" });
      setMarkingId(null);
    });
  }

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
            <p className="tabular font-sans text-xl font-bold text-emerald-700 leading-none">
              <AnimatedNumber value={summary.paidTotal} locale={locale} duration={0.9} />
              <span className={`ms-1.5 text-xs font-normal text-emerald-700/60 ${font}`}>
                {isAr ? "ر.س" : "SAR"}
              </span>
            </p>
          </div>
          {summary.overdueTotal > 0 && (
            <div>
              <p className={`text-xs text-rizq-ink-soft/60 mb-0.5 ${font}`}>
                {t("summaryOverdue")}
                {summary.overdueCount > 0 && (
                  <span className={`ms-1 text-red-600 font-semibold ${font}`}>
                    ({summary.overdueCount})
                  </span>
                )}
              </p>
              <p className="tabular font-sans text-xl font-bold text-red-700 leading-none">
                {fmtMoney(summary.overdueTotal, locale)}
                <span className={`ms-1.5 text-xs font-normal text-red-700/60 ${font}`}>
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
            <MotionItem key={invoice.id} className="relative group/row">
              <InvoiceCard invoice={invoice} locale={locale} />
              {/* Quick "Mark paid" affordance for sent/viewed invoices */}
              {(invoice.status === "sent" || invoice.status === "viewed") && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleMarkPaid(invoice.id);
                  }}
                  disabled={markingId === invoice.id}
                  className={`absolute ${isAr ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-3 py-1.5 text-xs font-medium opacity-0 group-hover/row:opacity-100 transition-opacity focus:opacity-100 hover:bg-emerald-700 disabled:opacity-50 ${font}`}
                >
                  {markingId === invoice.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <span>{t("markPaid")}</span>
                  )}
                </button>
              )}
            </MotionItem>
          ))}
        </MotionList>
      )}

      {/* FAB — New invoice */}
      <div className={`fixed bottom-8 ${isAr ? "left-6" : "right-6"} z-50`}>
        <Link
          href="/invoices/new"
          className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream shadow-lg px-5 py-3.5 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
        >
          <span className="text-lg leading-none">+</span>
          {t("newInvoice")}
        </Link>
      </div>
    </div>
  );
}
