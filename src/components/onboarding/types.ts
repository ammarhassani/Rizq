/**
 * Shared types for the Onboarding v2 wizard.
 */

export type OnboardingStepKey =
  | "welcome"
  | "identity"
  | "location"
  | "professional"
  | "rates"
  | "platforms"
  | "portfolio"
  | "brand"
  | "defaults"
  | "goals"
  | "review";

export interface OnboardingStep {
  id: number;
  step_key: OnboardingStepKey;
  title_ar: string;
  title_en: string;
  required: boolean;
  skippable: boolean;
  estimated_seconds: number | null;
}

export interface StepProps {
  locale: "ar" | "en";
  /** Called when the step completes (navigates to next). completeness 0-100. */
  onNext: (completeness?: number) => void;
  /** Called when the user goes back (wizard handles step decrement). */
  onBack: () => void;
  /** Called when the user explicitly skips (skippable steps only). */
  onSkip: () => void;
  /** Current profile snapshot for pre-filling (may be partial). */
  profile: ProfileSnapshot;
  /**
   * Autosave mode (feature 009, Settings → Profile). When true the editor saves on change
   * (debounced) and hides the wizard's Back/Skip/Save buttons. Defaults to false (wizard flow).
   */
  autosave?: boolean;
  /** Called when a save fails — lets the Settings profile page surface a "couldn't save" toast. */
  onSaveError?: () => void;
}

/** Columns we load from users to pre-fill wizard fields. */
export interface ProfileSnapshot {
  full_name_ar: string | null;
  full_name_en: string | null;
  fl_number: string | null;
  commercial_reg: string | null;
  vat_registered: boolean;
  vat_number: string | null;
  city_id: string | null;
  city: string | null;
  primary_specialty_id: string | null;
  specialties: string[];
  experience_tier_id: string | null;
  years_experience: number | null;
  languages: string[];
  current_hourly_rate_sar: number | null;
  current_daily_rate_sar: number | null;
  current_project_rate_range: { min: number; max: number } | null;
  previous_year_income_sar: number | null;
  income_goal_monthly_sar: number | null;
  /** null until the freelancer picks one — the column has no default (20260727083200). */
  rate_confidence: "exact" | "approximate" | "estimate" | null;
  bahr_profile_url: string | null;
  mostaql_profile_url: string | null;
  khamsat_profile_url: string | null;
  linkedin_url: string | null;
  behance_url: string | null;
  personal_website_url: string | null;
  portfolio_samples: Array<{ title: string; url?: string; description?: string }> | null;
  total_projects_completed: number | null;
  notable_clients: string[] | null;
  brand_name: string | null;
  brand_name_ar: string | null;
  tagline_ar: string | null;
  tagline_en: string | null;
  bio_ar: string | null;
  bio_en: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_city: string | null;
  default_deposit_pct: number;
  default_revisions: number;
  default_ip_terms: "full_transfer" | "license" | "per_project";
  default_payment_method: "bank_transfer" | "stc_pay" | "cash" | "other";
  default_payment_details: string | null;
  default_warranty_days: number;
  primary_goal: "increase_income" | "stabilize_income" | "build_brand" | "track_finances" | "qualify_hadaf" | "find_clients";
  goals: string[];
  uses_bahr: boolean;
  uses_mostaql: boolean;
  uses_khamsat: boolean;
  preferred_tone: "formal" | "balanced" | "friendly";
  profile_completeness_pct: number;
  onboarding_step: number;
}
