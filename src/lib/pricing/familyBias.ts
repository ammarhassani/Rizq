import type { EvidenceFamily } from "./evidenceFamily";

/**
 * What we believe each derivation gets wrong, declared rather than hidden.
 *
 * Every family reaches a SAR project price by a different route, and each route has a
 * characteristic error. Pooling them as if they were interchangeable observations is what made
 * the old band lurch between regimes. Naming the error per family is what lets them be combined
 * honestly — and, later, corrected by evidence.
 *
 * `mu` is a log-offset: the amount this family is believed to sit ABOVE the true Saudi freelance
 * price, so the estimator subtracts it. `tau` is how sure we are of that, and it does real work —
 * a family with a wide `tau` contributes width to the band rather than location.
 *
 * These are priors, not measurements. Each carries its reasoning and its citation so the
 * methodology page can print them, and so a reader can disagree with a specific number rather
 * than with the engine as a whole.
 *
 * PURE.
 */

export type FamilyPrior = {
  /** Mean log-offset from a true Saudi freelance price. Positive = this family reads high. */
  mu: number;
  /** Prior standard deviation on that offset. Wide = we are guessing and the band should say so. */
  tau: number;
  rationale: string;
  source_ref: string | null;
  as_of: string;
};

/**
 * The two defensible ways to turn a dollar into a riyal, and the reason this feature exists.
 *
 * PPP (1.85) prices non-tradable local services; the SAMA peg (3.75) prices anything sold into a
 * dollar market. Freelance digital work is BOTH — some of it serves Riyadh clients, some of it
 * serves clients who would otherwise hire in London.
 *
 * The corpus part-identifies this itself: 3.75 / 1.85 = 2.03, and the measured ratios between
 * Saudi-priced and PPP-converted sources are 1.88, 2.05, 2.33, 2.68 and 2.76 — they bracket
 * 2.03. The two "regimes" were never describing two markets. They were disagreeing about this
 * one number.
 */
export const PPP_BRIDGE = 1.85;
export const PEG_BRIDGE = 3.75;

/**
 * Where between the two a specialty sits. 0 = purely local, 1 = purely tradable.
 *
 * Default 0.5 is an assumption and is cited as one. It is also the single number first-party
 * data exists to settle — everything else in this engine is built so that settling it requires
 * no structural change.
 */
export const TRADABILITY_DEFAULT = 0.5;

/**
 * Interpolate in LOG space. A currency bridge is a multiplier, so the midpoint between two
 * multipliers is their geometric mean (2.634), not their arithmetic one (2.80). Interpolating
 * arithmetically would quietly tilt every default toward the peg.
 */
export function currencyBridge(lambda: number): number {
  const l = Math.max(0, Math.min(1, Number.isFinite(lambda) ? lambda : TRADABILITY_DEFAULT));
  return Math.exp(Math.log(PPP_BRIDGE) + l * (Math.log(PEG_BRIDGE) - Math.log(PPP_BRIDGE)));
}

export const FAMILY_PRIORS: Record<EvidenceFamily, FamilyPrior> = {
  first_party: {
    mu: 0,
    tau: 0.15,
    rationale:
      "A Saudi client paying a Saudi freelancer is the quantity every other family is trying to " +
      "estimate. No bridge, no conversion, no proxy — so no offset. The narrow tau reflects that " +
      "this is the target, not that any individual row is precise.",
    source_ref: null,
    as_of: "2026-07-29",
  },
  gulf_recruiter: {
    mu: 0.18,
    tau: 0.35,
    rationale:
      "Saudi salaries in riyals, so no currency bridge — the most independent published evidence " +
      "available. But recruiters place into larger employers, so advertised salaries skew above " +
      "the market a freelancer actually sells into. A modest positive offset (~20%) with wide " +
      "uncertainty, because the size of that skew is not measured.",
    source_ref: "Robert Walters Middle East Salary Survey 2026 (100,000+ roles analysed)",
    as_of: "2026-07-29",
  },
  freelance_rate: {
    mu: 0,
    tau: 0.45,
    rationale:
      "Published freelance rates from foreign markets. Freelance-native, so no employment bridge, " +
      "but they cross the currency bridge — which is where their error lives, and that error is " +
      "carried by the tradability weight rather than by an offset here. Wide tau reflects the " +
      "unresolved bridge, not doubt about the surveys.",
    source_ref: "YunoJuno 2026; Editorial Freelancers Association 2026; ProCopywriters 2024",
    as_of: "2026-07-29",
  },
  salary_bridged: {
    mu: 0,
    tau: 0.55,
    rationale:
      "Foreign salaries crossing BOTH the currency bridge and the employment-to-freelance bridge. " +
      "Two uncalibrated transforms compound, so this family gets the widest tau of the cited ones. " +
      "No offset: the composite bridge is the estimate, and if it is wrong the calibration path " +
      "corrects it globally rather than being patched here.",
    source_ref: "Stack Overflow Developer Survey 2025; Robert Half 2026 Salary Guide",
    as_of: "2026-07-29",
  },
  open_data: {
    mu: 0,
    tau: 0.6,
    rationale:
      "Government wage statistics through the same two bridges as salary_bridged, with the added " +
      "distance that national wage aggregates are not occupational freelance rates. No rows today.",
    source_ref: null,
    as_of: "2026-07-29",
  },
  editorial: {
    mu: 0,
    tau: 1.0,
    rationale:
      "Unverifiable judgement: no stated sample, no resolvable citation, one capture date. The tau " +
      "is deliberately enormous — this family should widen a band and must never move its centre. " +
      "Where any cited family exists, the estimator excludes editorial from the anchor entirely.",
    source_ref: null,
    as_of: "2026-07-29",
  },
};
