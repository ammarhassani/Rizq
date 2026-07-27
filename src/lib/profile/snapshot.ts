import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileSnapshot } from "@/components/onboarding/types";

/**
 * Shared profile-snapshot loader (feature 009). Extracted verbatim from the onboarding page so
 * onboarding AND the new Settings → Profile page build the same snapshot and therefore compute
 * the same strength (spec 009 SC-004). Behaviour-preserving.
 */

const PROFILE_COLUMNS = `onboarded_at, onboarding_completed, onboarding_step,
  full_name_ar, full_name_en, fl_number, commercial_reg,
  vat_registered, vat_number,
  city_id, city,
  primary_specialty_id, specialties, experience_tier_id,
  years_experience, languages,
  current_hourly_rate_sar, current_daily_rate_sar, current_project_rate_range,
  previous_year_income_sar, income_goal_monthly_sar, rate_confidence,
  bahr_profile_url, mostaql_profile_url, khamsat_profile_url,
  linkedin_url, behance_url, personal_website_url,
  portfolio_samples, total_projects_completed, notable_clients,
  brand_name, brand_name_ar, tagline_ar, tagline_en, bio_ar, bio_en, logo_url,
  contact_email, contact_phone, contact_whatsapp, contact_city,
  default_deposit_pct, default_revisions, default_ip_terms,
  default_payment_method, default_payment_details, default_warranty_days,
  primary_goal, goals, uses_bahr, uses_mostaql, uses_khamsat, preferred_tone,
  profile_completeness_pct`;

export type LoadedProfile = {
  snapshot: ProfileSnapshot;
  onboardedAt: string | null;
  onboardingCompleted: boolean;
};

/** Build the ProfileSnapshot from a raw users row (with safe defaults). */
export function buildProfileSnapshot(profile: Record<string, unknown> | null): ProfileSnapshot {
  const p = profile ?? {};
  return {
    full_name_ar: (p.full_name_ar as string | null) ?? null,
    full_name_en: (p.full_name_en as string | null) ?? null,
    fl_number: (p.fl_number as string | null) ?? null,
    commercial_reg: (p.commercial_reg as string | null) ?? null,
    vat_registered: (p.vat_registered as boolean | null) ?? false,
    vat_number: (p.vat_number as string | null) ?? null,
    city_id: (p.city_id as string | null) ?? null,
    city: (p.city as string | null) ?? null,
    primary_specialty_id: (p.primary_specialty_id as string | null) ?? null,
    specialties: (p.specialties as string[] | null) ?? [],
    experience_tier_id: (p.experience_tier_id as string | null) ?? null,
    years_experience: (p.years_experience as number | null) ?? null,
    languages: (p.languages as string[] | null) ?? ["ar"],
    current_hourly_rate_sar: (p.current_hourly_rate_sar as number | null) ?? null,
    current_daily_rate_sar: (p.current_daily_rate_sar as number | null) ?? null,
    current_project_rate_range: (p.current_project_rate_range as { min: number; max: number } | null) ?? null,
    previous_year_income_sar: (p.previous_year_income_sar as number | null) ?? null,
    income_goal_monthly_sar: (p.income_goal_monthly_sar as number | null) ?? null,
    // null = not chosen. Defaulting here would put the lie back on the other side of the
    // column: the row says nothing was picked, the snapshot would say "approximate".
    rate_confidence: (p.rate_confidence as "exact" | "approximate" | "estimate" | null) ?? null,
    bahr_profile_url: (p.bahr_profile_url as string | null) ?? null,
    mostaql_profile_url: (p.mostaql_profile_url as string | null) ?? null,
    khamsat_profile_url: (p.khamsat_profile_url as string | null) ?? null,
    linkedin_url: (p.linkedin_url as string | null) ?? null,
    behance_url: (p.behance_url as string | null) ?? null,
    personal_website_url: (p.personal_website_url as string | null) ?? null,
    portfolio_samples: (p.portfolio_samples as Array<{ title: string; url?: string; description?: string }> | null) ?? null,
    total_projects_completed: (p.total_projects_completed as number | null) ?? null,
    notable_clients: (p.notable_clients as string[] | null) ?? null,
    brand_name: (p.brand_name as string | null) ?? null,
    brand_name_ar: (p.brand_name_ar as string | null) ?? null,
    tagline_ar: (p.tagline_ar as string | null) ?? null,
    tagline_en: (p.tagline_en as string | null) ?? null,
    bio_ar: (p.bio_ar as string | null) ?? null,
    bio_en: (p.bio_en as string | null) ?? null,
    logo_url: (p.logo_url as string | null) ?? null,
    contact_email: (p.contact_email as string | null) ?? null,
    contact_phone: (p.contact_phone as string | null) ?? null,
    contact_whatsapp: (p.contact_whatsapp as string | null) ?? null,
    contact_city: (p.contact_city as string | null) ?? null,
    default_deposit_pct: (p.default_deposit_pct as number | null) ?? 50,
    default_revisions: (p.default_revisions as number | null) ?? 2,
    default_ip_terms: (p.default_ip_terms as "full_transfer" | "license" | "per_project" | null) ?? "full_transfer",
    default_payment_method:
      (p.default_payment_method as "bank_transfer" | "stc_pay" | "cash" | "other" | null) ?? "bank_transfer",
    default_payment_details: (p.default_payment_details as string | null) ?? null,
    default_warranty_days: (p.default_warranty_days as number | null) ?? 0,
    primary_goal:
      (p.primary_goal as
        | "increase_income"
        | "stabilize_income"
        | "build_brand"
        | "track_finances"
        | "qualify_hadaf"
        | "find_clients"
        | null) ?? "increase_income",
    goals: (p.goals as string[] | null) ?? [],
    uses_bahr: (p.uses_bahr as boolean | null) ?? false,
    uses_mostaql: (p.uses_mostaql as boolean | null) ?? false,
    uses_khamsat: (p.uses_khamsat as boolean | null) ?? false,
    preferred_tone: (p.preferred_tone as "formal" | "balanced" | "friendly" | null) ?? "balanced",
    profile_completeness_pct: (p.profile_completeness_pct as number | null) ?? 0,
    onboarding_step: (p.onboarding_step as number | null) ?? 0,
  };
}

/** Load the current user's profile row and return the snapshot + onboarding-gate flags. */
export async function loadProfileSnapshot(supabase: SupabaseClient, userId: string): Promise<LoadedProfile> {
  const { data: profile } = await supabase.from("users").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle();
  return {
    snapshot: buildProfileSnapshot(profile as Record<string, unknown> | null),
    onboardedAt: (profile?.onboarded_at as string | null) ?? null,
    onboardingCompleted: Boolean(profile?.onboarding_completed),
  };
}
