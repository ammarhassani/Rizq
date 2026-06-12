"use server";

import { createClient } from "@/lib/supabase/server";
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

/**
 * Admin-only: fills up to `maxCells` (specialty × tier × city) cells that lack
 * real data with a DeepSeek reasoned prior, inserting via the run_ingestion RPC.
 * Idempotent — skips cells that already have a reasoned row. Batched to avoid
 * serverless timeouts; call repeatedly until cells_remaining is 0.
 */
export async function runReasonedCollector(
  maxCells = 20
): Promise<RunResult> {
  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "not_admin" };
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", userResult.user.id)
    .single();
  if (profile?.role !== "admin") return { ok: false, code: "not_admin" };

  const [{ data: specialties }, { data: cities }, { data: tiers }] =
    await Promise.all([
      supabase
        .from("specialties")
        .select("id, slug, name_ar")
        .eq("active", true),
      supabase
        .from("cities")
        .select("id, slug, name_ar, region")
        .eq("active", true),
      supabase
        .from("experience_tiers")
        .select("id, slug, name_ar, years_min, years_max"),
    ]);
  if (!specialties || !cities || !tiers) return { ok: false, code: "error" };

  const { data: existing } = await supabase
    .from("benchmark_records")
    .select(
      "specialty_id, city_id, experience_tier_id, provenance, price_sar"
    )
    .eq("active", true)
    .eq("verified", true)
    .eq("flagged_as_outlier", false);
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

  const pending: ReasonedCell[] = [];
  for (const s of specialties) {
    const anchors: AnchorRow[] = rows
      .filter(
        (r) =>
          r.specialty_id === s.id &&
          (r.provenance === "published_ref" || r.provenance === "founder")
      )
      .map((r) => ({
        tier_slug: tiers.find((t) => t.id === r.experience_tier_id)?.slug ?? "",
        city_slug: cities.find((c) => c.id === r.city_id)?.slug ?? "",
        price_sar: Number(r.price_sar),
        provenance: r.provenance,
      }));
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

  const batch = pending.slice(0, maxCells);
  const generated = await Promise.all(
    batch.map((cell) => generateReasonedRow(cell))
  );
  const clean = generated.filter(
    (r): r is NonNullable<typeof r> => r !== null
  );

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
  if (error) return { ok: false, code: "error" };

  return {
    ok: true,
    cells_filled: batch.length,
    rows_inserted: clean.length,
    cells_remaining: pending.length - batch.length,
  };
}
