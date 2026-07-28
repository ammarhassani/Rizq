/**
 * Where the freelancer's own price sits inside the market band.
 *
 * A band on its own is information, not a decision. "1,890 – 6,700 SAR" is a 3.5×
 * spread; it does not tell someone whether to send 4,000. What turns it into a decision
 * is the one number the app already holds and never showed here: the rate they said they
 * charge, captured at onboarding as `users.current_project_rate_range`.
 *
 * Deliberately does NOT recommend a price. It states the gap and lets the freelancer
 * decide — a tool that says "charge 5,200" is making a claim about a specific client,
 * a specific brief and a specific negotiation, none of which it can see.
 *
 * PURE.
 */

export type Band = { min: number; anchor: number; max: number };
export type StatedRange = { min: number; max: number };

export type StatedRatePosition = {
  /** Midpoint of what they said they charge — the figure compared against the band. */
  stated: number;
  stated_min: number;
  stated_max: number;
  /** Where that midpoint falls relative to the band's edges. */
  position: "below" | "within" | "above";
  /**
   * Signed percent difference from the band's anchor, rounded. Negative = they charge
   * less than the median for this work. Anchor is the comparison point rather than the
   * edges because it is the figure the card leads with.
   */
  percent_vs_anchor: number;
};

const isPositive = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

/**
 * Returns null when there is nothing honest to say: no stated rate, a malformed range,
 * or a zero anchor. A missing comparison is better than one drawn from a guess.
 */
export function statedRatePosition(
  band: Band,
  stated: StatedRange | null | undefined
): StatedRatePosition | null {
  if (!stated || !isPositive(stated.min) || !isPositive(stated.max)) return null;
  if (!isPositive(band.anchor)) return null;

  // Onboarding lets a freelancer give a single figure, which arrives as min === max.
  const lo = Math.min(stated.min, stated.max);
  const hi = Math.max(stated.min, stated.max);
  const mid = (lo + hi) / 2;

  const position: StatedRatePosition["position"] =
    mid < band.min ? "below" : mid > band.max ? "above" : "within";

  return {
    stated: Math.round(mid),
    stated_min: lo,
    stated_max: hi,
    position,
    percent_vs_anchor: Math.round(((mid - band.anchor) / band.anchor) * 100),
  };
}
