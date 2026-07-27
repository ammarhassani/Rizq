/**
 * How to look, not just who is looking.
 *
 * Personas vary WHO drives and flows vary WHAT they drive. Neither changes the KIND of
 * question being asked, and one kind of question only ever finds one kind of defect.
 *
 * The most expensive defect this product has shipped — every proposal priced at the band
 * ceiling regardless of the brief — was invisible to all of it. Nothing contradicted anything:
 * the screens agreed, the database agreed, the tests passed. It was caught by a human writing
 * two very different briefs and noticing the same number came back twice. That is a
 * *metamorphic* question, and no persona would have asked it.
 *
 * Each strategy below is a different question to ask of the same product.
 */

export const STRATEGIES = [
  {
    name: "metamorphic",
    question: "when the input changes THIS way, how must the output change?",
    why: `Rizq has no ground truth for a price — nobody can say 8,100 SAR is "correct". But the
      RELATIONS are knowable, and a violated relation is a defect even when no single screen
      looks wrong. This is the strategy that would have caught the band-ceiling P0.`,
    relations: [
      "a brief with strictly more scope must not price lower than a smaller one",
      "the same brief twice must produce the same band (the engine is deterministic)",
      "raising a client's stated budget must never lower the quote",
      "adding a paid gig must raise the month's income by exactly that amount, everywhere it appears",
      "marking an invoice paid must move its amount from pending to paid, with the total unchanged",
      "applying 15% VAT must make the total exactly subtotal × 1.15",
      "deleting a gig must reduce every total by exactly its amount",
      "a wider fallback (city → region → national) must never report a SMALLER sample size",
    ],
  },
  {
    name: "differential",
    question: "two views of the same fact — do they agree?",
    why: `The client-facing leaks were exactly this: the owner's proposal and the client's copy
      of the same proposal differed in what they disclosed, and only one of them was allowed to.
      Cheap to run, and it needs no oracle at all — just two renderings of one truth.`,
    relations: [
      "the client's copy of a proposal must be a strict subset of the owner's — never a superset",
      "Arabic and English must show the same numeric values, only in different scripts",
      "mobile and desktop must present the same information, not a quietly truncated version",
      "a figure on the dashboard must equal the same figure on the module that owns it",
      "the PDF/DOCX export must carry what the screen carried, no more",
    ],
  },
  {
    name: "time-travel",
    question: "what happens at the boundary the clock crosses?",
    why: `Almost every rule in this product is time-bound — quotas reset at the Riyadh month
      boundary, Pro lapses at pro_until, invoices turn overdue on a due date, HADAF counts
      consecutive months. None of that is exercised by driving on a Tuesday afternoon, and all
      of it is money. Playwright's clock API moves the browser's idea of now.`,
    relations: [
      "crossing the Riyadh month boundary must reset the pricing quota, not the calendar-UTC one",
      "a Pro grant lapsing mid-month must not retroactively exhaust the free allowance",
      "an invoice must become overdue the day after its due date, and say so consistently",
      "a HADAF streak must break when a month is missed and resume counting from the next",
      "a share link must expire when it says it expires, and say why",
    ],
  },
  {
    name: "adversarial",
    question: "what happens when the world misbehaves?",
    why: `Feature 010 existed because a failed read rendered as "you have nothing yet". The
      difference between an error state and an empty state is only visible when something
      actually fails, and nothing fails on a good day.`,
    relations: [
      "a failed read must render an error with a retry, never an empty state",
      "an offline save must not report success",
      "a slow network must not leave a skeleton that never resolves",
      "a double submit must not create two rows",
      "two tabs editing the same record must not silently overwrite each other",
    ],
  },
  {
    name: "fuzz",
    question: "what does it do with input nobody expected?",
    why: `Arabic makes this sharper than usual: bidirectional override characters, mixed scripts,
      and Arabic-Indic digits all flow through the same fields as ordinary text, and any of them
      can end up in a document sent to a client.`,
    relations: [
      "a name with an RTL override character must not reorder the rest of the page",
      "a 10,000-character brief must be handled or refused, never truncated silently",
      "emoji, zero-width joiners and combining marks must survive a round trip",
      "Arabic-Indic digits typed into a money field must be understood or rejected clearly",
      "script payloads must render as text everywhere, including exports",
    ],
  },
  {
    name: "state-machine",
    question: "which states exist, and which transitions are reachable?",
    why: `A status enum is a promise about which transitions are legal. Nothing checks that the
      UI offers only the legal ones, or that every state is reachable and escapable — a record
      stuck in a state with no way out is a defect no single screen reveals.`,
    relations: [
      "every proposal status must be reachable, and none may be a dead end",
      "an invoice must not go backwards from paid without an explicit, deliberate action",
      "a project's derived lifecycle stage must match the artefacts that actually exist",
      "cancelling must be possible from any state where it is offered, and honest about effects",
    ],
  },
  {
    name: "scale",
    question: "does it still work with a real amount of data?",
    why: `Everything here has been driven with a handful of rows. A freelancer three years in has
      hundreds of gigs and dozens of clients, and lists, filters, totals and exports all behave
      differently at that size.`,
    relations: [
      "totals must stay correct when the list is paginated or virtualised",
      "a filter must agree with the summary figures above it",
      "an export must contain every row, not the first page",
      "no screen may take longer than a few seconds with a realistic history",
    ],
  },
];

export const STRATEGY_NAMES = STRATEGIES.map((s) => s.name);

export function strategyByName(name) {
  return STRATEGIES.find((s) => s.name === name);
}

/**
 * Compare two renderings of the same numbers across scripts.
 *
 * Arabic-Indic and Latin digits are the same values in different clothes, so a differential
 * check has to normalise before it compares — otherwise every comparison "fails" and the
 * strategy is useless.
 */
export function normalizeDigits(text) {
  return text
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[٬,]/g, "")
    .replace(/٫/g, ".");
}

/** Every number on a screen, normalised — the raw material for a differential comparison. */
export function figuresIn(text) {
  return (normalizeDigits(text).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}
