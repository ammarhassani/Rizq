#!/usr/bin/env node
/**
 * Drive plan rows until the plan is done, or until a stop condition says otherwise.
 *
 *   node drive/e2e.mjs            # every remaining row
 *   node drive/e2e.mjs 10         # ten rows
 *   node drive/e2e.mjs --p1-stop  # stop as soon as a P1 is filed, so it can be fixed
 *   node drive/e2e.mjs --loop     # never finish: on a complete plan, clear the ticks and
 *                                 # drive it again from row 1, forever, until killed
 *
 * `--loop` is the Ralph mode. The plan stops being a checklist to finish and becomes a
 * circuit to keep walking: the app changes under it, so the same row driven next cycle is
 * not the same test. Findings dedupe by title in the basket, so a repeat says "seen again"
 * rather than filing a new reference each lap.
 *
 * Batch mode trades depth for reach: it runs the GENERIC work section on every row rather than
 * the flow-specific driving an agent writes by hand. Use it to cover ground, then let the fix
 * pass and an interactive run handle what it surfaces.
 */
import { nextPlanRow, planProgress, resetPlan } from "./plan.mjs";
import { startOrResume, complete, abort } from "./invocation.mjs";
import { driveRow } from "./iterate.mjs";
import { writeIndex, findings } from "./basket.mjs";

const args = process.argv.slice(2);
const p1Stop = args.includes("--p1-stop");
const loop = args.includes("--loop");
const limit = Number(args.find((a) => /^\d+$/.test(a)) ?? Infinity);

const session = startOrResume();
console.log(session.resumed ? `resuming ${session.id}` : `session ${session.id}`);

let driven = 0;
let cycle = 1;
let stopped = null;

try {
  while (driven < limit) {
    let row = nextPlanRow();
    if (!row) {
      if (!loop) {
        stopped = "plan complete";
        break;
      }
      cycle += 1;
      resetPlan();
      console.log(`\n══ plan complete — starting cycle ${cycle} from row 1`);
      row = nextPlanRow();
      if (!row) {
        stopped = "plan is empty"; // no rows at all: looping would spin forever
        break;
      }
    }
    const found = await driveRow(row, session.id);
    driven += 1;

    if (p1Stop && found.some((f) => f.severity === "P1")) {
      stopped = `P1 filed on row ${row.n} — stopping so it can be fixed`;
      break;
    }
  }
  if (!stopped) stopped = `reached the limit of ${limit} row(s)`;
  complete(session.id, { note: stopped });
} catch (err) {
  // A crash mid-batch leaves the invocation open on purpose: the next run resumes it rather
  // than starting fresh and re-driving a row that may already have been filed.
  abort(session.id, String(err).slice(0, 200));
  console.error(`\naborted: ${err}`);
  process.exitCode = 1;
}

writeIndex();
const open = findings().filter((f) => f.status === "open");
const p = planProgress();
console.log(`\n${driven} row(s) driven over ${cycle} cycle(s) — ${stopped}`);
console.log(`plan ${p.done}/${p.total} · basket ${open.length} open (P1 ${open.filter((f) => f.severity === "P1").length}, P2 ${open.filter((f) => f.severity === "P2").length}, P3 ${open.filter((f) => f.severity === "P3").length})`);
