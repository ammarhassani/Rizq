/**
 * ProjectMoneyPanel — Feature 002 (Project hub), task T019.
 *
 * The single-project money view. Reuses the layout/labels of the income detail
 * screen (header card + deposit/final payment timeline) so a project's money
 * reads identically to the old /income/[id] page. Server component.
 */
import { getTranslations } from "next-intl/server";
import { fmtMoney } from "@/lib/format/number";

type Locale = "ar" | "en";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Gig = any;

function fmtPrice(n: number | null, locale: Locale): string {
  if (n == null || !isFinite(Number(n))) return "—";
  return fmtMoney(Number(n), locale === "ar" ? "ar" : "en");
}

function fmtDateTime(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export async function ProjectMoneyPanel({ gig, locale }: { gig: Gig; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Income.detail" });
  const tp = await getTranslations({ locale, namespace: "Projects" });
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const font = isAr ? "font-arabic" : "font-sans";

  if (!gig) return null;

  const depositDone = gig.status !== "pending";
  const finalDone = gig.status === "paid";

  return (
    <section className="mb-6">
      <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{tp("moneyTitle")}</h2>

      {/* Amount + status header */}
      <div className={`card-wahaj p-6 sm:p-8 mb-4 ${font}`}>
        <div dir={dir} className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {gig.description && (
              <p className={`text-sm text-rizq-ink-soft ${font}`}>{gig.description}</p>
            )}
          </div>
          <div className="shrink-0 text-end">
            <p className="tabular font-sans text-2xl font-bold text-rizq-green leading-none">
              {fmtPrice(gig.amount_sar, locale)}
            </p>
            <p className={`text-xs text-rizq-ink-soft/60 ${font}`}>{t("sar")}</p>
          </div>
        </div>
      </div>

      {/* Payment timeline */}
      <div className={`rounded-2xl border border-rizq-gold/20 bg-[var(--raised)] p-5 space-y-4 ${font}`}>
        <div dir={dir} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm ${
                depositDone ? "bg-emerald-100 text-[var(--acc)]" : "bg-rizq-gold/15 text-rizq-ink-soft"
              }`}
            >
              {depositDone ? "✓" : "○"}
            </span>
            <div>
              <p className={`text-sm font-medium text-rizq-ink ${font}`}>{t("depositLabel")}</p>
              {gig.deposit_paid_at && (
                <p className="text-xs text-rizq-ink-soft/60">{fmtDateTime(gig.deposit_paid_at, locale)}</p>
              )}
            </div>
          </div>
          <div className="text-end">
            <p className="tabular font-sans text-sm font-semibold text-rizq-ink">
              {fmtPrice(gig.deposit_sar ?? null, locale)}
            </p>
            <p className={`text-xs text-rizq-ink-soft/60 ${font}`}>{t("sar")}</p>
          </div>
        </div>

        <div className="border-l-2 border-dashed border-rizq-gold/25 ms-4 h-4" aria-hidden />

        <div dir={dir} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm ${
                finalDone ? "bg-emerald-100 text-[var(--acc)]" : "bg-rizq-gold/15 text-rizq-ink-soft"
              }`}
            >
              {finalDone ? "✓" : "○"}
            </span>
            <div>
              <p className={`text-sm font-medium text-rizq-ink ${font}`}>{t("finalPaymentLabel")}</p>
              {gig.final_paid_at && (
                <p className="text-xs text-rizq-ink-soft/60">{fmtDateTime(gig.final_paid_at, locale)}</p>
              )}
            </div>
          </div>
          <div className="text-end">
            <p className="tabular font-sans text-sm font-semibold text-rizq-ink">
              {fmtPrice(gig.remaining_sar ?? null, locale)}
            </p>
            <p className={`text-xs text-rizq-ink-soft/60 ${font}`}>{t("sar")}</p>
          </div>
        </div>
      </div>

      {/* Anomaly honesty banner (preserved) */}
      {gig.ai_anomaly_flag && gig.ai_anomaly_reason && (
        <div
          dir={dir}
          className={`mt-4 rounded-2xl border border-[var(--warn-line)] bg-[var(--warn-soft)] px-5 py-4 flex items-start gap-3 ${font}`}
        >
          <span className="text-amber-500 text-lg mt-0.5" aria-hidden>
            ❗
          </span>
          <div>
            <p className={`text-sm font-semibold text-amber-900 mb-0.5 ${font}`}>{t("anomalyTitle")}</p>
            <p className={`text-sm text-amber-800 ${font}`}>{gig.ai_anomaly_reason}</p>
          </div>
        </div>
      )}
    </section>
  );
}
