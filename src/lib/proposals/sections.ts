/**
 * Honesty guard for AI editing (feature 001, Foundational).
 *
 * Single source of truth for which proposal sections the AI may rewrite. Derived
 * from the artifact registry's `aiEditable` flags so it can never drift from the
 * renderer. Used by the AI clarifying-question generator (US3) and the
 * conversational chat editor (US4) to keep price/dates/legal off-limits to the AI.
 */

import { ARTIFACT_SECTIONS, type ArtifactSectionId } from "./artifact";

/** The prose sections the AI may rewrite. Today: cover_letter, understanding, approach, scope_of_work, assumptions. */
export const AI_EDITABLE_SECTION_IDS: readonly ArtifactSectionId[] = ARTIFACT_SECTIONS.filter(
  (s) => s.aiEditable,
).map((s) => s.id);

/** True when `id` is a section the AI is allowed to edit. */
export function isAiEditableSection(id: string): id is ArtifactSectionId {
  return (AI_EDITABLE_SECTION_IDS as readonly string[]).includes(id);
}

/**
 * Honesty guard: throws if any target id is NOT an AI-editable prose section.
 * Guarantees the AI can never be routed to pricing/timeline/milestones/terms/etc.
 */
export function assertNoProtectedSections(targetIds: readonly string[]): void {
  const offending = targetIds.filter((id) => !isAiEditableSection(id));
  if (offending.length > 0) {
    throw new Error(
      `AI may not edit protected proposal sections: ${offending.join(", ")}`,
    );
  }
}
