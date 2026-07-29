/**
 * Evidence strength — the human-readable replacement for the raw confidence percentage.
 *
 * `aggregate.confidence_score` accumulates the strongest row of each independent evidence
 * family, then scales by the published observations behind the cell.
 *
 * Printed as a raw percentage it was uninterpretable — under the previous formula the scale
 * had no attainable top, so "12%" meant twelve out of a maximum of thirty-six. The number is
 * therefore not shown; the same score maps to a band whose thresholds are set against the
 * distribution that is actually observed.
 *
 * Thresholds recalibrated 2026-07-29 from 0.10/0.20 to 0.35/0.60, when the aggregation moved
 * from averaging rows to accumulating families. Leaving them would have put 441 of 700 live
 * cells in the top band and stopped the label discriminating at all. Current split at these
 * thresholds: 84 limited · 175 moderate · 441 good, against quartiles of 50.7 / 61.5 / 72.6.
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
 * Ceiling the score can reach. Since the score accumulates across evidence families rather
 * than averaging rows, it approaches 1 asymptotically: each additional independent family
 * closes part of the remaining gap without ever shutting it. No finite corpus reaches 1, and
 * the thresholds below are set against the distribution that is actually observed.
 */
export const MAX_ATTAINABLE_SCORE = 1.0;

export function evidenceStrength(confidenceScore: number): EvidenceStrength {
  if (!Number.isFinite(confidenceScore) || confidenceScore < 0.35) return "limited";
  if (confidenceScore < 0.6) return "moderate";
  return "good";
}
