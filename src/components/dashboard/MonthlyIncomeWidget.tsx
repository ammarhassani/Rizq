import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
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

/**
 * Money hero — pixel-matched to the DC board (Rizq Wahaj): Space Grotesk 46px
 * aurora figure, solid +% chip, Space Mono paid/pending, a 78px goal ring, and
 * the goal line. Data is real (feature 006 goal).
 */
export function MonthlyIncomeWidget({ current, previous, trend, error, locale, goalSar }: Props) {
  const t = useTranslations("Dashboard");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";
  const unitLabel = t("currencySar");

  const totalSar = current?.total_sar ?? 0;
  const prevTotal = previous?.total_sar ?? null;
  const changePercent =
    prevTotal && prevTotal > 0 ? Math.round(((totalSar - prevTotal) / prevTotal) * 100) : null;

  const goalFrac = goalSar && goalSar > 0 ? Math.min(1, totalSar / goalSar) : 0;
  const goalPct = goalSar && goalSar > 0 ? Math.min(100, Math.round((totalSar / goalSar) * 100)) : null;
  const pctLabel = (n: number) => `${fmt(n, locale)}${t("text")}`;

  return (
    <div
      dir={dir}
      className="nm-raised relative overflow-hidden rounded-[22px] bg-[var(--raised)] px-6 py-[22px]"
    >
      {/* aurora orb — top inline-end */}
      <div
        aria-hidden
        className="orb-drift-a pointer-events-none absolute -top-16 h-56 w-56 rounded-full"
        style={{
          insetInlineEnd: "-30px",
          filter: "blur(70px)",
          opacity: 0.2,
          background: "radial-gradient(circle, var(--acc), transparent 70%)",
        }}
      />

      {error ? (
        <WidgetError locale={locale} />
      ) : totalSar === 0 && !current ? (
        <div className={`relative py-4 text-center ${font}`}>
          <p className={`mb-1 text-sm font-medium text-[var(--content-muted)] ${font}`}>
            {t("thisMonth")}
          </p>
          <p className={`mb-3 text-sm text-[var(--content-muted)] ${font}`}>
            {t("noIncomeThisMonth")}
          </p>
          <Link
            href="/income/new"
            className={`inline-flex items-center gap-1 text-sm text-[var(--acc)] hover:underline ${font}`}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("logProject")}
          </Link>
        </div>
      ) : (
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className={`mb-2 text-xs font-medium text-[var(--content-muted)] ${font}`}>
                {t("thisMonth")}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="aurora-text tabular font-sans text-[46px] font-bold leading-none tracking-tight">
                  <AnimatedNumber value={totalSar} locale={locale} duration={1.4} />
                </span>
                <span className={`text-[15px] text-[var(--content-muted)] ${font}`}>{unitLabel}</span>
                {changePercent !== null && (
                  <span
                    className="font-mono text-[11px] font-bold"
                    style={{
                      color: "var(--on-accent)",
                      background: "var(--fill)",
                      padding: "3px 8px",
                      borderRadius: "20px",
                      boxShadow: "var(--acc-glow)",
                    }}
                  >
                    {changePercent >= 0 ? "+" : ""}
                    {changePercent}%
                  </span>
                )}
              </div>
              {current && (
                <div className="mt-4 flex gap-6">
                  <div>
                    <div className={`text-[10px] text-[var(--content-faint)] ${font}`}>{t("paidLabel")}</div>
                    <div className="font-mono text-[15px] font-bold text-[var(--acc)]">{fmt(current.paid_sar, locale)}</div>
                  </div>
                  <div>
                    <div className={`text-[10px] text-[var(--content-faint)] ${font}`}>{t("pendingLabel")}</div>
                    <div className="font-mono text-[15px] font-bold text-[var(--warn)]">{fmt(current.pending_sar, locale)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Goal ring dial */}
            {goalPct !== null && (
              <div
                className="grid h-[78px] w-[78px] shrink-0 place-items-center rounded-full"
                style={{
                  ["--gp"]: goalFrac,
                  background:
                    "conic-gradient(var(--acc) 0turn calc(var(--gp) * 1turn), var(--track) calc(var(--gp) * 1turn) 1turn)",
                  boxShadow: "var(--acc-glow-strong)",
                  animation: "ringfill 1.7s cubic-bezier(0.22, 1, 0.36, 1) both",
                } as React.CSSProperties}
                aria-hidden
              >
                <div className="nm-inset grid h-[58px] w-[58px] place-items-center rounded-full bg-[var(--raised)]">
                  <span className="font-mono text-[15px] font-bold text-[var(--content)]">{pctLabel(goalPct)}</span>
                </div>
              </div>
            )}
          </div>

          {trend && trend.length >= 2 && (
            <div className="mt-3">
              <TrendChart points={trend} locale={locale} height={52} showLatest={false} />
            </div>
          )}

          {goalPct !== null && (
            <div className={`mt-2 flex justify-between text-[10px] text-[var(--content-faint)] ${font}`}>
              <span>
                {t("monthlyGoal")} {fmt(goalSar ?? 0, locale)} {unitLabel}
              </span>
              <span className="text-[var(--acc)]">{pctLabel(goalPct)} {t("goalReached")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
