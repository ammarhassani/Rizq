import type { ProjectSize } from "./contribution";

/**
 * How many billable hours a project size is worth — as recorded data, not as a constant.
 *
 * The 8 / 24 / 60 / 160 in the corpus were invented, and they multiply every single price the
 * product shows. They are not going to be right for both a logo and a bilingual site, and the
 * only honest thing to do with a number like that is to say where it came from and let better
 * values replace it.
 *
 * Three provenances, in increasing order of standing:
 *   reasoned — assumed. What ships today, marked as an assumption.
 *   stated   — freelancers told us what they expect a project of this size to take.
 *   measured — a completed project recorded its actual hours.
 *
 * NEVER inferred from paid ÷ hourly anchor. The freelancer quoted the anchor Rizq showed them,
 * so that "measurement" returns the constant it was built to test. Three separate reviewers on
 * the pricing council caught three separate experts proposing exactly that.
 *
 * PURE. The table read lives in the caller.
 */

export type HoursProvenance = "reasoned" | "stated" | "measured";

export type HoursRecord = {
  project_size: ProjectSize;
  hours: number;
  provenance: HoursProvenance;
  n: number;
};

/** Below this many observations, a stated or measured figure has not earned the override. */
export const HOURS_OVERRIDE_MIN_N = 5;

const RANK: Record<HoursProvenance, number> = { measured: 3, stated: 2, reasoned: 1 };

/** The assumption that ships today, kept here so a missing row degrades rather than throws. */
export const FALLBACK_HOURS: Record<ProjectSize, number> = {
  small: 8,
  medium: 24,
  large: 60,
  enterprise: 160,
};

export type ResolvedHours = {
  hours: number;
  provenance: HoursProvenance;
  n: number;
};

/**
 * Pick the hours figure for a size: the best-attested record that has cleared the threshold,
 * falling back to the assumption. Returns its provenance so the citation can say which basis
 * produced the price rather than implying all of them are measurements.
 */
export function resolveHours(
  size: ProjectSize,
  records: HoursRecord[]
): ResolvedHours {
  const candidates = records
    .filter((r) => r.project_size === size && r.hours > 0)
    // An observed figure only outranks the assumption once enough observations stand behind it.
    // Below that it is a smaller guess, not a better one.
    .filter((r) => r.provenance === "reasoned" || r.n >= HOURS_OVERRIDE_MIN_N)
    .sort((a, b) => RANK[b.provenance] - RANK[a.provenance] || b.n - a.n);

  const best = candidates[0];
  if (!best) {
    return { hours: FALLBACK_HOURS[size], provenance: "reasoned", n: 0 };
  }
  return { hours: best.hours, provenance: best.provenance, n: best.n };
}
