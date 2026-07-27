#!/usr/bin/env node
/**
 * Print the axis scoreboard and write drive/scoreboard.md.
 *
 *   node drive/scoreboard.mjs
 *
 * Answers the only question that decides where the next run goes: which axis values are still
 * producing defects, which are field-tested enough to trust, and which have never been tried at
 * all — because "no findings" from two runs and "no findings" from twenty mean opposite things.
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scoreboard, renderScoreboard, recommendations, readRuns } from "./telemetry.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "scoreboard.md");
const stats = scoreboard();
const md = renderScoreboard(stats);
writeFileSync(OUT, md + "\n");

const { fertile, untested } = recommendations(stats);
console.log(`\n${readRuns().length} run(s) recorded → drive/scoreboard.md\n`);
if (fertile.length) {
  console.log("FERTILE — still producing, burn them more:");
  for (const f of fertile) console.log(`  ${f}`);
  console.log("");
}
console.log(`untested values: ${untested.length}${untested.length ? " — " + untested.slice(0, 8).join(", ") : ""}`);
console.log("");
