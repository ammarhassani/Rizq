/**
 * BandMeter — bespoke min→max market band with an anchor pin and an optional
 * second marker for the user's own rate (server-safe, no client JS).
 *
 * Generalizes the inline band previously in ProposalArtifact's PricingSection:
 * a gradient track (gold → green → gold), an anchor pin rendered as a green
 * bar with a cream ring, plus an optional distinct "your rate" marker.
 *
 * Markers are clamped to [min, max] so an out-of-band value still renders at
 * the edge rather than overflowing the track.
 *
 * RTL: in Arabic the LOW value sits on the right, high on the left. We flip
 * the percentage for `locale === "ar"` and let the flex labels mirror.
 *
 * Accessibility: the track carries role="img" + a localized aria-label
 * summarizing min/anchor/max (and the user value when present). The track
 * geometry itself is decorative.
 */

type Props = {
  min: number;
  anchor: number;
  max: number;
  value?: number | null;
  locale: "ar" | "en";
  currency?: string;
  minLabel?: string;
  maxLabel?: string;
  /** Legend label for the anchor pin. Defaults to "Market anchor"/"وسيط السوق". */
  anchorLabel?: string;
};

function fmtNumber(n: number, locale: "ar" | "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  }).format(n);
}

function clampPct(v: number, min: number, max: number): number {
  const range = max - min;
  if (!(range > 0)) return 50;
  const pct = ((v - min) / range) * 100;
  return Math.min(100, Math.max(0, pct));
}

export function BandMeter({
  min,
  anchor,
  max,
  value,
  locale,
  currency = "SAR",
  minLabel,
  maxLabel,
  anchorLabel,
}: Props) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const curr = isAr && currency === "SAR" ? "ريال" : currency;

  const anchorPct = clampPct(anchor, min, max);
  const hasValue = value != null && Number.isFinite(value);
  const valuePct = hasValue ? clampPct(value as number, min, max) : 0;

  // RTL: low on the right → mirror the offset.
  const place = (pct: number) => (isAr ? 100 - pct : pct);

  const lowLbl = minLabel ?? (isAr ? "الأدنى" : "Min");
  const highLbl = maxLabel ?? (isAr ? "الأعلى" : "Max");
  const anchorLbl = anchorLabel ?? (isAr ? "وسيط السوق" : "Market anchor");

  const ariaLabel = (() => {
    const base = isAr
      ? `نطاق السوق من ${fmtNumber(min, locale)} إلى ${fmtNumber(max, locale)} ${curr}، الوسيط ${fmtNumber(anchor, locale)}`
      : `Market range ${fmtNumber(min, locale)} to ${fmtNumber(max, locale)} ${curr}, anchor ${fmtNumber(anchor, locale)}`;
    if (hasValue) {
      return isAr
        ? `${base}، سعرك ${fmtNumber(value as number, locale)}`
        : `${base}, your rate ${fmtNumber(value as number, locale)}`;
    }
    return base;
  })();

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="w-full" role="img" aria-label={ariaLabel}>
      {/* Min / Max endpoint labels */}
      <div className={`mb-1.5 flex justify-between text-xs text-rizq-ink-soft ${font}`}>
        <span>
          {lowLbl}: <span className="tabular font-sans">{fmtNumber(min, locale)}</span> {curr}
        </span>
        <span>
          {highLbl}: <span className="tabular font-sans">{fmtNumber(max, locale)}</span> {curr}
        </span>
      </div>

      {/* Track — extra vertical room above for the "your rate" callout */}
      <div className="relative pt-5">
        <div className="relative h-2 rounded-full bg-rizq-gold/15 overflow-hidden">
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 right-0 rounded-full bg-gradient-to-r from-rizq-gold/30 via-rizq-green/40 to-rizq-gold/30"
          />
        </div>

        {/* Anchor pin — green bar with a cream ring (lifted from PricingSection) */}
        <span
          aria-hidden
          className="absolute top-5 h-4 w-1 -translate-y-0 rounded-full bg-rizq-green shadow-[0_0_0_3px_rgba(250,245,236,0.9)] chart-pin-rise motion-reduce:opacity-100"
          style={{
            left: `${place(anchorPct)}%`,
            transform: "translate(-50%, -3px)",
          }}
        />

        {/* Optional "your rate" marker — distinct gold dot + dropline + label */}
        {hasValue && (
          <span
            aria-hidden
            className="absolute"
            style={{ left: `${place(valuePct)}%`, top: 0, transform: "translateX(-50%)" }}
          >
            {/* dropline from the callout to the track */}
            <span className="absolute left-1/2 top-4 h-3 w-px -translate-x-1/2 bg-rizq-gold-deep/50" />
            {/* the marker dot, riding on the track */}
            <span className="absolute left-1/2 top-[1.375rem] h-3 w-3 -translate-x-1/2 rounded-full border-2 border-rizq-gold-deep bg-rizq-cream shadow-sm" />
          </span>
        )}
      </div>

      {/* Anchor + your-rate legend */}
      <div className={`mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] ${font}`}>
        <span className="inline-flex items-center gap-1.5 text-rizq-ink-soft">
          <span aria-hidden className="inline-block h-2.5 w-1 rounded-full bg-rizq-green" />
          {anchorLbl}:{" "}
          <span className="tabular font-sans font-semibold text-rizq-ink">
            {fmtNumber(anchor, locale)}
          </span>
        </span>
        {hasValue && (
          <span className="inline-flex items-center gap-1.5 text-rizq-ink-soft">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full border-2 border-rizq-gold-deep bg-rizq-cream"
            />
            {isAr ? "سعرك" : "Your rate"}:{" "}
            <span className="tabular font-sans font-semibold text-rizq-ink">
              {fmtNumber(value as number, locale)}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
