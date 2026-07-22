/**
 * Profile strength — an HONEST, granular completeness score over the whole profile (feature 009).
 *
 * Every fillable profile field is its own weighted dimension, so the meter can't sit near 100%
 * while sections are actually empty (100% means the profile is genuinely complete). Each accepts
 * EITHER the *_id column OR the field the editors persist (specialty ← specialties slug array,
 * city ← city text, experience ← years). Weights sum to 100. The SAME model drives the onboarding
 * meter, the Settings profile page, the summary, and the Proposals nudge, so every surface agrees
 * (spec 009 SC-004). Testimonials are optional social proof and are intentionally NOT part of the %.
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
  | "fl_number"
  | "specialty"
  | "city"
  | "experience"
  | "rate"
  | "goal"
  | "brand"
  | "tagline"
  | "bio"
  | "logo"
  | "contact"
  | "samples"
  | "clients"
  | "platforms";

export type StrengthItem = {
  key: StrengthKey;
  label_ar: string;
  label_en: string;
  weight: number;
  met: boolean;
};

const nonEmpty = (a?: unknown[] | null) => Array.isArray(a) && a.length > 0;

/** Every fillable profile dimension, weighted. Weights sum to 100. */
const FIELDS: Array<Omit<StrengthItem, "met"> & { met: (p: StrengthProfile) => boolean }> = [
  { key: "full_name", weight: 6, label_ar: "الاسم الكامل", label_en: "Full name", met: (p) => Boolean(p.full_name_ar) },
  { key: "specialty", weight: 11, label_ar: "التخصص", label_en: "Specialty", met: (p) => Boolean(p.primary_specialty_id || nonEmpty(p.specialties)) },
  { key: "city", weight: 8, label_ar: "المدينة", label_en: "City", met: (p) => Boolean(p.city_id || p.city) },
  { key: "experience", weight: 8, label_ar: "مستوى الخبرة", label_en: "Experience level", met: (p) => Boolean(p.experience_tier_id || p.years_experience) },
  { key: "rate", weight: 11, label_ar: "سعرك", label_en: "Your rate", met: (p) => Boolean(p.current_hourly_rate_sar ?? p.current_daily_rate_sar ?? p.current_project_rate_range?.min) },
  { key: "goal", weight: 7, label_ar: "هدف الدخل الشهري", label_en: "Monthly income goal", met: (p) => Boolean(p.income_goal_monthly_sar) },
  { key: "fl_number", weight: 5, label_ar: "رقم وثيقة العمل الحر", label_en: "Freelance document number", met: (p) => Boolean(p.fl_number) },
  { key: "brand", weight: 7, label_ar: "اسم علامتك", label_en: "Brand name", met: (p) => Boolean(p.brand_name || p.brand_name_ar) },
  { key: "tagline", weight: 5, label_ar: "جملتك التعريفية", label_en: "Tagline", met: (p) => Boolean(p.tagline_ar || p.tagline_en) },
  { key: "bio", weight: 7, label_ar: "نبذة عنك", label_en: "Bio", met: (p) => Boolean(p.bio_ar || p.bio_en) },
  { key: "logo", weight: 5, label_ar: "شعارك", label_en: "Logo", met: (p) => Boolean(p.logo_url) },
  { key: "contact", weight: 5, label_ar: "وسيلة تواصل", label_en: "Contact detail", met: (p) => Boolean(p.contact_email || p.contact_phone || p.contact_whatsapp) },
  { key: "samples", weight: 5, label_ar: "نماذج أعمالك", label_en: "Work samples", met: (p) => nonEmpty(p.portfolio_samples) },
  { key: "clients", weight: 5, label_ar: "عملاء أو مشاريع سابقة", label_en: "Past clients or projects", met: (p) => Boolean(nonEmpty(p.notable_clients) || p.total_projects_completed) },
  {
    key: "platforms",
    weight: 5,
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

/** Strength 0..100 = sum of the weights of the profile dimensions that are filled. */
export function computeStrength(p: StrengthProfile): number {
  const total = FIELDS.reduce((sum, f) => (f.met(p) ? sum + f.weight : sum), 0);
  return Math.max(0, Math.min(100, Math.round(total)));
}

/** Per-dimension breakdown for the "what's still missing (+N%)" checklist. */
export function strengthItems(p: StrengthProfile): StrengthItem[] {
  return FIELDS.map((f) => ({ key: f.key, label_ar: f.label_ar, label_en: f.label_en, weight: f.weight, met: f.met(p) }));
}

/** At or above this strength, the profile is "strong" and the Proposals nudge is hidden. */
export const OPTIMAL_THRESHOLD = 80;
