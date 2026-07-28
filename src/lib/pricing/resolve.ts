import { createClient } from "@/lib/supabase/server";
import { aggregate, type AggRow, type ProvenanceSource } from "./aggregate";
import { buildCitation } from "./citation";
import { applyKAnonymity } from "./contribution";
import { computeMarketTrend, type MarketTrend, type TrendScope } from "./trend";
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
      /** Distinct citations behind those rows — see aggregate.source_count. */
      source_count: number;
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
    .select("price_sar, provenance, confidence, captured_at, recorded_at, source_user_id, project_size, source_ref")
    .eq("specialty_id", args.specialty_id)
    .eq("active", true)
    .eq("verified", true)
    .eq("flagged_as_outlier", false)
    // A NULL city/tier means the source published a national, seniority-agnostic
    // figure — a published rate report says "Software Engineering, £533/day", not
    // "Riyadh, senior". Such a row supports every cell of its specialty instead of
    // being fanned across 35 of them and counted 35 times.
    .or(`experience_tier_id.eq.${args.experience_tier_id},experience_tier_id.is.null`);

  if (args.city_id) query = query.or(`city_id.eq.${args.city_id},city_id.is.null`);
  if (args.city_ids && args.city_ids.length > 0) {
    query = query.or(`city_id.in.(${args.city_ids.join(",")}),city_id.is.null`);
  }
  // Project size follows the same wildcard rule as city and tier: a NULL means the
  // source did not state a size, so the row supports any of them.
  //
  // When the CALLER states no size we answer for a typical (medium) project rather
  // than blending every basis together. Sources are stored at four sizes derived from
  // 8 to 160 assumed hours; pooling those produces a band running from a one-day task
  // to a month-long engagement, which describes no project anyone is quoting.
  query = args.project_size
    ? query.or(`project_size.eq.${args.project_size},project_size.is.null`)
    : query.or("project_size.eq.medium,project_size.is.null");

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
      project_size: (r as { project_size: string | null }).project_size ?? null,
      source_ref: (r as { source_ref: string | null }).source_ref ?? null,
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

/**
 * Resolve the market-trend signal, widening the ROW SET but never the claim.
 *
 * The band settles at the tightest scope holding 3+ rows; a direction needs 8 rows over
 * 3+ months. No (specialty, city, tier) cell in the corpus has ever held 8 — the largest
 * holds 6 — so the trend computed to null for every lookup ever made and the M4 layer,
 * though shipped and tested, has never appeared on screen.
 *
 * Lowering the gate was the wrong fix: a direction drawn from 5 clustered records is not
 * a direction. Instead the signal may be computed nationally (same specialty and tier,
 * every city), where the corpus does carry ~27 rows across ~7 months — and it carries its
 * scope so the UI names the market it describes. A nationwide move shown as the
 * freelancer's own city would be the quiet overstatement Principle I exists to prevent.
 */
async function resolveTrend(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: AggRow[],
  fallback: "none" | "region" | "specialty",
  specialty_id: string,
  experience_tier_id: string,
  now: Date
): Promise<MarketTrend | null> {
  // The rows the band already used, labelled with the scope they actually came from.
  const bandScope: TrendScope =
    fallback === "none" ? "exact" : fallback === "region" ? "region" : "national";
  const fromBand = computeMarketTrend(rows, now, bandScope);
  if (fromBand) return fromBand;

  // The band's rows were too thin for a direction. Widen to the national set — unless
  // that IS what the band already used, in which case there is nothing wider to try.
  if (bandScope === "national") return null;

  const nationalRows = await fetchRows(supabase, { specialty_id, experience_tier_id });
  return computeMarketTrend(nationalRows, now, "national");
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
    source_count: agg.source_count,
    date_range: agg.date_range,
    fallback_kind: fallback,
  });

  return {
    status: "ok",
    min: agg.min,
    anchor: agg.anchor,
    max: agg.max,
    sample_size: agg.sample_size,
    source_count: agg.source_count,
    dominant_provenance: agg.dominant_provenance,
    sources: agg.sources,
    confidence_score: agg.confidence_score,
    fallback_used: fallback !== "none",
    fallback_kind: fallback,
    comparison_percent_below,
    provenance_citation_ar: citation.ar,
    provenance_citation_en: citation.en,
    date_range: agg.date_range,
    trend: await resolveTrend(supabase, rows, fallback, specialty_id, ids.experience_tier_id, now),
    ids,
  };
}
