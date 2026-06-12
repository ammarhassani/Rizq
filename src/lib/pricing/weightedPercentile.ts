/**
 * Weighted quantile via cumulative-center interpolation. Each point i is
 * placed at the normalized center of its weight band; the value at p is
 * linearly interpolated between the two straddling centers. With equal
 * weights this reduces to the standard linear-interpolation percentile.
 */
export function weightedPercentile(
  pairs: { value: number; weight: number }[],
  p: number
): number {
  const pts = pairs
    .filter((x) => x.weight > 0 && Number.isFinite(x.value))
    .sort((a, b) => a.value - b.value);
  if (pts.length === 0) return 0;
  if (pts.length === 1) return pts[0]!.value;

  const total = pts.reduce((s, x) => s + x.weight, 0);
  const centers: number[] = [];
  let cum = 0;
  for (const pt of pts) {
    centers.push((cum + pt.weight / 2) / total);
    cum += pt.weight;
  }

  if (p <= centers[0]!) return pts[0]!.value;
  if (p >= centers[centers.length - 1]!) return pts[pts.length - 1]!.value;

  for (let i = 0; i < centers.length - 1; i++) {
    const c0 = centers[i]!;
    const c1 = centers[i + 1]!;
    if (p >= c0 && p <= c1) {
      const frac = c1 === c0 ? 0 : (p - c0) / (c1 - c0);
      return pts[i]!.value + (pts[i + 1]!.value - pts[i]!.value) * frac;
    }
  }
  return pts[pts.length - 1]!.value;
}
