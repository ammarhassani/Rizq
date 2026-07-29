#!/usr/bin/env node
/**
 * Where the loop has and has not been.
 *
 *   node drive/coverage.mjs
 *
 * Prints the three-dimensional gap — persona × flow × strategy — so whoever is leading a
 * session picks a road nobody has driven instead of grinding the next cell in a list. A whole
 * untried strategy is worth more than a hundred untouched cells of one that has been.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { uncoveredRoads, coverage, knownFindings } from "./ledger.mjs";
import { PERSONA_NAMES } from "./personas.mjs";
import { FLOW_NAMES } from "./flows.mjs";
import { STRATEGY_NAMES, strategyByName } from "./strategies.mjs";
import { AXIS_NAMES } from "./axes.mjs";

const PLAN = resolve(dirname(fileURLToPath(import.meta.url)), "plan.md");

/** The locked plan: every row, and whether it has been ticked. */
function planRows() {
  const rows = [];
  for (const line of readFileSync(PLAN, "utf8").split("\n")) {
    const m = line.match(/^\|\s*(\d+)\s*\|(.+)\|([^|]*)\|\s*$/);
    if (!m) continue;
    const values = m[2].split("|").map((v) => v.trim());
    const run = {};
    AXIS_NAMES.forEach((axis, i) => (run[axis] = values[i]));
    rows.push({ n: Number(m[1]), run, done: m[3].trim().length > 0 });
  }
  return rows;
}

const roads = uncoveredRoads({
  personas: PERSONA_NAMES,
  flows: FLOW_NAMES,
  strategies: STRATEGY_NAMES,
});

const pct = ((roads.drivenCells / roads.totalCells) * 100).toFixed(1);
console.log(`\ncoverage: ${roads.drivenCells}/${roads.totalCells} cells (${pct}%)\n`);

if (roads.strategiesNeverTried.length) {
  console.log("STRATEGIES NEVER TRIED — the biggest gaps, each a different kind of question:");
  for (const name of roads.strategiesNeverTried) {
    const s = strategyByName(name);
    console.log(`  ${name.padEnd(14)} ${s.question}`);
  }
  console.log("");
}

if (roads.flowsNeverDriven.length) {
  console.log(`flows never driven (${roads.flowsNeverDriven.length}): ${roads.flowsNeverDriven.join(", ")}\n`);
}
if (roads.personasNeverUsed.length) {
  console.log(`personas never used (${roads.personasNeverUsed.length}): ${roads.personasNeverUsed.join(", ")}\n`);
}

const ledgerRows = coverage();
if (ledgerRows.length) {
  console.log("driven so far:");
  for (const r of ledgerRows) console.log(`  ${r.flow.padEnd(34)} ${r.lastDriven}  ×${r.runs}`);
  console.log("");
}

const rows = planRows();
const done = rows.filter((r) => r.done).length;
const next = rows.find((r) => !r.done);

console.log(`locked plan: ${done}/${rows.length} runs ticked (drive/plan.md)`);
if (next) {
  console.log(`\nNEXT RUN — row ${next.n}:`);
  for (const axis of AXIS_NAMES) console.log(`  ${axis.padEnd(9)} ${next.run[axis]}`);
  console.log(
    `\nThe plan covers every reachable pair. Follow it unless there is a reason not to, and`,
  );
  console.log(`say the reason. Tick the row when the run is recorded.`);
  console.log(
    `\nA BATCH run (drive/e2e.mjs) varies only persona, surface and theme — tier, state and`,
  );
  console.log(
    `entry reach nothing, so pairs differing only in those are ticked without having differed.`,
  );
  console.log(`Drive the combination by hand (ammar-loop) when it is the point of the row.`);
} else {
  console.log(
    `\nEvery row ticked. If three consecutive runs also found no new P1/P2, the space is`,
  );
  console.log(`exhausted — say so plainly instead of manufacturing work.`);
}
console.log(`\nopen + accepted findings on record: ${knownFindings().length}\n`);
