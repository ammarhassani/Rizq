/**
 * Reading and ticking the locked plan.
 *
 * `plan.md` is the source of truth for what to drive next — kept as markdown so a person can
 * read and audit it, parsed here so a run cannot drift from it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AXIS_NAMES } from "./axes.mjs";

export const PLAN = resolve(dirname(fileURLToPath(import.meta.url)), "plan.md");

const ROW = /^\|\s*(\d+)\s*\|(.+)\|([^|]*)\|\s*$/;

export function planRows() {
  const rows = [];
  for (const line of readFileSync(PLAN, "utf8").split("\n")) {
    const m = line.match(ROW);
    if (!m) continue;
    const values = m[2].split("|").map((v) => v.trim());
    const run = {};
    AXIS_NAMES.forEach((axis, i) => (run[axis] = values[i]));
    rows.push({ n: Number(m[1]), run, done: m[3].trim().length > 0 });
  }
  return rows;
}

/** The next row nobody has driven, or null when the plan is complete. */
export function nextPlanRow() {
  return planRows().find((r) => !r.done) ?? null;
}

/**
 * Tick a row, with the date it was driven.
 *
 * Only ever called after the run is recorded — a row ticked before its telemetry lands would
 * make the plan claim coverage the scoreboard cannot account for.
 */
export function tickPlanRow(n, date = new Date().toISOString().slice(0, 10)) {
  const out = readFileSync(PLAN, "utf8")
    .split("\n")
    .map((line) => {
      const m = line.match(ROW);
      if (!m || Number(m[1]) !== n) return line;
      return `| ${m[1]} |${m[2]}| ${date} |`;
    })
    .join("\n");
  writeFileSync(PLAN, out);
}

/**
 * Clear every tick so the plan can be driven again from row 1.
 *
 * The dates in the `done` column are not the coverage record — `runs.jsonl` is, and it keeps
 * every run with its date and findings forever. This only decides what to drive NEXT, so
 * wiping it loses nothing a reader needs; the scoreboard still reports the full history.
 */
export function resetPlan() {
  const out = readFileSync(PLAN, "utf8")
    .split("\n")
    .map((line) => {
      const m = line.match(ROW);
      return m ? `| ${m[1]} |${m[2]}|  |` : line;
    })
    .join("\n");
  writeFileSync(PLAN, out);
}

export function planProgress() {
  const rows = planRows();
  return { done: rows.filter((r) => r.done).length, total: rows.length };
}
