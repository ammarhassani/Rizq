/**
 * How much sample stands behind a source's figure → the row's `confidence`.
 *
 * Every `published_ref` row used to carry a confidence set by hand at ingestion — 0.60 for a
 * directly published freelance rate, 0.50 for anything bridged from a salary or a currency.
 * That flattened the one thing the sources themselves disagree about most: YunoJuno reports
 * 182,000 booking data points and ProCopywriters reports 298 respondents, and the benchmark
 * trusted them identically. The figure was published by both, was written into the ingestion
 * comments, and was then thrown away at the point it mattered.
 *
 * Thresholds are an editorial judgement about the orders of magnitude that matter, not a
 * statistical derivation, and the spec records them as such. They are not tuned to make any
 * particular cell look better: applying this mapping to the live corpus RAISES 385 cells and
 * LOWERS 315, because the largest block of rows is a seed that publishes no sample at all and
 * currently holds the joint-highest confidence in the table.
 *
 * Scope: `published_ref` and `ingested` rows only. `founder` and `reasoned` publish no sample,
 * and dropping them into the unstated band would RAISE editorial rows from 0.30 to 0.50 — an
 * inflation wearing an honesty fix as a disguise. Their weakness is already expressed by
 * PROVENANCE_WEIGHT. The scoping lives at the call sites rather than here, so this stays a
 * pure mapping with no provenance taxonomy to keep in sync.
 *
 * PURE.
 */

/** Ordered high → low; the first band whose floor the sample reaches wins. */
export const SAMPLE_CONFIDENCE_BANDS: ReadonlyArray<{ min: number; confidence: number }> = [
  { min: 50_000, confidence: 0.9 },
  { min: 5_000, confidence: 0.8 },
  { min: 500, confidence: 0.7 },
  { min: 50, confidence: 0.6 },
];

/**
 * Where a source that states no sample lands — and deliberately the same value as the
 * weakest *stated* band, not lower. The column is a claim about sample size, not a penalty:
 * a publisher who omits the figure has told us nothing, and "nothing" is not evidence of a
 * small sample any more than it is of a large one. Absence earns no promotion; it earns no
 * punishment beyond the floor either.
 */
export const UNSTATED_SAMPLE_CONFIDENCE = 0.5;

/**
 * Total by construction — returns a number for every input and never throws. A malformed
 * figure from an upstream report must degrade to caution, not break an ingestion run.
 */
export function sourceConfidence(
  publishedSample: number | null | undefined
): number {
  if (
    typeof publishedSample !== "number" ||
    !Number.isFinite(publishedSample) ||
    publishedSample <= 0
  ) {
    return UNSTATED_SAMPLE_CONFIDENCE;
  }
  for (const band of SAMPLE_CONFIDENCE_BANDS) {
    if (publishedSample >= band.min) return band.confidence;
  }
  return UNSTATED_SAMPLE_CONFIDENCE;
}
