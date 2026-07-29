import { freshnessDecay, monthsBetween } from "./freshness";
import { provenanceWeight, type BenchmarkProvenance } from "./provenance";
import type { EvidenceFamily } from "./evidenceFamily";
import { summariseFamilies, combine, type BandKind } from "./latentTruth";

export type AggRow = {
  price_sar: number;
  provenance: BenchmarkProvenance;
  confidence: number;
  captured_at: string; // ISO
  /**
   * Which project size the price was recorded for, when the record says. Optional
   * because the band does not need it (the query already filters on size when the
   * freelancer picks one) — but the TREND does: a "small task" price and a whole-project
   * price are different bases, and comparing one period of the first against another
   * period of the second manufactures a market move. See trend.ts.
   */
  project_size?: string | null;
  /**
   * The citation the row came from. Rows are not observations: the published-reference
   * seed expresses ONE reference as a min/median/max triple, so a cell holding three
   * rows can rest on a single document. Counting rows and calling it a sample size
   * overstates the evidence, which is the one thing the honesty layer exists to prevent.
   */
  source_ref?: string | null;
  /**
   * Observations the source's publisher states stand behind this figure. Drives the sample
   * factor: a cell resting on 210,000 published observations is not "thin" because it happens
   * to hold five rows.
   */
  published_sample?: number | null;
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
  /**
   * Distinct citations behind those rows. `sample_size` counts rows; this counts the
   * things a reader would recognise as separate evidence. When it is 1, the band —
   * however many rows fed it — rests on one source, and the citation must say so.
   */
  source_count: number;
  dominant_provenance: BenchmarkProvenance;
  sources: ProvenanceSource[];
  /**
   * Retained for the stored `queries` row and the share page, but no longer displayed. Evidence
   * is now communicated by composition and band width, not by a scalar nobody could interpret.
   */
  confidence_score: number;
  /** Which bodies of evidence produced this, and how many sources stood behind each. */
  families: Array<{ family: EvidenceFamily; adjusted: number; sourceCount: number; rowCount: number }>;
  /** agreed · disagreement · insufficient — drives what the card is allowed to claim. */
  band_kind: BandKind;
  /** Ratio between the highest and lowest family estimate. 1 when a single family. */
  family_spread: number;
  date_range: { earliest: string; latest: string };
};

/**
 * Published observations at which a cell earns full credit for its sample.
 *
 * This replaced a row count (`min(1, n/10)`). Counting rows was a stand-in for "how much
 * evidence is behind this", and it stopped being needed the moment each source began recording
 * the sample its publisher stated. The stand-in was actively wrong: the average cell rests on
 * ~130,000 published observations, and the row count was calling it thin because it held five
 * rows. Log-scaled, so the step from 100 to 1,000 observations counts for as much as 1,000 to
 * 10,000 — which is how sample size actually behaves.
 */
const FULL_CREDIT_SAMPLE = 10_000;

/**
 * Floor for a cell whose sources publish no sample size — roughly the credit 10 observations
 * would earn. Such a cell is not evidence-free; it is evidence we cannot size, and the
 * penalty for that already lands on `confidence` at ingestion.
 */
const UNSIZED_SAMPLE_CREDIT = 0.25;

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

  // The band comes from a bias-adjusted mixture over evidence families, not from percentiles
  // over pooled rows. Pooling was the root defect: a weighted median over a bimodal set lands in
  // whichever cluster carries more weight and JUMPS when weights move (measured: 199 of 700
  // bands, −85.9% to +44.4%). Every component stays in a mixture, so disagreement widens the
  // band instead of flipping it. See latentTruth.ts.
  const mixture = combine(summariseFamilies(weighted));
  if (!mixture) return null;

  const min = round10(mixture.min);
  const max = round10(mixture.max);
  // The anchor rounds to the nearest 50 SAR for a clean headline; clamp it back inside the band
  // because the coarser rounding can overshoot in a tight market. min ≤ anchor ≤ max is the
  // Aggregate contract.
  const anchor = Math.max(min, Math.min(max, round50(mixture.anchor)));

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

  // Retained for storage compatibility only. The published sample behind the cell, log-scaled,
  // with the floor that unquantified evidence is not absent evidence. It is no longer displayed:
  // the noisy-or accumulation, the agreement multiplier and the standalone sample factor were all
  // deleted in feature 013 for claiming a probabilistic meaning they never had. Evidence now
  // reaches the reader as composition and band width.
  const sampleBySource = new Map<string, number>();
  for (const r of weighted) {
    const sample = typeof r.published_sample === "number" && r.published_sample > 0 ? r.published_sample : 0;
    const key = (r.source_ref ?? "").trim() || "__unattributed__";
    sampleBySource.set(key, Math.max(sampleBySource.get(key) ?? 0, sample));
  }
  const totalSample = [...sampleBySource.values()].reduce((s, n) => s + n, 0);
  const confidence_score = round2(
    clamp01(
      Math.max(
        UNSIZED_SAMPLE_CREDIT,
        Math.min(1, Math.log(Math.max(1, totalSample)) / Math.log(FULL_CREDIT_SAMPLE))
      )
    )
  );

  // Rows sharing a citation are one piece of evidence. Rows with no citation collapse
  // into a single "unattributed" bucket rather than counting one apiece — an unknown
  // origin is not proof of an independent one.
  const sourceKeys = new Set(
    usable.map((r) => (r.source_ref ?? "").trim() || "__unattributed__")
  );

  const dates = usable.map((r) => r.captured_at).sort();
  return {
    min,
    anchor,
    max,
    sample_size: usable.length,
    source_count: sourceKeys.size,
    dominant_provenance,
    sources,
    confidence_score,
    families: mixture.families,
    band_kind: mixture.kind,
    family_spread: mixture.spread,
    date_range: { earliest: dates[0]!, latest: dates[dates.length - 1]! },
  };
}
