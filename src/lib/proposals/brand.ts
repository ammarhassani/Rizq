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
  };
}
