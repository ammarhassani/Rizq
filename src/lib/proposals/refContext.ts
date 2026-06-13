/**
 * Shared helper: loads ref-data lists and builds the ctx lines for
 * extractScope, plus provides slug→id lookup maps.
 *
 * Cached per-request by the underlying getSpecialties/getCities/getExperienceTiers
 * React cache() wrappers.
 */

import {
  getSpecialties,
  getCities,
  getExperienceTiers,
  type Specialty,
  type City,
  type ExperienceTier,
} from "@/lib/pricing/refDataDb";
import type { ScopeCtx } from "@/lib/ai/scope";

export type RefContext = {
  specialties: Specialty[];
  cities: City[];
  tiers: ExperienceTier[];
  ctx: ScopeCtx;
  /** slug → DB id */
  specialtyIdBySlug: Map<string, string>;
  cityIdBySlug: Map<string, string>;
  tierIdBySlug: Map<string, string>;
};

export async function loadRefContext(): Promise<RefContext | null> {
  const [specialties, cities, tiers] = await Promise.all([
    getSpecialties(),
    getCities(),
    getExperienceTiers(),
  ]);

  if (specialties.length === 0 || cities.length === 0 || tiers.length === 0) {
    return null;
  }

  const specialtyLines = specialties
    .map((s) => `${s.slug} (${s.name_ar})`)
    .join(", ");
  const cityLines = cities.map((c) => c.name_ar).join(", ");
  const tierLines = tiers
    .map(
      (t) =>
        `${t.slug} (${t.name_ar}, ${t.years_min}-${t.years_max ?? "∞"}y)`
    )
    .join(", ");

  const ctx: ScopeCtx = { specialtyLines, cityLines, tierLines };

  const specialtyIdBySlug = new Map(specialties.map((s) => [s.slug, s.id]));
  const cityIdBySlug = new Map(cities.map((c) => [c.slug, c.id]));
  const tierIdBySlug = new Map(tiers.map((t) => [t.slug, t.id]));

  return {
    specialties,
    cities,
    tiers,
    ctx,
    specialtyIdBySlug,
    cityIdBySlug,
    tierIdBySlug,
  };
}
