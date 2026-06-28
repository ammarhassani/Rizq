"use server";

/**
 * Live price preview (feature 006) — an EPHEMERAL market-rate band for the
 * freelancer's in-progress profile, shown in onboarding so they feel their data
 * feeding the pricing engine. Reuses the real resolver + cites provenance like
 * any Rizq price (honesty). Persists nothing.
 */

import { createClient } from "@/lib/supabase/server";
import { resolvePrice } from "@/lib/pricing/resolve";
import { tierSlugFromYears } from "@/lib/pricing/experienceTier";
import { getExperienceTiers } from "@/lib/pricing/refDataDb";

export type PricePreview =
  | {
      status: "ok";
      min: number;
      anchor: number;
      max: number;
      citation_ar: string;
      citation_en: string;
      specialtySlug: string;
    }
  | { status: "no_profile" | "insufficient_data" };

/**
 * Optional overrides let the onboarding UI preview a not-yet-saved selection;
 * anything omitted falls back to the saved profile.
 */
export async function previewPrice(overrides?: {
  specialtySlug?: string | null;
  citySlug?: string | null;
  experienceTierSlug?: string | null;
}): Promise<PricePreview> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "no_profile" };

  const { data: row } = await supabase
    .from("users")
    .select(
      "years_experience, primary_specialty:specialties!primary_specialty_id(slug), tier:experience_tiers!experience_tier_id(slug), city:cities!city_id(slug)"
    )
    .eq("id", user.id)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = (row ?? {}) as any;
  const specialtySlug = overrides?.specialtySlug ?? (r.primary_specialty?.slug as string | null) ?? null;
  const citySlug = overrides?.citySlug ?? (r.city?.slug as string | null) ?? null;
  if (!specialtySlug || !citySlug) return { status: "no_profile" };

  let tierSlug = overrides?.experienceTierSlug ?? (r.tier?.slug as string | null) ?? null;
  if (!tierSlug) {
    const tiers = await getExperienceTiers();
    tierSlug = tierSlugFromYears((r.years_experience as number | null) ?? null, tiers) ?? "mid";
  }

  const res = await resolvePrice({
    specialty_slug: specialtySlug,
    city_slug: citySlug,
    experience_tier_slug: tierSlug,
    project_size: null,
  });

  if (res.status !== "ok") return { status: "insufficient_data" };
  return {
    status: "ok",
    min: res.min,
    anchor: res.anchor,
    max: res.max,
    citation_ar: res.provenance_citation_ar,
    citation_en: res.provenance_citation_en,
    specialtySlug,
  };
}
