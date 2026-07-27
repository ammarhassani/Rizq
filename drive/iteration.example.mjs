/**
 * One Ralph-loop iteration, end to end.
 *
 *   node drive/iteration.example.mjs
 *
 * This one drives `income-and-hadaf`. An iteration replaces the middle section with whatever
 * flow the ledger says is due — the mechanics around it stay the same:
 *
 *   1. ask the ledger what to drive, so an identical prompt lands somewhere new each time
 *   2. do a freelancer's work through the forms; the doing is itself under test
 *   3. check the product against itself and against the database — disagreement is the finding
 *   4. run the standing sweeps for classes earlier passes already paid for
 *   5. record the run, so the next iteration starts where this one stopped
 */
import { open } from "./session.mjs";
import { standardSweeps } from "./sweeps.mjs";
import { addClient, logIncome, parseFigure } from "./work.mjs";
import { leastRecentlyDriven, recordRun } from "./ledger.mjs";
import { FLOW_NAMES, flowByName } from "./flows.mjs";

const FLOW = "income-and-hadaf";
const stamp = new Date().toISOString().slice(11, 19);

console.log(`ledger says drive next: ${leastRecentlyDriven(FLOW_NAMES)}`);
console.log(`this script drives: ${FLOW}\n${flowByName(FLOW).hint.replace(/\s+/g, " ")}\n`);

await open(async (tools) => {
  const { go, text, note, db, findings } = tools;

  // ── work ───────────────────────────────────────────────────────────────────
  const client = await addClient(tools, `عميل التجربة ${stamp}`);
  if (!client.id) note(`saving a client did not land on its page (stayed at ${client.landedOn})`);

  const income = await logIncome(tools, { amount: 4500, title: `مشروع ${stamp}` });
  if (income.landedOn.includes("/income/new")) {
    note("logging income left the freelancer on the form — the duplicate-save trap");
  }

  // ── does the product agree with itself? ────────────────────────────────────
  const { client: sb, userId } = await db();
  const { data: gigs } = await sb.from("gigs").select("amount_sar").eq("user_id", userId);
  const stored = (gigs ?? []).reduce((sum, g) => sum + Number(g.amount_sar), 0);

  await go("/ar/income");
  const ledgerText = await text();
  const shownForYear = parseFigure(ledgerText.match(/هذا العام\n([^\n]+)/)?.[1]);
  if (stored > 0 && shownForYear != null && Math.abs(shownForYear - stored) > 1) {
    note(`income ledger shows ${shownForYear} for the year while the database holds ${stored}`);
  }

  await go("/ar/hadaf");
  if (stored > 0 && /ما عندك مشاريع مسجلة/.test(await text())) {
    note("HADAF reports no recorded projects while income exists — the stale-cache defect");
  }

  // ── standing sweeps ────────────────────────────────────────────────────────
  for (const finding of await standardSweeps(tools)) note(finding);

  // ── record ─────────────────────────────────────────────────────────────────
  recordRun(FLOW, { findings });
  console.log(`ledger updated: ${FLOW}`);
});
