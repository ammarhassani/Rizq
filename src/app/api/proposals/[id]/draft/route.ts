/**
 * POST /api/proposals/[id]/draft — Phase D streaming prose pass.
 *
 * Streams an AI-written prose draft (cover letter, understanding, approach,
 * per-deliverable descriptions, assumptions, exclusions) for an owned proposal
 * so the freelancer watches the narrative appear live. The pricing pass is
 * untouched: numbers come only from extractScope + pricing and live in the
 * pricing section. This route writes ONLY narrative prose.
 *
 * Mirrors api/admin/ai-health: runtime=nodejs, dynamic=force-dynamic,
 * maxDuration=60, auth via createClient()+getUser(). Owner-scoped load
 * (.eq id + .eq user_id). Degrades gracefully (200 + code) when AI is not
 * configured so the client keeps templated defaults with no scary error.
 *
 * The stream drives live UX; the onFinish DB write is the source of truth.
 */

import { streamObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { deepseek, REASONING_MODEL, isAIConfigured } from "@/lib/ai/client";
import {
  ProseSchema,
  buildProsePrompt,
  mergeProseIntoArtifact,
  PROSE_FIELDS,
  type ProseField,
} from "@/lib/ai/proseDraft";
import { loadUserBrandDefaults } from "@/lib/proposals/brand";
import type { Scope } from "@/lib/ai/scope";
import type { ArtifactData } from "@/lib/proposals/artifact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { id: string };

function isProseField(v: string | null): v is ProseField {
  return v != null && (PROSE_FIELDS as readonly string[]).includes(v);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ ok: false, code: "unauthorized" }, { status: 401 });
    }

    // Owner-scoped load (RLS + explicit user_id filter).
    const { data: proposal, error } = await supabase
      .from("proposals")
      .select(
        "brief_text, brief_language, scope_json, price_min, price_anchor, price_max, client_name, artifact_json"
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !proposal) {
      return Response.json({ ok: false, code: "not_found" }, { status: 404 });
    }

    // No key in this runtime → client keeps templated defaults (no error UI).
    if (!isAIConfigured()) {
      return Response.json({ ok: false, code: "ai_unconfigured" }, { status: 200 });
    }

    // Optional ?section= for Phase E single-field regeneration. The full schema
    // still streams (the merge fills only non-empty fields), but we narrow the
    // model's focus to the requested field. Absent param → full document.
    const url = new URL(request.url);
    const sectionParam = url.searchParams.get("section");
    const focusField: ProseField | null = isProseField(sectionParam)
      ? sectionParam
      : null;

    const scope = (proposal.scope_json ?? {}) as Scope;
    const briefText = (proposal.brief_text as string | null) ?? "";
    const briefLanguage = (proposal.brief_language as string | null) ?? "ar";
    const locale: "ar" | "en" = briefLanguage === "en" ? "en" : "ar";

    // Goals live in scope_json.extras.project_goals (threaded by generateProposal).
    const extras = (scope.extras ?? {}) as Record<string, unknown>;
    const goals =
      typeof extras["project_goals"] === "string"
        ? (extras["project_goals"] as string)
        : null;

    // Profile (brand defaults) for voice/bio context.
    const brand = await loadUserBrandDefaults(
      supabase,
      user.id,
      user.email ?? null
    );

    const deliverables = Array.isArray(scope.deliverables)
      ? scope.deliverables.filter((d): d is string => typeof d === "string")
      : [];

    let prompt = buildProsePrompt({
      scope,
      brief: briefText,
      goals,
      profile: {
        freelancerName: brand.freelancerName,
        bio: locale === "en" ? brand.bioEn ?? brand.bioAr : brand.bioAr ?? brand.bioEn,
        yearsExperience: brand.yearsExperience,
        specialty: scope.specialty ?? null,
      },
      price: {
        min: Number(proposal.price_min),
        anchor: Number(proposal.price_anchor),
        max: Number(proposal.price_max),
      },
      deliverables,
      locale,
    });

    // Phase E narrowing: ask the model to refine just one field. The other
    // fields may still be returned (schema requires them) but the client merges
    // selectively; a future revision can swap to a per-field schema if needed.
    if (focusField) {
      prompt += `\n\nFOCUS: The freelancer is regenerating ONLY the "${focusField}" section. Put your best effort there; keep the other sections faithful to the brief.`;
    }

    const result = streamObject({
      model: deepseek(REASONING_MODEL),
      schema: ProseSchema,
      prompt,
      abortSignal: AbortSignal.timeout(45_000),
      // Source of truth: merge the FINAL validated object into stored
      // artifact_json. The streamed partials only drive live UX.
      onFinish: async ({ object }) => {
        if (!object) {
          // Final object failed schema validation — leave artifact_json as-is
          // (templated defaults remain). The client falls through to defaults.
          console.error("[proposals/draft] final object undefined (schema mismatch)", { id });
          return;
        }
        try {
          const baseArtifact = (proposal.artifact_json ?? { sections: [] }) as ArtifactData;
          const merged = mergeProseIntoArtifact(baseArtifact, object);
          const { error: updateError } = await supabase
            .from("proposals")
            .update({ artifact_json: merged, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("user_id", user.id);
          if (updateError) {
            console.error("[proposals/draft] persist failed", {
              id,
              code: updateError.code,
              message: updateError.message,
            });
          }
        } catch (err) {
          console.error("[proposals/draft] onFinish merge/persist threw", err);
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error("[proposals/draft] failed", err);
    return Response.json({ ok: false, code: "error" }, { status: 500 });
  }
}
