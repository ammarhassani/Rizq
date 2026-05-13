import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Specialty = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  category: string;
  sort_order: number;
};
export type City = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  region: string;
  sort_order: number;
};
export type ExperienceTier = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  years_min: number;
  years_max: number | null;
  sort_order: number;
};

/**
 * React `cache()` dedupes these within a single request so the form page
 * only hits Supabase once even when multiple components ask for the lists.
 */
export const getSpecialties = cache(async (): Promise<Specialty[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("specialties")
    .select("id, slug, name_ar, name_en, category, sort_order")
    .eq("active", true)
    .order("sort_order");
  if (error || !data) return [];
  return data as Specialty[];
});

export const getCities = cache(async (): Promise<City[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cities")
    .select("id, slug, name_ar, name_en, region, sort_order")
    .eq("active", true)
    .order("sort_order");
  if (error || !data) return [];
  return data as City[];
});

export const getExperienceTiers = cache(async (): Promise<ExperienceTier[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("experience_tiers")
    .select("id, slug, name_ar, name_en, years_min, years_max, sort_order")
    .order("sort_order");
  if (error || !data) return [];
  return data as ExperienceTier[];
});
