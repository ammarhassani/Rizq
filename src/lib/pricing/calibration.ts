import type { EvidenceFamily } from "./evidenceFamily";
import { FAMILY_PRIORS } from "./familyBias";

/**
 * Learn how far each evidence family sits from what Saudi clients actually pay — from the
 * DEVIATION between what Rizq suggested and what the freelancer charged, never from the charge.
 *
 * The distinction is the whole design. Rizq shows a band, the freelancer quotes near it, the
 * client pays near the quote — so ln(charged) on its own converges to ln(anchor) regardless of
 * the market, and a calibration built on it would measure our own persuasiveness and call it
 * evidence. Only the deviation carries information the anchor did not already contain, and the
 * observations where the freelancer never saw the band are cleaner still.
 *
 * Ships inert. With no observations the priors hold unchanged and every published band is
 * byte-identical to what it was before this module existed — which is what makes it safe to land
 * long before the first transaction.
 *
 * PURE. The table read lives in the caller.
 */

export type CalibrationRow = {
  family: EvidenceFamily;
  delta_log: number;
  n_obs: number;
  distinct_contributors: number;
};

export type Deviation = {
  family: EvidenceFamily;
  /** ln(charged / anchor_shown). Zero means the freelancer took our number. */
  logDeviation: number;
  /** Distinct contributors in the cell this came from. */
  distinctContributors: number;
  /** True when the freelancer saw our band before pricing — the anchored, weaker observation. */
  sawBandFirst: boolean;
};

/** Below this many distinct contributors a cell may not inform anything. Mirrors k-anonymity. */
export const CALIBRATION_K = 3;

/**
 * Prior strength in pseudo-observations. Five early web-dev invoices must not swing the corpus,
 * so the prior is worth roughly this many real ones before it starts yielding.
 */
export const PRIOR_PSEUDO_COUNT = 15;

/** Winsorisation bound. A 3× miss in either direction is the most one observation may argue. */
export const MAX_ABS_LOG_DEVIATION = Math.log(3);

/**
 * Fold deviations into per-family offsets against the declared priors.
 *
 * Returns an empty map for an empty input — the caller then applies nothing and the priors stand.
 */
export function calibrate(
  deviations: Deviation[]
): Map<EvidenceFamily, CalibrationRow> {
  const out = new Map<EvidenceFamily, CalibrationRow>();

  const eligible = deviations.filter(
    (d) =>
      Number.isFinite(d.logDeviation) &&
      d.distinctContributors >= CALIBRATION_K
  );
  if (eligible.length === 0) return out;

  const byFamily = new Map<EvidenceFamily, Deviation[]>();
  for (const d of eligible) {
    byFamily.set(d.family, [...(byFamily.get(d.family) ?? []), d]);
  }

  for (const [family, obs] of byFamily) {
    // An observation made without seeing our band is worth more than one made after it, because
    // the second one is partly an echo of the number we suggested.
    const weighted = obs.map((d) => ({
      value: Math.max(
        -MAX_ABS_LOG_DEVIATION,
        Math.min(MAX_ABS_LOG_DEVIATION, d.logDeviation)
      ),
      w: d.sawBandFirst ? 0.5 : 1,
    }));
    const wSum = weighted.reduce((s, o) => s + o.w, 0);
    const observed = weighted.reduce((s, o) => s + o.value * o.w, 0) / wSum;

    // Conjugate pull toward the prior. n_obs must beat PRIOR_PSEUDO_COUNT before the data
    // dominates, so a handful of early rows nudge rather than overturn.
    const prior = FAMILY_PRIORS[family].mu;
    const delta =
      (prior * PRIOR_PSEUDO_COUNT + observed * wSum) / (PRIOR_PSEUDO_COUNT + wSum);

    out.set(family, {
      family,
      delta_log: delta,
      n_obs: obs.length,
      distinct_contributors: Math.max(...obs.map((d) => d.distinctContributors)),
    });
  }

  return out;
}
