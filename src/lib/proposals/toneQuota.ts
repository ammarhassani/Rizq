// Tone-rewrite free-tier quota helpers (spec M1 — 3 tone uses/month, pro unlimited).
// Pure functions live here (not in the "use server" action) so they can be
// exported/tested without violating the server-action export rule.

/** Free tier gets this many tone rewrites per calendar month (Riyadh). */
export const FREE_MONTHLY_TONE_USES = 3;

/** Start of the current month in Riyadh (UTC+3), as epoch ms. */
export function startOfMonthRiyadhMs(now: number): number {
  const RIYADH = 3 * 60 * 60 * 1000;
  const r = new Date(now + RIYADH);
  return Date.UTC(r.getUTCFullYear(), r.getUTCMonth(), 1) - RIYADH;
}

/**
 * Counts EFFECTIVE tone-rewrite uses at/after `sinceMs` from the per-proposal
 * `tone_adjustments` logs — the existing record of every tone application, so no
 * separate counter table is needed. Only entries that actually changed something
 * (`sections_modified` non-empty) count against the quota; a no-op rewrite must
 * not burn a free use. The log itself stays complete (no-ops are still recorded).
 */
export function countToneUsesSince(
  rows: { tone_adjustments: unknown }[],
  sinceMs: number,
): number {
  let n = 0;
  for (const r of rows) {
    const adj = r.tone_adjustments;
    if (!Array.isArray(adj)) continue;
    for (const e of adj) {
      const entry = e as { applied_at?: unknown; sections_modified?: unknown };
      const applied = entry?.applied_at;
      const modified = entry?.sections_modified;
      const wasEffective = Array.isArray(modified) && modified.length > 0;
      if (typeof applied === "string" && wasEffective && new Date(applied).getTime() >= sinceMs) {
        n += 1;
      }
    }
  }
  return n;
}
