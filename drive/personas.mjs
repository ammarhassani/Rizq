/**
 * Six people, not one tester.
 *
 * One driver finds one kind of defect, because a defect is only visible to someone whose
 * expectations it violates. The rusher finds the double-submit; the meticulous one finds the
 * halala that does not add up; the sceptic finds the number with no provenance; the newcomer
 * finds the screen that assumes you already know what HADAF is. Running the same flow as
 * different people is how one product surface yields several classes of finding.
 *
 * Each persona sets three things: the device and locale they arrive with, how they behave
 * (pace, care, patience), and what they are watching for. `hint` is written for the agent
 * driving the iteration — it describes a mindset, not a checklist, because a checklist would
 * only ever find what someone already thought of.
 */

export const PERSONAS = [
  {
    name: "rusher",
    label: "المستعجل — on a phone, between meetings",
    device: { viewport: { width: 390, height: 844 }, mobile: true },
    locale: "ar-SA",
    behaviour: `Move fast and impatiently. Tap the primary button twice when nothing happens
      within a second. Start filling a form, navigate away, come back. Hit back mid-save. Skip
      every optional field and every explanation.`,
    watches: `Double-submits creating two rows. Work lost on navigation. A save that looks like
      nothing happened. Anything that needs more than a thumb on a 390px screen.`,
  },
  {
    name: "meticulous",
    label: "الدقيق — an accountant's eye",
    device: { viewport: { width: 1440, height: 900 }, mobile: false },
    locale: "ar-SA",
    behaviour: `Fill every field, including the optional ones. Type awkward but legal values:
      three decimals, very large amounts, a quantity of 7. Re-open what you saved and compare it
      against what you typed. Do the arithmetic yourself.`,
    watches: `Totals that disagree with their own line items. A stored value different from the
      typed one. Rounding that changes money. A figure on one screen contradicting the same
      figure on another.`,
  },
  {
    name: "newcomer",
    label: "المبتدئ — first week freelancing, empty account",
    device: { viewport: { width: 1280, height: 900 }, mobile: false },
    locale: "ar-SA",
    behaviour: `Arrive knowing nothing. Do not fill the profile. Open modules before creating
      anything in them. Follow whatever the empty state suggests and see where it leads.`,
    watches: `Empty states that explain nothing or offer no next step. Jargon with no gloss —
      HADAF, FL number, provenance. Screens that assume data that does not exist. A dead end
      with no way forward.`,
  },
  {
    name: "veteran",
    label: "الخبير — years of history, uses it daily",
    device: { viewport: { width: 1680, height: 1050 }, mobile: false },
    locale: "ar-SA",
    behaviour: `Work at volume. Create several clients and several income entries in a session.
      Use the command palette and the keyboard rather than the mouse. Sort, filter, export.
      Expect the app to keep up.`,
    watches: `Lists that stop being usable past a handful of rows. Filters that disagree with
      totals. Slow screens. Keyboard paths that dead-end or trap focus. Pagination that silently
      truncates.`,
  },
  {
    name: "sceptic",
    label: "المتشكك — does not trust software with money",
    device: { viewport: { width: 1280, height: 900 }, mobile: false },
    locale: "ar-SA",
    behaviour: `Interrogate every number. Click every "how do we calculate this". Follow every
      provenance citation. Compare what the AI says against the data it was given. Read the
      client-facing document as the client, not as its author.`,
    watches: `A figure with no source, or a source that does not support it. An AI sentence
      asserting more than the numbers do. A claim that survives after the data behind it is
      gone. Anything on a client's copy the freelancer would not want disclosed.`,
  },
  {
    name: "english-first",
    label: "English-first — a Saudi freelancer who works in English",
    device: { viewport: { width: 1280, height: 900 }, mobile: false },
    locale: "en-US",
    behaviour: `Do a full working session in /en. Switch locale mid-flow and back. Generate a
      document in English and read it end to end.`,
    watches: `Copy that was never translated, or a raw enum. Dates, currency and plurals
      formatted for the wrong locale. Layout that only works in RTL. A locale switch that loses
      state or lands on the wrong page.`,
  },
];

export const PERSONA_NAMES = PERSONAS.map((p) => p.name);

export function personaByName(name) {
  return PERSONAS.find((p) => p.name === name);
}

/**
 * The session options a persona arrives with — pass straight into `open()`.
 *
 * `theme` comes from the plan row rather than the persona: it is a property of the run being
 * driven, not of who is driving it.
 */
export function sessionOptions(persona, run = {}) {
  return {
    viewport: persona.device.viewport,
    locale: persona.locale,
    theme: run.theme ?? "light",
  };
}
