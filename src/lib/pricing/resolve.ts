import { createClient } from "@/lib/supabase/server";
import { aggregate, type AggRow, type ProvenanceSource } from "./aggregate";
import { buildCitation } from "./citation";
import { applyKAnonymity } from "./contribution";
import { computeMarketTrend, type MarketTrend } from "./trend";
import type { BenchmarkProvenance } from "./provenance";

export type ResolveInput = {
  specialty_slug: string;
  city_slug: string;
  experience_tier_slug: string;
  project_size?: "small" | "medium" | "large" | "enterprise" | null;
};

type ResolvedIds = {
  specialty_id: string;
  city_id: string;
  experience_tier_id: string;
};

export type ResolveResult =
  | {
      status: "ok";
      min: number;
      anchor: number;
      max: number;
      sample_size: number;
      dominant_provenance: BenchmarkProvenance;
      sources: ProvenanceSource[];
      confidence_score: number;
      fallback_used: boolean;
      fallback_kind: "none" | "region" | "specialty";
      comparison_percent_below: number;
      provenance_citation_ar: string;
      provenance_citation_en: string;
      date_range: { earliest: string; latest: string };
      /** Real directional signal from dated rows, or null if data too thin (M4 trend). */
      trend: MarketTrend | null;
      ids: ResolvedIds;
    }
  | { status: "insufficient_data"; sample_size: number; ids: ResolvedIds }
  | { status: "invalid_input"; reason: "specialty" | "city" | "tier" };

const MIN_SAMPLE = 3; // spec §M4.3

/** Provenance-weighted resolver with fallback widening (size → region → specialty). */
export async function resolvePrice(input: ResolveInput): Promise<ResolveResult> {
  const supabase = await createClient();

  const [specRes, cityRes, tierRes] = await Promise.all([
    supabase.from("specialties").select("id").eq("slug", input.specialty_slug).eq("active", true).maybeSingle(),
    supabase.from("cities").select("id, region").eq("slug", input.city_slug).eq("active", true).maybeSingle(),
    supabase.from("experience_tiers").select("id").eq("slug", input.experience_tier_slug).maybeSingle(),
  ]);

  if (!specRes.data) return { status: "invalid_input", reason: "specialty" };
  if (!cityRes.data) return { status: "invalid_input", reason: "city" };
  if (!tierRes.data) return { status: "invalid_input", reason: "tier" };

  const specialty_id = specRes.data.id as string;
  const city_id = cityRes.data.id as string;
  const region = (cityRes.data as { region: string }).region;
  const experience_tier_id = tierRes.data.id as string;
  const ids: ResolvedIds = { specialty_id, city_id, experience_tier_id };

  const regionCityIds = await supabase.from("cities").select("id").eq("region", region).eq("active", true);
  const regionIds = (regionCityIds.data ?? []).map((r) => r.id as string);

  const passes = input.project_size ? [input.project_size, undefined] : [undefined];
  const now = new Date();
  let bestSample = 0;

  for (const ps of passes) {
    const exact = await fetchRows(supabase, { specialty_id, city_id, experience_tier_id, project_size: ps ?? null });
    if (exact.length >= MIN_SAMPLE) return finalize(supabase, exact, "none", specialty_id, ids, now);

    const regionRows = await fetchRows(supabase, { specialty_id, city_ids: regionIds, experience_tier_id, project_size: ps ?? null });
    if (regionRows.length >= MIN_SAMPLE) return finalize(supabase, regionRows, "region", specialty_id, ids, now);

    const specRows = await fetchRows(supabase, { specialty_id, experience_tier_id, project_size: ps ?? null });
    if (specRows.length >= MIN_SAMPLE) return finalize(supabase, specRows, "specialty", specialty_id, ids, now);

    bestSample = Math.max(bestSample, exact.length, regionRows.length, specRows.length);
  }

  return { status: "insufficient_data", sample_size: bestSample, ids };
}

type FetchArgs = {
  specialty_id: string;
  city_id?: string;
  city_ids?: string[];
  experience_tier_id: string;
  project_size?: "small" | "medium" | "large" | "enterprise" | null;
};

async function fetchRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  args: FetchArgs
): Promise<AggRow[]> {
  let query = supabase
    .from("benchmark_records")
    .select("price_sar, provenance, confidence, captured_at, recorded_at, source_user_id")
    .eq("specialty_id", args.specialty_id)
    .eq("experience_tier_id", args.experience_tier_id)
    .eq("active", true)
    .eq("verified", true)
    .eq("flagged_as_outlier", false);

  if (args.city_id) query = query.eq("city_id", args.city_id);
  if (args.city_ids && args.city_ids.length > 0) query = query.in("city_id", args.city_ids);
  if (args.project_size) query = query.eq("project_size", args.project_size);

  const { data, error } = await query;
  if (error || !data) return [];
  const mapped = data.map((r) => {
    const price = Number((r as { price_sar: number }).price_sar);
    const conf = Number((r as { confidence: number | null }).confidence ?? 0.5);
    const captured =
      (r as { captured_at: string | null }).captured_at ??
      (r as { recorded_at: string | null }).recorded_at ??
      new Date().toISOString();
    return {
      price_sar: price,
      provenance: (r as { provenance: BenchmarkProvenance }).provenance,
      confidence: conf,
      captured_at: captured,
      source_user_id: (r as { source_user_id: string | null }).source_user_id ?? null,
    };
  });
  // k-anonymity: submitted rows surface only with ≥ K distinct contributors, so a
  // single freelancer's price never forms a band (PDPL / data-strategy Tier 3).
  return applyKAnonymity(mapped)
    .map(({ source_user_id: _omit, ...rest }) => rest as AggRow)
    // Keep only rows aggregate() will actually use: finite, non-negative price,
    // and non-zero confidence (a 0-confidence row contributes 0 weight and must
    // not count toward MIN_SAMPLE, or an all-zero-confidence cell would yield a
    // 0/0/0 band). The DB also enforces price_sar >= 0; this keeps the count honest.
    .filter((r) => Number.isFinite(r.price_sar) && r.price_sar >= 0 && r.confidence > 0);
}

async function finalize(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: AggRow[],
  fallback: "none" | "region" | "specialty",
  specialty_id: string,
  ids: ResolvedIds,
  now: Date
): Promise<ResolveResult> {
  const agg = aggregate(rows, now);
  if (!agg) return { status: "insufficient_data", sample_size: rows.length, ids };

  const { count: total } = await supabase
    .from("benchmark_records")
    .select("*", { count: "exact", head: true })
    .eq("specialty_id", specialty_id)
    .eq("active", true)
    .eq("verified", true)
    .eq("flagged_as_outlier", false);
  const { count: below } = await supabase
    .from("benchmark_records")
    .select("*", { count: "exact", head: true })
    .eq("specialty_id", specialty_id)
    .eq("active", true)
    .eq("verified", true)
    .eq("flagged_as_outlier", false)
    .lt("price_sar", agg.anchor);
  const comparison_percent_below =
    (total ?? 0) > 0 ? Math.round(((below ?? 0) / (total ?? 1)) * 100) : 0;

  const citation = buildCitation({
    dominant: agg.dominant_provenance,
    sample_size: agg.sample_size,
    date_range: agg.date_range,
    fallback_kind: fallback,
  });

  return {
    status: "ok",
    min: agg.min,
    anchor: agg.anchor,
    max: agg.max,
    sample_size: agg.sample_size,
    dominant_provenance: agg.dominant_provenance,
    sources: agg.sources,
    confidence_score: agg.confidence_score,
    fallback_used: fallback !== "none",
    fallback_kind: fallback,
    comparison_percent_below,
    provenance_citation_ar: citation.ar,
    provenance_citation_en: citation.en,
    date_range: agg.date_range,
    // Only show a trend for an EXACT-match market. When the band widened to
    // region/specialty fallback, a "this market moved X%" line would attribute
    // fallback-wide rows to the specific query — honesty gap (Principle I).
    trend: fallback === "none" ? computeMarketTrend(rows, now) : null,
    ids,
  };
}
