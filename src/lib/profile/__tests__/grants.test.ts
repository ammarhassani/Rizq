import { describe, it, expect } from "vitest";
import { USERS_WRITABLE_COLUMNS } from "../writableColumns";

/**
 * Authoritative list of every column the client writes via saveOnboardingStep
 * (across all step schemas) plus the always-written bookkeeping columns, and the
 * Studio profile form (which calls the same action). Derived from the Zod step
 * schemas in src/app/actions/onboarding/saveOnboardingStep.ts.
 *
 * If a profile field is added there without being granted UPDATE, this test fails
 * — which is exactly the bug ⑧ class ("Something went wrong" on save).
 */
const ONBOARDING_WRITTEN_COLUMNS = [
  // identity
  "full_name_ar", "full_name_en", "fl_number", "commercial_reg", "vat_registered", "vat_number",
  // location
  "city_id", "city",
  // professional
  "primary_specialty_id", "specialties", "experience_tier_id", "years_experience", "languages",
  // rates
  "current_hourly_rate_sar", "current_daily_rate_sar", "current_project_rate_range",
  "previous_year_income_sar", "income_goal_monthly_sar", "rate_confidence",
  // platforms
  "bahr_profile_url", "mostaql_profile_url", "khamsat_profile_url", "linkedin_url",
  "behance_url", "personal_website_url", "platform_ratings",
  // portfolio
  "portfolio_samples", "total_projects_completed", "notable_clients",
  // brand & contact
  "brand_name", "brand_name_ar", "logo_url", "brand_colors", "tagline_ar", "tagline_en",
  "bio_ar", "bio_en", "contact_email", "contact_phone", "contact_whatsapp", "contact_city",
  // defaults
  "default_deposit_pct", "default_revisions", "default_ip_terms", "default_milestone_structure",
  "default_payment_method", "default_payment_details", "default_warranty_days",
  // goals
  "primary_goal", "goals", "uses_bahr", "uses_mostaql", "uses_khamsat", "preferred_tone",
  // always-written bookkeeping
  "onboarding_step", "profile_completeness_pct", "profile_last_updated",
];

describe("users UPDATE grants cover the profile/onboarding save (bug ⑧ guard)", () => {
  it("every written column is in the writable-columns allowlist", () => {
    const granted = new Set<string>(USERS_WRITABLE_COLUMNS);
    const missing = ONBOARDING_WRITTEN_COLUMNS.filter((c) => !granted.has(c));
    expect(missing).toEqual([]);
  });

  it("does NOT grant privilege/billing/verification columns", () => {
    for (const c of ["id", "email", "role", "pro_until", "fl_verified", "fl_verified_at", "fl_document_url"]) {
      expect(USERS_WRITABLE_COLUMNS as readonly string[]).not.toContain(c);
    }
  });
});
