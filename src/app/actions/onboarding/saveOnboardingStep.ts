"use server";

/**
 * P5.10 — Onboarding v2 (M8): per-step save action.
 * Owner-scoped writes (auth.uid()) only.
 * Each step writes only its own columns; bumps onboarding_step to max(current, thisStep).
 * Returns updated profile_completeness_pct.
 *
 * NOTE: FL document upload is DEFERRED (no storage bucket yet).
 * fl_number is captured as text; fl_document_url is never written here.
 * The upload control in the UI renders as a disabled "قريبًا" placeholder.
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { computeStrength } from "@/lib/profile/strength";

// ── Per-step Zod schemas ─────────────────────────────────────────────────────

const StepIdentitySchema = z.object({
  full_name_ar: z.string().trim().max(120).optional().nullable(),
  full_name_en: z.string().trim().max(120).optional().nullable(),
  fl_number: z.string().trim().max(40).optional().nullable(),
  commercial_reg: z.string().trim().max(40).optional().nullable(),
  vat_registered: z.boolean().optional(),
  vat_number: z.string().trim().max(20).optional().nullable(),
});

const StepLocationSchema = z.object({
  city_id: z.string().uuid().optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(), // keep legacy text field in sync
});

const StepProfessionalSchema = z.object({
  primary_specialty_id: z.string().uuid().optional().nullable(),
  specialties: z.array(z.string().trim().max(120)).max(10).optional(),
  experience_tier_id: z.string().uuid().optional().nullable(),
  years_experience: z.number().int().min(0).max(60).optional().nullable(),
  languages: z.array(z.string().trim().max(20)).max(10).optional(),
});

const StepRatesSchema = z.object({
  current_hourly_rate_sar: z.number().nonnegative().optional().nullable(),
  current_daily_rate_sar: z.number().nonnegative().optional().nullable(),
  current_project_rate_range: z
    .object({ min: z.number().nonnegative(), max: z.number().nonnegative() })
    .optional()
    .nullable(),
  previous_year_income_sar: z.number().nonnegative().optional().nullable(),
  income_goal_monthly_sar: z.number().nonnegative().optional().nullable(),
  rate_confidence: z.enum(["exact", "approximate", "estimate"]).optional(),
});

const StepPortfolioSchema = z.object({
  portfolio_samples: z
    .array(
      z.object({
        title: z.string().trim().max(120),
        url: z.string().url().max(500).optional(),
        description: z.string().trim().max(500).optional(),
      })
    )
    .max(20)
    .optional()
    .nullable(),
  total_projects_completed: z.number().int().min(0).optional().nullable(),
  notable_clients: z.array(z.string().trim().max(120)).max(20).optional().nullable(),
});

const StepBrandSchema = z.object({
  brand_name: z.string().trim().max(120).optional().nullable(),
  brand_name_ar: z.string().trim().max(120).optional().nullable(),
  logo_url: z.string().url().max(500).optional().nullable().or(z.literal("")),
  brand_colors: z
    .object({ primary: z.string().max(20), secondary: z.string().max(20).optional() })
    .optional()
    .nullable(),
  tagline_ar: z.string().trim().max(200).optional().nullable(),
  tagline_en: z.string().trim().max(200).optional().nullable(),
  bio_ar: z.string().trim().max(1000).optional().nullable(),
  bio_en: z.string().trim().max(1000).optional().nullable(),
  contact_email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  contact_phone: z.string().trim().max(30).optional().nullable(),
  contact_whatsapp: z.string().trim().max(30).optional().nullable(),
  contact_city: z.string().trim().max(80).optional().nullable(),
});

const StepDefaultsSchema = z.object({
  default_deposit_pct: z.number().int().min(0).max(100).optional(),
  default_revisions: z.number().int().min(0).max(50).optional(),
  default_ip_terms: z.enum(["full_transfer", "license", "per_project"]).optional(),
  default_milestone_structure: z
    .array(z.object({ pct: z.number().min(0).max(100), trigger: z.string().max(50) }))
    .optional()
    .nullable(),
  default_payment_method: z
    .enum(["bank_transfer", "stc_pay", "cash", "other"])
    .optional(),
  default_payment_details: z.string().trim().max(500).optional().nullable(),
  default_warranty_days: z.number().int().min(0).max(365).optional(),
});

const StepGoalsSchema = z.object({
  primary_goal: z
    .enum([
      "increase_income",
      "stabilize_income",
      "build_brand",
      "track_finances",
      "qualify_hadaf",
      "find_clients",
    ])
    .optional(),
  goals: z.array(z.string().trim().max(80)).max(10).optional(),
  uses_bahr: z.boolean().optional(),
  uses_mostaql: z.boolean().optional(),
  uses_khamsat: z.boolean().optional(),
  preferred_tone: z.enum(["formal", "balanced", "friendly"]).optional(),
});

// ── Step number → key mapping ─────────────────────────────────────────────────
// Step 1 = welcome (no save), Step 10 = review (use completeOnboarding)
const STEP_SCHEMAS = {
  identity: StepIdentitySchema,
  location: StepLocationSchema,
  professional: StepProfessionalSchema,
  rates: StepRatesSchema,
  portfolio: StepPortfolioSchema,
  brand: StepBrandSchema,
  defaults: StepDefaultsSchema,
  goals: StepGoalsSchema,
} as const;

// Map step_key → step number (for bumping onboarding_step)
const STEP_KEY_TO_NUM: Record<string, number> = {
  welcome: 1,
  identity: 2,
  location: 3,
  professional: 4,
  rates: 5,
  portfolio: 6,
  brand: 7,
  defaults: 8,
  goals: 9,
  review: 10,
};

export type SaveOnboardingStepKey = keyof typeof STEP_SCHEMAS;

export type SaveOnboardingStepResult =
  | { ok: true; completeness: number }
  | { ok: false; code: "no_session" | "invalid" | "unknown_step" | "error" };

export async function saveOnboardingStep(
  stepKey: string,
  data: unknown
): Promise<SaveOnboardingStepResult> {
  // Validate step key
  if (!(stepKey in STEP_SCHEMAS)) {
    return { ok: false, code: "unknown_step" };
  }
  const key = stepKey as SaveOnboardingStepKey;
  const schema = STEP_SCHEMAS[key];

  const parsed = schema.safeParse(data);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "no_session" };

  const uid = userData.user.id;
  const stepNum = STEP_KEY_TO_NUM[stepKey] ?? 0;

  // Coerce empty strings to null for URL fields (Zod allows "" via .or(z.literal("")))
  const cleanData = Object.fromEntries(
    Object.entries(parsed.data as Record<string, unknown>).map(([k, v]) => [
      k,
      v === "" ? null : v,
    ])
  );

  // Step-specific: normalise current_project_rate_range to jsonb-safe object
  const updatePayload: Record<string, unknown> = {
    ...cleanData,
    profile_last_updated: new Date().toISOString(),
  };

  // First: fetch the current row so completeness is computed over the WHOLE profile (must
  // include every column the strength model reads, else the stored pct undercounts vs the
  // Settings profile page). onboarding_step is fetched for the max() below.
  const { data: currentRow, error: fetchErr } = await supabase
    .from("users")
    .select(
      "onboarding_step, full_name_ar, fl_number, primary_specialty_id, specialties, city_id, city, experience_tier_id, years_experience, current_hourly_rate_sar, current_daily_rate_sar, current_project_rate_range, income_goal_monthly_sar, brand_name, brand_name_ar, bio_ar, bio_en, contact_email, contact_phone, contact_whatsapp, logo_url, portfolio_samples, notable_clients, total_projects_completed, bahr_profile_url, mostaql_profile_url, khamsat_profile_url, linkedin_url, behance_url, personal_website_url"
    )
    .eq("id", uid)
    .maybeSingle();

  if (fetchErr) {
    console.error("[saveOnboardingStep] fetch failed", fetchErr.code);
    return { ok: false, code: "error" };
  }

  const currentStep = (currentRow?.onboarding_step as number | null) ?? 0;
  updatePayload.onboarding_step = Math.max(currentStep, stepNum);

  // Compute completeness from merged values
  const mergedForCompleteness: Record<string, unknown> = {
    ...(currentRow ?? {}),
    ...cleanData,
  };
  const pct = computeStrength(mergedForCompleteness);
  updatePayload.profile_completeness_pct = pct;

  const { error } = await supabase
    .from("users")
    .update(updatePayload)
    .eq("id", uid);

  if (error) {
    console.error("[saveOnboardingStep] update failed", error.code);
    return { ok: false, code: "error" };
  }

  return { ok: true, completeness: pct };
}
