/** Scope-derived signals that move the anchor within the band (spec M1.7 step 1). */
export type PricingModifierInput = {
  urgency: "rush_under_1_week" | "standard_1_4_weeks" | "long_term" | null;
  client_type: "individual" | "smb" | "corporate" | "government" | "agency" | null;
  ip_transfer: "full_transfer" | "license" | "unclear" | null;
  /** How many deliverables the scope covers — scales the band (more work → higher). */
  deliverable_count?: number | null;
};

/** The market band from resolvePrice (already rounded). */
export type MarketBand = { min: number; anchor: number; max: number };

export type ProposalPrice = {
  min: number;
  anchor: number;
  max: number;
  modifiers: { urgency: number; client_type: number; ip: number; complexity: number };
  personal_weight: number;
};

const round10 = (n: number) => Math.round(n / 10) * 10;
const round50 = (n: number) => Math.round(n / 50) * 50;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const median = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

function urgencyMod(u: PricingModifierInput["urgency"]): number {
  if (u === "rush_under_1_week") return 1.15;
  if (u === "long_term") return 0.9;
  return 1.0;
}
function clientMod(c: PricingModifierInput["client_type"]): number {
  if (c === "corporate") return 1.1;
  if (c === "individual") return 0.95;
  return 1.0;
}
function ipMod(ip: PricingModifierInput["ip_transfer"]): number {
  if (ip === "full_transfer") return 1.2;
  if (ip === "license") return 0.95;
  return 1.0;
}
/**
 * Scope-size lever: a multi-deliverable scope is more work, so it pushes the anchor
 * UP within the market band — like the other modifiers. It does NOT scale the band's
 * min/max: doing so would print figures no benchmark record supports, which the
 * citation ("based on N records") vouches for (constitution Principle I; M1.7 step 1
 * "move the anchor, never fabricate a band"). Sublinear (+10% per extra deliverable),
 * capped at +60%. 1 (or unknown) deliverable → 1.0 (single-item proposals unaffected).
 */
function complexityMod(deliverableCount: PricingModifierInput["deliverable_count"]): number {
  const n = typeof deliverableCount === "number" && deliverableCount > 0 ? deliverableCount : 1;
  return clamp(1 + 0.1 * (n - 1), 1.0, 1.6);
}

/** Personal weight by the freelancer's proposal count N (spec M1.7 step 2, cap 0.5). */
export function personalWeight(n: number): number {
  if (n <= 0) return 0;       // no history → pure market
  if (n < 3) return 0.1;
  if (n <= 10) return 0.3;
  return 0.5;
}

/**
 * Combine market band + scope modifiers + personal history into the proposal
 * price (spec M1.7). Modifiers move the anchor (clamped into the band);
 * personal history blends toward the freelancer's own median anchor; anchor
 * rounds to 50, min/max to 10. Always min ≤ anchor ≤ max.
 */
export function computeProposalPrice(
  market: MarketBand,
  mods: PricingModifierInput,
  pastAnchors: number[],
  /** The freelancer's own stated project rate (e.g. project-rate-range midpoint).
   *  Counts as a personal anchor point so pricing reflects them from proposal #1.
   *  (feature 006). Bounded by the existing personalWeight cap. */
  statedAnchor?: number | null
): ProposalPrice {
  const m = {
    urgency: urgencyMod(mods.urgency),
    client_type: clientMod(mods.client_type),
    ip: ipMod(mods.ip_transfer),
    complexity: complexityMod(mods.deliverable_count),
  };

  // The band is the CITED market band (rounded, never scaled) so every displayed
  // figure is backed by the provenance citation. All modifiers — including scope
  // complexity — move the anchor *within* that band (clamped). Keeps min ≤ anchor ≤ max.
  const min = round10(market.min);
  const max = round10(market.max);
  const combined = m.urgency * m.client_type * m.ip * m.complexity;
  const modifiedAnchor = clamp(market.anchor * combined, min, max);

  // The freelancer's stated rate joins their personal history as one anchor point,
  // so a profiled freelancer is reflected even with no past proposals.
  const personalPoints =
    typeof statedAnchor === "number" && statedAnchor > 0 ? [...pastAnchors, statedAnchor] : pastAnchors;
  const w = personalWeight(personalPoints.length);
  const personalAnchor = median(personalPoints);
  const blended = w > 0 ? modifiedAnchor * (1 - w) + personalAnchor * w : modifiedAnchor;

  const anchor = clamp(round50(blended), min, max);

  return { min, anchor, max, modifiers: m, personal_weight: w };
}
