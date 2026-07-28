/**
 * Evidence strength — the human-readable replacement for the raw confidence percentage.
 *
 * `aggregate.confidence_score` is a product of weights:
 *
 *   mean(provenanceWeight × row.confidence × freshnessDecay) × min(1, n / 10)
 *
 * The highest provenance weight in the taxonomy is `published_ref` at 0.6, and rows carry
 * a confidence of 0.5–0.6, so the mean weight cannot exceed ~0.36. Measured across the
 * live corpus the best cell reaches 0.35 and the average sits at 0.12.
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

/** Ceiling the score can reach with the best provenance the taxonomy admits. */
export const MAX_ATTAINABLE_SCORE = 0.36;

export function evidenceStrength(confidenceScore: number): EvidenceStrength {
  if (!Number.isFinite(confidenceScore) || confidenceScore < 0.1) return "limited";
  if (confidenceScore < 0.2) return "moderate";
  return "good";
}
