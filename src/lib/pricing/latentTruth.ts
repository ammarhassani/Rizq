import { evidenceFamily, type EvidenceFamily } from "./evidenceFamily";
import { FAMILY_PRIORS, type FamilyPrior } from "./familyBias";
import type { BenchmarkProvenance } from "./provenance";

/**
 * Estimate a price from families that disagree, without picking a winner and without pretending
 * they agree.
 *
 * The engine used to pool every row into one weighted percentile. A median over a set with two
 * clusters does not land between them — it lands in whichever cluster carries more weight, and
 * JUMPS when the weights change. Measured: one adjustment to source confidence moved 199 of 700
 * bands, extremes −85.9% and +44.4%. A freelancer saw a confident three-number band with no
 * indication that the sources behind it contradicted each other two-to-one.
 *
 * Here each family is summarised once, shifted by its declared bias, and combined as a
 * precision-weighted log-normal mixture. The property that matters: EVERY COMPONENT STAYS IN THE
 * RESULT. Reweighting can shift a mixture's mass but cannot evict a cluster from it the way it
 * can flip a median. So disagreement widens the band instead of flipping it, which is both more
 * stable and more honest — the width is the disagreement, made visible.
 *
 * PURE. Closed-form throughout: no sampling, no fitting, no dependency.
 */

export type WeightedRow = {
  price_sar: number;
  provenance: BenchmarkProvenance;
  source_ref?: string | null;
  published_sample?: number | null;
  /** provenanceWeight × confidence × freshnessDecay, computed by the caller. */
  weight: number;
};

export type FamilySummary = {
  family: EvidenceFamily;
  /** Weighted median of ln(price) within the family. */
  logMedian: number;
  /** Dispersion of ln(price) within the family. */
  logSpread: number;
  sourceCount: number;
  rowCount: number;
  /** Largest sample any single source in this family published. */
  publishedSample: number | null;
  /**
   * MEAN row weight, not the sum. The sum conflates evidence quality with how many rows we
   * happened to lift from a source — and made the mixture as sensitive to reweighting as the
   * median it replaced. Row count already reaches the estimate through internal spread, and is
   * deliberately excluded from sample credit.
   */
  meanWeight: number;
};

export type BandKind = "agreed" | "disagreement" | "insufficient";

export type MixtureBand = {
  min: number;
  anchor: number;
  max: number;
  kind: BandKind;
  families: Array<{
    family: EvidenceFamily;
    /** Family median after its declared bias is removed. */
    adjusted: number;
    sourceCount: number;
    rowCount: number;
  }>;
  /** max(adjusted) / min(adjusted) across families. 1 when a single family. */
  spread: number;
};

/** Sources within 50% of each other are telling the same story. */
export const SPREAD_AGREED = 1.5;
/**
 * Past this, a single band is not an answer. An 8× range is not something a freelancer can quote
 * to a client, and emitting one would be false helpfulness — the honest output is that the
 * evidence does not support a single price.
 */
export const SPREAD_INSUFFICIENT = 5;

const clampPositive = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

function weightedLogMedian(rows: WeightedRow[]): number {
  const pts = rows
    .filter((r) => r.price_sar > 0 && r.weight > 0)
    .map((r) => ({ v: Math.log(r.price_sar), w: r.weight }))
    .sort((a, b) => a.v - b.v);
  if (pts.length === 0) return 0;
  if (pts.length === 1) return pts[0]!.v;
  const total = pts.reduce((s, p) => s + p.w, 0);
  let cum = 0;
  for (const p of pts) {
    cum += p.w;
    if (cum >= total / 2) return p.v;
  }
  return pts[pts.length - 1]!.v;
}

/** Group rows into families and summarise each one. Rows within a family share an error. */
export function summariseFamilies(rows: WeightedRow[]): FamilySummary[] {
  const byFamily = new Map<EvidenceFamily, WeightedRow[]>();
  for (const r of rows) {
    if (!(r.price_sar > 0) || !(r.weight > 0)) continue;
    const f = evidenceFamily(r.provenance, r.source_ref);
    byFamily.set(f, [...(byFamily.get(f) ?? []), r]);
  }

  return [...byFamily.entries()].map(([family, fam]) => {
    const logMedian = weightedLogMedian(fam);
    const logs = fam.map((r) => Math.log(r.price_sar));
    const mean = logs.reduce((s, v) => s + v, 0) / logs.length;
    const variance =
      logs.length > 1
        ? logs.reduce((s, v) => s + (v - mean) ** 2, 0) / (logs.length - 1)
        : 0;
    // Sample counted once per SOURCE — ten roles lifted from one survey are ten readings of it,
    // not ten surveys.
    const samples = new Map<string, number>();
    for (const r of fam) {
      const key = (r.source_ref ?? "").trim() || "__unattributed__";
      samples.set(key, Math.max(samples.get(key) ?? 0, clampPositive(r.published_sample ?? 0)));
    }
    const publishedSample = [...samples.values()].reduce((s, n) => s + n, 0);

    return {
      family,
      logMedian,
      logSpread: Math.sqrt(variance),
      sourceCount: samples.size,
      rowCount: fam.length,
      publishedSample: publishedSample > 0 ? publishedSample : null,
      meanWeight: fam.reduce((s, r) => s + r.weight, 0) / fam.length,
    };
  });
}

/**
 * Component standard deviation in log space.
 *
 * Three things widen a component: the family's own internal disagreement, our prior uncertainty
 * about that family's bias, and a thin published sample. They compose in quadrature because they
 * are independent sources of error.
 */
function componentSigma(s: FamilySummary, prior: FamilyPrior): number {
  const internal = Math.max(s.logSpread, 0.05);
  // A 100,000-respondent survey earns a tighter component than a 38-respondent one. Log-scaled,
  // floored so an unstated sample is uncertain rather than infinitely so.
  const sample = s.publishedSample ?? 0;
  const sampleTerm = sample > 0 ? 0.6 / Math.sqrt(Math.log10(sample) + 1) : 0.6;
  return Math.sqrt(internal ** 2 + prior.tau ** 2 + sampleTerm ** 2);
}

/** Mixture CDF at a log-price. Monotone, so bisection is safe. */
function mixtureCdf(
  x: number,
  comps: Array<{ mu: number; sigma: number; w: number }>
): number {
  const total = comps.reduce((s, c) => s + c.w, 0);
  if (total <= 0) return 0;
  let acc = 0;
  for (const c of comps) {
    // Normal CDF via erf approximation (Abramowitz & Stegun 7.1.26) — closed form, no dependency.
    const z = (x - c.mu) / (c.sigma * Math.SQRT2);
    acc += c.w * 0.5 * (1 + erf(z));
  }
  return acc / total;
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-a * a);
  return sign * y;
}

function quantile(
  p: number,
  comps: Array<{ mu: number; sigma: number; w: number }>
): number {
  let lo = Math.min(...comps.map((c) => c.mu - 6 * c.sigma));
  let hi = Math.max(...comps.map((c) => c.mu + 6 * c.sigma));
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (mixtureCdf(mid, comps) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Combine family summaries into a band.
 *
 * Editorial evidence never anchors where a cited family exists — it is unverifiable judgement,
 * and letting it move the centre is what produced the 4× content-writing conflict in the first
 * place. It still contributes width, because pretending it is absent would be its own dishonesty.
 */
export function combine(
  summaries: FamilySummary[],
  priors: Record<EvidenceFamily, FamilyPrior> = FAMILY_PRIORS
): MixtureBand | null {
  const usable = summaries.filter((s) => Number.isFinite(s.logMedian) && s.rowCount > 0);
  if (usable.length === 0) return null;

  const hasCited = usable.some((s) => s.family !== "editorial");
  const anchoring = hasCited ? usable.filter((s) => s.family !== "editorial") : usable;

  const comps = anchoring.map((s) => {
    const prior = priors[s.family];
    const sigma = componentSigma(s, prior);
    return {
      family: s.family,
      // Subtract the declared bias: shift each family toward the others, never away.
      mu: s.logMedian - prior.mu,
      sigma,
      // Precision weighting — tighter components carry more of the mixture. Provenance quality
      // enters through a SQUARE ROOT so a 20% reweighting of one source moves the mixture by
      // ~10%, not 20%: SC-001 requires the band to stop lurching when weights are nudged, and
      // that stability is the whole point of replacing the pooled median.
      w: Math.sqrt(s.meanWeight) / (sigma * sigma),
      summary: s,
    };
  });

  const adjusted = comps.map((c) => Math.exp(c.mu));
  const spread =
    adjusted.length > 1 ? Math.max(...adjusted) / Math.min(...adjusted) : 1;

  const kind: BandKind =
    spread <= SPREAD_AGREED
      ? "agreed"
      : spread >= SPREAD_INSUFFICIENT
        ? "insufficient"
        : "disagreement";

  const min = Math.exp(quantile(0.1, comps));
  const anchor = Math.exp(quantile(0.5, comps));
  const max = Math.exp(quantile(0.9, comps));

  return {
    min,
    anchor,
    max,
    kind,
    spread,
    families: comps.map((c) => ({
      family: c.family,
      adjusted: Math.exp(c.mu),
      sourceCount: c.summary.sourceCount,
      rowCount: c.summary.rowCount,
    })),
  };
}
