/**
 * ClientInvoiceHistory — invoice history list for a client. Phase-4 task P4.7.
 * Mirrors ClientGigHistory. Shows invoice_number, total_sar, status badge,
 * due date, and an overdue flag (via isOverdue). Each row links to /invoices/[id].
 */

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { isOverdue } from "@/lib/invoices/overdue";

type Invoice = {
  id: string;
  invoice_number: string;
  total_sar: number;
  status: string;
  due_date: string | null;
  created_at: string;
};

type Props = {
  locale: "ar" | "en";
  invoices: Invoice[];
};

const INVOICE_STATUS_STYLES: Record<string, string> = {
  draft: "bg-rizq-ink/8 text-rizq-ink-soft",
  sent: "status-info",
  viewed: "bg-purple-50 text-purple-700",
  paid: "status-positive",
  overdue: "status-overdue",
  cancelled: "bg-rizq-ink/6 text-rizq-ink-soft/60",
};

const INVOICE_STATUS_AR: Record<string, string> = {
  draft: "مسودة",
  sent: "مُرسَلة",
  viewed: "مُطَّلَع عليها",
  paid: "مدفوعة",
  overdue: "متأخرة",
  cancelled: "ملغاة",
};

const INVOICE_STATUS_EN: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

function fmtPrice(n: number, locale: "ar" | "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string | null, locale: "ar" | "en"): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(
      locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US",
      { year: "numeric", month: "short", day: "numeric" }
    ).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ClientInvoiceHistory({ locale, invoices }: Props) {
  const tI18n = useTranslations("Clients.detail");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";
  const heading = isAr ? "سجل الفواتير" : "Invoice history";
  const emptyText = isAr ? "لا توجد فواتير لهذا العميل حتى الآن." : "No invoices for this client yet.";
  const today = new Date();

  if (invoices.length === 0) {
    return (
      <section className="mt-6 mb-6">
        <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{heading}</h2>
        <p className={`text-sm text-rizq-ink-soft/70 ${font}`}>{emptyText}</p>
      </section>
    );
  }

  return (
    <section className="mt-6 mb-6">
      <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{heading}</h2>
      <div className="space-y-2">
        {invoices.map((inv) => {
          const overdueFlag = isOverdue(inv.status, inv.due_date, today);
          return (
            <Link
              key={inv.id}
              href={`/invoices/${inv.id}` as `/invoices/${string}`}
              dir={dir}
              className={`flex items-start justify-between gap-4 rounded-xl border border-rizq-gold/15 bg-[var(--raised)] px-4 py-3 hover:border-rizq-green/30 hover:bg-rizq-cream/80 transition-all ${font}`}
            >
              <div className="min-w-0">
                <p className="tabular font-sans text-sm font-medium text-rizq-ink truncate">
                  {inv.invoice_number}
                </p>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${INVOICE_STATUS_STYLES[inv.status] ?? INVOICE_STATUS_STYLES.draft}`}
                  >
                    {isAr
                      ? INVOICE_STATUS_AR[inv.status] ?? inv.status
                      : INVOICE_STATUS_EN[inv.status] ?? inv.status}
                  </span>
                  {inv.due_date && (
                    <span className={`text-xs text-rizq-ink-soft/60 ${font}`}>
                      {isAr ? "الاستحقاق:" : "Due:"} {fmtDate(inv.due_date, locale)}
                    </span>
                  )}
                  {overdueFlag && (
                    <span className={`text-xs font-medium text-[var(--over)] ${font}`}>
                      {isAr ? "⚠ متأخرة" : "⚠ Overdue"}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-end">
                <p className="tabular font-sans text-sm font-semibold text-rizq-ink leading-none">
                  {fmtPrice(inv.total_sar, locale)}
                </p>
                <p className={`text-xs text-rizq-ink-soft/60 mt-0.5 ${font}`}>
                  {isAr ? "ريال" : "SAR"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
