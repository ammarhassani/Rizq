/**
 * Derive the experience tier from a freelancer's stated YEARS of experience.
 *
 * Pricing needs an `experience_tier`, but users naturally store *years* in their
 * profile. When the explicit tier isn't set, map years → tier via the tiers'
 * own [years_min, years_max) ranges (beginner 0–1 · junior 1–3 · mid 3–5 ·
 * senior 5–10 · expert 10+). Pure + total.
 */

export type TierRange = { slug: string; years_min: number | null; years_max: number | null };

/** Returns the tier slug whose [years_min, years_max) contains `years`, or null. */
export function tierSlugFromYears(years: number | null | undefined, tiers: TierRange[]): string | null {
  if (years == null || !Number.isFinite(years) || years < 0) return null;
  // Prefer an exact range match: min ≤ years < max (max null = open-ended).
  const match = tiers.find((t) => {
    const min = t.years_min ?? 0;
    const max = t.years_max; // null ⇒ no upper bound
    return years >= min && (max == null || years < max);
  });
  if (match) return match.slug;
  // Past the top of every bounded range → the most senior (highest years_min) tier.
  const top = [...tiers].sort((a, b) => (b.years_min ?? 0) - (a.years_min ?? 0))[0];
  return top?.slug ?? null;
}
