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

/**
 * Which market the signal describes.
 *
 * A band resolves at the tightest scope with 3+ rows, but a *direction* needs 8 rows
 * across 3+ months — and no (specialty, city, tier) cell in the corpus has ever held
 * that many. The trend was therefore never shown to anyone. Rather than lowering the
 * gate (a direction from 5 clustered records is not a direction), the signal may be
 * computed on a wider row set and must then SAY so: a nationwide move presented as
 * "your market" would be exactly the kind of quiet overstatement Principle I forbids.
 */
export type TrendScope = "exact" | "region" | "national";

export type MarketTrend = {
  direction: TrendDirection;
  /** The market this move describes — the UI must name it. */
  scope: TrendScope;
  /** Signed percent change, recent vs older median, rounded to whole percent. */
  percent: number;
  /**
   * True when the real move exceeded the display clamp, so `percent` is a floor rather
   * than the measurement. The UI must then say "over N%" — printing the clamp as an exact
   * figure states a number nobody computed.
   */
  clamped: boolean;
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
 * Do the two halves price comparable work?
 *
 * Rows carry the project size they were recorded for (or null when the source did not say).
 * A period of small-task prices against a period of whole-project prices is not a market
 * move, it is a change of subject — so the halves must draw on the same set of bases.
 */
function sameBasis(older: AggRow[], recent: AggRow[]): boolean {
  const basis = (rows: AggRow[]) =>
    new Set(rows.map((r) => r.project_size ?? "unspecified"));
  const a = basis(older);
  const b = basis(recent);
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

/**
 * Compute a directional market signal from dated rows, or null if the data is
 * too thin/clustered to honestly support one. Pure — exported for unit tests.
 */
export function computeMarketTrend(
  rows: AggRow[],
  now: Date,
  scope: TrendScope = "exact",
): MarketTrend | null {
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

  // Both halves must price the SAME KIND of work, or the "move" is a change in what was
  // recorded rather than in what the market pays. Real case: seven sized-project records
  // at 250–610 SAR spread over six months, then one June batch of twenty-one records with
  // no project size at 2,550–5,350 — a different price basis entirely. The comparison
  // reported a +733% market rise (clamped to +200% for display) and the AI dutifully
  // narrated it. A direction is only honest across a like-for-like basis.
  if (!sameBasis(older, recent)) return null;

  const older_median = weightedMedian(older, now);
  const recent_median = weightedMedian(recent, now);
  if (older_median <= 0) return null;

  const rawPct = Math.round(((recent_median - older_median) / older_median) * 100);
  // Clamp so a thin outlier can't fabricate an absurd headline percent. Direction
  // is set from the (unclamped) sign; magnitude is bounded.
  const percent = Math.max(-MAX_PCT, Math.min(MAX_PCT, rawPct));
  const clamped = Math.abs(rawPct) > MAX_PCT;
  const direction: TrendDirection =
    rawPct > STABLE_BAND_PCT ? "rising" : rawPct < -STABLE_BAND_PCT ? "falling" : "stable";

  return {
    direction,
    scope,
    percent,
    clamped,
    recent_median,
    older_median,
    recent_count: recent.length,
    older_count: older.length,
    span_months,
    sample_size: usable.length,
    date_range: { earliest, latest },
  };
}
