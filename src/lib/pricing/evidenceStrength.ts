/**
 * Evidence strength — the human-readable replacement for the raw confidence percentage.
 *
 * `aggregate.confidence_score` is a product of weights:
 *
 *   mean(provenanceWeight × row.confidence × freshnessDecay) × min(1, n / 10)
 *
 * The highest provenance weight in the taxonomy is `published_ref` at 0.6, and the highest
 * confidence a source can earn is 0.9 (a published sample of 50,000+, see
 * `sourceConfidence.ts`), so the mean weight cannot exceed 0.54.
 *
 * That ceiling was 0.36 until feature 012, when confidence stopped being hand-set at 0.5–0.6
 * and started tracking each source's published sample. The constant is not decoration: the
 * test below asserts the top band is reachable at the maximum, so leaving it stale would let
 * the bands drift out of calibration without anything failing.
 *
 * Printed as "Confidence: 12%" that reads as twelve-out-of-a-hundred, and a hundred is
 * unreachable by construction — the scale has no attainable top. Renormalising so 0.36
 * displays as 100% would be worse: it would make today's genuinely thin cells look
 * certain. So the number stops being shown, and the same score maps to a band whose
 * thresholds are set against the range that is actually achievable.
 *
 * Thresholds are deliberately coarse. A band is a claim about how much evidence stands
 * behind a price; three honest steps beat a precise number nobody can interpret.
 */

export type EvidenceStrength = "limited" | "moderate" | "good";

/**
 * Ceiling the score can reach: best provenance (`published_ref`, 0.6) × best earnable
 * confidence (0.9, from a published sample of 50,000+) × a fresh capture × a full sample.
 */
export const MAX_ATTAINABLE_SCORE = 0.54;

export function evidenceStrength(confidenceScore: number): EvidenceStrength {
  if (!Number.isFinite(confidenceScore) || confidenceScore < 0.1) return "limited";
  if (confidenceScore < 0.2) return "moderate";
  return "good";
}
