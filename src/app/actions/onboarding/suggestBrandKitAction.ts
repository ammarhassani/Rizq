"use server";

/**
 * suggestBrandKitAction — generate an AI brand kit (name + tagline + bio) from
 * the freelancer's already-entered profile (specialty, city, years, name).
 * Returns null on any error (not authenticated, AI failure, etc.).
 */

import { createClient } from "@/lib/supabase/server";
import { suggestBrandKit, type BrandKit } from "@/lib/ai/brandKit";

export async function suggestBrandKitAction(
  locale: "ar" | "en" = "ar"
): Promise<BrandKit | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("specialties, years_experience, city, full_name_ar, full_name_en, name")
    .eq("id", userData.user.id)
    .maybeSingle();

  const specialty = (profile?.specialties as string[] | null)?.[0] ?? null;
  const fullName =
    (profile?.full_name_ar as string | null) ??
    (profile?.full_name_en as string | null) ??
    (profile?.name as string | null) ??
    null;

  return suggestBrandKit({
    specialty,
    city: (profile?.city as string | null) ?? null,
    years: (profile?.years_experience as number | null) ?? null,
    fullName,
    locale,
  });
}
