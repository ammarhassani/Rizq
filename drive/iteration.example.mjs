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
import { personaByName, sessionOptions } from "./personas.mjs";
import { flowByName } from "./flows.mjs";
import { strategyByName } from "./strategies.mjs";
import { runKey } from "./axes.mjs";

const row = nextPlanRow();
if (!row) {
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

const findings = [];
/** Grade as you go: P1 money/legal/privacy/untruth, P2 self-contradiction, P3 cosmetic. */
const found = (severity, text) => findings.push({ severity, text });

await open(async (tools) => {
  const { page, go, text, note, db } = tools;
  const mobile = persona.device.mobile;
  const stamp = new Date().toISOString().slice(11, 19);

  // ── work — REWRITE THIS PART for the assigned flow ─────────────────────────
  const client = await addClient(tools, `عميل ${persona.name} ${stamp}`);
  if (!client.id && note(`saving a client did not land on its page (${client.landedOn})`)) {
    found("P2", "client save does not navigate to the created client");
  }

  const income = await logIncome(tools, { amount: 4500, title: `مشروع ${stamp}` });
  if (income.landedOn.includes("/income/new") && note("logging income left a blank form")) {
    found("P2", "logging income leaves the freelancer on a blank form (duplicate-save trap)");
  }

  // ── does the product agree with itself and with the database? ──────────────
  const { client: sb, userId } = await db();
  const { data: gigs } = await sb.from("gigs").select("amount_sar").eq("user_id", userId);
  const stored = (gigs ?? []).reduce((sum, g) => sum + Number(g.amount_sar), 0);

  await go("/ar/income");
  const shown = parseFigure((await text()).match(/هذا العام\n([^\n]+)/)?.[1]);
  if (stored > 0 && shown != null && Math.abs(shown - stored) > 1) {
    if (note(`ledger shows ${shown} for the year, database holds ${stored}`)) {
      found("P1", "income ledger disagrees with the database");
    }
  }

  // ── how does it look, at this persona's device size? ───────────────────────
  for (const route of ["/ar/dashboard", "/ar/income"]) {
    await go(route, 3500);
    for (const finding of await uxReview(page, { mobile, route })) {
      if (note(finding)) found("P3", finding);
    }
  }

  // ── standing sweeps ────────────────────────────────────────────────────────
  for (const finding of await standardSweeps(tools)) {
    if (note(finding)) found("P2", finding);
  }

  // ── record, then tick — never the other way round ──────────────────────────
  recordRun({
    run: row.run,
    findings,
    closed: [],
    notes: `plan row ${row.n}`,
  });
  tickPlanRow(row.n);
  console.log(`\nrecorded row ${row.n}: ${findings.length} finding(s). Run scoreboard.mjs next.`);
}, sessionOptions(persona));
