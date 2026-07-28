import "server-only";

/**
 * FreelancerProfile (feature 006) — the freelancer's truth, loaded ONCE and
 * passed as a parameter to every engine. Engines default from it; AI/the brief
 * only fills the situational. Every field is nullable — the profile is a PRIOR,
 * never required (empty profile ⇒ engines fall back to today's behavior).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadUserBrandDefaults, type UserBrandDefaults } from "@/lib/proposals/brand";

export type FreelancerProfile = {
  userId: string;
  // professional
  primarySpecialtySlug: string | null;
  listedSpecialtySlugs: string[];
  experienceTierSlug: string | null;
  yearsExperience: number | null;
  citySlug: string | null;
  // money
  projectRateRange: { min: number; max: number } | null;
  hourlyRate: number | null;
  dailyRate: number | null;
  incomeGoalMonthly: number | null;
  previousYearIncome: number | null;
  // goals + tone
  primaryGoal: string | null;
  goals: string[];
  preferredTone: string | null;
  // compliance + defaults
  vat: { registered: boolean; number: string | null; verified: boolean };
  defaults: {
    depositPct: number | null;
    revisions: number | null;
    ipTerms: string | null;
    paymentMethod: string | null;
    paymentDetails: string | null;
    warrantyDays: number | null;
  };
  // brand (reuse the proposal brand block)
  brand: UserBrandDefaults;
};

/** The midpoint of the freelancer's stated project-rate range, as a personal anchor. */
export function statedProjectAnchor(p: Pick<FreelancerProfile, "projectRateRange">): number | null {
  const r = p.projectRateRange;
  if (!r || !(r.min >= 0) || !(r.max > 0)) return null;
  const mid = (Number(r.min) + Number(r.max)) / 2;
  return mid > 0 ? mid : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadFreelancerProfile(supabase: SupabaseClient<any>, userId: string): Promise<FreelancerProfile> {
  const [{ data: row }, { data: specRows }, brand] = await Promise.all([
    supabase
      .from("users")
      .select(
        "specialties, years_experience, current_project_rate_range, current_hourly_rate_sar, current_daily_rate_sar, income_goal_monthly_sar, previous_year_income_sar, primary_goal, goals, preferred_tone, vat_registered, vat_number, fl_verified, default_deposit_pct, default_revisions, default_ip_terms, default_payment_method, default_payment_details, default_warranty_days, primary_specialty:specialties!primary_specialty_id(slug), tier:experience_tiers!experience_tier_id(slug), city:cities!city_id(slug)"
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("specialties").select("slug, name_en, name_ar"),
  ]).then(async ([r, s]) => [r, s, await loadUserBrandDefaults(supabase, userId)] as const);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = (row ?? {}) as any;
  const primarySpecialtySlug = (r.primary_specialty?.slug as string | null) ?? null;

  // listed specialties: free-text entries mapped to known slugs (slug or name match) + primary.
  const bySlug = new Map<string, string>();
  for (const sp of (specRows ?? []) as { slug: string; name_en: string; name_ar: string }[]) {
    bySlug.set(sp.slug.toLowerCase(), sp.slug);
    if (sp.name_en) bySlug.set(sp.name_en.toLowerCase(), sp.slug);
    if (sp.name_ar) bySlug.set(sp.name_ar.toLowerCase(), sp.slug);
  }
  const listed = new Set<string>();
  if (primarySpecialtySlug) listed.add(primarySpecialtySlug);
  for (const entry of (r.specialties as string[] | null) ?? []) {
    const hit = bySlug.get(String(entry).trim().toLowerCase());
    if (hit) listed.add(hit);
  }

  const rr = r.current_project_rate_range as { min?: number; max?: number } | null;
  const projectRateRange =
    rr && typeof rr.min === "number" && typeof rr.max === "number" ? { min: rr.min, max: rr.max } : null;

  return {
    userId,
    primarySpecialtySlug,
    listedSpecialtySlugs: [...listed],
    experienceTierSlug: (r.tier?.slug as string | null) ?? null,
    yearsExperience: (r.years_experience as number | null) ?? null,
    citySlug: (r.city?.slug as string | null) ?? null,
    projectRateRange,
    hourlyRate: (r.current_hourly_rate_sar as number | null) ?? null,
    dailyRate: (r.current_daily_rate_sar as number | null) ?? null,
    incomeGoalMonthly: (r.income_goal_monthly_sar as number | null) ?? null,
    previousYearIncome: (r.previous_year_income_sar as number | null) ?? null,
    primaryGoal: (r.primary_goal as string | null) ?? null,
    goals: (r.goals as string[] | null) ?? [],
    preferredTone: (r.preferred_tone as string | null) ?? null,
    vat: {
      registered: !!r.vat_registered,
      number: (r.vat_number as string | null) ?? null,
      verified: !!r.fl_verified,
    },
    defaults: {
      depositPct: (r.default_deposit_pct as number | null) ?? null,
      revisions: (r.default_revisions as number | null) ?? null,
      ipTerms: (r.default_ip_terms as string | null) ?? null,
      paymentMethod: (r.default_payment_method as string | null) ?? null,
      paymentDetails: (r.default_payment_details as string | null) ?? null,
      warrantyDays: (r.default_warranty_days as number | null) ?? null,
    },
    brand,
  };
}
