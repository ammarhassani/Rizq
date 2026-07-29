/**
 * ProjectInvoicesList — Feature 002 (Project hub), task T020.
 * Lists the invoices billed against a project, each linking to the invoice.
 * Server component.
 */
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fmtMoney } from "@/lib/format/number";

type Locale = "ar" | "en";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Invoice = any;

const STATUS_LABELS_AR: Record<string, string> = {
  draft: "مسودة",
  sent: "مُرسَلة",
  viewed: "مُشاهَدة",
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

function fmtPrice(n: number | null, locale: Locale): string {
  if (n == null || !isFinite(Number(n))) return "—";
  return fmtMoney(Number(n), locale === "ar" ? "ar" : "en");
}

export async function ProjectInvoicesList({
  invoices,
  locale,
}: {
  invoices: Invoice[];
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "Projects" });
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const font = isAr ? "font-arabic" : "font-sans";

  return (
    <section className="mb-6">
      <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{t("invoicesTitle")}</h2>

      {invoices.length === 0 ? (
        <div className={`rounded-2xl border border-rizq-gold/20 bg-[var(--raised)] px-5 py-4 text-sm text-rizq-ink-soft ${font}`}>
          {t("invoicesEmpty")}
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => {
            const label = isAr
              ? STATUS_LABELS_AR[inv.status] ?? inv.status
              : STATUS_LABELS_EN[inv.status] ?? inv.status;
            return (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}` as `/invoices/${string}`}
                dir={dir}
                className={`flex items-center justify-between gap-3 rounded-xl border border-rizq-gold/15 bg-[var(--raised)] px-4 py-3 hover:border-rizq-green/30 hover:bg-rizq-cream/80 transition-all ${font}`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className={`text-sm font-medium text-rizq-ink truncate ${font}`}>
                    {inv.invoice_number}
                  </span>
                  <span className={`text-xs text-rizq-ink-soft/70 ${font}`}>{label}</span>
                </span>
                <span className="tabular font-sans text-sm font-semibold text-rizq-ink">
                  {fmtPrice(inv.total_sar, locale)} {t("sar")}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
