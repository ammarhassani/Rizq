/**
 * TrendChart — bespoke, brand-matched area+line sparkline (server-safe).
 *
 * Renders a responsive SVG of a short monthly series (≤12 points). No client
 * JS: the draw-in animation is pure CSS (see globals.css `.chart-draw-*`),
 * gated by `prefers-reduced-motion`. Safe to render inside server components.
 *
 * RTL: in Arabic a time series reads right-to-left — the most-recent month
 * sits on the LEFT. We reverse the plotted order for `locale === "ar"` so the
 * latest point lands on the left edge, matching how the rest of the UI flows.
 *
 * Accessibility: the <svg> carries role="img" + a localized aria-label that
 * summarizes the trend (count of months + peak). Decorative geometry is
 * aria-hidden.
 */

import { useTranslations } from "next-intl";

type Point = { label: string; value: number };

type Props = {
  points: Point[];
  locale: "ar" | "en";
  currency?: string;
  height?: number;
  valueFormat?: "money" | "plain";
  /** Show the prominent latest-value header. Default true. Hosts that already
   *  display the headline figure (e.g. the dashboard widget) can pass false. */
  showLatest?: boolean;
};

function fmtNumber(n: number, locale: "ar" | "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtValue(
  n: number,
  locale: "ar" | "en",
  valueFormat: "money" | "plain",
  currency: string
): string {
  const num = fmtNumber(n, locale);
  if (valueFormat === "plain") return num;
  return locale === "ar" ? `${num} ${currency}` : `${num} ${currency}`;
}

export function TrendChart({
  points,
  locale,
  currency = "SAR",
  height = 120,
  valueFormat = "money",
  showLatest = true,
}: Props) {
  const tI18n = useTranslations("Tool.result");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const curr = isAr && currency === "SAR" ? "ريال" : currency;

  // Need at least 2 points to draw a trend.
  if (!points || points.length < 2) {
    return (
      <div
        dir={isAr ? "rtl" : "ltr"}
        className={`flex items-center justify-center card-wahaj-sm px-4 py-6 text-center text-sm text-rizq-ink-soft ${font}`}
        style={{ minHeight: height }}
      >
        {tI18n("enoughDataYet")}
      </div>
    );
  }

  // RTL: latest month on the left → reverse the visual order so index 0 (the
  // earliest month) plots on the right edge.
  const ordered = isAr ? [...points].slice().reverse() : points;

  const values = ordered.map((p) => p.value);
  const rawMax = Math.max(...values);
  const rawMin = Math.min(...values);
  // Pad the band so a flat-ish series still reads as a line, not a baseline.
  const max = rawMax === rawMin ? rawMax + 1 : rawMax;
  const min = rawMax === rawMin ? Math.max(0, rawMin - 1) : rawMin;

  // viewBox geometry. Width is arbitrary (scales via width:100%); we use 320.
  const W = 320;
  const H = height;
  const padX = 10;
  const padTop = 14;
  const padBottom = 18;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;

  const n = ordered.length;
  const xAt = (i: number) => padX + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v: number) =>
    padTop + innerH - ((v - min) / (max - min || 1)) * innerH;

  const linePoints = ordered.map((p, i) => ({ x: xAt(i), y: yAt(p.value) }));

  const linePath = linePoints
    .map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`)
    .join(" ");

  const areaPath =
    `M${linePoints[0].x.toFixed(2)} ${(padTop + innerH).toFixed(2)} ` +
    linePoints.map((pt) => `L${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join(" ") +
    ` L${linePoints[n - 1].x.toFixed(2)} ${(padTop + innerH).toFixed(2)} Z`;

  // The "latest" point is the most-recent month = last entry of the original
  // (unreversed) series. After RTL reversal it sits at visual index 0.
  const latestVisualIndex = isAr ? 0 : n - 1;
  const latestMarker = linePoints[latestVisualIndex];

  // Latest figure + peak/first-last labels (in calendar order, not visual).
  const latest = points[points.length - 1];
  const first = points[0];
  const peakValue = Math.max(...points.map((p) => p.value));

  // Unique ids so multiple charts on one page don't collide on gradient defs.
  const uid = `tc-${ordered.map((p) => p.label).join("").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}-${n}-${Math.round(peakValue)}`;

  const ariaLabel = isAr
    ? `اتجاه الدخل الشهري لآخر ${fmtNumber(n, locale)} أشهر، أعلى قيمة ${fmtValue(peakValue, locale, valueFormat, curr)}`
    : `Monthly income trend, last ${fmtNumber(n, locale)} months, peak ${fmtValue(peakValue, locale, valueFormat, curr)}`;

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="w-full">
      {/* Latest value, prominent */}
      {showLatest && (
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="tabular font-sans text-2xl font-bold leading-none text-rizq-green">
            {fmtValue(latest.value, locale, valueFormat, curr)}
          </p>
          <p className={`mt-0.5 text-xs text-rizq-ink-soft ${font}`}>{latest.label}</p>
        </div>
        <p className={`text-xs text-rizq-ink-soft/70 ${font}`}>
          {tI18n("peak")}{" "}
          <span className="tabular font-sans font-semibold text-rizq-ink-soft">
            {fmtNumber(peakValue, locale)}
          </span>
        </p>
      </div>
      )}

      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        className="block overflow-visible"
      >
        <defs aria-hidden>
          <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--acc)" stopOpacity="0.18" />
            <stop offset="55%" stopColor="var(--gold)" stopOpacity="0.10" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${uid}-line`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--acc)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
        </defs>

        {/* Soft area fill under the line */}
        <path
          aria-hidden
          d={areaPath}
          fill={`url(#${uid}-area)`}
          className="chart-area-fill motion-reduce:opacity-100"
        />

        {/* The trend line — clean 1.5px stroke with a draw-in animation */}
        <path
          aria-hidden
          d={linePath}
          fill="none"
          stroke={`url(#${uid}-line)`}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="chart-line-draw motion-reduce:[stroke-dasharray:none] motion-reduce:[stroke-dashoffset:0]"
        />

        {/* Subtle latest-point marker: gold dot with a cream ring */}
        <circle
          aria-hidden
          cx={latestMarker.x}
          cy={latestMarker.y}
          r="4.5"
          fill="var(--raised)"
          stroke="var(--acc)"
          strokeWidth="1.5"
          className="chart-dot-pop motion-reduce:opacity-100"
        />
        <circle aria-hidden cx={latestMarker.x} cy={latestMarker.y} r="2" fill="var(--gold)" />
      </svg>

      {/* First / last month labels (calendar order; flexbox handles RTL flip) */}
      <div className={`mt-1.5 flex justify-between text-[10px] text-rizq-ink-soft/60 ${font}`}>
        <span>{first.label}</span>
        <span>{latest.label}</span>
      </div>
    </div>
  );
}
