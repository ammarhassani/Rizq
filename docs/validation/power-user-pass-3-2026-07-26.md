# Power-User Pass 3 — remediation record (2026-07-26)

Feature [`specs/011-power-user-pass-3/`](../../specs/011-power-user-pass-3/). Eighteen defects
found by driving the product in Arabic as a freelancer, fixed across eight independent slices.
No migration, no new dependency.

**Merge gate at completion**: `pnpm typecheck` clean · `pnpm test` 72 files / 858 tests green
(baseline before the pass: 64 files / 768 tests) · `pnpm lint` unchanged at 38 errors /
40 warnings, all pre-existing · `pnpm build` succeeds.

---

## What was verified in the running product

Driven in Arabic against real Supabase, dev server on `localhost:3000`, logged in as a
disposable account. Evidence below is what the browser actually rendered, not what the code
says it should.

| Check | Result |
|---|---|
| `/ar/tool` count sentence | `بناءً على ٥ سجلات من السوق السعودي` — no `ليس رقمًا`, Arabic-Indic digits |
| …agrees with the citation beneath it | `تقدير رِزق بناءً على ٥ سجلات (مراجع منشورة) حتى عام ٢٠٢٦.` — same number, same numerals |
| Pricing tool prefill | specialty/city/experience pre-selected from the profile (`web-dev`, `jeddah`, `mid`), still editable |
| Quota badge after a lookup | `متبقي ٥ من ٥` → `متبقي ٤ من ٥` with no reload; an identical repeat left it at ٤ |
| Invoice, `vat_registered=true`, `vat_number=null` | VAT switch `disabled`, reason names the missing number, links to `/ar/settings/profile` |
| Invoice, `vat_registered=false` | VAT switch `disabled`, reason names the missing registration |
| Anonymous share page (stored artifact from before the change) | no band min/max, no methodology link, no Rizq tagline, no auth email, no `mailto:` — citation still present |
| Owner's view of the same proposal | band, sample size and methodology link all still visible |
| Onboarding/Settings rate verdict | `أقل سعر مشروع تقبله (٤٬٠٠٠ ريال) أقل من نطاق مشاريع السوق — قد يكون هناك مجال لرفعه.` |
| Income-goal wheel with `income_goal_monthly_sar = null` | no option carries `aria-selected="true"` |
| `/ar/proposals/<unknown-uuid>` while signed in | 404 inside the app shell (sidebar present, no public login/signup nav) |
| 390px: share page and pricing result | no horizontal scroll (`scrollWidth` 380 at a 390 viewport) |

The two VAT states were produced by temporarily editing the disposable account's
`vat_registered` / `vat_number` and restoring both afterwards.

---

## A defect the plan did not predict, found by driving it

The pass-3 plan assumed passing a raw number to an ICU plural was the whole fix. It was not.

**CLDR resolves plain `ar` to Latin digits.** `Intl.NumberFormat("ar")` returns `5`;
`Intl.NumberFormat("ar-SA")` returns `٥`. next-intl formats messages with the routing locale
`ar`, while every other number in this app is formatted `ar-SA`. So ICU's own `#` rendered
`بناءً على 5 سجلات` directly above `بناءً على ٥ سجلات` in the citation — two numeral systems in
one sentence pair (FR-021), which no unit test caught and which the fixed NaN had been masking.

**Rule now enforced**: an ICU plural argument stays a raw number so the category is chosen
correctly, and the digits come from a separate `{count}` the call site formatted with the
app's `ar-SA` formatter. `#` never appears in a plural message.

`src/lib/format/count.test.ts` guards all three failure modes statically, across both
catalogues and every call site in `src/`:

1. no call site passes a formatted value as a plural argument,
2. no plural message contains `#`,
3. every plural message is exercised by at least one call site.

`src/app/__tests__/error-states.test.ts` also needed a raised per-test timeout: it dynamically
imports whole Next server pages, and under the now-larger suite that transform exceeded the 5s
default. A loading cost, not a behaviour change.

---

## Claims this pass falsified

- **`forClientAudience()` "redacts the client copy"** — it cleared AI badges and nothing else.
  The price band, sample size and methodology link reached every client. Now an allow-list per
  redacted section: a field added to `pricing` or `verification` is withheld until someone
  decides it may be shown.
- **"`contact.email` is the freelancer's contact address"** — it fell back to `users.email` and
  then to the auth email, so the sign-in address was printed on every client document. It is
  now `contact_email` only. Artifacts stored before this carry a marker-less contact block and
  have their email withheld from clients at render.
- **"VAT is a fixed 15% toggle"** — it was available to anyone, and `createInvoiceFromGig`
  defaulted VAT on from `vat_registered` alone. Both paths now route through
  `resolveVatEligibility` (registered **and** a recorded number).
- **"`rate_confidence` is captured at onboarding"** — it was written as `approximate` whether or
  not the freelancer picked anything. It is now sent only when chosen.

---

## Deliberately not done

- **`consumed` flag on the pricing action result** (tasks T047). The returned `remaining`
  already distinguishes a lookup that consumed a slot from a deduped repeat, and the badge
  renders from it. A second field carrying the same fact was not added.
- **Retroactive rewrite of stored artifacts.** Redaction happens at render, so old proposals
  stop leaking without a migration — but a freelancer who had set a real `contact_email` before
  this change will see it withheld from the client copy until the proposal is regenerated. The
  conservative direction is deliberate (contract rule 2: withheld until allow-listed).
- **Live re-verification of the onboarding resume rule and the hourly-only rate prompt.** Both
  need a fresh, mid-onboarding account; the disposable account used here has completed
  onboarding and Settings → Profile autosaves on edit. Covered by
  `src/lib/onboarding/resume.test.ts` and by reading the branch, not by a browser run.
- **A root `app/not-found.tsx`.** An unmatched URL like `/ar/does-not-exist` never reaches
  `[locale]/not-found.tsx` — Next serves its own built-in 404. That is pre-existing and out of
  this feature's scope; the segment not-found (what `notFound()` renders) now uses the app
  shell for signed-in users.

---

## Pass 4 — the harder re-drive (same day, fresh account)

Everything above was re-checked on a **brand-new account** driven end to end, plus the paths
the first pass could not reach. That found **six more defects, five of them introduced by this
feature.** All are fixed and re-verified below.

### P4-1 — The welcome step was skipped for every new account *(regression, mine)*

`onboarding/page.tsx` normalised a stored `onboarding_step` of 0 up to 1 before handing it to
the wizard, which then resolved it as "step 1 already saved" and opened on identity. The old
`initialStep - 1` arithmetic had cancelled that out; `resumeStepIndex` does not.

Fixed by passing the stored value untouched. `resume.test.ts` now pins a fresh account to
`welcome` and `onboarding_step = 2` to `location`, using the real `STEP_KEYS` order.

### P4-2 — A valid link was silently discarded with an invalid one *(regression, mine)*

Typing one malformed URL alongside good ones flagged the bad field correctly **and threw away
the valid links**, saving nothing and leaving `onboarding_step` unchanged, with nothing on
screen saying so.

Root cause: the form and the action disagreed about what a URL is. `new URL()` in a **browser**
percent-encodes whitespace into the hostname, so `https://not a url at all` becomes
`https://not%20a%20url%20at%20all/` and passes Zod's `.url()`; the same input is rejected under
Node. The form vouched for the value, submitted it, and the action rejected the entire step.

Fixed by deleting both ad-hoc checks and defining one rule over the *parsed* URL parts
(`urlShape` → `PROFILE_URL` → `urlProblem`), used by the Zod schema and the form alike.
`fieldErrors.test.ts` asserts the two can never disagree, over the accepted and rejected sets.

Re-verified: `linkedin.com/in/sara` and `https://mostaql.com/u/sara` saved, the malformed and
`javascript:` fields flagged with their own reasons, other typed values intact, step advanced.

### P4-3 — VAT percentage printed Latin digits on an Arabic tax invoice *(mine)*

`{vatPct}%` was interpolated raw, so an otherwise fully Arabic-Indic invoice read
`ضريبة القيمة المضافة (15%)`. Same class in the proposal milestone split (`{pct}%`) and the
invoice fee rows (`{f.rate}%`). All three now go through the locale formatter. The issued
invoice now reads `(١٥%)` and carries **zero** Latin digits outside identifiers.

### P4-4 — A catalog price with three decimals reached the money field *(mine)*

Entry was constrained, but a price already stored with three decimals seeded the input as
`10450.555` while the totals used `10450.56`. Seeds from the catalog and from a gig prefill are
now clamped too. Verified: field `10450.55`, line total `٣١٬٣٥١٫٦٥` — the client can reproduce
it from what is printed.

### P4-5 — The dashboard's client count printed a Latin digit

`{clients.length}` rendered `1` beside Arabic-Indic figures. Extracted `fmtCount` to
`lib/format/number.ts` (replacing a local copy in `HadafStreakBar`) and applied it.

### P4-6 — `rate_confidence` was stamped by the database, not by the freelancer — CLOSED

`users.rate_confidence` was `NOT NULL DEFAULT 'approximate'`, so **every account carried that
value from creation**. The client had stopped sending it unless chosen, but the row still
recorded a confidence nobody picked, and FR-015's "the stored row MUST match" was not met.

Closed on 2026-07-27 with migration `20260727083200_rate_confidence_only_when_chosen`:

- `DROP DEFAULT` and `DROP NOT NULL`, so NULL can mean "not chosen";
- a one-time backfill nulling the **48 rows** holding `'approximate'`. None of them was
  evidence of a choice: the column default wrote it at signup, and the pre-fix rates step sent
  its own `'approximate'` fallback on every save regardless of what was clicked. The single row
  holding `'exact'` was preserved — that value could only have come from a deliberate click.
  **This step is not recoverable from the row**; it was applied deliberately rather than leave
  49 accounts asserting a choice that never happened.

Two further places were re-introducing the same claim above the database and are fixed:
`snapshot.ts` coerced a null back to `'approximate'` on read, and the step's own type could not
express null. The `StepRates` heuristic that ignored a stored `'approximate'` is gone — a stored
value is now proof of a click and shows back as the selection.

`rateConfidence.test.ts` guards every layer: the snapshot must not substitute a value, the step
must seed from the profile without a fallback and omit the field when unchosen, the type must
admit null, and the migration must exist.

Verified live, both directions: a fresh account shows no pill pressed with the row NULL; picking
`دقيقة` stores `exact` and shows back as pressed after a reload.

### Verified on the fresh account and the new artifacts

| Check | Result |
|---|---|
| Brand-new account opens onboarding | `مرحباً في رِزق` (welcome) |
| Rates step, untouched controls | no confidence pill pressed, no goal band selected |
| Hourly 1,000,000 with no minimum project | `أضف أقل سعر مشروع تقبله … سعرك بالساعة لم تتم مقارنته.` |
| Minimum project 6,000 entered | `أقل سعر مشروع تقبله (٦٬٠٠٠ ريال) يقع ضمن نطاق مشاريع السوق.` |
| Row after saving rates untouched | `income_goal_monthly_sar` null, `onboarding_step = 5` |
| Leave and return | lands on `الحضور على المنصات` (platforms), the next unfinished step |
| Issued VAT invoice | VAT no. `399999999900003` printed; `٣  ١٠٬٤٠٥٫٥٥  ٣١٬٣٥١٫٦٥`; `(١٥%)`; no Latin digits |
| Proposal from a brief stating `المدة المطلوبة ٣ أشهر` | scope extracted `stated_duration: "٣ أشهر"`, `budget_mentioned: 3000` |
| …cover letter | `نشكر مؤسسة الرمال على إتاحة الفرصة…` — no `عميل محترم` |
| …timeline | dates `يُتفق عليه`, plus `المدة كما ذكرها العميل: ٣ أشهر` |
| …quote vs the client's lowball 3,000 | quoted 5,400 — the budget lifts, never drags |
| Share dialog, no contact set | nudge shown, link still copyable (never blocks) |
| Anonymous share page | quote, client, duration, citation, Rizq attribution, `RZQ-` reference present; band, methodology link, tagline, auth email, mailto, AI badge **all absent** |
| DOCX export | same verdict, including no `النطاق السعري` line |
| Every page with a rewritten plural, `ar` + `en` | 200, no ICU failure, no literal `{count}` |
| 390px: dashboard, invoice, proposal, share, invoice form, onboarding | no horizontal scroll |
| Cross-user proposal URL | 404 inside the app shell, no other account's data |

### P4-7 — Arabic insight prose printed Latin digits — CLOSED

The dashboard insight card read `لا يوجد دخل مسجل خلال آخر 6 أشهر` beside Arabic-Indic figures.
Both producers were at fault: the model wrote prose with Latin digits, and the deterministic
non-AI fallback formats with an **en-US** formatter regardless of locale.

A prompt instruction was the first fix, which is a hope rather than a guarantee. Replaced with a
deterministic pass: `toArabicIndicDigits` rewrites digits (and the separators between them) in
Arabic strings, skipping any token carrying Latin letters or URL/identifier punctuation, so
brands, emails, links and reference codes survive. It is folded into the one seam every insight
already passes through — renamed `stripEmDashes` → `normalizeInsightText`, since it now does
more than dashes — which the action, the streaming draft route and the widget all call.

Because the widget normalises at render, insights **already cached** with Latin digits are fixed
without regenerating. Verified live: the previously-cached card now reads `٥٤٠٠ ريال` and
`٦ أشهر`, and the Arabic dashboard carries **zero** Latin digits.

### Still not fixed

Nothing from this pass. The one remaining known limitation is inherited, not introduced: a
freelancer who set `contact_email` before the client-facing redaction shipped will have it
withheld from client copies until the proposal is regenerated (see "Deliberately not done").

## Pass-2 regressions re-checked

- Onboarding writes `primary_specialty_id` / `city_id` / `experience_tier_id` — confirmed in
  the row and visible as the tool's prefill.
- Cross-user proposal URLs 404 under RLS — confirmed in the browser.
- A draft share link opens anonymously — the share page still serves `200` without a session.
- The free pricing allowance reads and enforces 5 — badge showed `٥ من ٥`.
