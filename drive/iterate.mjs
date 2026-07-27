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
import { personaByName, sessionOptions } from "./personas.mjs";
import { runKey } from "./axes.mjs";

export async function driveRow(row, sessionId) {
  const persona = personaByName(row.run.persona);
  const findings = [];
  const found = (severity, title, description, evidence = [], route = null) =>
    findings.push({ severity, title, description, evidence, route });

  checkpoint(sessionId, "row-claimed", { planRow: row.n });
  console.log(`\n── row ${row.n}: ${runKey(row.run)}`);

  await open(async (tools) => {
    const { page, go, text, note, db } = tools;
    const mobile = persona.device.mobile;
    const stamp = new Date().toISOString().slice(11, 19);

    const client = await addClient(tools, `عميل ${persona.name} ${stamp}`);
    if (!client.id && note(`client save did not navigate (${client.landedOn})`)) {
      found("P2", "Saving a client does not navigate to the created client",
        `Submitted and stayed at ${client.landedOn}; a save that appears to do nothing invites a second submit.`,
        [`landed on ${client.landedOn}`], "/ar/clients/new");
    }

    const income = await logIncome(tools, { amount: 4500, title: `مشروع ${stamp}` });
    if (income.landedOn.includes("/income/new") && note("logging income left a blank form")) {
      found("P2", "Logging income leaves the freelancer on a blank form",
        "The row saves but the form re-renders empty — a duplicate-income trap.",
        [`landed on ${income.landedOn}`], "/ar/income/new");
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
  }, sessionOptions(persona));

  return findings;
}
