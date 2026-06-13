"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { compareScope, canCompare, type ScopeDims } from "@/lib/ai/scopeCompare";
import type { Scope } from "@/lib/ai/scope";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const InputSchema = z.object({
  proposal_id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type GetScopeComparisonResult =
  | { ok: true; insight: { ar: string; en: string } | null }
  | { ok: false; code: "unauthorized" | "not_found" | "error" };

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

/**
 * Owner-gate: load the current proposal + the user's past proposals,
 * build ScopeDims, call compareScope, return bilingual insight or null.
 * Returns null insight when the user has <3 past proposals (spec M1.11-C).
 */
export async function getScopeComparison(
  rawInput: unknown
): Promise<GetScopeComparisonResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "error" };
  const { proposal_id } = parsed.data;

  const supabase = await createClient();

  // Auth guard
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Load current proposal
  const { data: currentRow, error: fetchErr } = await supabase
    .from("proposals")
    .select("id, scope_json, price_anchor, specialty_id")
    .eq("id", proposal_id)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !currentRow) return { ok: false, code: "not_found" };

  const currentScope = currentRow.scope_json as Scope;

  const currentDims: ScopeDims = {
    specialty: String(currentScope.specialty ?? ""),
    deliverable_count: currentScope.deliverable_count ?? null,
    revisions: currentScope.revisions ?? null,
    price_anchor: Number(currentRow.price_anchor ?? 0),
  };

  // Load past proposals (excluding this one, only stable statuses)
  const { data: pastRows } = await supabase
    .from("proposals")
    .select("scope_json, price_anchor, specialty_id")
    .eq("user_id", userId)
    .neq("id", proposal_id)
    .in("status", ["final", "sent", "viewed", "accepted"]);

  if (!canCompare((pastRows ?? []).length)) {
    // Fewer than 3 past proposals — insight hidden per spec
    return { ok: true, insight: null };
  }

  const pastDims: ScopeDims[] = (pastRows ?? []).map((row) => {
    const scope = row.scope_json as Scope;
    return {
      specialty: String(scope.specialty ?? ""),
      deliverable_count: scope.deliverable_count ?? null,
      revisions: scope.revisions ?? null,
      price_anchor: Number(row.price_anchor ?? 0),
    };
  });

  const insight = await compareScope(currentDims, pastDims);
  return { ok: true, insight };
}
