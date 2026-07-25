/**
 * GigCard — Income Ledger card for a single gig. Phase-3 task 3.7.
 */
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export type GigRow = {
  id: string;
  title: string;
  amount_sar: number;
  deposit_sar: number | null;
  remaining_sar: number | null;
  status: string;
  delivery_date: string | null;
  ai_anomaly_flag: boolean | null;
  client_id: string | null;
  client_name?: string | null; // joined in
  project_id?: string | null; // feature 002 — link the card to its project hub
};

type Props = {
  gig: GigRow;
  locale: "ar" | "en";
  /** When provided, replaces the static status badge (e.g. an interactive status
   *  quick-edit on the list) so there's only one status indicator, no overlap. */
  statusSlot?: React.ReactNode;
};

const STATUS_STYLES: Record<string, string> = {
  paid: "status-positive",
  pending: "status-pending",
  deposit_paid: "status-pending",
  in_progress: "status-info",
  delivered: "status-info",
  overdue: "status-overdue",
  cancelled: "bg-rizq-ink/8 text-rizq-ink-soft",
};

const STATUS_LABELS_AR: Record<string, string> = {
  paid: "مدفوع",
  pending: "قيد الانتظار",
  deposit_paid: "دفعة مقدمة",
  in_progress: "جاري",
  delivered: "مُسلَّم",
  overdue: "متأخر",
  cancelled: "ملغى",
};

const STATUS_LABELS_EN: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  deposit_paid: "Deposit paid",
  in_progress: "In progress",
  delivered: "Delivered",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

function fmtDate(iso: string | null, locale: "ar" | "en"): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(iso + "T00:00:00"));
  } catch { return iso; }
}

function fmtPrice(n: number, locale: "ar" | "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  }).format(n);
}

export function GigCard({ gig, locale, statusSlot }: Props) {
  const tI18n = useTranslations("Income.list");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const statusLabel = isAr
    ? STATUS_LABELS_AR[gig.status] ?? gig.status
    : STATUS_LABELS_EN[gig.status] ?? gig.status;
  const statusStyle = STATUS_STYLES[gig.status] ?? STATUS_STYLES.pending;

  return (
    <Link
      href={
        (gig.project_id
          ? `/projects/${gig.project_id}`
          : `/income/${gig.id}`) as `/projects/${string}` | `/income/${string}`
      }
      className={`group block rounded-2xl border border-rizq-gold/20 bg-[var(--raised)] hover:bg-rizq-cream/90 hover:border-rizq-green/30 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 p-5 ${font}`}
    >
      <div dir={dir} className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-semibold text-rizq-ink leading-snug group-hover:text-rizq-green transition-colors truncate">
              {gig.title}
            </p>
            {gig.ai_anomaly_flag && (
              <span title={tI18n("anomalyDetected")} className="text-[var(--warn)] text-sm" aria-label="anomaly">
                ❗
              </span>
            )}
          </div>
          {gig.client_name && (
            <p className={`mt-0.5 text-sm text-rizq-ink-soft truncate ${font}`}>{gig.client_name}</p>
          )}
          {gig.delivery_date && (
            <p className="mt-1 text-xs text-rizq-ink-soft/60">
              {tI18n("due")} {fmtDate(gig.delivery_date, locale)}
            </p>
          )}
        </div>
        <div className="shrink-0 text-end flex flex-col items-end gap-1.5">
          <p className="tabular font-sans text-base font-bold text-rizq-green leading-none">
            {fmtPrice(gig.amount_sar, locale)}
          </p>
          <p className={`text-xs text-rizq-ink-soft/60 ${font}`}>{tI18n("sar")}</p>
          {statusSlot ?? (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle} ${font}`}>
              {statusLabel}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
