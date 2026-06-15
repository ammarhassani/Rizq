/**
 * Shared brand-defaults loader — Phase-5 task P5.10 (part B).
 *
 * Loads the M8 brand/contact/defaults columns from `users` for a given userId.
 * Returns a typed bag of nullable-or-defaulted values used to populate proposal
 * and invoice artifact inputs. Falls back to null when any column is absent.
 *
 * PURE loader — no side-effects beyond the single Supabase SELECT.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

export type UserBrandDefaults = {
  /** Preferred Arabic display name (full_name_ar → name → null). */
  freelancerName: string;
  /** Brand name in Arabic (brand_name_ar → brand_name → null). */
  brandNameAr: string | null;
  /** Arabic tagline (tagline_ar → null). */
  taglineAr: string | null;
  /** Logo URL (logo_url → null). */
  logoUrl: string | null;
  /**
   * Brand colors as a typed pair, or null if the stored jsonb is absent /
   * missing the required keys / has non-string values.
   */
  brandColors: { primary: string; secondary: string } | null;
  /** Contact bundle — each field individually nullable. */
  contact: {
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
  };
  /** Default deposit percentage (default_deposit_pct → null). */
  defaultDepositPct: number | null;
  /** Default number of revisions (default_revisions → null). */
  defaultRevisions: number | null;
  /** Default IP terms (validated against union; null if invalid / absent). */
  defaultIpTerms: "full_transfer" | "license" | "per_project" | null;
  /** Preferred communication tone (validated; defaults to "balanced"). */
  preferredTone: "formal" | "balanced" | "friendly";
  /** Arabic bio / about text (bio_ar → null). */
  bioAr: string | null;
  /** English bio / about text (bio_en → null). */
  bioEn: string | null;
  /** Years of experience (int; null if absent / non-numeric). */
  yearsExperience: number | null;
  /** Total projects completed (int; null if absent / non-numeric). */
  totalProjectsCompleted: number | null;
  /** Notable client names (text[] → array of strings, default []). */
  notableClients: string[];
  /** Portfolio samples (jsonb array → typed shape, default []). */
  portfolioSamples: { title: string; url: string | null; description: string | null }[];
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const VALID_IP_TERMS = new Set<string>(["full_transfer", "license", "per_project"]);
const VALID_TONES = new Set<string>(["formal", "balanced", "friendly"]);

function parseBrandColors(
  raw: unknown
): { primary: string; secondary: string } | null {
  if (
    raw !== null &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    typeof (raw as Record<string, unknown>)["primary"] === "string" &&
    typeof (raw as Record<string, unknown>)["secondary"] === "string"
  ) {
    const obj = raw as Record<string, unknown>;
    return {
      primary: obj["primary"] as string,
      secondary: obj["secondary"] as string,
    };
  }
  return null;
}

/** Coerce an unknown into a string[] (filters non-strings); [] otherwise. */
function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string");
}

/**
 * Map a jsonb array into the typed portfolio-sample shape.
 * Non-object entries are dropped; title is coerced to string; url/description
 * to string|null. Returns [] when the input is not an array.
 */
function parsePortfolioSamples(
  raw: unknown
): { title: string; url: string | null; description: string | null }[] {
  if (!Array.isArray(raw)) return [];
  const out: { title: string; url: string | null; description: string | null }[] = [];
  for (const entry of raw) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) continue;
    const o = entry as Record<string, unknown>;
    out.push({
      title: typeof o["title"] === "string" ? o["title"] : "",
      url: typeof o["url"] === "string" ? o["url"] : null,
      description: typeof o["description"] === "string" ? o["description"] : null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public loader
// ---------------------------------------------------------------------------

/**
 * Fetches user brand/contact/defaults from Supabase.
 *
 * @param supabase - authenticated Supabase client (RLS enforces ownership).
 * @param userId   - the authenticated user's UUID.
 * @param authEmail - fallback email from auth.getUser() (used when contact_email
 *                    and users.email are both null).
 */
export async function loadUserBrandDefaults(
  supabase: SupabaseClient,
  userId: string,
  authEmail: string | null = null
): Promise<UserBrandDefaults> {
  const { data: profile } = await supabase
    .from("users")
    .select(
      [
        "name",
        "email",
        "full_name_ar",
        "brand_name",
        "brand_name_ar",
        "logo_url",
        "brand_colors",
        "tagline_ar",
        "contact_email",
        "contact_phone",
        "contact_whatsapp",
        "default_deposit_pct",
        "default_revisions",
        "default_ip_terms",
        "preferred_tone",
        "bio_ar",
        "bio_en",
        "years_experience",
        "portfolio_samples",
        "total_projects_completed",
        "notable_clients",
      ].join(", ")
    )
    .eq("id", userId)
    .single();

  // Cast each field defensively from the untyped Supabase response.
  const p = (profile ?? {}) as Record<string, unknown>;

  const name = (p["name"] as string | null) ?? null;
  const email = (p["email"] as string | null) ?? authEmail ?? null;
  const fullNameAr = (p["full_name_ar"] as string | null) ?? null;

  // freelancerName: full_name_ar → name → email → fallback
  const freelancerName =
    fullNameAr ?? name ?? email ?? "مستقل / Freelancer";

  // brandNameAr: brand_name_ar → brand_name → null
  const brandNameAr =
    (p["brand_name_ar"] as string | null) ??
    (p["brand_name"] as string | null) ??
    null;

  const taglineAr = (p["tagline_ar"] as string | null) ?? null;
  const logoUrl = (p["logo_url"] as string | null) ?? null;
  const brandColors = parseBrandColors(p["brand_colors"]);

  const contact = {
    email:
      (p["contact_email"] as string | null) ??
      (p["email"] as string | null) ??
      authEmail ??
      null,
    phone: (p["contact_phone"] as string | null) ?? null,
    whatsapp: (p["contact_whatsapp"] as string | null) ?? null,
  };

  const rawDepositPct = p["default_deposit_pct"];
  const defaultDepositPct =
    typeof rawDepositPct === "number" ? rawDepositPct : null;

  const rawRevisions = p["default_revisions"];
  const defaultRevisions =
    typeof rawRevisions === "number" ? rawRevisions : null;

  const rawIpTerms = p["default_ip_terms"] as string | null | undefined;
  const defaultIpTerms =
    rawIpTerms && VALID_IP_TERMS.has(rawIpTerms)
      ? (rawIpTerms as "full_transfer" | "license" | "per_project")
      : null;

  const rawTone = p["preferred_tone"] as string | null | undefined;
  const preferredTone: "formal" | "balanced" | "friendly" =
    rawTone && VALID_TONES.has(rawTone)
      ? (rawTone as "formal" | "balanced" | "friendly")
      : "balanced";

  // Profile / about fields (untyped client — parse defensively).
  const bioAr = (p["bio_ar"] as string | null) ?? null;
  const bioEn = (p["bio_en"] as string | null) ?? null;

  const rawYears = p["years_experience"];
  const yearsExperience = typeof rawYears === "number" ? rawYears : null;

  const rawTotal = p["total_projects_completed"];
  const totalProjectsCompleted = typeof rawTotal === "number" ? rawTotal : null;

  const notableClients = parseStringArray(p["notable_clients"]);
  const portfolioSamples = parsePortfolioSamples(p["portfolio_samples"]);

  return {
    freelancerName,
    brandNameAr,
    taglineAr,
    logoUrl,
    brandColors,
    contact,
    defaultDepositPct,
    defaultRevisions,
    defaultIpTerms,
    preferredTone,
    bioAr,
    bioEn,
    yearsExperience,
    totalProjectsCompleted,
    notableClients,
    portfolioSamples,
  };
}

// ---------------------------------------------------------------------------
// Testimonials loader (Phase C — proposal "About you" social proof)
// ---------------------------------------------------------------------------

/** Camel-cased testimonial shape consumed by the proposal artifact. */
export type ArtifactTestimonial = {
  clientName: string | null;
  clientTitle: string | null;
  quoteAr: string | null;
  quoteEn: string | null;
  rating: number | null;
};

/**
 * Loads the user's ACTIVE testimonials (owner-scoped via RLS), ordered by
 * sort_order then created_at, mapped to the camelCase artifact shape.
 *
 * Defensive: the Supabase client is untyped, so every column is cast through
 * `unknown`. Returns [] on no rows OR any query error (testimonials are
 * supplementary social proof — never fail the proposal build over them).
 */
export async function loadTestimonials(
  supabase: SupabaseClient,
  userId: string
): Promise<ArtifactTestimonial[]> {
  const { data, error } = await supabase
    .from("testimonials")
    .select("client_name, client_title, quote_ar, quote_en, rating")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !Array.isArray(data)) return [];

  return (data as Array<Record<string, unknown>>).map((row) => {
    const rawRating = row["rating"];
    return {
      clientName: (row["client_name"] as string | null) ?? null,
      clientTitle: (row["client_title"] as string | null) ?? null,
      quoteAr: (row["quote_ar"] as string | null) ?? null,
      quoteEn: (row["quote_en"] as string | null) ?? null,
      rating: typeof rawRating === "number" ? rawRating : null,
    };
  });
}
