import { weightedPercentile } from "./weightedPercentile";
import { freshnessDecay, monthsBetween } from "./freshness";
import { provenanceWeight, type BenchmarkProvenance } from "./provenance";

export type AggRow = {
  price_sar: number;
  provenance: BenchmarkProvenance;
  confidence: number;
  captured_at: string; // ISO
};

export type ProvenanceSource = {
  provenance: BenchmarkProvenance;
  count: number;
  weight: number;
};

export type Aggregate = {
  min: number;
  anchor: number;
  max: number;
  sample_size: number;
  dominant_provenance: BenchmarkProvenance;
  sources: ProvenanceSource[];
  confidence_score: number;
  date_range: { earliest: string; latest: string };
};

const CONFIDENCE_SAMPLE_TARGET = 10;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const round2 = (n: number) => Math.round(n * 100) / 100;
const round10 = (n: number) => Math.round(n / 10) * 10;
const round50 = (n: number) => Math.round(n / 50) * 50;

/** Pure weighted aggregation: rows → band + provenance + confidence. */
export function aggregate(rows: AggRow[], now: Date): Aggregate | null {
  const usable = rows.filter(
    (r) => Number.isFinite(r.price_sar) && r.price_sar >= 0
  );
  if (usable.length === 0) return null;

  const weighted = usable.map((r) => {
    const age = monthsBetween(new Date(r.captured_at), now);
    const weight = provenanceWeight(r.provenance) * clamp01(r.confidence) * freshnessDecay(age);
    return { ...r, weight };
  });

  const pairs = weighted.map((r) => ({ value: r.price_sar, weight: r.weight }));
  const min = round10(weightedPercentile(pairs, 0.1));
  const max = round10(weightedPercentile(pairs, 0.9));
  // The anchor (median) rounds to the nearest 50 SAR for a clean headline price,
  // while min/max round to 10. In very tight markets that coarser rounding can
  // overshoot the band edges, so clamp the anchor back inside [min, max] — the
  // Aggregate contract guarantees min ≤ anchor ≤ max.
  const anchor = Math.max(min, Math.min(max, round50(weightedPercentile(pairs, 0.5))));

  const byProv = new Map<BenchmarkProvenance, { count: number; weight: number }>();
  for (const r of weighted) {
    const cur = byProv.get(r.provenance) ?? { count: 0, weight: 0 };
    cur.count += 1;
    cur.weight += r.weight;
    byProv.set(r.provenance, cur);
  }
  const sources: ProvenanceSource[] = [...byProv.entries()]
    .map(([provenance, v]) => ({ provenance, count: v.count, weight: round2(v.weight) }))
    .sort((a, b) => b.weight - a.weight);
  const dominant_provenance = sources[0]!.provenance;

  const meanWeight =
    weighted.reduce((s, r) => s + r.weight, 0) / weighted.length;
  const sampleFactor = Math.min(1, usable.length / CONFIDENCE_SAMPLE_TARGET);
  const confidence_score = round2(clamp01(meanWeight * sampleFactor));

  const dates = usable.map((r) => r.captured_at).sort();
  return {
    min,
    anchor,
    max,
    sample_size: usable.length,
    dominant_provenance,
    sources,
    confidence_score,
    date_range: { earliest: dates[0]!, latest: dates[dates.length - 1]! },
  };
}
