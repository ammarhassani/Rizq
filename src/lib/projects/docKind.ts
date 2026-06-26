/**
 * Project Workspace (spec 004) — document kind rules (pure).
 *
 * A project document is exactly one kind at a time: `input` (brief, contract,
 * requirements, notes) or `deliverable` (the output). Switching away from
 * `deliverable` must clear the handover state (a non-deliverable can't be
 * "sent"). Pure + unit-tested.
 */

import type { ProjectDocKind } from "./types";

export const PROJECT_DOC_KINDS = ["input", "deliverable"] as const;

export function isValidDocKind(value: string): value is ProjectDocKind {
  return value === "input" || value === "deliverable";
}

/**
 * Given a kind change, returns the document patch to apply. Leaving
 * `deliverable` clears `handover_state`; becoming a deliverable leaves it null
 * (it enters the handover flow later, on the Deliverables tab).
 */
export function docKindPatch(nextKind: ProjectDocKind): {
  project_doc_kind: ProjectDocKind;
  handover_state: null;
} {
  return { project_doc_kind: nextKind, handover_state: null };
}
