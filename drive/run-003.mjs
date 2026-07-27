/**
 * Plan row 3 — veteran / invoice-and-vat / differential / print-pdf / degraded-profile /
 * pro-active / direct-url.
 *
 * The question is differential: two renderings of one invoice must agree. There are four of
 * them here — the builder's running total, the saved detail screen, the same screen under
 * `@media print` (the "PDF" a Saudi freelancer actually sends), and the anonymous share page
 * the client opens. A VAT invoice is a legal document, so a figure that changes between those
 * four, or a VAT number that only survives on one of them, is not cosmetic.
 *
 * The profile stays degraded on purpose: nothing but the VAT registration is filled, so the
 * client-facing copy has no brand name and no contact email to fall back on — which is exactly
 * where feature 011's auth-email leak lived.
 *
 * Pro was granted out of band (`role='pro'`, `pro_until` +30d). There is no product path to
 * Pro — Tap is founder-gated and unbuilt, and `users.role` is revoked from the authenticated
 * role — so `tier=pro-active` cannot be reached by using the product. Stated, not hidden.
 */
import { open, BASE } from "./session.mjs";
import { standardSweeps } from "./sweeps.mjs";
import { uxReview } from "./ux.mjs";
import { addClient, createInvoice, parseFigure } from "./work.mjs";
import { nextPlanRow, tickPlanRow, planProgress } from "./plan.mjs";
import { recordRun } from "./telemetry.mjs";
import { fileFinding, writeIndex } from "./basket.mjs";
import { startOrResume, checkpoint, complete, abort } from "./invocation.mjs";
import { personaByName, sessionOptions } from "./personas.mjs";
import { flowByName } from "./flows.mjs";
import { strategyByName } from "./strategies.mjs";
import { runKey, } from "./axes.mjs";
import { normalizeDigits } from "./strategies.mjs";

const session = startOrResume();
console.log(
  session.resumed
    ? `resuming ${session.id} (last step: ${session.from}, plan row ${session.planRow ?? "?"})`
    : `session ${session.id}`,
);

const row = nextPlanRow();
if (!row) {
  complete(session.id, { note: "plan complete" });
  process.exit(0);
}

const persona = personaByName(row.run.persona);
const flow = flowByName(row.run.flow);
const strategy = strategyByName(row.run.strategy);
const progress = planProgress();

console.log(`plan row ${row.n} of ${progress.total} (${progress.done} ticked)`);
console.log(`  ${runKey(row.run)}\n`);
console.log(`  ${persona.label}`);
console.log(`  asks  ${strategy.question}\n`);

checkpoint(session.id, "row-claimed", { planRow: row.n });

const findings = [];
const found = (severity, title, description, evidence = [], route = null) =>
  findings.push({ severity, title, description, evidence, route });

/** Money as the invoice stores it: two decimals, no locale noise. */
const money = (n) => Number(Number(n).toFixed(2));
const num = (s) => parseFigure(s);

/** Every money-looking figure on a rendering, normalised, so two surfaces can be compared. */
const figures = (text) =>
  (normalizeDigits(text).match(/\d[\d,]*(?:\.\d+)?/g) ?? [])
    .map((f) => Number(f.replace(/,/g, "")))
    .filter((n) => Number.isFinite(n));

const VAT_NUMBER = "310123456700003";
const UNIT = 1234.56;
const QTY = 7;

await open(async (tools) => {
  const { page, go, text, note, db } = tools;
  const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, "");

  // ── 1. degraded profile: VAT must be refused, and say why ──────────────────
  await go("/ar/invoices/new", 4500);
  const vatSwitch = page.locator("[role=switch]").first();
  const blockedBefore = (await vatSwitch.count()) ? await vatSwitch.isDisabled() : null;
  const blockedReason = (await text()).includes("غير مسجّل في الضريبة");
  console.log(`VAT switch disabled before registration: ${blockedBefore} (reason shown: ${blockedReason})`);
  if (blockedBefore === false) {
    if (note("VAT can be switched on with vat_registered=false")) {
      found(
        "P1",
        "VAT switchable on an unregistered profile",
        "The invoice builder let VAT be applied while the profile is not VAT-registered and holds no VAT number. Charging 15% VAT without a registration is a ZATCA breach.",
        [`switch disabled = ${blockedBefore}`],
        "/ar/invoices/new",
      );
    }
  }

  // ── 2. register for VAT through the product, not the database ──────────────
  await go("/ar/settings/profile", 5000);
  const vatBox = page.locator('input[type=checkbox]').first();
  if (!(await vatBox.isChecked())) await vatBox.check();
  await page.waitForTimeout(800);
  await page.locator("#vat-number").fill(VAT_NUMBER);
  await page.waitForTimeout(1000);
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(4000);

  const { client: sb, userId } = await db();
  const { data: profile } = await sb
    .from("users")
    .select("vat_registered, vat_number, role, pro_until, brand_name, contact_email")
    .eq("id", userId)
    .maybeSingle();
  console.log("profile after saving:", profile);
  if (!profile?.vat_registered || profile?.vat_number !== VAT_NUMBER) {
    if (note("saving the VAT registration in Settings → Profile did not store it")) {
      found(
        "P2",
        "VAT registration entered in Settings does not reach the profile row",
        `The identity section was ticked and a valid 15-digit VAT number typed; the row afterwards held vat_registered=${profile?.vat_registered} vat_number=${profile?.vat_number}.`,
        [`typed ${VAT_NUMBER}`, `row held ${profile?.vat_number}`],
        "/ar/settings/profile",
      );
    }
  }

  // ── 3. build the invoice: awkward-but-legal money, quantity 7 ──────────────
  const client = await addClient(tools, `عميل الفوترة ${stamp}`);
  const invoice = await createInvoice(tools, {
    clientName: `عميل الفوترة ${stamp}`,
    itemName: `تصميم واجهة ${stamp}`,
    unitPrice: UNIT,
    quantity: QTY,
    vat: true,
  });
  console.log("builder showed:", invoice.shown, "vat applied:", invoice.vatApplied, "→", invoice.landedOn);

  if (!invoice.id) {
    abort(session.id, `invoice was not created (landed on ${invoice.landedOn})`);
    if (note(`creating an invoice did not land on the invoice (${invoice.landedOn})`)) {
      found(
        "P1",
        "Creating an invoice does not produce an invoice",
        `The builder was filled with a client, a catalog item, quantity ${QTY} and VAT on, and submitting landed on ${invoice.landedOn} with no invoice id.`,
        [`landed on ${invoice.landedOn}`],
        "/ar/invoices/new",
      );
    }
    throw new Error("cannot run the differential without an invoice");
  }

  // ── 4. what the database holds ─────────────────────────────────────────────
  const { data: stored } = await sb
    .from("invoices")
    .select("invoice_number, items, subtotal_sar, vat_pct, vat_sar, total_sar, artifact_json, status, share_token, public_share")
    .eq("id", invoice.id)
    .maybeSingle();
  const line = (stored?.items ?? [])[0] ?? {};
  console.log("stored:", {
    subtotal: stored?.subtotal_sar,
    vat_pct: stored?.vat_pct,
    vat: stored?.vat_sar,
    total: stored?.total_sar,
    line,
  });

  // arithmetic the client will do on the printed document
  const expectedSubtotal = money(UNIT * QTY);
  const expectedVat = money(expectedSubtotal * 0.15);
  const expectedTotal = money(expectedSubtotal + expectedVat);

  if (stored && Math.abs(Number(stored.subtotal_sar) - expectedSubtotal) > 0.005) {
    if (note(`subtotal ${stored.subtotal_sar} is not ${UNIT} × ${QTY} = ${expectedSubtotal}`)) {
      found(
        "P1",
        "Invoice subtotal is not unit price × quantity",
        `A catalog item priced ${UNIT} at quantity ${QTY} stored subtotal ${stored.subtotal_sar}; the arithmetic the client can do on the printed unit price gives ${expectedSubtotal}.`,
        [`stored ${stored.subtotal_sar}`, `unit × qty = ${expectedSubtotal}`],
        `/ar/invoices/${invoice.id}`,
      );
    }
  }
  if (stored && Number(stored.vat_pct) > 0 && Math.abs(Number(stored.vat_sar) - money(Number(stored.subtotal_sar) * 0.15)) > 0.005) {
    if (note(`VAT ${stored.vat_sar} is not 15% of the stored subtotal ${stored.subtotal_sar}`)) {
      found(
        "P1",
        "Stored VAT is not 15% of the stored subtotal",
        `The invoice carries vat_pct=${stored.vat_pct} but vat_sar=${stored.vat_sar} against subtotal_sar=${stored.subtotal_sar}; 15% of that subtotal is ${money(Number(stored.subtotal_sar) * 0.15)}.`,
        [`vat_sar ${stored.vat_sar}`, `expected ${money(Number(stored.subtotal_sar) * 0.15)}`],
        `/ar/invoices/${invoice.id}`,
      );
    }
  }
  if (stored && Math.abs(Number(stored.total_sar) - money(Number(stored.subtotal_sar) + Number(stored.vat_sar))) > 0.005) {
    if (note(`total ${stored.total_sar} is not subtotal + VAT`)) {
      found(
        "P1",
        "Invoice total is not its own subtotal plus its own VAT",
        `subtotal_sar=${stored.subtotal_sar} + vat_sar=${stored.vat_sar} does not equal total_sar=${stored.total_sar}.`,
        [`total ${stored.total_sar}`, `subtotal + vat = ${money(Number(stored.subtotal_sar) + Number(stored.vat_sar))}`],
        `/ar/invoices/${invoice.id}`,
      );
    }
  }

  // builder's running total vs what was saved
  const builderTotal = num(invoice.shown?.total);
  if (builderTotal != null && stored && Math.abs(builderTotal - Number(stored.total_sar)) > 0.5) {
    if (note(`the builder showed a total of ${builderTotal}, the saved invoice holds ${stored.total_sar}`)) {
      found(
        "P1",
        "The invoice builder's total differs from the invoice it creates",
        `The running total on /ar/invoices/new read ${builderTotal}; the invoice saved from that same form holds ${stored.total_sar}. The freelancer agreed to one number and sent another.`,
        [`builder showed ${invoice.shown?.total}`, `stored total_sar ${stored.total_sar}`],
        "/ar/invoices/new",
      );
    }
  }

  // ── 5. four renderings of one invoice ──────────────────────────────────────
  const route = `/ar/invoices/${invoice.id}`;
  await go(route, 5000);
  const screenText = await text();
  const screenFigures = figures(screenText);

  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(1500);
  const printText = await text();
  const printFigures = figures(printText);
  await page.emulateMedia({ media: "screen" });

  const shownTotal = Math.max(...screenFigures.filter((f) => f > 100), 0);
  console.log("screen figures:", [...new Set(screenFigures)].slice(0, 20));
  console.log("print figures :", [...new Set(printFigures)].slice(0, 20));

  const hasFigure = (list, want) => list.some((f) => Math.abs(f - want) < 0.02);

  for (const [label, want] of [
    ["subtotal", Number(stored.subtotal_sar)],
    ["VAT", Number(stored.vat_sar)],
    ["total", Number(stored.total_sar)],
  ]) {
    if (!hasFigure(screenFigures, want) && note(`the invoice screen does not show its own ${label} (${want})`)) {
      found(
        "P2",
        `Invoice screen does not show its stored ${label}`,
        `The saved invoice holds ${label} ${want}, and no figure matching it appears on /ar/invoices/{id}.`,
        [`stored ${want}`, `screen figures ${[...new Set(screenFigures)].slice(0, 12).join(", ")}`],
        route,
      );
    }
    if (!hasFigure(printFigures, want) && note(`the printed invoice drops its ${label} (${want})`)) {
      found(
        "P1",
        `Printed invoice drops its ${label}`,
        `Under @media print the invoice no longer carries ${label} ${want}. The PDF a client receives is the legal document; a missing money line on it is not a styling issue.`,
        [`stored ${want}`, `print figures ${[...new Set(printFigures)].slice(0, 12).join(", ")}`],
        route,
      );
    }
  }

  // the VAT number is the thing that makes a VAT invoice legal
  const vatOnScreen = normalizeDigits(screenText).includes(VAT_NUMBER);
  const vatOnPrint = normalizeDigits(printText).includes(VAT_NUMBER);
  console.log(`VAT number — screen: ${vatOnScreen}, print: ${vatOnPrint}`);
  if (Number(stored.vat_sar) > 0 && !vatOnPrint) {
    if (note("a VAT-carrying invoice prints without the VAT registration number")) {
      found(
        "P1",
        "VAT invoice prints without the VAT registration number",
        `The invoice charges ${stored.vat_sar} SAR of VAT, and the printed document does not carry the registration number ${VAT_NUMBER}. A Saudi tax invoice must show it.`,
        [`vat_sar ${stored.vat_sar}`, `screen shows number: ${vatOnScreen}`, `print shows number: ${vatOnPrint}`],
        route,
      );
    }
  }

  // print must not be a quietly truncated screen: every money figure the screen carried
  const lostInPrint = [...new Set(screenFigures)].filter(
    (f) => f > 100 && !hasFigure(printFigures, f),
  );
  if (lostInPrint.length && note(`printing drops ${lostInPrint.length} figure(s) the screen showed: ${lostInPrint.slice(0, 6).join(", ")}`)) {
    found(
      "P2",
      "Printing the invoice drops figures the screen showed",
      `Under @media print these figures present on screen disappear: ${lostInPrint.slice(0, 8).join(", ")}. Either the screen shows something the document should not, or the document loses something it should carry.`,
      [`screen ${[...new Set(screenFigures)].slice(0, 12).join(", ")}`, `print ${[...new Set(printFigures)].slice(0, 12).join(", ")}`],
      route,
    );
  }

  // ── 6. the client's copy ───────────────────────────────────────────────────
  await page.getByRole("button", { name: /مشاركة|شارك/ }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  const enable = page.getByRole("button", { name: /تفعيل المشاركة/ }).first();
  if (await enable.count()) {
    await enable.click();
    await page.waitForTimeout(6000);
  }
  const { data: shared } = await sb
    .from("invoices")
    .select("share_token, public_share, status")
    .eq("id", invoice.id)
    .maybeSingle();
  console.log("share:", shared);

  if (shared?.share_token && shared?.public_share) {
    const shareUrl = `${BASE}/ar/i/${shared.share_token}`;
    const html = await (await fetch(shareUrl)).text();
    const clientCopy = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ");
    const clientFigures = figures(clientCopy);
    console.log("client copy figures:", [...new Set(clientFigures)].filter((f) => f > 100).slice(0, 20));

    if (!normalizeDigits(clientCopy).includes(VAT_NUMBER) && Number(stored.vat_sar) > 0) {
      if (note("the client's copy of a VAT invoice omits the VAT registration number")) {
        found(
          "P1",
          "Client's copy of a VAT invoice omits the VAT registration number",
          `The shared invoice at /ar/i/{token} charges ${stored.vat_sar} SAR of VAT and does not print the registration number. This is the copy the client keeps for their own books.`,
          [`share token ${shared.share_token.slice(0, 8)}…`, `vat_sar ${stored.vat_sar}`],
          "/ar/i/[token]",
        );
      }
    }
    for (const [label, want] of [
      ["subtotal", Number(stored.subtotal_sar)],
      ["VAT", Number(stored.vat_sar)],
      ["total", Number(stored.total_sar)],
    ]) {
      if (!hasFigure(clientFigures, want) && note(`the client's copy does not show the invoice ${label} (${want})`)) {
        found(
          "P1",
          `Client's copy of the invoice does not show its ${label}`,
          `The shared page omits ${label} ${want}, which the owner's copy shows. The client is asked to pay against a document that does not state it.`,
          [`stored ${want}`, `client figures ${[...new Set(clientFigures)].filter((f) => f > 100).slice(0, 10).join(", ")}`],
          "/ar/i/[token]",
        );
      }
    }
    // nothing private may travel with it — the profile is degraded, so any address here is a fallback
    const authEmail = tools.user.email;
    if (clientCopy.includes(authEmail) && note("the client's copy of the invoice carries the freelancer's login email")) {
      found(
        "P1",
        "Client's copy leaks the freelancer's login email",
        `The profile has no contact email, and the shared invoice fell back to the account's auth address (${authEmail}). Feature 011 fixed exactly this on proposals.`,
        [`auth email ${authEmail}`, "profile contact_email is null"],
        "/ar/i/[token]",
      );
    }
    if (/رِزق[^<]{0,40}(منظومة|سعّر بثقة)/.test(clientCopy) === false) {
      // absence is fine; presence of the freelancer's own tagline slot is what matters
    }
  } else if (note("enabling sharing on an invoice produced no share token")) {
    found(
      "P2",
      "Enabling invoice sharing produces no share link",
      `The share dialog's "تفعيل المشاركة" was clicked and the row still holds public_share=${shared?.public_share} share_token=${shared?.share_token}.`,
      [`public_share ${shared?.public_share}`],
      route,
    );
  }

  // ── 7. pro-active: does the product agree with itself about the tier? ──────
  await go("/ar/upgrade", 4500);
  const upgradeText = await text();
  const claimsFree = /مجاني|ترقية الآن|اشترك/.test(upgradeText) && !/نشِط|أنت مشترك|Pro/i.test(upgradeText);
  console.log("upgrade page says free while pro_until is in the future:", claimsFree);
  if (claimsFree && note("the upgrade page treats an active Pro grant as a free account")) {
    found(
      "P2",
      "Upgrade page does not recognise an active Pro grant",
      `The account holds role=pro with pro_until=${profile?.pro_until} (in the future), and /ar/upgrade still presents the free-tier pitch with no sign the grant is active.`,
      [`pro_until ${profile?.pro_until}`],
      "/ar/upgrade",
    );
  }

  // ── 8. how it looks ────────────────────────────────────────────────────────
  for (const r of [route, "/ar/invoices"]) {
    await go(r, 3500);
    for (const finding of await uxReview(page, { mobile: false, route: r })) {
      if (note(finding)) found("P3", finding.slice(0, 90), finding, [], r);
    }
  }

  checkpoint(session.id, "driven", { planRow: row.n });

  for (const finding of await standardSweeps(tools)) {
    if (note(finding)) found("P2", finding.slice(0, 90), finding);
  }

  checkpoint(session.id, "checked", { planRow: row.n, findings: findings.length });

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
  for (const l of filed) console.log(`  ${l}`);
}, sessionOptions(persona));
