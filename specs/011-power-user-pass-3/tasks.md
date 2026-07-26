---
description: "Task list for Power-User Pass 3 Remediation"
---

# Tasks: Power-User Pass 3 Remediation

**Input**: Design documents from `specs/011-power-user-pass-3/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included where the constitution requires them — Principle IV (money, quotas,
eligibility, pricing) and SC-009. Not every slice gets a test; cosmetic tasks do not.

**Organization**: one phase per user story. Every phase is independently shippable; slices
1–4 are the MVP.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelisable (different files, no dependency on an incomplete task)
- **[Story]**: US1–US8, mapping to the user stories in spec.md
- Every task names the exact file it touches

## Path Conventions

Single Next.js app: `src/app`, `src/components`, `src/lib`, catalogues in `messages/`.

---

## Phase 1: Setup

**Purpose**: confirm the baseline before changing anything, so a later red test is
attributable.

- [ ] T001 Record the pre-change baseline: run `pnpm typecheck` and `pnpm test`, note the counts (currently 64 files / 768 tests green) in the PR description or commit body.

---

## Phase 2: Foundational

**Purpose**: none. Every slice below stands alone; no shared prerequisite exists.

*(No foundational tasks — do not invent one. Slices 1–8 may start in any order.)*

---

## Phase 3: User Story 1 — Numbers the freelancer can trust in Arabic (Priority: P1) 🎯 MVP

**Goal**: no count sentence ever renders NaN in Arabic, and the sample-size sentence
describes what the records actually are.

**Independent Test**: run the same pricing lookup in `ar` and `en`; both state the same real
count with locale-correct digits and grammar; the words "ليس رقمًا" appear nowhere; the
sentence agrees with the provenance citation below it.

### Tests for User Story 1

- [ ] T002 [P] [US1] Unit `src/lib/format/count.test.ts` — for counts 0, 1, 2, 3, 5, 11 in `ar` and `en`, the rendered message contains the correctly formatted number and never a not-a-number rendering (`"ليس رقمًا"`, `"NaN"`). Drive it through the real `ar`/`en` catalogue entries so a message edit that breaks a plural branch fails here.
- [ ] T003 [P] [US1] Extend `src/lib/format/count.test.ts` (or a sibling) with a guard that scans `messages/ar.json` + `messages/en.json` for every ICU `plural` message and asserts each is exercised with a numeric argument by at least one call site — prevents the next pre-formatted-string regression.

### Implementation for User Story 1

- [ ] T004 [US1] `src/components/tool/ResultCard.tsx:196` — pass the raw `sample_size` number to `t("sampleSize", …)` instead of `numberFmt.format(sample_size)`; same at `:203` for `comparison` if that argument feeds a plural/number branch.
- [ ] T005 [P] [US1] `src/app/[locale]/r/[id]/page.tsx:193` — pass the raw `row.result_sample_size ?? 0` to `t("sampleSize", …)` instead of `fmt.format(...)`.
- [ ] T006 [P] [US1] `src/components/rate/RateCalculatorClient.tsx:403` — same fix for `t("sampleSizeNote", { n: … })`; verify whether `sampleSizeNote` is a plural message and, if it is not, convert it so Arabic grammar matches the count.
- [ ] T007 [US1] `messages/ar.json:720` + the matching `messages/en.json:720` — reword `Tool.result.sampleSize` so it describes records/published references rather than "N Saudi freelancers" (FR-002), keeping all Arabic plural branches (one/two/few/other) grammatical.
- [ ] T008 [P] [US1] Audit the remaining plural call sites for the same mistake and leave them alone if already correct — `Hadaf.monthsToQualify` and `Hadaf.daysCount` in `src/app/[locale]/hadaf/page.tsx`, `HadafStreakBar.streakLabel`, `Income.summaryLine` in `src/app/[locale]/income/page.tsx` (already correct; keep its explanatory comment).

**Checkpoint**: US1 shippable. Arabic pricing result and public result page state a real count.

---

## Phase 4: User Story 2 — An invoice that cannot break Saudi tax law (Priority: P1)

**Goal**: VAT may only be applied by a registered freelancer with a recorded VAT number, and
any VAT-carrying invoice shows that number.

**Independent Test**: with `vat_registered=false` the VAT control is unavailable and explains
why; with registration plus a number, VAT applies and the number appears on the document; an
invoice issued earlier renders unchanged.

### Tests for User Story 2

- [ ] T009 [P] [US2] Unit `src/lib/invoices/vatEligibility.test.ts` — eligibility is true only when `vat_registered` is true **and** `vat_number` is a non-empty string; false for each of the three failing combinations (per [contracts/vat-eligibility.md](./contracts/vat-eligibility.md)).
- [ ] T010 [P] [US2] Unit in `src/lib/invoices/artifact.test.ts` — an artifact built with `vatPct > 0` includes the VAT registration number in its rendered content; with `vatPct === 0` it does not require one.

### Implementation for User Story 2

- [ ] T011 [US2] `src/lib/invoices/vatEligibility.ts` (new) — one exported predicate taking the profile's `vat_registered` + `vat_number`, returning eligibility and a reason code (`not_registered` | `missing_number`) for the UI to translate.
- [ ] T012 [US2] `src/app/[locale]/invoices/new/page.tsx` — read `vat_registered` and `vat_number` from the profile and pass the eligibility result into `InvoiceForm`.
- [ ] T013 [US2] `src/components/invoices/InvoiceForm.tsx:116,361-385` — when not eligible, render the VAT row disabled with the reason and a link to Settings → Profile; force `vatOn` false and keep `vat_pct: 0` in the submitted payload (`:204`).
- [ ] T014 [US2] `src/lib/invoices/artifact.ts` — add the VAT registration number to the artifact input and the totals/tax section content so it can be rendered.
- [ ] T015 [US2] `src/app/actions/invoices/_artifact.ts` — supply the VAT number from the profile when building the artifact input.
- [ ] T016 [US2] `src/components/invoices/InvoiceArtifact.tsx:299,452` area — render the VAT registration number beside the VAT line whenever `vatPct > 0`, in both locales.
- [ ] T017 [P] [US2] `messages/ar.json` + `messages/en.json` — copy for the disabled-VAT explanation (both reason codes) and the VAT-number label on the document.

**Checkpoint**: US2 shippable. No route exists to a VAT invoice without registration.

---

## Phase 5: User Story 3 — Client documents reveal nothing private (Priority: P1)

**Goal**: the price floor, sample size, methodology link, login email and Rizq's tagline never
reach a client-facing surface; the owner keeps all of them.

**Independent Test**: open a share link with no session and assert the withheld elements are
absent from the served HTML, including for a proposal generated before this change.

### Tests for User Story 3

- [ ] T018 [P] [US3] Unit in `src/lib/proposals/artifact.test.ts` — `forClientAudience()` removes the pricing band minimum/maximum, sample size and methodology link while keeping the quoted price and its provenance citation (per [contracts/client-facing-artifact.md](./contracts/client-facing-artifact.md)).
- [ ] T019 [P] [US3] Unit `src/lib/proposals/brand.test.ts` (new) — `contact.email` is the profile's `contact_email` or null; it is never `users.email` and never the auth email.
- [ ] T020 [P] [US3] Update `src/lib/invoices/artifact.test.ts:122` — assert an absent tagline renders as absent instead of asserting the Rizq tagline default (the current test locks in the defect).

### Implementation for User Story 3

- [ ] T021 [US3] `src/lib/proposals/artifact.ts:345` — extend `forClientAudience()` to strip the band (`min`, `max`), sample size and methodology link from the pricing/verification sections, allow-list style so new fields default to withheld.
- [ ] T022 [US3] `src/components/proposals/ProposalArtifact.tsx:1272` — confirm every client-visible branch renders from the redacted `source`, including the price-range bar and the "كيف نحسب هذا السعر؟" link.
- [ ] T023 [P] [US3] `src/lib/proposals/docx.ts` — apply the same redaction when the export is produced for a client so the DOCX matches the share page.
- [ ] T024 [US3] `src/lib/proposals/brand.ts:182-186` — `contact.email` resolves to `contact_email` only; drop the `users.email` and `authEmail` fallbacks. Leave the `freelancerName` fallback chain alone.
- [ ] T025 [P] [US3] `src/lib/proposals/artifact.ts:101` and `src/lib/invoices/artifact.ts:60` — remove `taglineAr` from the Rizq defaults so an absent tagline renders nothing; keep the colour defaults.
- [ ] T026 [P] [US3] `src/components/proposals/ProposalArtifact.tsx` + `src/components/invoices/InvoiceArtifact.tsx` — render no tagline element at all when the value is absent (no empty line, no placeholder).
- [ ] T027 [US3] `src/app/[locale]/p/[token]/page.tsx:90-102` — `buildContactLinks` must not fall back to any address the freelancer did not set; when there is none, the "contact the freelancer" affordance is hidden rather than mailto-ing the login address.
- [ ] T028 [P] [US3] Settings → Profile and the share dialog — prompt the freelancer to add a contact email when none is set, without blocking sharing (FR-008); copy in `messages/ar.json` + `messages/en.json`.

**Checkpoint**: US3 shippable. A client sees the offer, not the freelancer's internals.

---

## Phase 6: User Story 4 — Errors that say what is actually wrong (Priority: P1)

**Goal**: validation failures name the field and reason; retry wording is reserved for
retryable failures; nothing discarded is reported as saved.

**Independent Test**: submit each form with one invalid field and confirm the message points
at that field, other input survives, and no "try again" appears.

### Tests for User Story 4

- [ ] T029 [P] [US4] Unit `src/app/actions/onboarding/saveOnboardingStep.test.ts` — a malformed platform URL returns a validation failure carrying the field path and a reason code, not the generic `error` code; a session failure and a database failure still return their own codes.
- [ ] T030 [P] [US4] Unit for `createClient` in `src/app/actions/clients/clients.test.ts` — an invalid email returns the failing field; a valid payload succeeds.

### Implementation for User Story 4

- [ ] T031 [US4] `src/app/actions/onboarding/saveOnboardingStep.ts:214,228` — widen the failure union to carry `field` and `reason` derived from the Zod issue list (per [contracts/validation-errors.md](./contracts/validation-errors.md)); keep `no_session`/`unknown_step`/`error` as-is.
- [ ] T032 [US4] `src/app/actions/clients/clients.ts:70` (`createClient`) and `:120` (`updateClient`) — same failure shape.
- [ ] T033 [US4] `src/components/onboarding/StepPlatforms.tsx` — render the returned field error under the offending input; keep the other typed values; stop showing retry copy for validation failures.
- [ ] T034 [US4] `src/components/clients/ClientForm.tsx` — same field-level rendering for email/phone and any other validated field.
- [ ] T035 [US4] Platform URL handling — reject unsupported schemes explicitly with a field error instead of accepting the input and storing null (FR-011); keep the scheme allow-list server-side.
- [ ] T036 [P] [US4] `messages/ar.json` + `messages/en.json` — one string per reason code (invalid URL, invalid email, invalid phone, unsupported scheme, required), plus keep the existing transient retry copy for `error` only.

**Checkpoint**: US4 shippable. MVP (US1–US4) complete.

---

## Phase 7: User Story 5 — Onboarding tells the truth (Priority: P2)

**Goal**: the rate verdict names what it judged and prompts when it cannot judge; resume lands
on the next unfinished step; nothing is shown or stored as chosen unless it was.

**Independent Test**: enter each rate field alone and combined; leave and return mid-flow;
complete the rates step without touching the wheel or the confidence control and inspect the
stored row.

### Tests for User Story 5

- [ ] T037 [P] [US5] Unit for the resume rule (extract it from the wizard into `src/lib/onboarding/resume.ts` if it needs a home) — `onboarding_step = n` resolves to the next unfinished step, clamped to the review step at the end and to the start at 0.

### Implementation for User Story 5

- [ ] T038 [US5] `src/components/onboarding/OnboardingPricePreview.tsx:64-88` — label the verdict with the figure it judged (the minimum project price against the market **project** range) in `ar` and `en`; do not derive a project figure from the hourly rate.
- [ ] T039 [US5] `src/components/onboarding/StepRates.tsx:80-83` — when no minimum project is entered but an hourly rate is, render a prompt to add the minimum project instead of rendering no verdict; never imply the hourly rate was checked.
- [ ] T040 [US5] `src/components/onboarding/OnboardingWizard.tsx:78` — resume on the first unfinished step derived from `initialStep`, clamped at both ends.
- [ ] T041 [P] [US5] `src/components/onboarding/MonthlyGoalWheel.tsx` — no band appears selected until the freelancer picks one; the visual default must match the stored null.
- [ ] T042 [P] [US5] `src/components/onboarding/StepRates.tsx` — send `rate_confidence` only when the freelancer picked it; stop defaulting it to `approximate` on save.
- [ ] T043 [P] [US5] `messages/ar.json` + `messages/en.json` — copy for the labelled verdict and the "add your minimum project price" prompt.

**Checkpoint**: US5 shippable.

---

## Phase 8: User Story 6 — The profile is used, and the quota is current (Priority: P2)

**Goal**: the pricing tool opens pre-filled from the profile; the remaining-queries badge
matches what is enforced immediately after a lookup.

**Independent Test**: open the tool with a complete profile and reach a result without
re-entering anything; watch the badge change after a lookup with no reload.

### Tests for User Story 6

- [ ] T044 [P] [US6] Unit for the prefill resolution — a complete profile yields all three slugs; a partial profile yields only what it knows; a URL parameter wins over the profile value.

### Implementation for User Story 6

- [ ] T045 [US6] `src/app/[locale]/tool/page.tsx:38-63` — load the freelancer's specialty, city and experience-tier slugs alongside the reference data and pass them to `ToolFlow`.
- [ ] T046 [US6] `src/components/tool/ToolFlow.tsx:64+` — seed the three selectors from those slugs when no URL parameter is present, keeping the existing validation against the known option lists and leaving every field editable.
- [ ] T047 [US6] `src/app/actions/tool/calculate.ts:23,49` — return the remaining allowance (and whether this lookup consumed one) in the success result.
- [ ] T048 [US6] `src/components/tool/QuotaBadge.tsx` — accept a client-updatable value so `ToolFlow` can render the post-lookup count without a reload; fix the stale `limit = 3` default to match the enforced free tier.
- [ ] T049 [US6] `src/components/tool/ToolFlow.tsx` — render the badge from the action's returned allowance after each lookup, leaving it unchanged when a repeated lookup consumed nothing.

**Checkpoint**: US6 shippable.

---

## Phase 9: User Story 7 — The proposal reflects its brief (Priority: P3)

**Goal**: the cover letter addresses the named client; a duration stated in the brief reaches
the timeline.

**Independent Test**: generate a proposal for a named client from a brief stating a duration
and read the cover letter and timeline.

### Tests for User Story 7

- [ ] T050 [P] [US7] Unit in `src/lib/proposals/artifact.test.ts` — the `cover_letter` section carries `clientName`; the default salutation is used only when no name exists.
- [ ] T051 [P] [US7] Unit in `src/lib/ai/scope.test.ts` — the extraction schema accepts a stated duration and tolerates its absence (null) without failing validation.

### Implementation for User Story 7

- [ ] T052 [US7] `src/lib/proposals/artifact.ts:214` — include `clientName: input.clientName` in `buildCoverLetter`, so `ProposalArtifact.tsx:160` stops falling back to `noClient`.
- [ ] T053 [US7] `src/lib/ai/scope.ts:26` — add a nullable duration field to `ScopeSchema` (as stated by the client, not a computed date) and update the few-shot examples in the same file.
- [ ] T054 [US7] `src/lib/proposals/artifact.ts:256` (`buildTimeline`) + `src/app/actions/proposals/generateProposal.ts:398` — pass the extracted duration through and render it in the timeline; keep "to be agreed" when it is null.
- [ ] T055 [P] [US7] `src/components/proposals/ProposalArtifact.tsx` timeline section + `messages/ar.json`/`messages/en.json` — copy for a stated duration in both locales.

**Checkpoint**: US7 shippable.

---

## Phase 10: User Story 8 — Money and numerals read consistently (Priority: P3)

**Goal**: money inputs are halala-precise, numerals are consistent within a view, and the
not-found page uses the app shell.

**Independent Test**: type a three-decimal unit price; view an Arabic invoice; open an unknown
URL while signed in.

### Tests for User Story 8

- [ ] T056 [P] [US8] Unit for the money-input constraint — a value with three or more decimals is reduced to two before it reaches the totals, so `unit price × quantity` equals the displayed line total.

### Implementation for User Story 8

- [ ] T057 [US8] `src/components/items/ItemForm.tsx:150-153` — replace `step="any"` with a two-decimal constraint and round on change/blur.
- [ ] T058 [US8] `src/components/invoices/InvoiceForm.tsx:298-320` — same two-decimal constraint on the inline unit-price and quantity inputs.
- [ ] T059 [P] [US8] `src/components/invoices/InvoiceArtifact.tsx:452` area — render the quantity through the same locale formatter as the money columns so one numeral system is used per view.
- [ ] T060 [P] [US8] `messages/ar.json:911` (`ratingStars`) — make both numbers locale-formatted so the accessible name reads consistently; check the two call sites (`src/app/[locale]/clients/[id]/page.tsx:186`, `src/components/clients/ClientForm.tsx:281`).
- [ ] T061 [US8] `src/app/[locale]/not-found.tsx` — render inside the app shell for signed-in users, keeping `SiteNav` for anonymous visitors; the Arabic default stays (Next cannot read `params` here).

**Checkpoint**: US8 shippable.

---

## Phase 11: Polish & Cross-Cutting

- [ ] T062 Run [quickstart.md](./quickstart.md) end to end in **Arabic first**, then English, for every shipped slice.
- [ ] T063 Re-verify at 390px: pricing result, shared proposal, invoice (Principle III).
- [ ] T064 Re-verify the pass-2 regressions still hold: onboarding writes the three foreign keys; a lowball client budget does not drag the quote down; a draft share link opens anonymously; cross-user URLs 404.
- [ ] T065 Merge gate — `pnpm typecheck` clean and `pnpm test` green, including every new test above.
- [ ] T066 Update `docs/validation/` with a pass-3 record and correct any claim this feature falsified; update the feature-011 entry in `.claude/CLAUDE.md` to SHIPPED with what actually landed.

---

## Dependencies & Execution Order

- **Phase 1** first (baseline), **Phase 11** last.
- **Phases 3–10 are independent** and may ship in any order or in parallel. Recommended order
  is priority order: US1 → US2 → US3 → US4 (MVP) → US5 → US6 → US7 → US8.
- Only intra-story ordering is real:
  - US1: T002–T003 before T004–T007 (tests first for a formatting rule).
  - US2: T011 before T012–T013; T014–T015 before T016.
  - US3: T021 before T022–T023; T024 before T027.
  - US4: T031–T032 before T033–T035.
  - US6: T047 before T048–T049.
  - US7: T053 before T054.
- US5's T033-style error rendering benefits from US4's failure shape but does not require it —
  T038–T042 touch different concerns.

### Parallel opportunities

- All `[P]` tasks within a phase touch different files.
- Across phases: T005/T006 (US1), T009/T010 (US2), T018–T020 (US3), T029/T030 (US4) are four
  independent test tasks that can be written concurrently.
- The catalogue edits (T007, T017, T036, T043, T055, T060) all touch `messages/*.json` — batch
  them per phase to avoid conflicting edits to the same file.

## Implementation Strategy

**MVP** = US1 + US2 + US3 + US4. That closes the Arabic NaN, the VAT legality gap, the three
client-facing leaks and the retry-loop errors — every P1 in the spec.

**Incremental**: ship each phase as its own small commit with its tests, keeping the merge gate
green at every step. No phase depends on a later one, so any slice can be dropped or deferred
without stranding work.

**Out of scope** (do not drift): the pricing engine's arithmetic, the quote itself, the free-tier
allowance values, and the proposal-quota model. This feature changes what the product *says* and
*discloses*, not what it charges or computes.
