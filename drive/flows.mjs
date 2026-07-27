/**
 * What a freelancer actually does, as a rotation.
 *
 * A Ralph loop fires an identical prompt every time, so variety has to come from here rather
 * than from the prompt. Each iteration asks the ledger which of these was driven longest ago
 * and drives that one — which is also how parts of the product nobody has opened get opened,
 * since "never" sorts before every date.
 *
 * `hint` is written for the agent running the iteration, not for a machine: it says what a
 * person would be trying to achieve, and what a lie would look like on that screen. Encoding
 * the assertions here would recreate `e2e/` — the point is that the driver looks.
 */
export const FLOWS = [
  {
    name: "onboarding",
    hint: `Sign up FRESH (open({...}, { fresh: true })) and complete all eleven steps through the
      UI — never the database. Three of pass 2's P0s lived here and none was visible from the
      row: check what each step SAVED, that resume lands on the next unfinished step, that the
      live price preview names the figure it judged, and that nothing is shown as chosen unless
      it was chosen.`,
  },
  {
    name: "proposal-to-client",
    hint: `Write a brief a real client would send (Arabic, a stated budget, a stated duration),
      generate the proposal, then open the share link in a context with NO session — that is the
      document the client sees. It must not disclose the price band, the sample size, the
      methodology link, the freelancer's login email, or Rizq's own tagline. Check the quoted
      price against the brief: a lowball budget must not drag it down.`,
  },
  {
    name: "invoice-and-vat",
    hint: `Build an invoice from the catalog. VAT may only be switchable when the profile is
      VAT-registered AND has a number, and any VAT-carrying invoice must print that number.
      Check the client's own arithmetic: unit price × quantity must equal the printed line
      total. Then look at the invoice as the client does, via its share link.`,
  },
  {
    name: "income-and-hadaf",
    hint: `Log income the way a person types it (including messy amounts), then check every
      screen that claims to know about it — ledger, dashboard, HADAF, calendar — against the row
      and against each other. HADAF is the one that decides subsidy eligibility; a stale or
      disagreeing figure there is never cosmetic.`,
  },
  {
    name: "pricing-tool",
    hint: `Run lookups across specialties and cities, including thin ones. Every number needs a
      provenance line that matches it, the sentence must describe the records it actually has,
      and a trend may only claim a market it measured. Watch the quota badge track what is
      enforced, and the sixth lookup refuse honestly.`,
  },
  {
    name: "clients-and-projects",
    hint: `Add a client, drive the project chooser all three ways, open a project workspace.
      Check the guided context survives navigation, the lifecycle stage matches what exists, and
      the paywall limits match what is actually enforced.`,
  },
  {
    name: "documents-and-catalog",
    hint: `Upload a document with an expiry, add catalog items, import/export CSV. Check quota
      messages name the real limit, expiry reminders land on the calendar, and money in the
      catalog is halala-precise.`,
  },
  {
    name: "mobile",
    hint: `Drive a normal working session at 390px — 70% of Saudi traffic is mobile (Principle
      III). Nothing may scroll horizontally, tap targets must be reachable, and the money
      screens must stay readable. Use open(fn, { viewport: { width: 390, height: 844 } }).`,
  },
  {
    name: "english-locale",
    hint: `Do a full working session in /en. The Arabic-only defects are well covered now; this
      looks for the mirror — English copy that was never written, a raw enum, a date or currency
      formatted for the wrong locale, an RTL-only layout assumption.`,
  },
  {
    name: "recovery",
    hint: `Be a person having a bad day: submit forms with one bad field, double-click save,
      navigate away mid-save, open a stale link, run out of quota. Errors must name the field
      and the reason, never offer "try again" for something that can never succeed, and never
      report a save for a value that was discarded.`,
  },
];

export const FLOW_NAMES = FLOWS.map((f) => f.name);

export function flowByName(name) {
  return FLOWS.find((f) => f.name === name);
}
