"use server";

import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { isAIConfigured, deepseek, REASONING_MODEL } from "@/lib/ai/client";
import { getUpcomingInvoiceDueDates } from "@/lib/invoices/queries";
import {
  buildDeterministicInsights,
  buildBusinessInsightsPrompt,
  BusinessInsightsSchema,
  stripEmDashes,
} from "@/lib/ai/businessInsights";
import type { BusinessInsightsCtx } from "@/lib/ai/businessInsights";

/**
 * Shared context aggregator for business insights.
 *
 * Aggregates the freelancer's last-30d proposals, last-3mo gigs, clients,
 * last-6mo monthly income, and upcoming invoice deadlines into the
 * `BusinessInsightsCtx` shape consumed by both the AI generator and the
 * deterministic fallback.
 *
 * Factored out of `getBusinessInsightsAction` so the action AND the streaming
 * draft route (`/api/dashboard/insights/draft`) share ONE aggregator and can't
 * drift. `hasData` mirrors the action's emptiness check.
 *
 * Pure read; no caching/AI side effects — callers decide what to do with it.
 *
 * Note: this is exported but not a server action (it takes a SupabaseClient
 * arg and returns a non-serializable-friendly object). It must NOT be called
 * across the client boundary — only from server actions / route handlers that
 * pass their own server `supabase` client.
 */
export async function buildInsightsContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ ctx: BusinessInsightsCtx; hasData: boolean }> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().slice(0, 10);

  const [proposalsRes, gigsRes, clientsRes, incomeRes, deadlinesRaw] = await Promise.allSettled([
    supabase
      .from("proposals")
      .select("client_name, client_id, status, price_anchor, created_at, clients(name)")
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("gigs")
      .select("title, status, amount_sar, delivery_date")
      .eq("user_id", userId)
      .gte("delivery_date", ninetyDaysAgo)
      .order("delivery_date", { ascending: false })
      .limit(20),
    supabase
      .from("clients")
      .select("name, total_gigs, total_value_sar, last_contacted_at")
      .eq("user_id", userId)
      .order("last_contacted_at", { ascending: false })
      .limit(20),
    supabase
      .from("monthly_income")
      .select("month, total_sar, paid_sar, pending_sar")
      .gte("month", sixMonthsAgo)
      .order("month", { ascending: false })
      .limit(6),
    getUpcomingInvoiceDueDates(supabase, userId, { limit: 20 }),
  ]);

  const proposals: BusinessInsightsCtx["proposals"] =
    proposalsRes.status === "fulfilled" && proposalsRes.value.data
      ? proposalsRes.value.data.map((p) => ({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          title: ((p.client_name as string | null) ?? ((p.clients as any)?.name as string | null)) ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          clientName: ((p.clients as any)?.name as string | null) ?? null,
          status: p.status as string,
          amount: p.price_anchor != null ? Number(p.price_anchor) : null,
          date: p.created_at != null ? String(p.created_at).slice(0, 10) : null,
        }))
      : [];

  const gigs: BusinessInsightsCtx["gigs"] =
    gigsRes.status === "fulfilled" && gigsRes.value.data
      ? gigsRes.value.data.map((g) => ({
          title: g.title as string,
          status: g.status as string,
          amount_sar: Number(g.amount_sar),
          date: g.delivery_date != null ? String(g.delivery_date).slice(0, 10) : null,
        }))
      : [];

  const clients: BusinessInsightsCtx["clients"] =
    clientsRes.status === "fulfilled" && clientsRes.value.data
      ? clientsRes.value.data.map((c) => ({
          name: c.name as string,
          total_gigs: Number(c.total_gigs ?? 0),
          total_value_sar: Number(c.total_value_sar ?? 0),
          last_contacted_at: c.last_contacted_at != null ? String(c.last_contacted_at).slice(0, 10) : null,
        }))
      : [];

  const income: BusinessInsightsCtx["income"] =
    incomeRes.status === "fulfilled" && incomeRes.value.data
      ? incomeRes.value.data.map((m) => ({
          month: String(m.month ?? "").slice(0, 7),
          total_sar: Number(m.total_sar ?? 0),
          paid_sar: Number(m.paid_sar ?? 0),
          pending_sar: Number(m.pending_sar ?? 0),
        }))
      : [];

  const invoiceDeadlines =
    deadlinesRaw.status === "fulfilled" ? deadlinesRaw.value : [];

  const deadlines: BusinessInsightsCtx["deadlines"] = invoiceDeadlines.map((inv) => ({
    type: "invoice",
    title: inv.invoice_number,
    date: inv.due_date,
    status: inv.status,
  }));

  const hasData = proposals.length > 0 || gigs.length > 0 || clients.length > 0 || income.length > 0;

  return { ctx: { proposals, gigs, clients, income, deadlines }, hasData };
}

type InsightItem = {
  ar: string;
  en: string;
  kind: "income" | "client" | "proposal" | "deadline" | "general";
};

type InsightsOkResult = {
  ok: true;
  insights: InsightItem[];
  generated_at: string;
  cached: boolean;
  empty?: boolean;
  /** "ai" = DeepSeek analysis; "summary" = deterministic facts computed from data. */
  source: "ai" | "summary";
};

type InsightsErrResult = {
  ok: false;
  code: "unauthenticated" | "db_error" | "ai_error";
};

export type InsightsActionResult = InsightsOkResult | InsightsErrResult;

/**
 * Generate 2-4 insights via DeepSeek (non-streaming). Returns null on any error
 * so the action falls back to the deterministic summary. Local to this server
 * module so the server-only DeepSeek client never reaches the client bundle
 * (the client-safe businessInsights module only carries the schema + helpers).
 */
async function generateBusinessInsights(
  ctx: BusinessInsightsCtx
): Promise<{ insights: InsightItem[] } | null> {
  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: BusinessInsightsSchema,
      prompt: buildBusinessInsightsPrompt(ctx),
      abortSignal: AbortSignal.timeout(20_000),
    });
    return {
      insights: result.object.insights.map((i) => ({
        ...i,
        ar: stripEmDashes(i.ar, "ar"),
        en: stripEmDashes(i.en, "en"),
      })),
    };
  } catch (err) {
    console.error("[generateBusinessInsights] failed", err);
    return null;
  }
}

export async function getBusinessInsightsAction(opts?: {
  refresh?: boolean;
}): Promise<InsightsActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthenticated" };

  const userId = userData.user.id;
  const refresh = opts?.refresh ?? false;

  // --- Read cache ---
  if (!refresh) {
    const { data: cache } = await supabase
      .from("dashboard_insights_cache")
      .select("insights, generated_at, valid_until")
      .eq("user_id", userId)
      .maybeSingle();

    if (cache && cache.valid_until) {
      const validUntil = new Date(cache.valid_until as string);
      if (validUntil > new Date()) {
        const insights = (cache.insights as InsightItem[]) ?? [];
        return {
          ok: true,
          insights,
          generated_at: cache.generated_at as string,
          cached: true,
          empty: insights.length === 0,
          source: "ai",
        };
      }
    }
  }

  // --- Aggregate context (shared with the streaming draft route) ---
  const now = new Date();
  const { ctx, hasData } = await buildInsightsContext(supabase, userId);

  if (!hasData) {
    // Cache empty result
    await supabase.from("dashboard_insights_cache").upsert({
      user_id: userId,
      insights: [],
      generated_at: now.toISOString(),
      valid_until: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    });
    return { ok: true, insights: [], generated_at: now.toISOString(), cached: false, empty: true, source: "summary" };
  }

  // Prefer DeepSeek analysis; fall back to a deterministic, data-derived summary
  // when the provider is unconfigured or the call fails, so the card never breaks.
  let insights: InsightItem[] | null = null;
  let source: "ai" | "summary" = "summary";

  if (isAIConfigured()) {
    const result = await generateBusinessInsights(ctx);
    if (result) {
      insights = result.insights as InsightItem[];
      source = "ai";
    } else {
      console.error("[getBusinessInsightsAction] AI returned no result — falling back to summary");
    }
  } else {
    console.warn("[getBusinessInsightsAction] DEEPSEEK_API_KEY not set — using deterministic summary");
  }

  if (!insights) {
    insights = buildDeterministicInsights(ctx) as InsightItem[];
    source = "summary";
  }

  const generatedAt = now.toISOString();

  // Cache AI results only (the deterministic summary is cheap and should reflect
  // live data on each load).
  if (source === "ai") {
    const validUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    const { error: upsertErr } = await supabase.from("dashboard_insights_cache").upsert({
      user_id: userId,
      insights,
      generated_at: generatedAt,
      valid_until: validUntil,
      feedback: null,
    });
    if (upsertErr) {
      console.error("[getBusinessInsightsAction] cache upsert failed", upsertErr.message);
    }
  }

  return { ok: true, insights, generated_at: generatedAt, cached: false, source };
}

export async function submitInsightFeedbackAction(opts: {
  index: number;
  vote: "up" | "down";
}): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { ok: false };

    const userId = userData.user.id;
    const { data: cache } = await supabase
      .from("dashboard_insights_cache")
      .select("feedback")
      .eq("user_id", userId)
      .maybeSingle();

    const existing = (cache?.feedback as Record<string, string> | null) ?? {};
    const updated = { ...existing, [String(opts.index)]: opts.vote };

    await supabase
      .from("dashboard_insights_cache")
      .update({ feedback: updated })
      .eq("user_id", userId);

    return { ok: true };
  } catch {
    return { ok: false };
  }
}
