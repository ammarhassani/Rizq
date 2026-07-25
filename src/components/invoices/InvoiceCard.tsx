/**
 * InvoiceCard — Invoice list card. Phase-4 task P4.4.
 * Mirrors GigCard in structure, status colors, and RTL handling.
 */
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { isOverdue } from "@/lib/invoices/overdue";

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  total_sar: number;
  due_date: string | null;
  created_at: string;
  client_id: string | null;
  client_name?: string | null; // joined in
};

type Props = {
  invoice: InvoiceRow;
  locale: "ar" | "en";
  /** When provided, replaces the static status badge (e.g. an interactive
   *  status quick-edit on the list). Avoids rendering two status indicators. */
  statusSlot?: React.ReactNode;
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-rizq-ink/8 text-rizq-ink-soft",
  sent: "status-info",
  viewed: "status-info",
  paid: "status-positive",
  overdue: "status-overdue",
  cancelled: "bg-rizq-ink/8 text-rizq-ink-soft",
};

const STATUS_LABELS_AR: Record<string, string> = {
  draft: "مسودة",
  sent: "مُرسَلة",
  viewed: "مُطَّلَع عليها",
  paid: "مدفوعة",
  overdue: "متأخرة",
  cancelled: "ملغاة",
};

const STATUS_LABELS_EN: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

function fmtDate(iso: string | null, locale: "ar" | "en"): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(
      locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US",
      { month: "short", day: "numeric" }
    ).format(new Date(iso + "T00:00:00"));
  } catch {
    return iso;
  }
}

function fmtMoney(n: number, locale: "ar" | "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  }).format(n);
}

export function InvoiceCard({ invoice, locale, statusSlot }: Props) {
  const tI18n = useTranslations("Invoices.list");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const today = new Date();
  const overdueFlag = isOverdue(invoice.status, invoice.due_date, today);

  const statusLabel = isAr
    ? STATUS_LABELS_AR[invoice.status] ?? invoice.status
    : STATUS_LABELS_EN[invoice.status] ?? invoice.status;
  const statusStyle = STATUS_STYLES[invoice.status] ?? STATUS_STYLES.draft;

  const clientDisplay = invoice.client_name ?? (tI18n("unlinkedClient"));

  return (
    <Link
      href={`/invoices/${invoice.id}` as `/invoices/${string}`}
      className={`group block rounded-2xl border border-rizq-gold/20 bg-[var(--raised)] hover:bg-rizq-cream/90 hover:border-rizq-green/30 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 p-5 ${font}`}
    >
      <div dir={dir} className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Invoice number */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="tabular font-sans text-base font-semibold text-rizq-ink leading-snug group-hover:text-rizq-green transition-colors">
              {invoice.invoice_number}
            </p>
            {/* Overdue badge */}
            {overdueFlag && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium status-overdue ${font}`}>
                {tI18n("filterOverdue")}
              </span>
            )}
          </div>
          {/* Client name */}
          <p className={`mt-0.5 text-sm text-rizq-ink-soft truncate ${font}`}>
            {clientDisplay}
          </p>
          {/* Due date */}
          {invoice.due_date && (
            <p className="mt-1 text-xs text-rizq-ink-soft/60">
              {tI18n("due")}{" "}
              {fmtDate(invoice.due_date, locale)}
            </p>
          )}
        </div>
        <div className="shrink-0 text-end flex flex-col items-end gap-1.5">
          <p className="tabular font-sans text-base font-bold text-rizq-green leading-none">
            {fmtMoney(invoice.total_sar, locale)}
          </p>
          <p className={`text-xs text-rizq-ink-soft/60 ${font}`}>
            {tI18n("sar")}
          </p>
          {statusSlot ?? (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle} ${font}`}
            >
              {statusLabel}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
