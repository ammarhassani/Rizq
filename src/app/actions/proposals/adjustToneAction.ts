"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ARTIFACT_SECTIONS, type ArtifactSection } from "@/lib/proposals/artifact";
import { adjustTone, rewriteSectionTone, type ToneSection } from "@/lib/ai/tone";
import { stripDashes } from "@/lib/ai/proseDraft";
import { isProActive } from "@/lib/billing/tier";
import {
  FREE_MONTHLY_TONE_USES,
  startOfMonthRiyadhMs,
  countToneUsesSince,
} from "@/lib/proposals/toneQuota";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const TONE_VALUES = ["formal", "balanced", "friendly", "persuasive"] as const;

/**
 * Prose section ids that the PER-SECTION tone path can rewrite (Phase E). The
 * global path (no section_id) keeps its original behavior over scope_of_work /
 * milestones / timeline; the per-section path handles the prose shapes directly.
 */
const PROSE_SECTION_IDS = [
  "cover_letter",
  "understanding",
  "approach",
  "scope_of_work",
  "assumptions",
] as const;

const InputSchema = z.object({
  proposal_id: z.string().uuid(),
  tone: z.enum(TONE_VALUES),
  // Phase E: when present, rewrite ONLY this one section; absent → global.
  section_id: z.enum(PROSE_SECTION_IDS).optional(),
});

// ---------------------------------------------------------------------------
// Return type (discriminated union)
// ---------------------------------------------------------------------------

type AdjustToneResult =
  | {
      ok: true;
      modified: string[];
      artifact_json: import("@/lib/proposals/artifact").ArtifactData;
    }
  | { ok: false; code: "unauthorized" | "not_found" | "error" | "quota_exhausted" };

// ---------------------------------------------------------------------------
// Section text extractor
//
// Only aiEditable sections reach this function. We extract the human-readable
// string content while leaving numbers, dates, and names untouched (the AI
// preservesData guard in tone.ts enforces this at rewrite time too).
//
// Sections in scope:
//   scope_of_work: description (string | null) + deliverables joined (string[])
//   milestones:    trigger labels joined (milestone trigger names)
//   timeline:      startDate + deliveryDate (strings — AI must preserve them)
//
// Free-tier "3 tone uses/month" quota is enforced in adjustProposalTone() below
// (counted from the tone_adjustments logs; pro/admin unlimited).
// ---------------------------------------------------------------------------

function extractSectionText(section: ArtifactSection): string {
  const c = section.content;

  switch (section.id) {
    case "scope_of_work": {
      const parts: string[] = [];
      if (typeof c["description"] === "string" && c["description"]) {
        parts.push(c["description"]);
      }
      if (Array.isArray(c["deliverables"])) {
        const deliverables = (c["deliverables"] as unknown[])
          .filter((d): d is string => typeof d === "string")
          .join("، ");
        if (deliverables) parts.push(deliverables);
      }
      return parts.join("\n");
    }

    case "milestones": {
      if (!Array.isArray(c["milestones"])) return "";
      // Extract trigger labels — these are short string tags; numbers (pct)
      // are preserved because extractProtectedTokens won't find them in labels,
      // but the pct values live as numbers not as text so they are never
      // included in the text string sent for rewriting.
      const labels = (c["milestones"] as unknown[])
        .filter((m): m is Record<string, unknown> => typeof m === "object" && m !== null)
        .map((m) => (typeof m["trigger"] === "string" ? m["trigger"] : ""))
        .filter(Boolean);
      return labels.join(", ");
    }

    case "timeline": {
      const parts: string[] = [];
      if (typeof c["startDate"] === "string" && c["startDate"]) {
        parts.push(`start: ${c["startDate"]}`);
      }
      if (typeof c["deliveryDate"] === "string" && c["deliveryDate"]) {
        parts.push(`delivery: ${c["deliveryDate"]}`);
      }
      return parts.join(", ");
    }

    default:
      return "";
  }
}

/** Merge rewritten ToneSection text back into the artifact sections array.
 *  Non-aiEditable sections and sections whose text didn't change are left
 *  untouched. The function is non-destructive on section structure (only
 *  the relevant text fields are updated). */
function mergeRewrittenText(
  artifactSections: ArtifactSection[],
  rewritten: ToneSection[]
): ArtifactSection[] {
  const rewriteMap = new Map(rewritten.map((s) => [s.id, s.text]));

  return artifactSections.map((section) => {
    const newText = rewriteMap.get(section.id);
    if (newText === undefined) return section;

    const c = { ...section.content };

    switch (section.id) {
      case "scope_of_work": {
        // Split back: first line is description, rest are deliverable items.
        const lines = newText.split("\n").filter(Boolean);
        if (lines.length > 0) {
          c["description"] = lines[0];
          // If multiple lines, remaining lines are deliverables (joined by ، on
          // extraction, so attempt to re-split on ، — fallback: keep original).
          if (lines.length > 1) {
            const deliverableText = lines.slice(1).join("\n");
            const items = deliverableText.split("،").map((s) => s.trim()).filter(Boolean);
            if (items.length > 0) c["deliverables"] = items;
          }
        }
        break;
      }

      case "milestones": {
        // Trigger labels are purely decorative text; we update them directly.
        if (Array.isArray(c["milestones"])) {
          const newTriggers = newText.split(",").map((s) => s.trim()).filter(Boolean);
          const milestones = (c["milestones"] as unknown[]).map((m, i) => {
            if (typeof m === "object" && m !== null && newTriggers[i]) {
              return { ...(m as Record<string, unknown>), trigger: newTriggers[i] };
            }
            return m;
          });
          c["milestones"] = milestones;
        }
        break;
      }

      case "timeline": {
        // Timeline text is just "start: DATE, delivery: DATE" — we don't parse
        // it back since dates live as structured fields. No merge needed; the
        // AI is instructed to preserve dates exactly, and the guard in tone.ts
        // ensures the rewrite passed only if it did. We can safely skip the
        // merge for timeline (the text representation is redundant with the
        // structured startDate/deliveryDate fields which are not mutated).
        break;
      }

      default:
        break;
    }

    return { ...section, content: c };
  });
}

// ---------------------------------------------------------------------------
// Per-section prose tone (Phase E)
//
// Unlike the global path (which joins/splits a single string per section), the
// prose path rewrites each text FRAGMENT in place so structure survives:
//   cover_letter / understanding : body
//   approach                     : each phase title + body
//   scope_of_work                : each deliverable description (preserves the
//                                  deliverables list, never rewritten)
//   assumptions                  : each assumption + each exclusion line
// Each fragment passes through rewriteSectionTone (the preservesData guard keeps
// numbers/dates/names), and the result is dash-stripped. Returns the new content
// object + whether anything actually changed.
// ---------------------------------------------------------------------------

async function rewriteProseSection(
  section: ArtifactSection,
  toneInstruction: string
): Promise<{ content: Record<string, unknown>; modified: boolean }> {
  const c = { ...section.content };
  let modified = false;

  const one = async (text: string): Promise<string> => {
    const r = await rewriteSectionTone(text, toneInstruction);
    if (r.modified) modified = true;
    return stripDashes(r.text);
  };

  const list = async (vals: unknown): Promise<string[] | null> => {
    if (!Array.isArray(vals)) return null;
    const items = vals.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    if (items.length === 0) return null;
    return Promise.all(items.map(one));
  };

  switch (section.id) {
    case "cover_letter":
    case "understanding": {
      if (typeof c["body"] === "string" && c["body"].trim().length > 0) {
        c["body"] = await one(c["body"] as string);
      }
      break;
    }
    case "approach": {
      if (Array.isArray(c["phases"])) {
        const phases = c["phases"] as Array<Record<string, unknown>>;
        c["phases"] = await Promise.all(
          phases.map(async (p) => {
            if (typeof p !== "object" || p === null) return p;
            const title =
              typeof p["title"] === "string" && p["title"].trim().length > 0
                ? await one(p["title"] as string)
                : p["title"];
            const body =
              typeof p["body"] === "string" && p["body"].trim().length > 0
                ? await one(p["body"] as string)
                : p["body"];
            return { ...p, title, body };
          })
        );
      }
      break;
    }
    case "scope_of_work": {
      const rewritten = await list(c["deliverable_descriptions"]);
      if (rewritten) c["deliverable_descriptions"] = rewritten;
      break;
    }
    case "assumptions": {
      const a = await list(c["assumptions"]);
      const e = await list(c["exclusions"]);
      if (a) c["assumptions"] = a;
      if (e) c["exclusions"] = e;
      break;
    }
    default:
      break;
  }

  return { content: c, modified };
}

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function adjustProposalTone(rawInput: unknown): Promise<AdjustToneResult> {
  // Validate input.
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "error" };
  const { proposal_id, tone, section_id } = parsed.data;

  const supabase = await createClient();

  // Auth check.
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };

  // Free-tier tone quota: 3 rewrites/month. Pro/admin (active) unlimited.
  // ponytail: count-then-act is not atomic — concurrent rapid clicks could let a
  // 4th slip past. Accepted: low stakes (a couple extra AI rewrites, self-heals
  // next month). Move to a DB trigger like the pricing quota if it ever matters.
  const { data: prof } = await supabase
    .from("users")
    .select("role, pro_until")
    .eq("id", userResult.user.id)
    .single();
  const role = (prof?.role ?? "free") as "free" | "pro" | "admin";
  const proUntil = (prof?.pro_until as string | null) ?? null;
  if (!isProActive(role, proUntil)) {
    const { data: adjRows } = await supabase
      .from("proposals")
      .select("tone_adjustments")
      .eq("user_id", userResult.user.id);
    const used = countToneUsesSince(adjRows ?? [], startOfMonthRiyadhMs(Date.now()));
    if (used >= FREE_MONTHLY_TONE_USES) return { ok: false, code: "quota_exhausted" };
  }

  // Load proposal (RLS scopes to owner).
  const { data: proposal, error: proposalErr } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", proposal_id)
    .single();

  if (proposalErr || !proposal) return { ok: false, code: "not_found" };

  // Load tone-adjustment prompt for this tone + locale.
  const locale = proposal.brief_language === "en" ? "en" : "ar";
  const { data: toneRow, error: toneErr } = await supabase
    .from("tone_adjustment_prompts")
    .select("prompt")
    .eq("tone", tone)
    .eq("locale", locale)
    .single();

  if (toneErr || !toneRow) {
    console.error("[adjustProposalTone] tone prompt not found", { tone, locale, toneErr });
    return { ok: false, code: "error" };
  }

  const toneInstruction = toneRow.prompt as string;

  const artifactJson = proposal.artifact_json as { sections?: ArtifactSection[] } | null;
  const rawSections: ArtifactSection[] = artifactJson?.sections ?? [];

  // -------------------------------------------------------------------------
  // PER-SECTION path (Phase E): rewrite ONLY the requested prose section.
  // -------------------------------------------------------------------------
  if (section_id) {
    const target = rawSections.find((s) => s.id === section_id);
    if (!target) {
      // Section not present yet — nothing to rewrite; return artifact unchanged.
      return {
        ok: true,
        modified: [],
        artifact_json: (artifactJson ?? { sections: [] }) as import("@/lib/proposals/artifact").ArtifactData,
      };
    }

    let rewrite: { content: Record<string, unknown>; modified: boolean };
    try {
      rewrite = await rewriteProseSection(target, toneInstruction);
    } catch (err) {
      console.error("[adjustProposalTone] per-section rewrite threw", err);
      return { ok: false, code: "error" };
    }

    const updatedSections = rawSections.map((s) =>
      s.id === section_id ? { ...s, content: rewrite.content } : s
    );
    const updatedArtifactJson = { ...artifactJson, sections: updatedSections };

    const existingAdjustments = Array.isArray(proposal.tone_adjustments)
      ? (proposal.tone_adjustments as unknown[])
      : [];
    const updatedAdjustments = [
      ...existingAdjustments,
      {
        tone,
        section: section_id,
        applied_at: new Date().toISOString(),
        sections_modified: rewrite.modified ? [section_id] : [],
      },
    ];

    const { error: sectionUpdateErr } = await supabase
      .from("proposals")
      .update({
        artifact_json: updatedArtifactJson,
        tone_adjustments: updatedAdjustments,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposal_id);

    if (sectionUpdateErr) {
      console.error("[adjustProposalTone] per-section update failed", sectionUpdateErr);
      return { ok: false, code: "error" };
    }

    return {
      ok: true,
      modified: rewrite.modified ? [section_id] : [],
      artifact_json: updatedArtifactJson as import("@/lib/proposals/artifact").ArtifactData,
    };
  }

  // -------------------------------------------------------------------------
  // GLOBAL path (no section_id) — unchanged behavior.
  // -------------------------------------------------------------------------

  // Identify aiEditable section ids.
  const aiEditableIds = new Set(
    ARTIFACT_SECTIONS.filter((s) => s.aiEditable).map((s) => s.id)
  );

  // Extract aiEditable sections from artifact_json (declared above; may be null
  // if the proposal hasn't been finalised yet).
  const editableSections = rawSections.filter((s) => aiEditableIds.has(s.id));

  // Build ToneSection list — only sections with non-empty text participate.
  const toneSections: ToneSection[] = editableSections
    .map((s) => ({ id: s.id, text: extractSectionText(s) }))
    .filter((s) => s.text.trim().length > 0);

  if (toneSections.length === 0) {
    // Nothing to rewrite (proposal has no aiEditable text yet).
    // Return the current artifact unchanged so the UI can still re-render it.
    return {
      ok: true,
      modified: [],
      artifact_json: (artifactJson ?? { sections: [] }) as import("@/lib/proposals/artifact").ArtifactData,
    };
  }

  // Call AI tone adjustment.
  let adjustResult: { sections: ToneSection[]; modified: string[] };
  try {
    adjustResult = await adjustTone(toneSections, toneInstruction);
  } catch (err) {
    console.error("[adjustProposalTone] adjustTone threw", err);
    return { ok: false, code: "error" };
  }

  // Merge rewritten text back into artifact_json.
  const updatedSections = mergeRewrittenText(rawSections, adjustResult.sections);
  const updatedArtifactJson = { ...artifactJson, sections: updatedSections };

  // Append tone_adjustments log entry.
  const existingAdjustments = Array.isArray(proposal.tone_adjustments)
    ? (proposal.tone_adjustments as unknown[])
    : [];
  const newEntry = {
    tone,
    applied_at: new Date().toISOString(),
    sections_modified: adjustResult.modified,
  };
  const updatedAdjustments = [...existingAdjustments, newEntry];

  // Persist.
  const { error: updateErr } = await supabase
    .from("proposals")
    .update({
      artifact_json: updatedArtifactJson,
      tone_adjustments: updatedAdjustments,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposal_id);

  if (updateErr) {
    console.error("[adjustProposalTone] update failed", updateErr);
    return { ok: false, code: "error" };
  }

  return {
    ok: true,
    modified: adjustResult.modified,
    artifact_json: updatedArtifactJson as import("@/lib/proposals/artifact").ArtifactData,
  };
}
