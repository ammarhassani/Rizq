/**
 * POST /api/dashboard/insights/draft — streaming Rizq Insights pass.
 *
 * Streams the AI business-insight cards for the signed-in freelancer so the
 * dashboard widget watches them appear live, token by token. Mirrors the Phase
 * D proposals draft route: runtime=nodejs, dynamic=force-dynamic, maxDuration=60,
 * auth via createClient()+getUser().
 *
 * Context is aggregated by the SHARED `buildInsightsContext` helper (the same
 * one `getBusinessInsightsAction` uses) so the action and this route can't drift.
 *
 * Degrades gracefully (200 + code) when AI is not configured or there's no data
 * so the client keeps its non-stream `getBusinessInsightsAction` fallback (which
 * yields the deterministic summary) with no scary error.
 *
 * The stream drives live UX; the onFinish DB upsert is the source of truth — it
 * writes the final validated insights into `dashboard_insights_cache` (em dashes
 * stripped, valid 1h) exactly like the action does, so the stream's result
 * becomes the cache.
 */

import { streamObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { deepseek, REASONING_MODEL, isAIConfigured } from "@/lib/ai/client";
import {
  BusinessInsightsSchema,
  buildBusinessInsightsPrompt,
  normalizeInsightText,
} from "@/lib/ai/businessInsights";
import { buildInsightsContext } from "@/app/actions/dashboard/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ ok: false, code: "unauthorized" }, { status: 401 });
    }

    // No key in this runtime → client keeps its non-stream fallback (summary).
    if (!isAIConfigured()) {
      return Response.json({ ok: false, code: "ai_unconfigured" }, { status: 200 });
    }

    // Shared aggregator (identical to getBusinessInsightsAction).
    const { ctx, hasData } = await buildInsightsContext(supabase, user.id);

    // Nothing to analyze → let the client fall back (it renders the empty state).
    if (!hasData) {
      return Response.json({ ok: false, code: "no_data" }, { status: 200 });
    }

    const result = streamObject({
      model: deepseek(REASONING_MODEL),
      schema: BusinessInsightsSchema,
      prompt: buildBusinessInsightsPrompt(ctx),
      abortSignal: AbortSignal.timeout(30_000),
      // Source of truth: the FINAL validated insights become the cache (so a
      // subsequent load returns cached:true). Streamed partials only drive UX.
      onFinish: async ({ object }) => {
        if (!object) {
          // Final object failed schema validation — leave the cache as-is; the
          // client falls through to its deterministic summary fallback.
          console.error("[dashboard/insights/draft] final object undefined (schema mismatch)");
          return;
        }
        try {
          // Belt-and-suspenders: strip em/en dashes the model may still emit.
          const insights = object.insights.map((i) => ({
            ...i,
            ar: normalizeInsightText(i.ar, "ar"),
            en: normalizeInsightText(i.en, "en"),
          }));
          const now = new Date();
          const validUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
          const { error: upsertErr } = await supabase
            .from("dashboard_insights_cache")
            .upsert({
              user_id: user.id,
              insights,
              generated_at: now.toISOString(),
              valid_until: validUntil,
              feedback: null,
            });
          if (upsertErr) {
            console.error("[dashboard/insights/draft] cache upsert failed", upsertErr.message);
          }
        } catch (err) {
          console.error("[dashboard/insights/draft] onFinish upsert threw", err);
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error("[dashboard/insights/draft] failed", err);
    return Response.json({ ok: false, code: "error" }, { status: 500 });
  }
}
