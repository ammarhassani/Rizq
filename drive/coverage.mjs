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
import { uncoveredRoads, coverage, knownFindings, nextAssignment } from "./ledger.mjs";
import { PERSONA_NAMES } from "./personas.mjs";
import { FLOW_NAMES } from "./flows.mjs";
import { STRATEGY_NAMES, strategyByName } from "./strategies.mjs";

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

const rows = coverage();
if (rows.length) {
  console.log("driven so far:");
  for (const r of rows) console.log(`  ${r.flow.padEnd(34)} ${r.lastDriven}  ×${r.runs}`);
  console.log("");
}

const next = nextAssignment(PERSONA_NAMES, FLOW_NAMES);
console.log(`least-recent persona × flow: ${next.persona} × ${next.flow}`);
console.log(`open + accepted findings on record: ${knownFindings().length}`);
console.log(
  `\nPick deliberately: an untried STRATEGY beats an untouched cell of a strategy already used.\n`,
);
