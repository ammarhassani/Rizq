/**
 * ClientGigHistory — gig history list. Phase-3 task 3.2.
 */

import { useTranslations } from "next-intl";

type Gig = {
  id: string;
  title: string;
  amount_sar: number;
  status: string;
  delivery_date: string | null;
  created_at: string;
};

type Props = {
  locale: "ar" | "en";
  gigs: Gig[];
};

const GIG_STATUS_STYLES: Record<string, string> = {
  pending: "bg-rizq-ink/8 text-rizq-ink-soft",
  deposit_paid: "status-info",
  in_progress: "status-pending",
  delivered: "bg-purple-50 text-purple-700",
  paid: "status-positive",
  overdue: "status-overdue",
  cancelled: "bg-rizq-ink/6 text-rizq-ink-soft/60",
};

const GIG_STATUS_AR: Record<string, string> = {
  pending: "بانتظار", deposit_paid: "دفعة مقدمة", in_progress: "جارٍ",
  delivered: "مُسلَّم", paid: "مدفوع", overdue: "متأخر", cancelled: "ملغى",
};
const GIG_STATUS_EN: Record<string, string> = {
  pending: "Pending", deposit_paid: "Deposit paid", in_progress: "In progress",
  delivered: "Delivered", paid: "Paid", overdue: "Overdue", cancelled: "Cancelled",
};

function fmtPrice(n: number, locale: "ar" | "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }).format(n);
}

function fmtDate(iso: string | null, locale: "ar" | "en"): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    }).format(new Date(iso));
  } catch { return iso; }
}

export function ClientGigHistory({ locale, gigs }: Props) {
  if (gigs.length === 0) return null;
  const tI18n = useTranslations("Clients.detail");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";
  const heading = tI18n("gigs");

  return (
    <section className="mt-6 mb-6">
      <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{heading}</h2>
      <div className="space-y-2">
        {gigs.map((g) => (
          <div
            key={g.id}
            dir={dir}
            className={`flex items-start justify-between gap-4 rounded-xl border border-rizq-gold/15 bg-[var(--raised)] px-4 py-3 ${font}`}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-rizq-ink truncate">{g.title}</p>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${GIG_STATUS_STYLES[g.status] ?? GIG_STATUS_STYLES.pending}`}>
                  {isAr ? GIG_STATUS_AR[g.status] : GIG_STATUS_EN[g.status]}
                </span>
                {g.delivery_date && (
                  <span className={`text-xs text-rizq-ink-soft/60 ${font}`}>{fmtDate(g.delivery_date, locale)}</span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-end">
              <p className="tabular font-sans text-sm font-semibold text-rizq-ink leading-none">{fmtPrice(g.amount_sar, locale)}</p>
              <p className={`text-xs text-rizq-ink-soft/60 mt-0.5 ${font}`}>{tI18n("sar")}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
