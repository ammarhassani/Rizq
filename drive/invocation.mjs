/**
 * One invocation of the loop, tracked well enough to survive losing the machine.
 *
 * The failure this is built against is mundane: the laptop sleeps, the wifi drops, the process
 * is killed halfway through a run. Without a record the next invocation cannot tell whether the
 * plan row was driven, whether its findings were filed, or whether it is about to redo work and
 * file everything twice.
 *
 * So every state change is appended to `invocations.jsonl` before the work it describes, and
 * resuming means replaying that log. Append-only, one JSON object per line: a hard kill can
 * lose the line being written, never the history.
 */
import { appendFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const LOG = resolve(HERE, "invocations.jsonl");

/** The steps of a run, in order. A resume starts at the first one not yet reached. */
export const STEPS = [
  "started",
  "row-claimed",
  "driven",
  "checked",
  "filed",
  "row-ticked",
  "completed",
];

function append(entry) {
  appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
}

export function readLog() {
  if (!existsSync(LOG)) return [];
  return readFileSync(LOG, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null; // torn final line from a hard kill
      }
    })
    .filter(Boolean);
}

/** Every invocation, folded from the log, newest last. */
export function invocations() {
  const byId = new Map();
  for (const row of readLog()) {
    if (!byId.has(row.session)) {
      byId.set(row.session, { id: row.session, steps: [], row: null, findings: 0, startedAt: row.at });
    }
    const inv = byId.get(row.session);
    inv.steps.push(row.step);
    inv.lastAt = row.at;
    if (row.planRow !== undefined) inv.row = row.planRow;
    if (row.findings !== undefined) inv.findings = row.findings;
    if (row.note) inv.note = row.note;
  }
  return [...byId.values()];
}

export function reached(inv, step) {
  return inv.steps.includes(step);
}

/** An invocation that started and never completed — the thing a resume picks up. */
export function unfinished() {
  return invocations().find((inv) => !reached(inv, "completed")) ?? null;
}

function nextId(all) {
  const highest = all.reduce((max, inv) => {
    const n = Number(String(inv.id).split("-")[1] ?? 0);
    return n > max ? n : max;
  }, 0);
  return `S-${String(highest + 1).padStart(4, "0")}`;
}

/**
 * Begin, or pick up where the last one stopped.
 *
 * Resuming is the default because the alternative — starting fresh after a crash — silently
 * re-drives a row that may already have been filed, and doubles the basket.
 */
export function startOrResume({ force = false } = {}) {
  const open = force ? null : unfinished();
  if (open) {
    append({ session: open.id, step: "resumed", planRow: open.row });
    return { id: open.id, resumed: true, from: open.steps[open.steps.length - 1], planRow: open.row };
  }
  const id = nextId(invocations());
  append({ session: id, step: "started" });
  return { id, resumed: false, from: null, planRow: null };
}

/** Record reaching a step. Called BEFORE the work it names, so a crash looks like "not done". */
export function checkpoint(session, step, data = {}) {
  if (!STEPS.includes(step) && step !== "resumed" && step !== "aborted") {
    throw new Error(`unknown step: ${step}`);
  }
  append({ session, step, ...data });
}

export function complete(session, { findings = 0, note = "" } = {}) {
  append({ session, step: "completed", findings, note });
}

/** Give up cleanly, so the next invocation resumes rather than guessing. */
export function abort(session, reason) {
  append({ session, step: "aborted", note: reason });
}

/** What the next invocation should know before it does anything. */
export function status() {
  const all = invocations();
  const open = unfinished();
  const done = all.filter((inv) => reached(inv, "completed"));
  return {
    total: all.length,
    completed: done.length,
    open: open ? { id: open.id, lastStep: open.steps[open.steps.length - 1], planRow: open.row } : null,
    lastCompleted: done.length ? done[done.length - 1] : null,
  };
}
