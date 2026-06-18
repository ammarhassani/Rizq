"use server";

/**
 * Per-section inline refine actions (Phase E).
 *
 *   updateSection(input)     — MANUAL inline text edit of ONE prose section.
 *                              The user now owns the text, so ai_generated → false
 *                              (the renderer's "AI-drafted" badge disappears).
 *   regenerateSection(input) — AI regen of ONE prose section (non-streaming).
 *                              Restores ai_generated → true on that section only.
 *
 * Both mirror editProposal.ts: owner-scoped load of artifact_json, a version
 * bump + proposal_versions snapshot row, owner-scoped persist, and a
 * revalidatePath of the detail page. NEITHER touches the price or the citation
 * (honesty architecture). Regen NEVER overwrites another section's (possibly
 * hand-edited) content — pickProseField narrows the model output to this one
 * section before mergeProseIntoArtifact runs.
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
  stripDashes,
} from "@/lib/ai/proseDraft";
import { loadUserBrandDefaults } from "@/lib/proposals/brand";
import type { ArtifactData, ArtifactSection } from "@/lib/proposals/artifact";
import type { Scope } from "@/lib/ai/scope";

// ---------------------------------------------------------------------------
// Section ids + per-section content shapes (manual edit)
// ---------------------------------------------------------------------------

const SECTION_IDS = [
  "cover_letter",
  "understanding",
  "approach",
  "scope_of_work",
  "assumptions",
] as const;

const BodyContent = z.object({ body: z.string() });
const ApproachContent = z.object({
  // Empty is allowed: clearing all phases makes the renderer fall back to its
  // templated default phases (with no AI badge, since ai_generated:false).
  phases: z.array(z.object({ title: z.string(), body: z.string() })).max(8),
});
const ScopeContent = z.object({
  deliverable_descriptions: z.array(z.string()),
});
const AssumptionsContent = z.object({
  assumptions: z.array(z.string()),
  exclusions: z.array(z.string()),
});

// Discriminated on section_id so each section only accepts its own shape.
const UpdateInputSchema = z.discriminatedUnion("section_id", [
  z.object({ proposal_id: z.string().uuid(), section_id: z.literal("cover_letter"), content: BodyContent }),
  z.object({ proposal_id: z.string().uuid(), section_id: z.literal("understanding"), content: BodyContent }),
  z.object({ proposal_id: z.string().uuid(), section_id: z.literal("approach"), content: ApproachContent }),
  z.object({ proposal_id: z.string().uuid(), section_id: z.literal("scope_of_work"), content: ScopeContent }),
  z.object({ proposal_id: z.string().uuid(), section_id: z.literal("assumptions"), content: AssumptionsContent }),
]);

const RegenInputSchema = z.object({
  proposal_id: z.string().uuid(),
  section_id: z.enum(SECTION_IDS),
});

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export type UpdateSectionResult =
  | { ok: true; version: number }
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

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// Drafts are editable too (refine before finalizing); accepted/declined lock.
const EDITABLE_STATUSES = new Set(["draft", "final", "sent"]);

/** Defensively dash-strip a string the user typed. */
function clean(v: string): string {
  return stripDashes(v);
}

/**
 * Produce a new content object for one section by merging the edited fields
 * into the existing section content and flagging ai_generated:false. Only the
 * fields this section owns are touched; everything else (deliverables list,
 * description, revisions) is preserved verbatim.
 */
function applyManualEdit(
  section: ArtifactSection,
  input: z.infer<typeof UpdateInputSchema>
): Record<string, unknown> {
  const c = { ...section.content };

  switch (input.section_id) {
    case "cover_letter":
    case "understanding": {
      c["body"] = clean(input.content.body);
      break;
    }
    case "approach": {
      c["phases"] = input.content.phases
        .map((p) => ({ title: clean(p.title), body: clean(p.body) }))
        .filter((p) => p.title.length > 0 || p.body.length > 0);
      break;
    }
    case "scope_of_work": {
      // Only the per-deliverable descriptions are owned here; keep deliverables.
      c["deliverable_descriptions"] = input.content.deliverable_descriptions.map(clean);
      break;
    }
    case "assumptions": {
      c["assumptions"] = input.content.assumptions.map(clean).filter((s) => s.length > 0);
      c["exclusions"] = input.content.exclusions.map(clean).filter((s) => s.length > 0);
      break;
    }
  }

  // The user owns this text now → drop the AI-drafted badge.
  c["ai_generated"] = false;
  return c;
}

/**
 * Insert a proposal_versions snapshot of the OLD state, then persist the new
 * artifact_json + bumped version, all owner-scoped. Mirrors editProposal.ts
 * (sans AI change summary — section refine logs a null summary).
 * Returns the new version on success, or an error code.
 */
async function bumpAndPersist(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  proposalId: string,
  proposal: Record<string, unknown>,
  newArtifact: ArtifactData,
  logPrefix: string
): Promise<{ ok: true; version: number } | { ok: false }> {
  const oldVersion = Number(proposal["version"]);
  const newVersion = oldVersion + 1;

  const { error: versionErr } = await supabase.from("proposal_versions").insert({
    proposal_id: proposalId,
    user_id: userId,
    version: oldVersion,
    scope_json: proposal["scope_json"] as Scope,
    price_min: Number(proposal["price_min"]),
    price_anchor: Number(proposal["price_anchor"]),
    price_max: Number(proposal["price_max"]),
    changed_by: userId,
    change_summary: null,
  });

  if (versionErr) {
    console.error(`${logPrefix} version insert failed`, {
      code: versionErr.code,
      message: versionErr.message,
    });
    return { ok: false };
  }

  const { error: updateErr } = await supabase
    .from("proposals")
    .update({
      artifact_json: newArtifact,
      version: newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposalId)
    .eq("user_id", userId);

  if (updateErr) {
    console.error(`${logPrefix} update failed`, {
      code: updateErr.code,
      message: updateErr.message,
    });
    return { ok: false };
  }

  return { ok: true, version: newVersion };
}

/** Revalidate both locale variants of the owner detail page. */
function revalidateDetail(proposalId: string): void {
  revalidatePath(`/[locale]/proposals/${proposalId}`, "page");
}

// ---------------------------------------------------------------------------
// updateSection — manual inline edit
// ---------------------------------------------------------------------------

export async function updateSection(rawInput: unknown): Promise<UpdateSectionResult> {
  const parsed = UpdateInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const input = parsed.data;

  const supabase = await createClient();

  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  const { data: rawProposal, error: fetchErr } = await supabase
    .from("proposals")
    .select("id, status, version, scope_json, price_min, price_anchor, price_max, artifact_json")
    .eq("id", input.proposal_id)
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

  let found = false;
  const sections: ArtifactSection[] = artifact.sections.map((section) => {
    if (section.id !== input.section_id) return section;
    found = true;
    return { ...section, content: applyManualEdit(section, input) };
  });

  if (!found) return { ok: false, code: "not_found" };

  const newArtifact: ArtifactData = { sections };

  const result = await bumpAndPersist(
    supabase,
    userId,
    input.proposal_id,
    proposal,
    newArtifact,
    "[updateSection]"
  );
  if (!result.ok) return { ok: false, code: "error" };

  revalidateDetail(input.proposal_id);
  return { ok: true, version: result.version };
}

// ---------------------------------------------------------------------------
// updateProjectTitle — edit the cover's project title (AI-drafted, user-owned)
// ---------------------------------------------------------------------------

const UpdateTitleSchema = z.object({
  proposal_id: z.string().uuid(),
  title: z.string().max(140),
});

export async function updateProjectTitle(rawInput: unknown): Promise<UpdateSectionResult> {
  const parsed = UpdateTitleSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { proposal_id, title } = parsed.data;

  const supabase = await createClient();

  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  const { data: rawProposal, error: fetchErr } = await supabase
    .from("proposals")
    .select("id, status, version, scope_json, price_min, price_anchor, price_max, artifact_json")
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

  const cleanTitle = clean(title).trim().slice(0, 140);

  let found = false;
  const sections: ArtifactSection[] = artifact.sections.map((section) => {
    if (section.id !== "cover") return section;
    found = true;
    return {
      ...section,
      content: { ...section.content, projectTitle: cleanTitle || null },
    };
  });

  if (!found) return { ok: false, code: "not_found" };

  const result = await bumpAndPersist(
    supabase,
    userId,
    proposal_id,
    proposal,
    { sections },
    "[updateProjectTitle]"
  );
  if (!result.ok) return { ok: false, code: "error" };

  revalidateDetail(proposal_id);
  return { ok: true, version: result.version };
}

// ---------------------------------------------------------------------------
// regenerateSection — AI regen of ONE section (non-streaming)
// ---------------------------------------------------------------------------

export async function regenerateSection(rawInput: unknown): Promise<UpdateSectionResult> {
  const parsed = RegenInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { proposal_id, section_id } = parsed.data;

  const supabase = await createClient();

  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  const { data: rawProposal, error: fetchErr } = await supabase
    .from("proposals")
    .select(
      "id, status, version, brief_text, brief_language, scope_json, price_min, price_anchor, price_max, client_name, artifact_json"
    )
    .eq("id", proposal_id)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !rawProposal) return { ok: false, code: "not_found" };
  const proposal = rawProposal as Record<string, unknown>;

  if (!EDITABLE_STATUSES.has(proposal["status"] as string)) {
    return { ok: false, code: "status_not_editable" };
  }

  // No DeepSeek key in this runtime → tell the UI to show a soft inline note.
  if (!isAIConfigured()) return { ok: false, code: "ai_unconfigured" };

  const artifact = proposal["artifact_json"] as ArtifactData | null;
  if (!artifact || !Array.isArray(artifact.sections)) {
    return { ok: false, code: "error" };
  }

  try {
    const scope = (proposal["scope_json"] ?? {}) as Scope;
    const brand = await loadUserBrandDefaults(
      supabase,
      userId,
      userResult.user.email ?? null
    );

    // Identical assembly to the streaming draft route, then a FOCUS directive.
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
        brand
      )
    );
    prompt += `\n\nFOCUS: The freelancer is regenerating ONLY the "${section_id}" section. Put your best effort there; keep the other sections faithful to the brief.`;

    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: ProseSchema,
      prompt,
      abortSignal: AbortSignal.timeout(30_000),
    });

    // Narrow the model output to THIS section only, then merge. This is what
    // guarantees a regen can never clobber a sibling section's edited content.
    const picked = pickProseField(result.object, section_id);
    const newArtifact = mergeProseIntoArtifact(artifact, picked);

    const persisted = await bumpAndPersist(
      supabase,
      userId,
      proposal_id,
      proposal,
      newArtifact,
      "[regenerateSection]"
    );
    if (!persisted.ok) return { ok: false, code: "error" };

    revalidateDetail(proposal_id);
    return { ok: true, version: persisted.version };
  } catch (err) {
    console.error("[regenerateSection] failed", err);
    return { ok: false, code: "error" };
  }
}
