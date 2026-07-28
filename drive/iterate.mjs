/**
 * Drive one plan row, end to end.
 *
 * Extracted from the example so a batch run can call it per row without copying it. The `work`
 * section here is the GENERIC one — sweeps, UX review, and the ledger-vs-database check. An
 * agent driving a row interactively rewrites that section for the assigned flow, which is
 * always richer than this; batch mode trades that depth for reach.
 */
import { open } from "./session.mjs";
import { standardSweeps } from "./sweeps.mjs";
import { uxReview } from "./ux.mjs";
import { addClient, logIncome, parseFigure } from "./work.mjs";
import { tickPlanRow } from "./plan.mjs";
import { recordRun } from "./telemetry.mjs";
import { fileFinding, writeIndex } from "./basket.mjs";
import { checkpoint, complete } from "./invocation.mjs";
import { personaByName, sessionOptions, screenFor } from "./personas.mjs";
import { runKey } from "./axes.mjs";

/** Is the app telling the freelancer why the save was refused? */
async function quotaRefusal(page) {
  const dialog = page.getByRole("dialog");
  return (await dialog.count()) > 0 && (await dialog.first().isVisible());
}

/** Did the row actually reach the database, as this same signed-in freelancer? */
async function rowExists({ db }, table, column, value) {
  const { client, userId } = await db();
  const { data } = await client.from(table).select("id").eq("user_id", userId).eq(column, value);
  return (data ?? []).length > 0;
}

export async function driveRow(row, sessionId) {
  const persona = personaByName(row.run.persona);
  const findings = [];
  const found = (severity, title, description, evidence = [], route = null) =>
    findings.push({ severity, title, description, evidence, route });

  checkpoint(sessionId, "row-claimed", { planRow: row.n });
  console.log(`\n── row ${row.n}: ${runKey(row.run)}`);

  await open(async (tools) => {
    const { page, go, text, note, db } = tools;
    // The row's surface decides the screen, not the persona alone — see screenFor.
    const mobile = screenFor(persona, row.run).mobile;
    const stamp = new Date().toISOString().slice(11, 19);

    // A save that goes nowhere is only a defect if it also saved nothing NEW, or saved
    // without saying so. Asserting on the landed URL alone filed the working paywall as a
    // defect 137 times across one batch: at the quota ceiling the form correctly stays put
    // and a dialog explains why. Both checks below ask the database and the screen.
    const clientName = `عميل ${persona.name} ${stamp}`;
    const client = await addClient(tools, clientName);
    if (!client.id) {
      const refused = await quotaRefusal(page);
      const saved = await rowExists(tools, "clients", "name", clientName);
      if (!refused && !saved && note(`client save did nothing (${client.landedOn})`)) {
        found("P2", "Saving a client neither navigates nor saves",
          `Submitted and stayed at ${client.landedOn} with no client row and no explanation on screen.`,
          [`landed on ${client.landedOn}`, "no matching clients row", "no dialog shown"],
          "/ar/clients/new");
      } else if (saved && note(`client saved but stayed on the form (${client.landedOn})`)) {
        found("P2", "A saved client leaves the freelancer on the empty form",
          "The row is in the database but the form re-rendered blank — a duplicate-client trap.",
          [`landed on ${client.landedOn}`, "clients row exists"], "/ar/clients/new");
      }
    }

    const incomeTitle = `مشروع ${stamp}`;
    const income = await logIncome(tools, { amount: 4500, title: incomeTitle });
    if (income.landedOn.includes("/income/new")) {
      const refused = await quotaRefusal(page);
      const saved = await rowExists(tools, "gigs", "title", incomeTitle);
      if (saved && note("income saved but the form re-rendered blank")) {
        found("P2", "Logging income leaves the freelancer on a blank form",
          "The row saves but the form re-renders empty — a duplicate-income trap.",
          [`landed on ${income.landedOn}`, "gigs row exists"], "/ar/income/new");
      } else if (!refused && !saved && note("logging income did nothing")) {
        found("P2", "Logging income neither saves nor explains why",
          "Submitted with no gig row and no dialog — the freelancer is given no reason.",
          [`landed on ${income.landedOn}`, "no matching gigs row", "no dialog shown"],
          "/ar/income/new");
      }
    }

    const { client: sb, userId } = await db();
    const { data: gigs } = await sb.from("gigs").select("amount_sar").eq("user_id", userId);
    const stored = (gigs ?? []).reduce((sum, g) => sum + Number(g.amount_sar), 0);

    await go("/ar/income");
    const shown = parseFigure((await text()).match(/هذا العام\n([^\n]+)/)?.[1]);
    if (stored > 0 && shown != null && Math.abs(shown - stored) > 1) {
      if (note(`ledger ${shown} vs database ${stored}`)) {
        found("P1", "Income ledger disagrees with the database",
          "Year-to-date on the ledger does not match the sum of gigs, verified as the same signed-in user.",
          [`ledger ${shown}`, `database ${stored}`], "/ar/income");
      }
    }

    for (const route of ["/ar/dashboard", "/ar/income"]) {
      await go(route, 3000);
      for (const f of await uxReview(page, { mobile, route })) {
        if (note(f)) found("P3", f.slice(0, 90), f, [], route);
      }
    }

    checkpoint(sessionId, "driven", { planRow: row.n });

    for (const f of await standardSweeps(tools)) {
      if (note(f)) found("P2", f.slice(0, 90), f);
    }
    checkpoint(sessionId, "checked", { planRow: row.n, findings: findings.length });

    const filed = [];
    for (const f of findings) {
      const entry = fileFinding({ ...f, run: row.run, session: sessionId });
      filed.push(`${entry.ref}${entry.duplicate ? " (again)" : ""} ${f.severity}`);
    }
    writeIndex();
    checkpoint(sessionId, "filed", { planRow: row.n, findings: findings.length });

    recordRun({
      run: row.run,
      findings: findings.map((f) => ({ text: f.title, severity: f.severity })),
      closed: [],
      notes: `session ${sessionId}, plan row ${row.n}`,
    });

    tickPlanRow(row.n);
    checkpoint(sessionId, "row-ticked", { planRow: row.n });

    console.log(`   ${findings.length} finding(s)${filed.length ? ": " + filed.join(", ") : ""}`);
  }, sessionOptions(persona, row.run));

  return findings;
}
