"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { resolvePrice, type ResolveResult } from "@/lib/pricing/resolve";
import { getQuotaState } from "@/lib/pricing/quota";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, maybeSweep } from "@/lib/rateLimit";
import { isAIConfigured } from "@/lib/ai/client";
import { generateMarketTrendNarrative } from "@/lib/ai/marketTrend";

const InputSchema = z.object({
  specialty_slug: z.string().min(1).max(64),
  city_slug: z.string().min(1).max(64),
  experience_tier_slug: z.string().min(1).max(64),
  project_size: z
    .enum(["small", "medium", "large", "enterprise"])
    .optional()
    .nullable(),
});

export type ToolActionResult =
  | {
      ok: true;
      // The query row id (used for /r/[id] sharing)
      query_id: string;
      // null when result is insufficient_data
      result:
        | (Extract<ResolveResult, { status: "ok" }> & { id: string })
        | Extract<ResolveResult, { status: "insufficient_data" }>;
      quota: {
        mode: "anon" | "free" | "pro" | "admin";
        remaining: number | "unlimited";
      };
    }
  | {
      ok: false;
      code: "invalid" | "quota_exhausted" | "rate_limited" | "error";
      cta?: "signup" | "upgrade";
    };

async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  return xff ? xff.split(",")[0]!.trim() : h.get("x-real-ip") ?? "unknown";
}

export async function calculate(input: unknown): Promise<ToolActionResult> {
  maybeSweep();

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  // Rate-limit independent of quota — protects against scripted abuse on the
  // 1-free-anon-query path even before quota counts kick in.
  const ip = await getClientIp();
  const rl = await checkRateLimit(`tool:${ip}`, 20, 60 * 1000);
  if (!rl.allowed) return { ok: false, code: "rate_limited" };

  // Quota gate
  const quota = await getQuotaState();
  if (!quota.ok) {
    return { ok: false, code: "quota_exhausted", cta: quota.cta };
  }

  // Calculate
  const result = await resolvePrice(parsed.data);

  if (result.status === "invalid_input") {
    return { ok: false, code: "invalid" };
  }

  // Insufficient-data results don't burn quota. The user got no actionable
  // value, so charging them feels wrong. We also skip the queries log to
  // keep the count honest. Server still returns the result so the UI shows
  // the insufficient-data card.
  if (result.status === "insufficient_data") {
    return {
      ok: true,
      query_id: "00000000-0000-0000-0000-000000000000",
      result,
      quota: { mode: quota.mode, remaining: quota.remaining },
    };
  }

  // Dedupe: if the same user/session already ran this exact combo in the
  // last 24h, return the cached query row instead of burning a new slot.
  // Tweaking project_size alone, or accidentally hitting Calculate twice,
  // should not consume quota.
  const supabase = await createClient();
  const dedupeWindow = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dedupeFilter = supabase
    .from("queries")
    .select("id, public_share")
    .eq("specialty_id", result.ids.specialty_id)
    .eq("city_id", result.ids.city_id)
    .eq("experience_tier_id", result.ids.experience_tier_id)
    .gte("created_at", dedupeWindow)
    .order("created_at", { ascending: false })
    .limit(1);
  const { data: dedupeRow } = await (quota.user_id
    ? dedupeFilter.eq("user_id", quota.user_id)
    : dedupeFilter.eq("session_id", quota.session_id!));

  if (dedupeRow && dedupeRow[0]) {
    return {
      ok: true,
      query_id: dedupeRow[0].id,
      result: { ...result, id: dedupeRow[0].id },
      quota: { mode: quota.mode, remaining: quota.remaining },
    };
  }

  // Log the query via security-definer RPC. The function reads auth.uid()
  // server-side, so we don't have to trust (or fight) the caller-supplied
  // user_id. Anon callers must supply a session_id.
  const { data: insertedId, error: insertError } = await supabase.rpc(
    "log_query",
    {
      p_specialty_id: result.ids.specialty_id,
      p_city_id: result.ids.city_id,
      p_experience_tier_id: result.ids.experience_tier_id,
      p_session_id: quota.session_id,
      p_project_size: parsed.data.project_size ?? null,
      p_result_min: result.min,
      // queries.result_median stores the resolver's anchor (p50, rounded to the
      // nearest 50 SAR then clamped into [min,max]). The column name is legacy.
      p_result_median: result.anchor,
      p_result_max: result.max,
      p_result_sample_size: result.sample_size,
      p_result_fallback_used: result.fallback_used,
    }
  );

  if (insertError || !insertedId) {
    // Errcode 53400 from the quota trigger maps to a clean UI state.
    if (insertError?.code === "53400") {
      return {
        ok: false,
        code: "quota_exhausted",
        cta: quota.mode === "anon" ? "signup" : "upgrade",
      };
    }
    console.error("[tool/calculate] log_query rpc failed", {
      code: insertError?.code,
    });
    return { ok: false, code: "error" };
  }
  const inserted = { id: insertedId as string };

  // For free users, refresh the dashboard so the counter reflects the new query
  if (quota.mode === "free") revalidatePath(`/[locale]/dashboard`, "page");

  // Recompute remaining after this insert
  const remaining =
    quota.remaining === "unlimited"
      ? ("unlimited" as const)
      : Math.max(0, quota.remaining - 1);

  // invalid_input and insufficient_data already returned earlier, so result is
  // always status "ok" here — attach the inserted query id for sharing.
  return {
    ok: true,
    query_id: inserted.id,
    result: { ...result, id: inserted.id },
    quota: { mode: quota.mode, remaining },
  };
}

const ToggleShareSchema = z.object({
  query_id: z.string().uuid(),
  share: z.boolean(),
});

/**
 * Flips queries.public_share on the caller's own query row.
 *
 * The RLS UPDATE policy on queries already requires `auth.uid() = user_id`,
 * so a non-owner can't actually mutate someone else's row. This action
 * adds an explicit ownership guard so we can return a clean code instead
 * of relying on the RLS denial alone — and the action stops at the
 * earliest cheap check (auth) before any DB write attempt.
 */
export async function toggleShare(input: unknown): Promise<{ ok: boolean }> {
  const parsed = ToggleShareSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false };

  const { error } = await supabase
    .from("queries")
    .update({ public_share: parsed.data.share })
    .eq("id", parsed.data.query_id)
    .eq("user_id", userResult.user.id);

  return { ok: !error };
}

// ─── Market-trend AI narrative (M4 trend layer, AI half) ───────────────────────

const TrendNarrativeSchema = z.object({
  trend: z.object({
    direction: z.enum(["rising", "falling", "stable"]),
    percent: z.number(),
    recent_median: z.number(),
    older_median: z.number(),
    recent_count: z.number(),
    older_count: z.number(),
    span_months: z.number(),
    sample_size: z.number(),
    date_range: z.object({ earliest: z.string(), latest: z.string() }),
  }),
  specialty_name: z.string().max(120),
  city_name: z.string().max(120),
});

export type TrendNarrativeResult =
  | { ok: true; narrative: { ar: string; en: string } }
  | { ok: false };

/**
 * Interprets a pre-COMPUTED market-trend signal into a one-line bilingual
 * insight (labeled "تحليل رِزق —" by the UI). The direction/percent come from
 * real dated rows — this only narrates them. Non-blocking and best-effort:
 * returns { ok: false } when AI is unconfigured or the model errors, so the UI
 * keeps the plain computed trend line.
 */
export async function getMarketTrendNarrative(input: unknown): Promise<TrendNarrativeResult> {
  const parsed = TrendNarrativeSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  if (!isAIConfigured()) return { ok: false };

  const narrative = await generateMarketTrendNarrative(parsed.data);
  if (!narrative) return { ok: false };
  return { ok: true, narrative };
}
