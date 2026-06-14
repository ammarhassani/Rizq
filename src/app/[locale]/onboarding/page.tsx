/**
 * P5.10 — Onboarding page v2.
 *
 * LEGACY SAFETY: users with onboarded_at IS NOT NULL are treated as already
 * onboarded and redirected to /dashboard immediately — they are NOT forced
 * through the new 11-step wizard. This preserves the v0.1 contract exactly.
 *
 * NEW USERS (onboarded_at IS NULL): shown the v2 wizard. Resume from
 * users.onboarding_step if > 0 (i.e. they started but didn't finish).
 *
 * onboarding_completed = true also redirects to dashboard (new users who
 * finished the v2 flow also set onboarded_at via completeOnboarding()).
 */

import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound, redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/auth/AuthCard";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import type { ProfileSnapshot } from "@/components/onboarding/types";
import type { OnboardingStep } from "@/components/onboarding/types";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // ── Legacy + new-completion guard ──────────────────────────────────────────
  // Existing users (onboarded_at set via v0.1 saveOnboarding/skipOnboarding)
  // and new users who completed v2 (onboarded_at set by completeOnboarding)
  // both get redirected to dashboard. This is the single guard point so that:
  //   a) v0.1 users are never re-trapped in the new wizard.
  //   b) v2 completers don't see the wizard again on re-login.
  const { data: profile } = await supabase
    .from("users")
    .select(
      `onboarded_at, onboarding_completed, onboarding_step,
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
       brand_name, brand_name_ar, tagline_ar, tagline_en, bio_ar, bio_en,
       contact_email, contact_phone, contact_whatsapp, contact_city,
       default_deposit_pct, default_revisions, default_ip_terms,
       default_payment_method, default_payment_details, default_warranty_days,
       primary_goal, goals, uses_bahr, uses_mostaql, uses_khamsat, preferred_tone,
       profile_completeness_pct`
    )
    .eq("id", user.id)
    .maybeSingle();

  // ── Redirect if already onboarded (legacy v0.1 OR v2 completed) ──────────
  if (profile?.onboarded_at || profile?.onboarding_completed) {
    redirect(`/${locale}/dashboard`);
  }

  // ── Load onboarding step config from DB ────────────────────────────────────
  const { data: stepRows } = await supabase
    .from("onboarding_steps")
    .select("id, step_key, title_ar, title_en, required, skippable, estimated_seconds")
    .eq("enabled", true)
    .order("sort_order");

  const steps: OnboardingStep[] = (stepRows ?? []).map((row) => ({
    id: row.id as number,
    step_key: row.step_key as OnboardingStep["step_key"],
    title_ar: row.title_ar as string,
    title_en: row.title_en as string,
    required: row.required as boolean,
    skippable: row.skippable as boolean,
    estimated_seconds: row.estimated_seconds as number | null,
  }));

  // ── Build ProfileSnapshot with safe defaults ────────────────────────────────
  const snapshot: ProfileSnapshot = {
    full_name_ar: (profile?.full_name_ar as string | null) ?? null,
    full_name_en: (profile?.full_name_en as string | null) ?? null,
    fl_number: (profile?.fl_number as string | null) ?? null,
    commercial_reg: (profile?.commercial_reg as string | null) ?? null,
    vat_registered: (profile?.vat_registered as boolean | null) ?? false,
    vat_number: (profile?.vat_number as string | null) ?? null,
    city_id: (profile?.city_id as string | null) ?? null,
    city: (profile?.city as string | null) ?? null,
    primary_specialty_id: (profile?.primary_specialty_id as string | null) ?? null,
    specialties: (profile?.specialties as string[] | null) ?? [],
    experience_tier_id: (profile?.experience_tier_id as string | null) ?? null,
    years_experience: (profile?.years_experience as number | null) ?? null,
    languages: (profile?.languages as string[] | null) ?? ["ar"],
    current_hourly_rate_sar: (profile?.current_hourly_rate_sar as number | null) ?? null,
    current_daily_rate_sar: (profile?.current_daily_rate_sar as number | null) ?? null,
    current_project_rate_range:
      (profile?.current_project_rate_range as { min: number; max: number } | null) ?? null,
    previous_year_income_sar: (profile?.previous_year_income_sar as number | null) ?? null,
    income_goal_monthly_sar: (profile?.income_goal_monthly_sar as number | null) ?? null,
    rate_confidence:
      (profile?.rate_confidence as "exact" | "approximate" | "estimate" | null) ?? "approximate",
    bahr_profile_url: (profile?.bahr_profile_url as string | null) ?? null,
    mostaql_profile_url: (profile?.mostaql_profile_url as string | null) ?? null,
    khamsat_profile_url: (profile?.khamsat_profile_url as string | null) ?? null,
    linkedin_url: (profile?.linkedin_url as string | null) ?? null,
    behance_url: (profile?.behance_url as string | null) ?? null,
    personal_website_url: (profile?.personal_website_url as string | null) ?? null,
    portfolio_samples:
      (profile?.portfolio_samples as Array<{
        title: string;
        url?: string;
        description?: string;
      }> | null) ?? null,
    total_projects_completed: (profile?.total_projects_completed as number | null) ?? null,
    notable_clients: (profile?.notable_clients as string[] | null) ?? null,
    brand_name: (profile?.brand_name as string | null) ?? null,
    brand_name_ar: (profile?.brand_name_ar as string | null) ?? null,
    tagline_ar: (profile?.tagline_ar as string | null) ?? null,
    tagline_en: (profile?.tagline_en as string | null) ?? null,
    bio_ar: (profile?.bio_ar as string | null) ?? null,
    bio_en: (profile?.bio_en as string | null) ?? null,
    contact_email: (profile?.contact_email as string | null) ?? null,
    contact_phone: (profile?.contact_phone as string | null) ?? null,
    contact_whatsapp: (profile?.contact_whatsapp as string | null) ?? null,
    contact_city: (profile?.contact_city as string | null) ?? null,
    default_deposit_pct: (profile?.default_deposit_pct as number | null) ?? 50,
    default_revisions: (profile?.default_revisions as number | null) ?? 2,
    default_ip_terms:
      (profile?.default_ip_terms as "full_transfer" | "license" | "per_project" | null) ??
      "full_transfer",
    default_payment_method:
      (profile?.default_payment_method as
        | "bank_transfer"
        | "stc_pay"
        | "cash"
        | "other"
        | null) ?? "bank_transfer",
    default_payment_details: (profile?.default_payment_details as string | null) ?? null,
    default_warranty_days: (profile?.default_warranty_days as number | null) ?? 0,
    primary_goal:
      (profile?.primary_goal as
        | "increase_income"
        | "stabilize_income"
        | "build_brand"
        | "track_finances"
        | "qualify_hadaf"
        | "find_clients"
        | null) ?? "increase_income",
    goals: (profile?.goals as string[] | null) ?? [],
    uses_bahr: (profile?.uses_bahr as boolean | null) ?? false,
    uses_mostaql: (profile?.uses_mostaql as boolean | null) ?? false,
    uses_khamsat: (profile?.uses_khamsat as boolean | null) ?? false,
    preferred_tone:
      (profile?.preferred_tone as "formal" | "balanced" | "friendly" | null) ?? "balanced",
    profile_completeness_pct: (profile?.profile_completeness_pct as number | null) ?? 0,
    onboarding_step: (profile?.onboarding_step as number | null) ?? 0,
  };

  const t = await getTranslations({ locale, namespace: "Onboarding" });
  const localeTyped = locale as "ar" | "en";
  const initialStep = snapshot.onboarding_step > 0 ? snapshot.onboarding_step : 1;

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-10 sm:py-14">
      {/* Dot-grid background */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.45] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(200, 169, 81, 0.20) 1px, transparent 1.6px)",
          backgroundSize: "30px 30px",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
        }}
      />
      <div className="relative z-10 w-full max-w-[520px]">
        <AuthCard locale={localeTyped} title={t("v2.steps.welcome.title")} subtitle="">
          <OnboardingWizard
            locale={localeTyped}
            profile={snapshot}
            initialStep={initialStep}
            steps={steps}
          />
        </AuthCard>
      </div>
    </div>
  );
}
