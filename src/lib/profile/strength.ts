/**
 * Profile strength — honest AND fair to newcomers (feature 009).
 *
 * It measures PROFILE SETUP, not track record. So a brand-new freelancer with no prior existence
 * (no portfolio, no past clients, no platform presence, no logo/FL yet) can reach 100% by filling
 * the things every freelancer can provide. The history/asset fields are OPTIONAL extras that make a
 * profile stronger but are NEVER weighed against someone who legitimately has none.
 *
 * - CORE dimensions (weights sum to 100) drive the score. Each accepts EITHER the *_id column OR
 *   the field the editors persist (specialty ← slug array, city ← text, experience ← years incl. 0).
 * - OPTIONAL dimensions have no weight; they're surfaced for display only (green when present).
 *
 * The same model drives onboarding, the Settings profile page, the summary, and the nudge (SC-004).
 * Testimonials are optional social proof handled by their own section (not here).
 */

/** Minimal shape strength reads — satisfied by ProfileSnapshot and the users row. */
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
  current_project_rate_range?: { min: number; max: number } | null;
  income_goal_monthly_sar?: number | null;
  brand_name?: string | null;
  brand_name_ar?: string | null;
  tagline_ar?: string | null;
  tagline_en?: string | null;
  bio_ar?: string | null;
  bio_en?: string | null;
  logo_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
  portfolio_samples?: Array<unknown> | null;
  notable_clients?: string[] | null;
  total_projects_completed?: number | null;
  bahr_profile_url?: string | null;
  mostaql_profile_url?: string | null;
  khamsat_profile_url?: string | null;
  linkedin_url?: string | null;
  behance_url?: string | null;
  personal_website_url?: string | null;
  uses_bahr?: boolean | null;
  uses_mostaql?: boolean | null;
  uses_khamsat?: boolean | null;
};

export type StrengthKey =
  | "full_name"
  | "specialty"
  | "city"
  | "experience"
  | "rate"
  | "goal"
  | "brand"
  | "tagline"
  | "bio"
  | "contact"
  | "fl_number"
  | "logo"
  | "samples"
  | "clients"
  | "platforms";

export type StrengthItem = {
  key: StrengthKey;
  label_ar: string;
  label_en: string;
  /** Weight toward the 0..100 score. Optional extras are 0. */
  weight: number;
  /** true = a "nice to have" that never counts against the score. */
  optional: boolean;
  met: boolean;
};

const nonEmpty = (a?: unknown[] | null) => Array.isArray(a) && a.length > 0;
const hasNumber = (n?: number | null) => typeof n === "number"; // 0 is a valid answer (e.g. 0 years)

type Def = Omit<StrengthItem, "met"> & { met: (p: StrengthProfile) => boolean };

/** CORE — what every freelancer can fill, regardless of experience. Weights sum to 100. */
const CORE: Def[] = [
  { key: "full_name", weight: 10, optional: false, label_ar: "الاسم الكامل", label_en: "Full name", met: (p) => Boolean(p.full_name_ar) },
  { key: "specialty", weight: 14, optional: false, label_ar: "التخصص", label_en: "Specialty", met: (p) => Boolean(p.primary_specialty_id || nonEmpty(p.specialties)) },
  { key: "city", weight: 10, optional: false, label_ar: "المدينة", label_en: "City", met: (p) => Boolean(p.city_id || p.city) },
  { key: "experience", weight: 10, optional: false, label_ar: "مستوى الخبرة", label_en: "Experience level", met: (p) => Boolean(p.experience_tier_id) || hasNumber(p.years_experience) },
  { key: "rate", weight: 14, optional: false, label_ar: "سعرك", label_en: "Your rate", met: (p) => Boolean(p.current_hourly_rate_sar ?? p.current_daily_rate_sar ?? p.current_project_rate_range?.min) },
  { key: "goal", weight: 10, optional: false, label_ar: "هدف الدخل الشهري", label_en: "Monthly income goal", met: (p) => Boolean(p.income_goal_monthly_sar) },
  { key: "brand", weight: 8, optional: false, label_ar: "اسم علامتك", label_en: "Brand name", met: (p) => Boolean(p.brand_name || p.brand_name_ar) },
  { key: "tagline", weight: 6, optional: false, label_ar: "جملتك التعريفية", label_en: "Tagline", met: (p) => Boolean(p.tagline_ar || p.tagline_en) },
  { key: "bio", weight: 10, optional: false, label_ar: "نبذة عنك", label_en: "Bio", met: (p) => Boolean(p.bio_ar || p.bio_en) },
  { key: "contact", weight: 8, optional: false, label_ar: "وسيلة تواصل", label_en: "Contact detail", met: (p) => Boolean(p.contact_email || p.contact_phone || p.contact_whatsapp) },
];

/** OPTIONAL extras — history/assets a newcomer may not have. Never weighed against the score. */
const OPTIONAL: Def[] = [
  { key: "fl_number", weight: 0, optional: true, label_ar: "رقم وثيقة العمل الحر", label_en: "Freelance document number", met: (p) => Boolean(p.fl_number) },
  { key: "logo", weight: 0, optional: true, label_ar: "شعارك", label_en: "Logo", met: (p) => Boolean(p.logo_url) },
  { key: "samples", weight: 0, optional: true, label_ar: "نماذج أعمالك", label_en: "Work samples", met: (p) => nonEmpty(p.portfolio_samples) },
  { key: "clients", weight: 0, optional: true, label_ar: "عملاء أو مشاريع سابقة", label_en: "Past clients or projects", met: (p) => Boolean(nonEmpty(p.notable_clients) || p.total_projects_completed) },
  {
    key: "platforms",
    weight: 0,
    optional: true,
    label_ar: "تواجدك الإلكتروني",
    label_en: "Online presence",
    met: (p) =>
      Boolean(
        p.bahr_profile_url ||
          p.mostaql_profile_url ||
          p.khamsat_profile_url ||
          p.linkedin_url ||
          p.behance_url ||
          p.personal_website_url ||
          p.uses_bahr ||
          p.uses_mostaql ||
          p.uses_khamsat,
      ),
  },
];

const ALL: Def[] = [...CORE, ...OPTIONAL];

/** Strength 0..100 = sum of the weights of the filled CORE dimensions. Optional extras don't count. */
export function computeStrength(p: StrengthProfile): number {
  const total = CORE.reduce((sum, f) => (f.met(p) ? sum + f.weight : sum), 0);
  return Math.max(0, Math.min(100, Math.round(total)));
}

/** Per-dimension breakdown (core + optional) for the profile checklist. */
export function strengthItems(p: StrengthProfile): StrengthItem[] {
  return ALL.map((f) => ({ key: f.key, label_ar: f.label_ar, label_en: f.label_en, weight: f.weight, optional: f.optional, met: f.met(p) }));
}

/** At or above this strength, the profile is "strong" and the Proposals nudge is hidden. */
export const OPTIMAL_THRESHOLD = 80;
