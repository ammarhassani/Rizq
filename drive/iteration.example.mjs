/**
 * One Ralph-loop iteration, in the shape every iteration should take.
 *
 *   node drive/iteration.example.mjs
 *
 * Three parts, in this order:
 *   1. do a freelancer's work through the forms — this builds the state everything else
 *      needs, and the doing is itself under test
 *   2. check the product against ITSELF and against the database — two screens disagreeing,
 *      or a screen disagreeing with the row, is the finding
 *   3. run the standing sweeps for the classes earlier passes already paid for
 *
 * The sweeps are the floor, not the point. They catch regressions; they do not find new
 * kinds of wrong. Part 2 is where the next defect comes from.
 */
import { open } from "./session.mjs";
import { standardSweeps } from "./sweeps.mjs";
import { addClient, logIncome, parseFigure } from "./work.mjs";

const stamp = new Date().toISOString().slice(11, 19);

await open(async (tools) => {
  const { go, text, note, db } = tools;

  // ── 1. Work ────────────────────────────────────────────────────────────────
  const client = await addClient(tools, `عميل التجربة ${stamp}`);
  if (!client.id) note(`saving a client did not land on its page (stayed at ${client.landedOn})`);

  const income = await logIncome(tools, { amount: 4500, title: `مشروع ${stamp}` });
  if (income.landedOn.includes("/income/new")) {
    note("logging income left the freelancer on the form — the duplicate-save trap");
  }

  // ── 2. Does the product agree with itself? ─────────────────────────────────
  const { client: sb, userId } = await db();
  const { data: gigs } = await sb.from("gigs").select("amount_sar").eq("user_id", userId);
  const stored = (gigs ?? []).reduce((sum, g) => sum + Number(g.amount_sar), 0);

  await go("/ar/income");
  const ledger = await text();
  const ledgerTotal = parseFigure(ledger.match(/هذا العام\n([^\n]+)/)?.[1]);
  if (stored > 0 && ledgerTotal != null && Math.abs(ledgerTotal - stored) > 1) {
    note(`ledger shows ${ledgerTotal} for the year while the database holds ${stored}`);
  }

  await go("/ar/hadaf");
  const hadaf = await text();
  if (stored > 0 && /ما عندك مشاريع مسجلة/.test(hadaf)) {
    note("HADAF says no recorded projects while income exists — the stale-cache defect");
  }

  // ── 3. Standing sweeps ─────────────────────────────────────────────────────
  for (const finding of await standardSweeps(tools)) note(finding);
});
