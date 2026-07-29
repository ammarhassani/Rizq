import { weightedPercentile } from "./weightedPercentile";
import { freshnessDecay, monthsBetween } from "./freshness";
import { provenanceWeight, type BenchmarkProvenance } from "./provenance";
import { evidenceFamily, type EvidenceFamily } from "./evidenceFamily";

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
  confidence_score: number;
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

/**
 * Agreement between independent bodies of evidence.
 *
 * Provenance and sample size answer "how good are these sources". They do not answer the
 * question a freelancer is actually asking, which is "do they agree". Meta-analysis treats
 * these as separate axes: inverse-variance weighting handles precision, and heterogeneity
 * (I²) is reported alongside it precisely because a pooled estimate from studies that
 * disagree is not the same claim as one from studies that concur.
 *
 * Rizq had only the first axis, and it showed. Measured on the live corpus before this was
 * added: 146 of 581 multi-family cells held sources disagreeing by more than 3×, and 109 of
 * those were reporting "good" evidence. The average score for cells whose sources disagreed
 * 3× was 63.5% — HIGHER than the 62.4% overall. Well-sampled sources contradicting each other
 * were scoring better than modest sources concurring, which is backwards.
 *
 * Spread is the ratio of the highest family median to the lowest. Full credit up to 1.5×
 * (sources within 50% of each other are telling the same story); floored at 0.3 by 5×, which
 * is where the content-writing regime conflict sits — a 4× disagreement between the Saudi seed
 * and the PPP-converted foreign reports is not a market band, it is two different claims.
 */
const SPREAD_FULL_CREDIT = 1.5;
const SPREAD_FLOOR_AT = 5;
const MIN_AGREEMENT = 0.3;

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

  // Evidence accumulates across independent families and does NOT accumulate within one.
  //
  // Averaging every row was the old behaviour and it had a perverse consequence: adding a
  // mediocre source LOWERED a cell's confidence, so the engine punished corroboration. But
  // naive accumulation over rows is worse — three rows from one document would read as three
  // agreeing witnesses. Families split the difference: the strongest row speaks for its family,
  // and only genuinely different derivations compound. See evidenceFamily.ts.
  const bestByFamily = new Map<EvidenceFamily, number>();
  const sampleByFamily = new Map<EvidenceFamily, number>();
  const pricesByFamily = new Map<EvidenceFamily, number[]>();
  for (const r of weighted) {
    const family = evidenceFamily(r.provenance, r.source_ref);
    bestByFamily.set(family, Math.max(bestByFamily.get(family) ?? 0, r.weight));
    // Summed within a family, because two roles from one survey really are two samples of it.
    const sample = typeof r.published_sample === "number" && r.published_sample > 0 ? r.published_sample : 0;
    sampleByFamily.set(family, (sampleByFamily.get(family) ?? 0) + sample);
    if (r.price_sar > 0) pricesByFamily.set(family, [...(pricesByFamily.get(family) ?? []), r.price_sar]);
  }

  // Noisy-or: each family independently fails to establish the price with probability
  // (1 - weight), so the chance at least one succeeds is 1 - the product of the failures.
  const accumulated = 1 - [...bestByFamily.values()].reduce((p, w) => p * (1 - clamp01(w)), 1);

  const totalSample = [...sampleByFamily.values()].reduce((s, n) => s + n, 0);
  // Floored, not zeroed. A source that states no sample has given us an unquantified figure,
  // not an absent one — and it is already penalised once, at `sourceConfidence`, which puts
  // every unstated source in the lowest band. Letting log(0) drive the factor to zero would
  // punish it a second time and collapse the whole score to 0 for editorial-only cells,
  // which reads as "no evidence exists" rather than "we cannot size the evidence".
  const sampleFactor = Math.max(
    UNSIZED_SAMPLE_CREDIT,
    Math.min(1, Math.log(Math.max(1, totalSample)) / Math.log(FULL_CREDIT_SAMPLE))
  );
  // How far apart the independent families land. One family cannot disagree with itself, so a
  // single-family cell is neither rewarded nor punished here — its thinness is already carried
  // by the accumulation term.
  const familyMedians = [...pricesByFamily.values()]
    .map((prices) => {
      const sorted = [...prices].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)]!;
    })
    .filter((p) => p > 0);
  const spread =
    familyMedians.length > 1
      ? Math.max(...familyMedians) / Math.min(...familyMedians)
      : 1;
  const agreement =
    spread <= SPREAD_FULL_CREDIT
      ? 1
      : Math.max(
          MIN_AGREEMENT,
          1 -
            (1 - MIN_AGREEMENT) *
              (Math.log(spread / SPREAD_FULL_CREDIT) /
                Math.log(SPREAD_FLOOR_AT / SPREAD_FULL_CREDIT))
        );

  const confidence_score = round2(clamp01(accumulated * sampleFactor * agreement));

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
    date_range: { earliest: dates[0]!, latest: dates[dates.length - 1]! },
  };
}
