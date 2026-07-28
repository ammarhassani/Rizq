/**
 * The basket: every finding, filed and never fixed here.
 *
 * The loop observes and reports. It does not remediate — a run that finds a defect and also
 * repairs it produces a diff nobody reviewed, mixes discovery with change, and (as pass 4
 * showed, where five of six defects were created by pass 3's own fixes) can inject faster than
 * it finds. So findings land here with a reference, a title and a description, and somebody
 * decides later what happens to them.
 *
 * Append-only JSONL, flushed on every write. A power cut, a dropped connection or a killed
 * process loses at most the finding being written, never the basket.
 */
import { appendFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const BASKET = resolve(HERE, "basket.jsonl");
export const BASKET_INDEX = resolve(HERE, "basket.md");

const PREFIX = "RZQ";

export function readBasket() {
  if (!existsSync(BASKET)) return [];
  return readFileSync(BASKET, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null; // a torn last line from a hard kill — skip it, keep the rest
      }
    })
    .filter(Boolean);
}

function nextRef(existing) {
  const highest = existing.reduce((max, f) => {
    const n = Number(String(f.ref ?? "").split("-")[1] ?? 0);
    return n > max ? n : max;
  }, 0);
  return `${PREFIX}-${String(highest + 1).padStart(4, "0")}`;
}

/**
 * Is this finding already in the basket?
 *
 * Matched on significant words, because the same defect described twice by two runs is still
 * one defect, and a basket that lists it eleven times is a basket nobody reads.
 */
export function findExisting(title, basket = readBasket()) {
  const words = (s) =>
    new Set(
      String(s)
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
  const a = words(title);
  if (a.size === 0) return null;
  const routeOf = (s) => String(s).match(/\/[a-z]{2}\/[^\s—]*/i)?.[0] ?? null;
  const aRoute = routeOf(title);
  for (const item of basket) {
    // Same message, different page, is a different defect. A sweep finding is mostly the
    // tool's own boilerplate — "Elements must meet minimum color contrast ratio thresholds"
    // is 8 shared words against the 1 that says WHERE — so word overlap alone merged
    // /ar/income into a /ar/dashboard reference that was already closed, and hid a
    // mobile-only contrast failure for 124 rows.
    const bRoute = routeOf(item.title);
    if (aRoute && bRoute && aRoute !== bRoute) continue;
    const b = words(item.title);
    let shared = 0;
    for (const w of a) if (b.has(w)) shared++;
    if (shared / a.size >= 0.6) return item;
  }
  return null;
}

/**
 * File a finding. Returns the existing entry (with `duplicate: true`) if it is already known,
 * so a run can report "seen again" without growing the basket.
 *
 * `severity` — P1 money wrong, a legal obligation breached, something private reaching a
 * client, or a screen stating something untrue. P2 the product contradicting itself or losing
 * work. P3 cosmetic.
 */
export function fileFinding({
  title,
  description,
  severity = "P3",
  evidence = [],
  run = null,
  session = null,
  route = null,
}) {
  const basket = readBasket();
  const existing = findExisting(title, basket);
  if (existing) {
    appendFileSync(
      BASKET,
      JSON.stringify({
        kind: "seen-again",
        ref: existing.ref,
        at: new Date().toISOString(),
        session,
        run,
      }) + "\n",
    );
    return { ...existing, duplicate: true };
  }

  const entry = {
    kind: "finding",
    ref: nextRef(basket),
    at: new Date().toISOString(),
    status: "open",
    severity,
    title,
    description,
    evidence,
    route,
    run,
    session,
  };
  appendFileSync(BASKET, JSON.stringify(entry) + "\n");
  return entry;
}

/** Findings only, with their repeat counts and current status. */
export function findings() {
  const all = readBasket();
  const items = new Map();
  for (const row of all) {
    if (row.kind === "finding") items.set(row.ref, { ...row, seenAgain: 0 });
    else if (row.kind === "seen-again" && items.has(row.ref)) items.get(row.ref).seenAgain += 1;
    else if (row.kind === "status" && items.has(row.ref)) items.get(row.ref).status = row.status;
  }
  return [...items.values()];
}

/**
 * Change a finding's status.
 *
 * - `open` — filed, undecided
 * - `withdrawn` — verification showed it was never a defect (the checker was wrong, not the
 *   product). Excluded from counts: a withdrawn finding must not inflate an axis's yield.
 * - `accepted` — real, and we are choosing to live with it
 * - `wont-fix` — real, and deliberately not being fixed
 * - `fixed` — closed by a remediation pass
 *
 * `withdrawn` and `wont-fix` are not the same thing, and conflating them makes the basket claim
 * defects that do not exist. The loop may withdraw its own findings; everything else is a human
 * decision.
 */
export function setStatus(ref, status, note = "") {
  appendFileSync(
    BASKET,
    JSON.stringify({ kind: "status", ref, status, note, at: new Date().toISOString() }) + "\n",
  );
}

/** Regenerate the readable index. Derived — safe to delete, never hand-edited. */
export function renderBasket() {
  const items = findings();
  const withdrawn = items.filter((f) => f.status === "withdrawn");
  const live = items.filter((f) => f.status !== "withdrawn");
  const open = live.filter((f) => f.status === "open");
  const bySeverity = (s) => open.filter((f) => f.severity === s);

  const lines = [
    "# Basket",
    "",
    "Generated by `node drive/basket-index.mjs` from `basket.jsonl`. Do not hand-edit.",
    "",
    "The loop files findings here and never fixes them. Remediation is a separate, reviewed",
    "decision — mixing discovery with change is how pass 3's fixes shipped five new defects.",
    "",
    `**${open.length} open** — P1 ${bySeverity("P1").length} · P2 ${bySeverity("P2").length} · P3 ${bySeverity("P3").length}`,
    `**${live.length - open.length} closed** of ${live.length} real · **${withdrawn.length} withdrawn** (never defects)`,
    "",
  ];

  for (const severity of ["P1", "P2", "P3"]) {
    const group = bySeverity(severity);
    if (!group.length) continue;
    lines.push(`## ${severity}`, "");
    for (const f of group) {
      lines.push(`### ${f.ref} — ${f.title}`, "");
      lines.push(f.description, "");
      const meta = [];
      if (f.route) meta.push(`route \`${f.route}\``);
      if (f.run) meta.push(`run \`${Object.values(f.run).join("/")}\``);
      if (f.session) meta.push(`session \`${f.session}\``);
      if (f.seenAgain) meta.push(`seen again ×${f.seenAgain}`);
      meta.push(`filed ${f.at.slice(0, 10)}`);
      lines.push(`_${meta.join(" · ")}_`, "");
      if (f.evidence?.length) {
        lines.push("```", ...f.evidence.slice(0, 6), "```", "");
      }
    }
  }

  const closed = live.filter((f) => f.status !== "open");
  if (closed.length) {
    lines.push("## Closed", "");
    for (const f of closed) lines.push(`- ${f.ref} (${f.status}) — ${f.title}`);
    lines.push("");
  }

  if (withdrawn.length) {
    lines.push("## Withdrawn — verification showed these were never defects", "");
    for (const f of withdrawn) lines.push(`- ${f.ref} — ${f.title}`);
    lines.push("");
  }

  return lines.join("\n");
}

export function writeIndex() {
  writeFileSync(BASKET_INDEX, renderBasket() + "\n");
  return BASKET_INDEX;
}
