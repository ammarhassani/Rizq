/**
 * One iteration, end to end — the shape every run copies.
 *
 *   node drive/iteration.example.mjs
 *
 * It takes the next unticked row of the locked plan, drives it, records what it found with
 * severities, ticks the row, and leaves the scoreboard able to say whether that combination is
 * worth driving again. The "work" section is the only part an iteration rewrites: what a
 * `veteran` does on `proposal-to-client` is not what a `rusher` does on `recovery`.
 */
import { open } from "./session.mjs";
import { standardSweeps } from "./sweeps.mjs";
import { uxReview } from "./ux.mjs";
import { addClient, logIncome, parseFigure } from "./work.mjs";
import { nextPlanRow, tickPlanRow, planProgress } from "./plan.mjs";
import { recordRun } from "./telemetry.mjs";
import { fileFinding, writeIndex } from "./basket.mjs";
import { startOrResume, checkpoint, complete, abort } from "./invocation.mjs";
import { personaByName, sessionOptions } from "./personas.mjs";
import { flowByName } from "./flows.mjs";
import { strategyByName } from "./strategies.mjs";
import { runKey } from "./axes.mjs";

const session = startOrResume();
console.log(
  session.resumed
    ? `resuming ${session.id} (last step: ${session.from}, plan row ${session.planRow ?? "?"})`
    : `session ${session.id}`,
);

const row = nextPlanRow();
if (!row) {
  complete(session.id, { note: "plan complete" });
  console.log("Every plan row is ticked. If three consecutive runs also found no new P1/P2,");
  console.log("the search space is exhausted — say so instead of manufacturing work.");
  process.exit(0);
}

const persona = personaByName(row.run.persona);
const flow = flowByName(row.run.flow);
const strategy = strategyByName(row.run.strategy);
const progress = planProgress();
const oneLine = (s) => s.replace(/\s+/g, " ").trim();

console.log(`plan row ${row.n} of ${progress.total} (${progress.done} ticked)`);
console.log(`  ${runKey(row.run)}\n`);
console.log(`  who      ${persona.label}`);
console.log(`  behaves  ${oneLine(persona.behaviour)}`);
console.log(`  watches  ${oneLine(persona.watches)}`);
console.log(`  flow     ${oneLine(flow.hint)}`);
console.log(`  asks     ${strategy.question}`);
console.log(`  because  ${oneLine(strategy.why)}\n`);
for (const relation of strategy.relations.slice(0, 4)) console.log(`   · ${relation}`);
console.log("");

checkpoint(session.id, "row-claimed", { planRow: row.n });

/**
 * Findings are collected, not filed immediately: filing happens once, after the driving is
 * done, so a crash mid-run leaves the basket untouched rather than half-populated.
 */
const findings = [];
const found = (severity, title, description, evidence = [], route = null) =>
  findings.push({ severity, title, description, evidence, route });

await open(async (tools) => {
  const { page, go, text, note, db } = tools;
  const mobile = persona.device.mobile;
  const stamp = new Date().toISOString().slice(11, 19);

  // ── work — REWRITE THIS PART for the assigned flow ─────────────────────────
  const client = await addClient(tools, `عميل ${persona.name} ${stamp}`);
  if (!client.id && note(`saving a client did not land on its page (${client.landedOn})`)) {
    found(
      "P2",
      "Saving a client does not navigate to the created client",
      `The client form was submitted and stayed at ${client.landedOn}. A save that appears to do nothing invites a second submit.`,
      [`landed on ${client.landedOn}`],
      "/ar/clients/new",
    );
  }

  const income = await logIncome(tools, { amount: 4500, title: `مشروع ${stamp}` });
  if (income.landedOn.includes("/income/new") && note("logging income left a blank form")) {
    found(
      "P2",
      "Logging income leaves the freelancer on a blank form",
      "The row saves but the form re-renders empty, so the natural response is to fill it in and save again — a duplicate-income trap.",
      [`landed on ${income.landedOn}`, `typed amount ${income.typed}`],
      "/ar/income/new",
    );
  }

  // ── does the product agree with itself and with the database? ──────────────
  const { client: sb, userId } = await db();
  const { data: gigs } = await sb.from("gigs").select("amount_sar").eq("user_id", userId);
  const stored = (gigs ?? []).reduce((sum, g) => sum + Number(g.amount_sar), 0);

  await go("/ar/income");
  const shown = parseFigure((await text()).match(/هذا العام\n([^\n]+)/)?.[1]);
  if (stored > 0 && shown != null && Math.abs(shown - stored) > 1) {
    if (note(`ledger shows ${shown} for the year, database holds ${stored}`)) {
      found(
        "P1",
        "Income ledger disagrees with the database",
        "The year-to-date figure on the ledger does not match the sum of the freelancer's gigs. Verified by querying gigs as the same signed-in user.",
        [`ledger showed ${shown}`, `database held ${stored}`],
        "/ar/income",
      );
    }
  }

  // ── how does it look, at this persona's device size? ───────────────────────
  for (const route of ["/ar/dashboard", "/ar/income"]) {
    await go(route, 3500);
    for (const finding of await uxReview(page, { mobile, route })) {
      if (note(finding)) {
        found("P3", finding.slice(0, 90), finding, [], route);
      }
    }
  }

  // ── standing sweeps ────────────────────────────────────────────────────────
  checkpoint(session.id, "driven", { planRow: row.n });

  for (const finding of await standardSweeps(tools)) {
    if (note(finding)) found("P2", finding.slice(0, 90), finding);
  }

  checkpoint(session.id, "checked", { planRow: row.n, findings: findings.length });

  // ── file, record, tick, complete — in that order, each checkpointed ────────
  const filed = [];
  for (const f of findings) {
    const entry = fileFinding({ ...f, run: row.run, session: session.id });
    filed.push(`${entry.ref}${entry.duplicate ? " (seen again)" : ""} ${f.severity} ${f.title}`);
  }
  writeIndex();
  checkpoint(session.id, "filed", { planRow: row.n, findings: findings.length });

  recordRun({
    run: row.run,
    findings: findings.map((f) => ({ text: f.title, severity: f.severity })),
    closed: [],
    notes: `session ${session.id}, plan row ${row.n}`,
  });

  tickPlanRow(row.n);
  checkpoint(session.id, "row-ticked", { planRow: row.n });
  complete(session.id, { findings: findings.length });

  console.log(`\nrow ${row.n} done — ${findings.length} finding(s):`);
  for (const line of filed) console.log(`  ${line}`);
  console.log("\nNothing was fixed. Findings are in drive/basket.md for a separate decision.");
}, sessionOptions(persona));
