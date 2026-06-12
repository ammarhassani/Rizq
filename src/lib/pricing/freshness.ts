const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.4375;

/** Months between two dates (fractional). */
export function monthsBetween(captured: Date, now: Date): number {
  return (now.getTime() - captured.getTime()) / MS_PER_MONTH;
}

/**
 * Piecewise-linear freshness decay through the spec anchor points
 * (0mo → 1.0), (18mo → 0.5), (36mo → 0.1), floored at 0.1 (spec §M4.3).
 */
export function freshnessDecay(ageMonths: number): number {
  if (ageMonths <= 0) return 1.0;
  if (ageMonths >= 36) return 0.1;
  if (ageMonths <= 18) return 1.0 + (0.5 - 1.0) * (ageMonths / 18);
  return 0.5 + (0.1 - 0.5) * ((ageMonths - 18) / 18);
}
