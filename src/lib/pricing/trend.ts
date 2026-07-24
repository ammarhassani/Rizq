import type { AggRow } from "./aggregate";
import { freshnessDecay, monthsBetween } from "./freshness";
import { provenanceWeight } from "./provenance";
import { weightedPercentile } from "./weightedPercentile";

/**
 * Market trend — spec M4 "AI-trend layer", the HONEST half.
 *
 * A trend is a real directional signal computed from dated benchmark rows
 * (recent-half weighted median vs older-half), NOT an invented forecast. It is
 * emitted only when the data can actually support a direction — enough dated
 * samples, a wide enough time span, and both halves populated. Below those
 * gates we return null (no trend shown), because claiming a direction from 3
 * clustered records would violate Principle I (no invented confidence).
 *
 * The AI layer (src/lib/ai/marketTrend.ts) INTERPRETS this computed signal; it
 * never manufactures the direction.
 */

export type TrendDirection = "rising" | "falling" | "stable";

export type MarketTrend = {
  direction: TrendDirection;
  /** Signed percent change, recent vs older median, rounded to whole percent. */
  percent: number;
  recent_median: number;
  older_median: number;
  recent_count: number;
  older_count: number;
  span_months: number;
  sample_size: number;
  date_range: { earliest: string; latest: string };
};

// Gates — deliberately conservative. A trend claim is a data claim (Principle I).
const MIN_TREND_SAMPLE = 8; // need real mass before asserting a direction
const MIN_SPAN_MONTHS = 3; // two clustered days is not a trend
const MIN_BUCKET = 3; // each half needs its own support
const STABLE_BAND_PCT = 5; // within ±5% reads as "stable", not a move
const MAX_PCT = 200; // clamp: a thin bad-data outlier must not print "+9900%"

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Weighted median of a bucket, using the SAME provenance × confidence × freshness
 * weighting as the band (aggregate.ts). Keeps the trend consistent with the anchor
 * — a direction can't lean on rows the band deliberately down-weights.
 */
function weightedMedian(rows: AggRow[], now: Date): number {
  const pairs = rows.map((r) => ({
    value: r.price_sar,
    weight:
      provenanceWeight(r.provenance) *
      clamp01(r.confidence) *
      freshnessDecay(monthsBetween(new Date(r.captured_at), now)),
  }));
  return weightedPercentile(pairs, 0.5);
}

/**
 * Compute a directional market signal from dated rows, or null if the data is
 * too thin/clustered to honestly support one. Pure — exported for unit tests.
 */
export function computeMarketTrend(rows: AggRow[], now: Date): MarketTrend | null {
  const usable = rows.filter(
    (r) => Number.isFinite(r.price_sar) && r.price_sar >= 0 && !!r.captured_at,
  );
  if (usable.length < MIN_TREND_SAMPLE) return null;

  const sorted = [...usable].sort(
    (a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime(),
  );
  const earliest = sorted[0]!.captured_at;
  const latest = sorted[sorted.length - 1]!.captured_at;
  const span_months = monthsBetween(new Date(earliest), new Date(latest));
  if (span_months < MIN_SPAN_MONTHS) return null;

  // Split at the midpoint DATE (not the midpoint index) so a burst of records on
  // one day can't masquerade as "recent" — the split reflects real time.
  const midMs =
    (new Date(earliest).getTime() + new Date(latest).getTime()) / 2;
  const older = sorted.filter((r) => new Date(r.captured_at).getTime() < midMs);
  const recent = sorted.filter((r) => new Date(r.captured_at).getTime() >= midMs);
  if (older.length < MIN_BUCKET || recent.length < MIN_BUCKET) return null;

  const older_median = weightedMedian(older, now);
  const recent_median = weightedMedian(recent, now);
  if (older_median <= 0) return null;

  const rawPct = Math.round(((recent_median - older_median) / older_median) * 100);
  // Clamp so a thin outlier can't fabricate an absurd headline percent. Direction
  // is set from the (unclamped) sign; magnitude is bounded.
  const percent = Math.max(-MAX_PCT, Math.min(MAX_PCT, rawPct));
  const direction: TrendDirection =
    rawPct > STABLE_BAND_PCT ? "rising" : rawPct < -STABLE_BAND_PCT ? "falling" : "stable";

  return {
    direction,
    percent,
    recent_median,
    older_median,
    recent_count: recent.length,
    older_count: older.length,
    span_months,
    sample_size: usable.length,
    date_range: { earliest, latest },
  };
}
