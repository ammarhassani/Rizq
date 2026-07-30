/**
 * Benchmark flywheel — pure helpers (feature: data strategy Tier 3).
 *
 * Turns a completed engagement into a `submitted` benchmark observation, and
 * enforces k-anonymity at read so a single freelancer's price never forms a band.
 */

export type ProjectSize = "small" | "medium" | "large" | "enterprise";

/** Map scope deliverable_count → project_size bucket (mirrors the benchmark enum). */
export function projectSizeFromDeliverables(deliverableCount: number | null | undefined): ProjectSize {
  const n = typeof deliverableCount === "number" && deliverableCount > 0 ? deliverableCount : 1;
  if (n <= 1) return "small";
  if (n <= 3) return "medium";
  if (n <= 6) return "large";
  return "enterprise";
}

/**
 * Assumed billable hours behind each project size.
 *
 * Every external source prices TIME (an hourly or day rate); Rizq prices PROJECTS.
 * Bridging the two needs an hours-per-project assumption, and this is it — shared by
 * every collector so the assumption is stated once and calibrated once. It is the
 * weakest number in the pricing stack; the first real `submitted` data should replace
 * it with a regression on paid price vs deliverable_count.
 */
export const PROJECT_HOURS: Record<ProjectSize, number> = {
  small: 8,
  medium: 24,
  large: 60,
  enterprise: 160,
};

/** Minimum distinct contributors before `submitted` rows may surface in a band. */
export const SUBMITTED_K_ANON = 3;

/**
 * Confidence recorded for a benchmark contributed from a finalized proposal.
 *
 * An ask, not a clearing price — below the paid-invoice path's 0.70 on purpose. Lives here
 * rather than beside the server action because a `"use server"` module may only export async
 * functions; exporting a const from one breaks every route that transitively imports it.
 */
export const PROPOSAL_CONTRIBUTION_CONFIDENCE = 0.4;

export type KAnonRow = { provenance: string; source_user_id?: string | null };

/**
 * k-anonymity guard: drop `submitted` rows from a cell unless they come from at
 * least SUBMITTED_K_ANON distinct contributors. Non-submitted rows pass through.
 * Pure — used by resolvePrice after fetching a cell's rows.
 */
export function applyKAnonymity<T extends KAnonRow>(rows: T[]): T[] {
  const submitted = rows.filter((r) => r.provenance === "submitted");
  if (submitted.length === 0) return rows;
  const distinct = new Set(submitted.map((r) => r.source_user_id ?? "").filter(Boolean));
  if (distinct.size >= SUBMITTED_K_ANON) return rows;
  return rows.filter((r) => r.provenance !== "submitted");
}
