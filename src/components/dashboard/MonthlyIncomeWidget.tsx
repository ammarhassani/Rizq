import { Link } from "@/i18n/navigation";
import { Wallet, Plus } from "lucide-react";
import { AnimatedNumber } from "@/components/tool/AnimatedNumber";
import { TrendChart } from "@/components/charts/TrendChart";
import { WidgetError } from "./WidgetError";

type MonthlyRow = {
  month: string | null;
  total_sar: number | null;
  paid_sar: number | null;
  pending_sar: number | null;
};

type TrendPoint = { label: string; value: number };

type Props = {
  current: MonthlyRow | null;
  previous: MonthlyRow | null;
  trend?: TrendPoint[];
  error?: boolean;
  locale: "ar" | "en";
  /** The freelancer's personal monthly income goal (from onboarding/profile). feature 006 */
  goalSar?: number | null;
};

function fmt(n: number | null, locale: "ar" | "en"): string {
  if (n == null || !Number.isFinite(n)) return locale === "ar" ? "٠" : "0";
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }).format(n);
}

export function MonthlyIncomeWidget({ current, previous, trend, error, locale, goalSar }: Props) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const unitLabel = isAr ? "ريال" : "SAR";
  const conv = (sar: number | null): number | null => sar;

  const totalSar = current?.total_sar ?? 0;
  const prevTotal = previous?.total_sar ?? null;
  const changePercent =
    prevTotal && prevTotal > 0
      ? Math.round(((totalSar - prevTotal) / prevTotal) * 100)
      : null;

  // Progress toward the freelancer's own monthly goal (feature 006 — the profile
  // income goal becomes a parameter the dashboard renders against).
  const goalPct =
    goalSar && goalSar > 0 ? Math.min(100, Math.round((totalSar / goalSar) * 100)) : null;

  return (
    <div dir={dir} className="nm-raised rounded-[22px] bg-[var(--raised)] p-5 sm:p-6 flex flex-col gap-4">
      <div className={`flex items-center justify-between ${font}`}>
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-rizq-green opacity-70" />
          <span className={`text-sm font-semibold text-rizq-ink ${font}`}>
            {isAr ? "دخل الشهر" : "Monthly Income"}
          </span>
        </div>
        <Link href="/income" className={`text-xs text-rizq-green hover:underline ${font}`}>
          {isAr ? "عرض الكل ←" : "View all →"}
        </Link>
      </div>

      {error ? (
        <WidgetError locale={locale} />
      ) : totalSar === 0 && !current ? (
        <div className={`text-center py-4 ${font}`}>
          <p className={`text-sm text-rizq-ink-soft mb-3 ${font}`}>
            {isAr ? "ما سجّلت أي مشاريع هذا الشهر." : "No income logged this month."}
          </p>
          <Link
            href="/income/new"
            className={`inline-flex items-center gap-1 text-sm text-rizq-green hover:underline ${font}`}
          >
            <Plus className="h-3 w-3" />
            {isAr ? "سجّل مشروع" : "Log a project"}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="tabular font-sans text-4xl sm:text-5xl font-bold aurora-text-m leading-none">
                <AnimatedNumber value={conv(totalSar) ?? 0} locale={locale} duration={0.9} />
              </p>
              <p className={`text-xs text-rizq-ink-soft mt-0.5 ${font}`}>
                {isAr ? `${unitLabel} هذا الشهر` : `${unitLabel} this month`}
              </p>
            </div>
            {changePercent !== null && (
              <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular ${
                changePercent >= 0 ? "status-positive" : "status-overdue"
              }`}>
                {changePercent >= 0 ? "↑" : "↓"}{Math.abs(changePercent)}%
              </span>
            )}
          </div>

          {goalPct !== null && (
            <div className="pt-1">
              <div className={`flex items-center justify-between text-xs mb-1 ${font}`}>
                <span className="text-rizq-ink-soft/70">{isAr ? "هدفك الشهري" : "Your monthly goal"}</span>
                <span className="tabular font-semibold text-rizq-green">
                  {goalPct}% · {fmt(conv(goalSar ?? 0), locale)} {unitLabel}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[var(--track)] overflow-hidden">
                <div
                  className="h-full rounded-full aurora-fill transition-[width] duration-700"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
            </div>
          )}

          {trend && trend.length >= 2 && (
            <div className="pt-3 border-t border-[var(--line)]">
              <TrendChart points={trend} locale={locale} height={96} showLatest={false} />
            </div>
          )}

          {current && (
            <div className="flex gap-4 pt-2 border-t border-[var(--line)]">
              <div>
                <p className={`text-xs text-rizq-ink-soft/60 ${font}`}>{isAr ? "مدفوع" : "Paid"}</p>
                <p className="tabular text-sm font-semibold text-[var(--acc)]">{fmt(conv(current.paid_sar), locale)}</p>
              </div>
              <div>
                <p className={`text-xs text-rizq-ink-soft/60 ${font}`}>{isAr ? "قيد الدفع" : "Pending"}</p>
                <p className="tabular text-sm font-semibold text-[var(--warn)]">{fmt(conv(current.pending_sar), locale)}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
