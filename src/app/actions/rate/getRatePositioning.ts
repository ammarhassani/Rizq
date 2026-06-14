"use server";

/**
 * getRatePositioningAction — spec M10.5.
 * Auth-gated. Resolves slugs from the user's profile or the passed
 * specialty/city/tier. Calls resolvePrice for market band, pulls 3-month
 * avg income, and returns the AI positioning narrative.
 *
 * Included feature (free for all authenticated users) — no quota charge.
 */

import { createClient } from "@/lib/supabase/server";
import { resolvePrice } from "@/lib/pricing/resolve";
import { generateRatePositioning } from "@/lib/ai/ratePositioning";
import type { RatePositioning } from "@/lib/ai/ratePositioning";

export type GetRatePositioningInput = {
  target_rate: number;
  specialty_slug: string;
  city_slug: string;
  experience_tier_slug: string;
};

export type GetRatePositioningResult =
  | { ok: true; narrative: RatePositioning | null }
  | { ok: false; code: "unauthorized" | "invalid_input" | "error" };

export async function getRatePositioningAction(
  input: GetRatePositioningInput
): Promise<GetRatePositioningResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  if (!Number.isFinite(input.target_rate) || input.target_rate < 0) {
    return { ok: false, code: "invalid_input" };
  }

  const userId = userData.user.id;

  // ── Resolve market band ────────────────────────────────────────────────────
  let market_p10 = 0;
  let market_p50 = 0;
  let market_p90 = 0;
  let sample_size = 0;
  let specialty_name_ar = "";
  let specialty_name_en = "";
  let city_name_ar = "";
  let city_name_en = "";
  let tier_name_ar = "";
  let tier_name_en = "";

  try {
    const [specRes, cityRes, tierRes] = await Promise.all([
      supabase
        .from("specialties")
        .select("name_ar, name_en")
        .eq("slug", input.specialty_slug)
        .maybeSingle(),
      supabase
        .from("cities")
        .select("name_ar, name_en")
        .eq("slug", input.city_slug)
        .maybeSingle(),
      supabase
        .from("experience_tiers")
        .select("name_ar, name_en")
        .eq("slug", input.experience_tier_slug)
        .maybeSingle(),
    ]);

    specialty_name_ar = (specRes.data?.name_ar as string | null) ?? input.specialty_slug;
    specialty_name_en = (specRes.data?.name_en as string | null) ?? input.specialty_slug;
    city_name_ar = (cityRes.data?.name_ar as string | null) ?? input.city_slug;
    city_name_en = (cityRes.data?.name_en as string | null) ?? input.city_slug;
    tier_name_ar = (tierRes.data?.name_ar as string | null) ?? input.experience_tier_slug;
    tier_name_en = (tierRes.data?.name_en as string | null) ?? input.experience_tier_slug;

    const resolved = await resolvePrice({
      specialty_slug: input.specialty_slug,
      city_slug: input.city_slug,
      experience_tier_slug: input.experience_tier_slug,
    });

    if (resolved.status === "ok") {
      market_p10 = resolved.min;
      market_p50 = resolved.anchor;
      market_p90 = resolved.max;
      sample_size = resolved.sample_size;
    }
  } catch (err) {
    console.error("[getRatePositioningAction] market resolve failed", err);
    // Proceed without market band — AI still generates a qualitative narrative
  }

  // ── Pull 3-month average from monthly_income view ──────────────────────────
  let avg_3mo_income: number | null = null;
  let gig_count = 0;

  try {
    const now = new Date();
    const threeMonthsAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 3,
      1
    ).toISOString();

    const [avgRes, gigCountRes] = await Promise.all([
      supabase
        .from("monthly_income")
        .select("paid_sar")
        .gte("month", threeMonthsAgo)
        .order("month", { ascending: false })
        .limit(3),
      supabase
        .from("gigs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

    if (avgRes.data && avgRes.data.length > 0) {
      const total = avgRes.data.reduce(
        (sum, r) => sum + ((r.paid_sar as number) ?? 0),
        0
      );
      avg_3mo_income = Math.round(total / avgRes.data.length);
    }

    gig_count = gigCountRes.count ?? 0;
  } catch (err) {
    console.error("[getRatePositioningAction] income fetch failed", err);
    // Non-fatal: proceed with null avg
  }

  // ── Generate AI narrative ──────────────────────────────────────────────────
  const narrative = await generateRatePositioning({
    target_rate: input.target_rate,
    specialty_name_ar,
    specialty_name_en,
    city_name_ar,
    city_name_en,
    tier_name_ar,
    tier_name_en,
    market_p10,
    market_p50,
    market_p90,
    sample_size,
    avg_3mo_income,
    gig_count,
  });

  return { ok: true, narrative };
}

// ─── Save defaults ────────────────────────────────────────────────────────────

export type SaveRateDefaultsInput = {
  monthly_target_sar: number | null;
  working_days_per_month: number;
  hours_per_day: number;
  projects_per_month_target: number | null;
  specialty_id: string | null;
  city_id: string | null;
  experience_tier_id: string | null;
};

export type SaveRateDefaultsResult =
  | { ok: true }
  | { ok: false; code: "unauthorized" | "error" };

export async function saveRateDefaultsAction(
  input: SaveRateDefaultsInput
): Promise<SaveRateDefaultsResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const { error } = await supabase.from("rate_calculator_defaults").upsert(
    {
      user_id: userData.user.id,
      monthly_target_sar: input.monthly_target_sar,
      working_days_per_month: input.working_days_per_month,
      hours_per_day: input.hours_per_day,
      projects_per_month_target: input.projects_per_month_target,
      specialty_id: input.specialty_id,
      city_id: input.city_id,
      experience_tier_id: input.experience_tier_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[saveRateDefaultsAction] upsert failed", error);
    return { ok: false, code: "error" };
  }

  return { ok: true };
}
