/**
 * Project Workspace (spec 004) — deliverable handover state machine (pure).
 *
 * A deliverable item moves forward-only through adjacent steps:
 *   draft → ready → sent    (`sent` is terminal; no skips, no going back)
 * A null/unknown stored state is treated as `draft` (the implicit start).
 * Pure + unit-tested (Constitution IV).
 */

import { DELIVERABLE_STATES, type DeliverableState } from "./types";

const ORDER: Record<DeliverableState, number> = { draft: 0, ready: 1, sent: 2 };

export function normalizeState(s: string | null | undefined): DeliverableState {
  return s === "ready" || s === "sent" ? s : "draft";
}

export function isDeliverableState(s: string): s is DeliverableState {
  return (DELIVERABLE_STATES as readonly string[]).includes(s);
}

/** Can the item move from `current` to `target`? Adjacent forward step only. */
export function canAdvance(current: string | null | undefined, target: string): boolean {
  if (!isDeliverableState(target)) return false;
  const c = normalizeState(current);
  if (c === "sent") return false; // terminal
  return ORDER[target] === ORDER[c] + 1;
}

/** The next forward state from `current`, or null when terminal. Powers a single "advance" button. */
export function nextState(current: string | null | undefined): DeliverableState | null {
  const c = normalizeState(current);
  return c === "draft" ? "ready" : c === "ready" ? "sent" : null;
}
