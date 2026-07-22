/**
 * Profile strength — THE model the app actually uses (feature 009).
 *
 * The strength shown in onboarding and persisted to users.profile_completeness_pct is the
 * simple 7-core-field score below (previously inlined in saveOnboardingStep as
 * `computeCompleteness`). It is centralised here so the onboarding save, the Settings profile
 * page, and the Proposals nudge all compute the SAME number (spec 009 SC-004).
 *
 * NOTE: lib/profile/completeness.ts holds a richer 10-dimension model that is not wired to
 * anything; this 7-field score is the live one. ponytail: unify onto the richer model later if
 * the strength meter is ever reworked — but that changes the number users see, so out of scope here.
 */

/**
 * Minimal shape strength reads — satisfied by ProfileSnapshot and the users row.
 * NOTE: the profile editors persist specialty/city/experience as `specialties` (slug array),
 * `city` (text), and `years_experience` — NOT the *_id columns — so strength accepts EITHER the
 * id OR the editor-written field, else the meter can never move for those three (feature 009 fix).
 */
export type StrengthProfile = {
  full_name_ar?: string | null;
  fl_number?: string | null;
  primary_specialty_id?: string | null;
  specialties?: string[] | null;
  city_id?: string | null;
  city?: string | null;
  experience_tier_id?: string | null;
  years_experience?: number | null;
  current_hourly_rate_sar?: number | null;
  current_daily_rate_sar?: number | null;
  income_goal_monthly_sar?: number | null;
};

export type StrengthItem = {
  key: "full_name" | "fl_number" | "specialty" | "city" | "experience" | "rate" | "goal";
  label_ar: string;
  label_en: string;
  met: boolean;
};

/** The 7 core KYC fields, each worth an equal share of 100%. */
const FIELDS: Array<Omit<StrengthItem, "met"> & { met: (p: StrengthProfile) => boolean }> = [
  { key: "full_name", label_ar: "الاسم الكامل", label_en: "Full name", met: (p) => Boolean(p.full_name_ar) },
  { key: "fl_number", label_ar: "رقم وثيقة العمل الحر", label_en: "Freelance document number", met: (p) => Boolean(p.fl_number) },
  { key: "specialty", label_ar: "التخصص", label_en: "Specialty", met: (p) => Boolean(p.primary_specialty_id || (p.specialties && p.specialties.length > 0)) },
  { key: "city", label_ar: "المدينة", label_en: "City", met: (p) => Boolean(p.city_id || p.city) },
  { key: "experience", label_ar: "مستوى الخبرة", label_en: "Experience level", met: (p) => Boolean(p.experience_tier_id || p.years_experience) },
  { key: "rate", label_ar: "سعرك", label_en: "Your rate", met: (p) => Boolean(p.current_hourly_rate_sar ?? p.current_daily_rate_sar) },
  { key: "goal", label_ar: "هدف الدخل الشهري", label_en: "Monthly income goal", met: (p) => Boolean(p.income_goal_monthly_sar) },
];

/** Strength 0..100 = share of the 7 core fields that are filled (matches the persisted pct). */
export function computeStrength(p: StrengthProfile): number {
  const filled = FIELDS.filter((f) => f.met(p)).length;
  return Math.round((filled / FIELDS.length) * 100);
}

/** Per-field breakdown for the "what's still missing" checklist. */
export function strengthItems(p: StrengthProfile): StrengthItem[] {
  return FIELDS.map((f) => ({ key: f.key, label_ar: f.label_ar, label_en: f.label_en, met: f.met(p) }));
}

/** Each core field is worth this many percentage points (for "+N%" hints). */
export const STRENGTH_STEP_PCT = Math.round(100 / FIELDS.length); // ≈ 14

/** At or above this strength, the profile is "strong" and the nudge is hidden. */
export const OPTIMAL_THRESHOLD = 80;
