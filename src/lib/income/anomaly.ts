/**
 * Pure anomaly-detection helpers for income entries — spec M3.6-B (threshold logic).
 * No AI, no I/O — pure functions so they can be unit-tested without any server
 * mocks or API keys.
 */

/**
 * Returns (amount - avg) / avg as a signed percentage fraction.
 * Returns 0 when avg <= 0 (division by zero guard).
 */
export function deviationPct(amount: number, avg: number): number {
  if (avg <= 0) return 0;
  return (amount - avg) / avg;
}

/**
 * Returns true when the absolute deviation from the category average exceeds
 * the given threshold (default 40 %).
 *
 * Rules:
 * - Returns false when avg <= 0 (no data / guard).
 * - The caller is responsible for the minimum-sample check (≥ 3 same-category
 *   gigs) before calling this; this function simply computes the maths.
 * - Boundary: |deviation| must be STRICTLY greater than the threshold, so an
 *   exact 40 % deviation at the default threshold is NOT an anomaly.
 */
export function isPriceAnomaly(
  amount: number,
  categoryAvg: number,
  threshold = 0.4
): boolean {
  if (categoryAvg <= 0) return false;
  return Math.abs(deviationPct(amount, categoryAvg)) > threshold;
}
