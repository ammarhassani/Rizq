# Phase 0 Research — Power-User Pass 3

Every finding below was reproduced in the running app (Arabic, fresh account, real Supabase +
DeepSeek) and its root cause then confirmed by reading the code path. Nothing here is
inferred from the spec docs.

---

## R1 — Arabic count sentences render NaN

**Observed**: pricing result in `ar` reads "بناءً على ليس رقمًا مستقلًا سعوديًا"; the same
query in `en` reads "Based on 5 Saudi freelancers".

**Root cause**: a number formatted for display is passed into an ICU plural argument.
[ResultCard.tsx:196](../../src/components/tool/ResultCard.tsx#L196) calls
`t("sampleSize", { n: numberFmt.format(sample_size) })`. In `en` the string `"5"` is coerced
back to a number by chance; in `ar` `"٥"` is not numeric, so ICU falls to the `other` branch
and renders `#` as `Intl.NumberFormat("ar").format(NaN)` = "ليس رقمًا".

**Decision**: pass raw numbers to plural arguments; let ICU format them. Where the surrounding
page needs matching digits for a *non*-plural argument, keep pre-formatting only that argument.

**Rationale**: the repo already solved this once and documented it inline at
[income/page.tsx:185](../../src/app/[locale]/income/page.tsx#L185) ("`n` stays a number so the
ICU plural can pick an Arabic category"). Consistency with an existing in-repo decision beats
inventing a new convention.

**Alternatives considered**: parsing the formatted string back to a number inside the message
layer (fragile, locale-specific); switching the Arabic messages to a single `other` branch
(loses grammatical correctness, which is the whole point of Arabic plural categories).

**Sites**: [ResultCard.tsx:196](../../src/components/tool/ResultCard.tsx#L196) and `:203`,
[r/[id]/page.tsx:193](../../src/app/[locale]/r/[id]/page.tsx#L193),
[RateCalculatorClient.tsx:403](../../src/components/rate/RateCalculatorClient.tsx#L403).
Audited and found *correct*: `Hadaf.monthsToQualify`, `Hadaf.daysCount`,
`HadafStreakBar.streakLabel`, `Income.summaryLine`.

---

## R2 — The sample-size sentence misstates provenance

**Observed**: "Based on 5 Saudi freelancers" sits directly above "Rizq estimate based on 5
records (published references)".

**Root cause**: the message text itself (`Tool.result.sampleSize` in both catalogues) names
freelancers, while the records in this result are published references.

**Decision**: reword to name records/references rather than surveyed people, so the sentence
agrees with the citation beneath it in both languages.

**Rationale**: Principle I forbids overstating what the data supports; "5 freelancers" implies
a survey the product explicitly does not run (no marketplace scraping, Principle VI).

**Alternatives considered**: keeping the wording and varying it by dominant provenance — more
strings, more ways to drift out of sync with the citation that is already rendered.

---

## R3 — VAT can be charged without registration

**Observed**: profile `vat_registered=false`, `vat_number=null`; the invoice form's VAT switch
is freely available; the issued invoice showed a 15% VAT line and no registration number.

**Root cause**: [InvoiceForm.tsx:116](../../src/components/invoices/InvoiceForm.tsx#L116)
holds `vatOn` as pure local state with no profile input, and the invoice artifact has no field
for a VAT registration number.

**Decision**: the form receives the freelancer's VAT status; the control is unavailable and
explained when the profile is not registered or has no number; the artifact renders the number
whenever `vatPct > 0`.

**Rationale**: KSA VAT law — collecting VAT unregistered is a violation, and a tax invoice
without the seller's registration number is invalid. Compliance is a gate (Principle VI).

**Alternatives considered**: a warning banner that still allows the toggle (leaves the illegal
invoice one click away); blocking at save time only (wastes the user's work and explains
nothing while they build).

**Existing invoices**: totals are stored on the row, so historical invoices keep rendering
what they were issued with. The gate applies to *new* VAT application only.

---

## R4 — Client-facing documents disclose the freelancer's internals

**Observed on a share link opened as an outside visitor**: the price floor and ceiling
("الأدنى ٥٬٢٥٠ … الأعلى ١٠٬٩٥٠"), the sample size, a link to the pricing methodology, the
freelancer's **signup email** (`…+rizqpu-…@gmail.com`), and Rizq's own tagline presented as
the freelancer's.

**Root causes**, three independent ones:

1. The redaction seam exists but only strips AI badges —
   [`forClientAudience()`](../../src/lib/proposals/artifact.ts#L345) maps `ai_generated` to
   false and nothing else, while `ProposalArtifact` already accepts `audience="client"`
   ([ProposalArtifact.tsx:1272](../../src/components/proposals/ProposalArtifact.tsx#L1272)).
2. [brand.ts:182](../../src/lib/proposals/brand.ts#L182) resolves
   `contact.email = contact_email ?? users.email ?? authEmail`, so the login address is used
   whenever the freelancer never set a contact email.
3. `RIZQ_DEFAULTS.taglineAr` / `RIZQ_INVOICE_DEFAULTS.taglineAr`
   ([proposals/artifact.ts:101](../../src/lib/proposals/artifact.ts#L101),
   [invoices/artifact.ts:60](../../src/lib/invoices/artifact.ts#L60)) substitute Rizq's
   marketing tagline for an absent freelancer tagline — and
   [artifact.test.ts:122](../../src/lib/invoices/artifact.test.ts#L122) asserts that behaviour,
   so the test must change with the code.

**Decision**: redact at render time through the existing `forClientAudience()` seam; make
`contact.email` strictly the deliberately-provided contact address; drop the tagline default
so an absent tagline renders nothing.

**Rationale**: redacting at render covers proposals already stored with a band in their
artifact JSON — a migration or rewrite would not. The owner keeps the band because it is the
decision support they are paying for.

**Alternatives considered**: stripping the band at generation time (loses it for the owner
too, and leaves old artifacts leaking); a per-proposal "show band to client" toggle (a
preference nobody asked for; can be added later if a freelancer wants it).

---

## R5 — Validation failures present as transient errors

**Observed**: one malformed URL in the onboarding platforms step → "تعذّر الحفظ. حاول
مجددًا."; an invalid email in the new-client form → "حدث خطأ. حاول مرة أخرى."; neither names a
field, and retrying can never succeed. Separately, a `javascript:` URL produced a *successful*
save with the value silently dropped.

**Root cause**: [saveOnboardingStep.ts:214](../../src/app/actions/onboarding/saveOnboardingStep.ts#L214)
returns `{ ok: false, code: "invalid" }` — the Zod issue list is discarded, so the client has
nothing to attach to a field, and "invalid" and "error" are rendered by the same retry copy.
The client action follows the same shape.

**Decision**: carry the first failing field path and a machine-readable reason in the failure
result; render it under that field; keep retry wording for `error`/network only. For values
the schema rejects but the UI accepted (unsupported URL scheme), report the rejection rather
than reporting success.

**Rationale**: the user cannot fix what the app will not name, and "try again" for a permanent
failure is false guidance — an honesty failure as much as a UX one.

**Alternatives considered**: surfacing raw Zod messages (English-only, developer-worded);
validating only client-side (the server is the trust boundary and must still answer usefully).

---

## R6 — The onboarding rate verdict ignores the hourly rate

**Observed**: hourly = 1,000,000 with minimum project 6,000 → "سعرك ضمن نطاق السوق"; hourly
alone → no verdict at all.

**Root cause**: [StepRates.tsx:81](../../src/components/onboarding/StepRates.tsx#L81) passes
`userRate={projectMin}` only, and `OnboardingPricePreview` compares that single figure to a
**project** band.

**Decision**: name what is being judged ("your minimum project price" vs the market project
range) and, when no minimum project is entered, prompt for it instead of rendering silence.
Do **not** convert an hourly rate into a project figure — there is no honest multiplier.

**Rationale**: Principle I — the product may not state a verdict about a number it did not
read, and may not invent an hours-per-project constant to manufacture one.

**Alternatives considered**: comparing hourly against a derived hourly band (the resolver
returns a project band; deriving one would be an invented number); comparing hourly × 8 × 20
(a fabricated project size).

---

## R7 — Onboarding resumes on the step already completed

**Observed**: after completing step 3 the database holds `onboarding_step = 3`, and returning
to onboarding lands on step 3 again.

**Root cause**: the action stores the step it just saved; the wizard resumes at
`initialStep - 1` ([OnboardingWizard.tsx:78](../../src/components/onboarding/OnboardingWizard.tsx#L78)),
so "last saved" is treated as "where to continue".

**Decision**: resume on the first unfinished step, clamped to the review step at the end.

**Alternatives considered**: writing `step + 1` on save (breaks the meaning of the stored
column for anything else reading it, and lands a skipped step on the wrong screen).

---

## R8 — Pricing tool ignores the profile; quota badge goes stale

**Observed**: with specialty, city and experience all stored, the tool opens with three empty
selectors. After a lookup the badge stayed at its page-load value.

**Root cause**: [ToolFlow.tsx:64](../../src/components/tool/ToolFlow.tsx#L64) seeds state from
URL parameters only, and `QuotaBadge` is a server component rendered once by the page while
lookups happen in a client action.

**Decision**: seed the three selectors from the profile snapshot when no URL parameter is
present, keeping them editable; return the post-lookup remaining allowance from the pricing
action and let the badge reflect it without a reload.

**Note found while reading**: `QuotaBadge`'s default parameter is `limit = 3`, a stale echo of
the old free tier. It is always passed explicitly today, but the default should match the
enforced 5.

---

## R9 — Cover letter does not name the client

**Observed**: "نشكر عميل محترم" on a proposal whose header names the client correctly.

**Root cause**: [buildCoverLetter()](../../src/lib/proposals/artifact.ts#L214) writes only
`body` and `ai_generated`, but the renderer reads `c["clientName"]`
([ProposalArtifact.tsx:160](../../src/components/proposals/ProposalArtifact.tsx#L160)) and
falls back to the `noClient` string. The cover *section* has the name; the cover *letter*
section never receives it.

**Decision**: include `clientName` in the cover-letter section content. The neutral fallback
stays for genuinely unnamed clients.

---

## R10 — A stated duration never reaches the timeline

**Observed**: a brief stating "المدة المطلوبة ٣ أشهر" produced a timeline with both dates
reading "يُتفق عليه", while `budget_mentioned: 3000` from the same brief *was* extracted.

**Root cause**: the extraction schema ([scope.ts:26](../../src/lib/ai/scope.ts#L26)) has
`urgency` as a three-way bucket and no duration field at all, and
[generateProposal.ts:398](../../src/app/actions/proposals/generateProposal.ts#L398) passes
`startDate: null, deliveryDate: null` unconditionally.

**Decision**: add one nullable duration field to the extraction schema and render it in the
timeline; when the model returns null, the timeline keeps "to be agreed".

**Rationale**: the client stated a duration in writing — echoing it back is the minimum a
proposal owes them. Inventing calendar dates from it is not; the field carries the duration as
stated, not a computed delivery date.

---

## R11 — Money precision and numerals

**Observed**: a unit price of 10450.555 renders as 10,450.56 on the invoice while the line
total is 31,351.67 — the client's own arithmetic on the printed unit price gives 31,351.68.
Quantities render in Latin digits inside Arabic-Indic tables; star ratings are announced as
"1 من ٥ نجوم".

**Root cause**: money inputs accept unbounded decimals; the totals are computed on the
unrounded value (correct) and displayed rounded (correct), so only the *input* precision is
wrong. The numeral mixing is per-call-site formatting.

**Decision**: constrain money inputs to two decimals (SAR has halalas) at entry; format every
numeral in a view through the locale formatter, including accessible names.

**Rationale**: rounding at entry keeps one true value everywhere, rather than introducing a
display-vs-storage divergence to paper over.

---

## R12 — Not-found renders the marketing nav

**Observed**: a signed-in freelancer opening an unknown URL gets the public `SiteNav`
([not-found.tsx:15](../../src/app/[locale]/not-found.tsx#L15)) instead of the app shell.

**Decision**: render inside the standard shell for signed-in users, keeping the public nav for
visitors. Next cannot read `params` in `not-found.tsx`, so the Arabic default stays.

---

## Findings confirmed *fixed* (regression guards to keep)

- Onboarding writes `primary_specialty_id`, `city_id`, `experience_tier_id` (verified:
  `web-dev`, `jeddah`, `mid` derived from 4 years).
- A client's lowball stated budget (3,000 against a 5,250–10,950 band) no longer drags the
  quote down; `budget_mentioned` is extracted and only lifts.
- A share link on a **draft** proposal opens for an anonymous visitor.
- Cross-user proposal, invoice and client URLs return 404 under RLS.
- The free pricing allowance reads and enforces 5.
- Script payloads in a client name and platform URLs never execute; React escaping holds.
- No horizontal scroll at 390px on dashboard, proposal and invoice.
