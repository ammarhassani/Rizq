/**
 * The loop's memory.
 *
 * A Ralph loop fires the SAME prompt every iteration, so without a record each run starts from
 * zero: it re-drives the flow the last one drove, re-reports the finding the last one already
 * fixed, and never reaches the parts of the product nobody has opened. The ledger is what makes
 * iteration N+1 different from iteration N.
 *
 * It is committed on purpose. `drive/.auth/findings.log` dies with the browser profile, and the
 * knowledge of what has been driven is worth more than the account it was driven with.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const LEDGER = resolve(HERE, "ledger.md");

const COVERAGE_HEADING = "## Flow coverage";
const OPEN_HEADING = "## Open findings";
const KNOWN_HEADING = "## Known and accepted";

function read() {
  return existsSync(LEDGER) ? readFileSync(LEDGER, "utf8") : "";
}

function section(text, heading) {
  const start = text.indexOf(heading);
  if (start < 0) return "";
  const rest = text.slice(start + heading.length);
  const end = rest.search(/\n## /);
  return end < 0 ? rest : rest.slice(0, end);
}

/** Rows of `| flow | last driven | iterations |` under the coverage heading. */
export function coverage() {
  const rows = [];
  for (const line of section(read(), COVERAGE_HEADING).split("\n")) {
    const m = line.match(/^\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|/);
    if (m) rows.push({ flow: m[1], lastDriven: m[2].trim(), runs: Number(m[3]) });
  }
  return rows;
}

/**
 * The flow least recently driven — how successive iterations of an identical prompt end up
 * somewhere new. "never" sorts first, so unopened parts of the product go before re-runs.
 */
export function leastRecentlyDriven(flows) {
  const seen = new Map(coverage().map((r) => [r.flow, r]));
  const scored = flows.map((flow) => {
    const row = seen.get(flow);
    return { flow, when: !row || row.lastDriven === "never" ? "" : row.lastDriven, runs: row?.runs ?? 0 };
  });
  scored.sort((a, b) => (a.when === b.when ? a.runs - b.runs : a.when < b.when ? -1 : 1));
  return scored[0].flow;
}

/**
 * The persona × flow pair due next.
 *
 * A defect is only visible to someone whose expectations it violates, so the same flow driven
 * by a different person is a genuinely different run — the rusher and the accountant break the
 * invoice builder in different places. Pairing them here means an identical loop prompt keeps
 * landing somewhere new long after every flow has been opened once.
 */
export function nextAssignment(personas, flows) {
  const seen = new Map(coverage().map((r) => [r.flow, r]));
  const pairs = [];
  for (const persona of personas) {
    for (const flow of flows) {
      const key = `${persona}/${flow}`;
      const row = seen.get(key);
      pairs.push({
        persona,
        flow,
        key,
        when: !row || row.lastDriven === "never" ? "" : row.lastDriven,
        runs: row?.runs ?? 0,
      });
    }
  }
  pairs.sort((a, b) => (a.when === b.when ? a.runs - b.runs : a.when < b.when ? -1 : 1));
  return pairs[0];
}

/**
 * Findings already written down — so a run reports what is NEW, not what is unfixed.
 *
 * Bullets wrap across lines in a hand-edited ledger, so a continuation line is folded into the
 * bullet above it. Splitting on newlines instead turns one finding into five fragments, and the
 * word-overlap match then never fires.
 */
export function knownFindings() {
  const text = read();
  const lines = [...section(text, OPEN_HEADING).split("\n"), ...section(text, KNOWN_HEADING).split("\n")];
  const bullets = [];
  for (const line of lines) {
    if (/^\s*[-*]\s+/.test(line)) {
      bullets.push(line.replace(/^\s*[-*]\s+/, "").trim());
    } else if (line.trim() && bullets.length && !line.startsWith("#")) {
      bullets[bullets.length - 1] += " " + line.trim();
    }
  }
  return bullets.filter(Boolean);
}

/**
 * Is this finding one the ledger already carries?
 *
 * Compared on the significant words rather than the exact string: the same defect phrased two
 * ways is still the same defect, and a loop that re-reports it teaches the next iteration
 * nothing.
 */
export function isKnown(finding) {
  const words = (s) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
  const a = words(finding);
  if (a.size === 0) return false;
  for (const known of knownFindings()) {
    const b = words(known);
    let shared = 0;
    for (const w of a) if (b.has(w)) shared++;
    if (shared / a.size >= 0.6) return true;
  }
  return false;
}

/** Record that a flow was driven, so the next iteration picks a different one. */
export function recordRun(flow, { findings = [], date = new Date().toISOString().slice(0, 10) } = {}) {
  let text = read();
  if (!text) {
    text = `# Drive ledger\n\n${COVERAGE_HEADING}\n\n| flow | last driven | iterations |\n|---|---|---|\n\n${OPEN_HEADING}\n\n${KNOWN_HEADING}\n`;
  }
  const rows = coverage();
  const existing = rows.find((r) => r.flow === flow);
  if (existing) {
    existing.lastDriven = date;
    existing.runs += 1;
  } else {
    rows.push({ flow, lastDriven: date, runs: 1 });
  }
  rows.sort((a, b) => a.flow.localeCompare(b.flow));

  const table = [
    "",
    "| flow | last driven | iterations |",
    "|---|---|---|",
    ...rows.map((r) => `| \`${r.flow}\` | ${r.lastDriven} | ${r.runs} |`),
    "",
  ].join("\n");

  const start = text.indexOf(COVERAGE_HEADING);
  const after = text.slice(start + COVERAGE_HEADING.length);
  const end = after.search(/\n## /);
  text =
    text.slice(0, start + COVERAGE_HEADING.length) +
    table +
    (end < 0 ? "\n" : after.slice(end));

  if (findings.length) {
    const marker = `${OPEN_HEADING}\n`;
    const at = text.indexOf(marker);
    const bullets = findings.map((f) => `- ${date} · ${f}`).join("\n") + "\n";
    text = text.slice(0, at + marker.length) + "\n" + bullets + text.slice(at + marker.length);
  }

  writeFileSync(LEDGER, text);
  return { flow, findings: findings.length };
}
