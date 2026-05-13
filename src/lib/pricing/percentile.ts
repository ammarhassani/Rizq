/**
 * Pure percentile calculation with linear interpolation. Lives in its own
 * module so unit tests can import it without dragging in the Supabase
 * client transitively.
 *
 * @param sorted ascending-sorted array of numbers
 * @param p between 0 and 1 (0.5 = median)
 */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const frac = idx - lo;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * frac;
}
