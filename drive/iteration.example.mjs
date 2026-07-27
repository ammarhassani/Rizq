/**
 * One Ralph-loop iteration, end to end.
 *
 *   node drive/iteration.example.mjs
 *
 * The ledger names a persona and a flow; this script drives that pair. An iteration replaces
 * the "work" section with whatever the assigned flow calls for and keeps everything else:
 *
 *   1. ask the ledger which person should drive what, so an identical prompt lands somewhere
 *      new every run — six personas × ten flows is sixty distinct runs before anything repeats
 *   2. arrive as that person: their device, their locale, their pace
 *   3. do the work through the forms; the doing is itself under test
 *   4. check the product against itself and against the database
 *   5. review how it LOOKS and BEHAVES, not just what it stored
 *   6. run the standing sweeps, then record the run
 */
import { open } from "./session.mjs";
import { standardSweeps } from "./sweeps.mjs";
import { addClient, logIncome, parseFigure } from "./work.mjs";
import { nextAssignment, recordRun } from "./ledger.mjs";
import { FLOW_NAMES, flowByName } from "./flows.mjs";
import { PERSONA_NAMES, personaByName, sessionOptions } from "./personas.mjs";
import { uxReview } from "./ux.mjs";

const assignment = nextAssignment(PERSONA_NAMES, FLOW_NAMES);
const persona = personaByName(assignment.persona);
const flow = flowByName(assignment.flow);
const stamp = new Date().toISOString().slice(11, 19);

const oneLine = (s) => s.replace(/\s+/g, " ").trim();
console.log(`assignment: ${persona.name} × ${flow.name}`);
console.log(`  who: ${persona.label}`);
console.log(`  behaves: ${oneLine(persona.behaviour)}`);
console.log(`  watches: ${oneLine(persona.watches)}`);
console.log(`  flow: ${oneLine(flow.hint)}\n`);

await open(async (tools) => {
  const { page, go, text, note, db, findings } = tools;
  const mobile = persona.device.mobile;

  // ── work: what this person came to do ──────────────────────────────────────
  // (Replace this section per flow. Shown here: income-and-hadaf.)
  const client = await addClient(tools, `عميل ${persona.name} ${stamp}`);
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
  const shownForYear = parseFigure((await text()).match(/هذا العام\n([^\n]+)/)?.[1]);
  if (stored > 0 && shownForYear != null && Math.abs(shownForYear - stored) > 1) {
    note(`income ledger shows ${shownForYear} for the year while the database holds ${stored}`);
  }

  await go("/ar/hadaf");
  if (stored > 0 && /ما عندك مشاريع مسجلة/.test(await text())) {
    note("HADAF reports no recorded projects while income exists — the stale-cache defect");
  }

  // ── how does it look and behave? ───────────────────────────────────────────
  // Reviewed on the screens this person actually stood on, at their device size.
  for (const route of ["/ar/dashboard", "/ar/income", "/ar/invoices/new", "/ar/hadaf"]) {
    await go(route, 3500);
    for (const finding of await uxReview(page, { mobile, route })) note(finding);
  }

  // ── standing sweeps ────────────────────────────────────────────────────────
  for (const finding of await standardSweeps(tools)) note(finding);

  recordRun(assignment.key, { findings });
  console.log(`ledger updated: ${assignment.key}`);
}, sessionOptions(persona));
