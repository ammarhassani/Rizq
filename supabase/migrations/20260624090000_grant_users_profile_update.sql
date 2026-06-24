-- ─────────────────────────────────────────────────────────────────────────
-- Feature 001 (bug ⑧): fix Studio profile + onboarding saving.
--
-- Root cause: 20260513113211 revoked UPDATE on public.users and re-granted only
-- (name, preferred_language, city, last_active). The M8 profile/onboarding
-- columns (20260613230814) were never granted, so every profile/onboarding
-- write touches an ungranted column and Postgres rejects the UPDATE — surfacing
-- as the generic "Something went wrong" toast and silently breaking onboarding.
--
-- Fix: extend the column-level UPDATE grant to the columns the client legitimately
-- writes via saveOnboardingStep / the Studio profile form. RLS policy
-- users_update_own (auth.uid() = id) still scopes rows — this only widens which
-- COLUMNS may be written, not which ROWS.
--
-- DELIBERATELY EXCLUDED (no privilege escalation): id, email, role, pro_until,
-- fl_verified, fl_verified_at, fl_document_url, onboarded_at, created_at.
-- ─────────────────────────────────────────────────────────────────────────

grant update (
  -- already-granted base (idempotent re-grant)
  name, preferred_language, city, last_active,
  -- identity & compliance (user-entered; verification flags excluded)
  full_name_ar, full_name_en, fl_number, commercial_reg, vat_registered, vat_number,
  -- location
  city_id,
  -- professional
  primary_specialty_id, specialties, experience_tier_id, years_experience, languages,
  -- rates
  current_hourly_rate_sar, current_daily_rate_sar, current_project_rate_range,
  previous_year_income_sar, income_goal_monthly_sar, rate_confidence,
  -- platforms
  bahr_profile_url, mostaql_profile_url, khamsat_profile_url, linkedin_url,
  behance_url, personal_website_url, platform_ratings,
  -- portfolio
  portfolio_samples, total_projects_completed, notable_clients,
  -- brand & contact
  brand_name, brand_name_ar, logo_url, brand_colors, tagline_ar, tagline_en,
  bio_ar, bio_en, contact_email, contact_phone, contact_whatsapp, contact_city,
  -- business defaults
  default_deposit_pct, default_revisions, default_ip_terms,
  default_milestone_structure, default_payment_method, default_payment_details,
  default_warranty_days,
  -- goals & preferences
  primary_goal, goals, uses_bahr, uses_mostaql, uses_khamsat, preferred_tone,
  -- onboarding bookkeeping
  onboarding_step, onboarding_completed, onboarding_completed_at,
  profile_completeness_pct, profile_last_updated
) on public.users to authenticated;
