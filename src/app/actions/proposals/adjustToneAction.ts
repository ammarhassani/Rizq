"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ARTIFACT_SECTIONS, type ArtifactSection } from "@/lib/proposals/artifact";
import { adjustTone, type ToneSection } from "@/lib/ai/tone";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const TONE_VALUES = ["formal", "balanced", "friendly", "persuasive"] as const;

const InputSchema = z.object({
  proposal_id: z.string().uuid(),
  tone: z.enum(TONE_VALUES),
});

type Input = z.infer<typeof InputSchema>;

// ---------------------------------------------------------------------------
// Return type (discriminated union)
// ---------------------------------------------------------------------------

type AdjustToneResult =
  | { ok: true; modified: string[] }
  | { ok: false; code: "unauthorized" | "not_found" | "error" };

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
// Note: free-tier "3 tone uses/month" quota enforcement is deferred to a
// follow-up task per spec; the action currently runs for all authenticated users.
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
// Server action
// ---------------------------------------------------------------------------

export async function adjustProposalTone(rawInput: Input): Promise<AdjustToneResult> {
  // Validate input.
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "error" };
  const { proposal_id, tone } = parsed.data;

  const supabase = await createClient();

  // Auth check.
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };

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

  // Identify aiEditable section ids.
  const aiEditableIds = new Set(
    ARTIFACT_SECTIONS.filter((s) => s.aiEditable).map((s) => s.id)
  );

  // Extract aiEditable sections from artifact_json.
  // artifact_json may be null if the proposal hasn't been finalised yet.
  const artifactJson = proposal.artifact_json as { sections?: ArtifactSection[] } | null;
  const rawSections: ArtifactSection[] = artifactJson?.sections ?? [];

  const editableSections = rawSections.filter((s) => aiEditableIds.has(s.id));

  // Build ToneSection list — only sections with non-empty text participate.
  const toneSections: ToneSection[] = editableSections
    .map((s) => ({ id: s.id, text: extractSectionText(s) }))
    .filter((s) => s.text.trim().length > 0);

  if (toneSections.length === 0) {
    // Nothing to rewrite (proposal has no aiEditable text yet).
    return { ok: true, modified: [] };
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

  return { ok: true, modified: adjustResult.modified };
}
