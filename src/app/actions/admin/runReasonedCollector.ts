"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getSpecialties,
  getCities,
  getExperienceTiers,
} from "@/lib/pricing/refDataDb";
import {
  generateReasonedRow,
  type ReasonedCell,
  type AnchorRow,
} from "@/lib/pricing/collectors/reasoned";

type RunResult =
  | {
      ok: true;
      cells_filled: number;
      rows_inserted: number;
      cells_remaining: number;
    }
  | { ok: false; code: "not_admin" | "error" };

// Hard ceiling on cells per invocation — bounds both serverless time and the
// number of concurrent DeepSeek requests fired by the Promise.all below.
const MAX_CELLS_CEILING = 50;

/**
 * Admin-only: fills up to `maxCells` (specialty × tier × city) cells that lack
 * real data with a DeepSeek reasoned prior, inserting via the run_ingestion RPC.
 * Idempotent — skips cells that already have a reasoned row. Batched (hard cap
 * of 50/call) to bound serverless time + concurrent LLM cost; call repeatedly
 * until cells_remaining is 0. Counts reflect ACTUAL successes, so a caller
 * should stop when cells_filled stays 0 (no progress — e.g. an AI outage).
 */
export async function runReasonedCollector(maxCells = 20): Promise<RunResult> {
  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "not_admin" };
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", userResult.user.id)
    .single();
  if (profile?.role !== "admin") return { ok: false, code: "not_admin" };

  if (!process.env.DEEPSEEK_API_KEY) {
    console.error("[runReasonedCollector] DEEPSEEK_API_KEY is not set");
    return { ok: false, code: "error" };
  }

  const safeMax = Math.min(Math.max(1, Math.floor(maxCells)), MAX_CELLS_CEILING);

  const [specialties, cities, tiers] = await Promise.all([
    getSpecialties(),
    getCities(),
    getExperienceTiers(),
  ]);
  if (specialties.length === 0 || cities.length === 0 || tiers.length === 0) {
    console.error("[runReasonedCollector] reference data unavailable");
    return { ok: false, code: "error" };
  }

  const { data: existing, error: rowsErr } = await supabase
    .from("benchmark_records")
    .select("specialty_id, city_id, experience_tier_id, provenance, price_sar")
    .eq("active", true)
    .eq("verified", true)
    .eq("flagged_as_outlier", false);
  if (rowsErr) {
    // Swallowing this would make every cell look unfilled and re-generate
    // reasoned rows over data that already exists — fail loudly instead.
    console.error("[runReasonedCollector] benchmark_records fetch failed", {
      code: rowsErr.code,
      message: rowsErr.message,
    });
    return { ok: false, code: "error" };
  }
  const rows = existing ?? [];

  const cellKey = (s: string, c: string, t: string) => `${s}|${c}|${t}`;
  const realCount = new Map<string, number>();
  const hasReasoned = new Set<string>();
  for (const r of rows) {
    const k = cellKey(r.specialty_id, r.city_id, r.experience_tier_id);
    if (r.provenance === "reasoned") {
      hasReasoned.add(k);
    } else {
      realCount.set(k, (realCount.get(k) ?? 0) + 1);
    }
  }

  const tierSlug = (id: string) => tiers.find((t) => t.id === id)?.slug ?? "";
  const citySlug = (id: string) => cities.find((c) => c.id === id)?.slug ?? "";

  const pending: ReasonedCell[] = [];
  for (const s of specialties) {
    const anchors: AnchorRow[] = rows
      .filter(
        (r) =>
          r.specialty_id === s.id &&
          (r.provenance === "published_ref" || r.provenance === "founder")
      )
      .map((r) => ({
        tier_slug: tierSlug(r.experience_tier_id),
        city_slug: citySlug(r.city_id),
        price_sar: Number(r.price_sar),
        provenance: r.provenance,
      }))
      // Drop anchors whose tier/city is no longer active (empty slug) so they
      // can't corrupt the prompt with malformed "- / : 5000 SAR" lines.
      .filter((a) => a.tier_slug !== "" && a.city_slug !== "");

    for (const t of tiers) {
      for (const c of cities) {
        const k = cellKey(s.id, c.id, t.id);
        if ((realCount.get(k) ?? 0) >= 3 || hasReasoned.has(k)) continue;
        pending.push({
          specialty_id: s.id,
          city_id: c.id,
          experience_tier_id: t.id,
          specialty_name_ar: s.name_ar,
          city_name_ar: c.name_ar,
          region: c.region,
          tier_name_ar: t.name_ar,
          years_min: t.years_min,
          years_max: t.years_max,
          anchors,
        });
      }
    }
  }

  const batch = pending.slice(0, safeMax);
  const generated = await Promise.all(
    batch.map((cell) => generateReasonedRow(cell))
  );
  const clean = generated.filter((r): r is NonNullable<typeof r> => r !== null);

  // Failed cells stay in `pending` on the next call (idempotent), so only
  // successfully-written cells reduce cells_remaining.
  if (clean.length === 0) {
    return {
      ok: true,
      cells_filled: 0,
      rows_inserted: 0,
      cells_remaining: pending.length,
    };
  }

  const { error } = await supabase.rpc("run_ingestion", {
    p_collector_id: "reasoned_v1",
    p_source_desc: `reasoned prior backfill — ${clean.length} cells`,
    p_rows: clean,
  });
  if (error) {
    console.error("[runReasonedCollector] run_ingestion failed", {
      code: error.code,
      message: error.message,
    });
    return { ok: false, code: "error" };
  }

  return {
    ok: true,
    cells_filled: clean.length,
    rows_inserted: clean.length,
    cells_remaining: pending.length - clean.length,
  };
}
