"use server";

/**
 * proposalChat — conversational, in-place proposal editing (feature 001 / US4).
 *
 * The freelancer types a free-text revision message in the hovering chat dock.
 * We route it to the responsible PROSE section(s), regenerate only those (the
 * proven non-streaming generateObject + pickProseField + mergeProseIntoArtifact
 * path, identical to regenerateSection), and snapshot the prior version.
 *
 * Honesty architecture: the router schema can only target the five editable
 * prose sections, and we re-assert it here. Price/timeline/milestones/terms are
 * never touched. A scope change (add/remove a deliverable) is DETECTED and
 * returned for the freelancer to confirm in the editor — never auto-applied,
 * never auto-priced by the model.
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { deepseek, REASONING_MODEL, isAIConfigured } from "@/lib/ai/client";
import {
  ProseSchema,
  buildProsePrompt,
  proposalProsePromptArgs,
  mergeProseIntoArtifact,
  pickProseField,
} from "@/lib/ai/proseDraft";
import { routeChatIntent } from "@/lib/ai/chatIntent";
import { sanitizeIntentTargets, type ChatScopeChange } from "@/lib/proposals/proposalChatShape";
import { assertNoProtectedSections } from "@/lib/proposals/sections";
import { loadUserBrandDefaults } from "@/lib/proposals/brand";
import type { ArtifactData } from "@/lib/proposals/artifact";
import type { Scope } from "@/lib/ai/scope";
import { PROPOSAL_STRINGS } from "@/lib/proposals/proposalStrings";

const EDITABLE_STATUSES = new Set(["draft", "final", "sent"]);

/**
 * Version-history label for an AI chat edit. This string is rendered verbatim in
 * the freelancer's version list, so it has to read like a sentence in their
 * language — not the internal `Chat edit: scope_of_work` snake_case.
 */
function describeChatEdit(targets: string[], locale: "ar" | "en"): string {
  const labels = PROPOSAL_STRINGS[locale].sections as Record<string, string>;
  const named = targets.map((id) => labels[id] ?? id);
  const list = named.join(locale === "ar" ? "، " : ", ");
  if (!list) return locale === "ar" ? "تعديل عبر رِزق AI" : "Edited with Rizq AI";
  return locale === "ar" ? `تعديل عبر رِزق AI: ${list}` : `Edited with Rizq AI: ${list}`;
}

const InputSchema = z.object({
  proposal_id: z.string().uuid(),
  message: z.string().trim().min(2).max(1000),
});

export type ProposalChatResult =
  | {
      ok: true;
      reply_ar: string;
      reply_en: string;
      modified: string[];
      scope_change: ChatScopeChange | null;
    }
  | {
      ok: false;
      code:
        | "unauthorized"
        | "invalid"
        | "not_found"
        | "status_not_editable"
        | "ai_unconfigured"
        | "error";
    };

export async function proposalChat(rawInput: unknown): Promise<ProposalChatResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { proposal_id, message } = parsed.data;

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  if (!isAIConfigured()) return { ok: false, code: "ai_unconfigured" };

  const { data: rawProposal, error: fetchErr } = await supabase
    .from("proposals")
    .select(
      "id, status, version, brief_text, brief_language, scope_json, price_min, price_anchor, price_max, artifact_json",
    )
    .eq("id", proposal_id)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !rawProposal) return { ok: false, code: "not_found" };
  const proposal = rawProposal as Record<string, unknown>;

  if (!EDITABLE_STATUSES.has(proposal["status"] as string)) {
    return { ok: false, code: "status_not_editable" };
  }

  const artifact = proposal["artifact_json"] as ArtifactData | null;
  if (!artifact || !Array.isArray(artifact.sections)) {
    return { ok: false, code: "error" };
  }

  const scope = (proposal["scope_json"] ?? {}) as Scope;
  const deliverables = Array.isArray(scope.deliverables)
    ? scope.deliverables.filter((d): d is string => typeof d === "string")
    : [];

  // 1. Route the message → responsible sections + optional scope change.
  const intent = await routeChatIntent(message, {
    deliverables,
    briefSnippet: String(proposal["brief_text"] ?? "").slice(0, 600),
  });
  if (!intent) return { ok: false, code: "error" };

  const scopeChange = intent.scope_change ?? null;
  const targets = sanitizeIntentTargets(intent.target_section_ids);

  // Nothing to edit (a question, or a scope-only suggestion) → reply without a write.
  if (targets.length === 0) {
    return {
      ok: true,
      reply_ar: intent.reply_ar,
      reply_en: intent.reply_en,
      modified: [],
      scope_change: scopeChange,
    };
  }

  // Belt-and-suspenders: never let a protected section through.
  assertNoProtectedSections(targets);

  // 2. Regenerate prose with the freelancer's revision applied; keep only targets.
  try {
    const brand = await loadUserBrandDefaults(supabase, userId, userResult.user.email ?? null);
    let prompt = buildProsePrompt(
      proposalProsePromptArgs(
        {
          scope,
          briefText: proposal["brief_text"] as string | null,
          briefLanguage: proposal["brief_language"] as string | null,
          priceMin: Number(proposal["price_min"]),
          priceAnchor: Number(proposal["price_anchor"]),
          priceMax: Number(proposal["price_max"]),
        },
        brand,
      ),
    );
    prompt += `\n\nREVISION REQUEST from the freelancer — apply this to the relevant sections and keep everything else faithful to the brief. Never change prices, dates, milestones, or legal terms:\n"""${message}"""\n${intent.instruction ? `Distilled intent: ${intent.instruction}\n` : ""}Edit ONLY these sections: ${targets.join(", ")}.`;

    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: ProseSchema,
      prompt,
      abortSignal: AbortSignal.timeout(30_000),
    });

    // Apply ONLY the targeted sections (each narrowed via pickProseField).
    let nextArtifact: ArtifactData = artifact;
    for (const sectionId of targets) {
      nextArtifact = mergeProseIntoArtifact(nextArtifact, pickProseField(result.object, sectionId));
    }

    // 3. Snapshot the prior version, then persist the new artifact (price/scope
    //    unchanged — prose only). Mirrors the bumpAndPersist pattern.
    const oldVersion = Number(proposal["version"]);
    const newVersion = oldVersion + 1;

    const { error: versionErr } = await supabase.from("proposal_versions").insert({
      proposal_id,
      user_id: userId,
      version: oldVersion,
      scope_json: scope,
      price_min: Number(proposal["price_min"]),
      price_anchor: Number(proposal["price_anchor"]),
      price_max: Number(proposal["price_max"]),
      changed_by: userId,
      change_summary: describeChatEdit(
        targets,
        (proposal["brief_language"] as string | null) === "en" ? "en" : "ar"
      ),
    });
    if (versionErr) {
      console.error("[proposalChat] version insert failed", versionErr.code);
      return { ok: false, code: "error" };
    }

    const { error: updateErr } = await supabase
      .from("proposals")
      .update({
        artifact_json: nextArtifact,
        version: newVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposal_id)
      .eq("user_id", userId);

    if (updateErr) {
      console.error("[proposalChat] update failed", updateErr.code);
      return { ok: false, code: "error" };
    }

    revalidatePath("/[locale]/proposals/[id]", "page");
    return {
      ok: true,
      reply_ar: intent.reply_ar,
      reply_en: intent.reply_en,
      modified: targets,
      scope_change: scopeChange,
    };
  } catch (err) {
    console.error("[proposalChat] failed", err);
    return { ok: false, code: "error" };
  }
}
