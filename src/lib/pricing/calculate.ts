import { createClient } from "@/lib/supabase/server";
import { percentile } from "./percentile";

export type CalculateInput = {
  specialty_slug: string;
  city_slug: string;
  experience_tier_slug: string;
  project_size?: "small" | "medium" | "large" | "enterprise" | null;
};

export type CalculateResult =
  | {
      status: "ok";
      min: number;
      median: number;
      max: number;
      sample_size: number;
      // True when we widened the query (city → region, etc.) to hit the threshold
      fallback_used: boolean;
      fallback_kind: "none" | "region" | "specialty";
      // % of records in the same specialty (any city/tier) priced below our median.
      // Used for the "أعلى من X%" comparison context on the result page.
      comparison_percent_below: number;
      // resolved IDs for logging into the queries table
      ids: {
        specialty_id: string;
        city_id: string;
        experience_tier_id: string;
      };
    }
  | {
      status: "insufficient_data";
      sample_size: number;
      ids: {
        specialty_id: string;
        city_id: string;
        experience_tier_id: string;
      };
    }
  | {
      status: "invalid_input";
      reason: "specialty" | "city" | "tier";
    };

const MIN_SAMPLE = 5;

/**
 * Resolves the slug triple into IDs, then runs the percentile calculation
 * with progressive fallback (exact → region → specialty-wide) until either
 * we hit MIN_SAMPLE matches or exhaust all paths.
 */
export async function calculateBenchmark(
  input: CalculateInput
): Promise<CalculateResult> {
  const supabase = await createClient();

  // 1. Resolve slugs → IDs (cheap; all reference tables are tiny)
  const [specRes, cityRes, tierRes] = await Promise.all([
    supabase
      .from("specialties")
      .select("id")
      .eq("slug", input.specialty_slug)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("cities")
      .select("id, region")
      .eq("slug", input.city_slug)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("experience_tiers")
      .select("id")
      .eq("slug", input.experience_tier_slug)
      .maybeSingle(),
  ]);

  if (!specRes.data) return { status: "invalid_input", reason: "specialty" };
  if (!cityRes.data) return { status: "invalid_input", reason: "city" };
  if (!tierRes.data) return { status: "invalid_input", reason: "tier" };

  const specialty_id = specRes.data.id;
  const city_id = cityRes.data.id;
  const region = (cityRes.data as { region: string }).region;
  const experience_tier_id = tierRes.data.id;
  const ids = { specialty_id, city_id, experience_tier_id };

  // Resolve region cities once — used by both passes below.
  const regionCityIds = await supabase
    .from("cities")
    .select("id")
    .eq("region", region)
    .eq("active", true);
  const regionIds = (regionCityIds.data ?? []).map((r) => r.id);

  // Soft project_size filter: try the narrow pass with project_size, then
  // a wider pass without it. The narrow pass wins if it has ≥MIN_SAMPLE;
  // otherwise we fall through transparently. This treats project_size as
  // a "prefer" hint rather than a hard requirement.
  const passes = input.project_size
    ? [input.project_size, undefined]
    : [undefined];

  let bestSample = 0;
  for (const ps of passes) {
    const exactPrices = await fetchPrices(supabase, {
      specialty_id,
      city_id,
      experience_tier_id,
      project_size: ps ?? null,
    });
    if (exactPrices.length >= MIN_SAMPLE) {
      return finalize(supabase, exactPrices, "none", specialty_id, ids);
    }

    const regionPrices = await fetchPrices(supabase, {
      specialty_id,
      city_ids: regionIds,
      experience_tier_id,
      project_size: ps ?? null,
    });
    if (regionPrices.length >= MIN_SAMPLE) {
      return finalize(supabase, regionPrices, "region", specialty_id, ids);
    }

    const specPrices = await fetchPrices(supabase, {
      specialty_id,
      experience_tier_id,
      project_size: ps ?? null,
    });
    if (specPrices.length >= MIN_SAMPLE) {
      return finalize(supabase, specPrices, "specialty", specialty_id, ids);
    }

    bestSample = Math.max(
      bestSample,
      exactPrices.length,
      regionPrices.length,
      specPrices.length
    );
  }

  return { status: "insufficient_data", sample_size: bestSample, ids };
}

// ─────────────────────────────────────────────────────────────────────────

type FetchArgs = {
  specialty_id: string;
  city_id?: string;
  city_ids?: string[];
  experience_tier_id: string;
  project_size?: "small" | "medium" | "large" | "enterprise" | null;
};

async function fetchPrices(
  supabase: Awaited<ReturnType<typeof createClient>>,
  args: FetchArgs
): Promise<number[]> {
  let query = supabase
    .from("benchmark_records")
    .select("price_sar")
    .eq("specialty_id", args.specialty_id)
    .eq("experience_tier_id", args.experience_tier_id)
    .eq("active", true)
    .eq("verified", true)
    .eq("flagged_as_outlier", false);

  if (args.city_id) query = query.eq("city_id", args.city_id);
  if (args.city_ids && args.city_ids.length > 0) {
    query = query.in("city_id", args.city_ids);
  }
  if (args.project_size) {
    query = query.eq("project_size", args.project_size);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((r) => Number(r.price_sar)).filter((n) => Number.isFinite(n));
}


type ResolvedIds = {
  specialty_id: string;
  city_id: string;
  experience_tier_id: string;
};

async function finalize(
  supabase: Awaited<ReturnType<typeof createClient>>,
  prices: number[],
  fallback: "none" | "region" | "specialty",
  specialty_id: string,
  ids: ResolvedIds
): Promise<CalculateResult> {
  const sorted = [...prices].sort((a, b) => a - b);
  const min = percentile(sorted, 0.1);
  const median = percentile(sorted, 0.5);
  const max = percentile(sorted, 0.9);

  // Comparison context: % of records in the same specialty (any city/tier)
  // priced strictly below our median.
  const { count: totalSpecialty } = await supabase
    .from("benchmark_records")
    .select("*", { count: "exact", head: true })
    .eq("specialty_id", specialty_id)
    .eq("active", true)
    .eq("verified", true)
    .eq("flagged_as_outlier", false);

  const { count: belowMedian } = await supabase
    .from("benchmark_records")
    .select("*", { count: "exact", head: true })
    .eq("specialty_id", specialty_id)
    .eq("active", true)
    .eq("verified", true)
    .eq("flagged_as_outlier", false)
    .lt("price_sar", median);

  const total = totalSpecialty ?? 0;
  const comparison_percent_below =
    total > 0 ? Math.round(((belowMedian ?? 0) / total) * 100) : 0;

  return {
    status: "ok",
    min: roundSar(min),
    median: roundSar(median),
    max: roundSar(max),
    sample_size: prices.length,
    fallback_used: fallback !== "none",
    fallback_kind: fallback,
    comparison_percent_below,
    ids,
  };
}

function roundSar(n: number): number {
  // Round to nearest 10 SAR for clean display
  return Math.round(n / 10) * 10;
}
