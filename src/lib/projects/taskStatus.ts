/**
 * Project Workspace (spec 004) — task status rules (pure).
 *
 * Tasks use a small kanban status set (todo | doing | done). Movement is free
 * (any → any), so the rule is just validation + a safe default + progress math.
 * Pure + unit-tested.
 */

import { TASK_STATUSES, type TaskStatus } from "./types";

export function isValidStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

export function normalizeStatus(value: string | null | undefined): TaskStatus {
  return value === "doing" || value === "done" ? value : "todo";
}

/** Completion ratio (0..1) of a set of tasks by status — drives milestone/progress UI. */
export function completionRatio(statuses: (string | null | undefined)[]): number {
  if (statuses.length === 0) return 0;
  const done = statuses.filter((s) => normalizeStatus(s) === "done").length;
  return done / statuses.length;
}
