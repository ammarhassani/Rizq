/**
 * Pure helpers for the conversational proposal editor (feature 001 / US4).
 * Kept out of the server-only router/action so they can be unit-tested.
 */
import { isAiEditableSection } from "./sections";

export type ChatScopeChange = {
  kind: "add" | "remove";
  deliverable_ar: string;
  deliverable_en: string;
};

/**
 * Keep only valid AI-editable section ids, deduped and order-preserving.
 * Defense beyond the router schema's enum — guarantees the chat can never be
 * routed to a protected section (price/timeline/milestones/terms).
 */
export function sanitizeIntentTargets(ids: readonly string[] | undefined | null): string[] {
  if (!ids) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (isAiEditableSection(id) && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}
