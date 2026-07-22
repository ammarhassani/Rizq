# Feature Specification: Production-Maturity Validation

**Feature Branch**: `008-production-validation`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Production-maturity validation of the Rizq FLRP app. Static business-logic audit of every module M0–M12 against spec-v2 + cross-cutting lenses; a Playwright power-user e2e harness exercising every feature, its dependencies, and internal integrations; a consolidated severity-ranked production-readiness verdict."

## Overview

Rizq has strong unit coverage on its money/logic core but **zero end-to-end coverage** and no
independent confirmation that the shipped app behaves the way `docs/spec-v2-flrp.md` promises.
This feature produces that confirmation in three forms: an automated power-user regression suite,
a static spec-vs-code conformance audit, and a single production-readiness report that a founder
can read to decide "can this ship?".

The goal is **evidence, not vibes**: every claim of "it works" is backed by a runnable test or a
cited code reference.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated power-user regression suite (Priority: P1)

A durable, committed test suite drives a real browser as a signed-in power user through **every**
module and the integrations between them, so any future change that breaks a user journey fails
loudly instead of silently.

**Why this priority**: This is the durable asset. It answers "is it working?" repeatably, not once.
Without it the audit is a snapshot that rots on the next commit.

**Independent Test**: Run the suite against a locally served build. It self-provisions a disposable
user, walks each module, and reports per-module pass/fail. Delivers value even if nothing else in
this feature exists.

**Acceptance Scenarios**:

1. **Given** a fresh checkout and populated environment, **When** the suite runs, **Then** it starts
   the app, signs up a disposable user, completes minimal onboarding, and reaches an authenticated
   dashboard without manual steps.
2. **Given** the authenticated session, **When** each module spec runs, **Then** the primary
   create/read flow of every module (M0–M12, Projects, Auth, Upgrade) executes and asserts on
   visible, persisted results.
3. **Given** the golden-path journey, **When** it runs, **Then** an artifact created upstream
   (proposal) is shown to flow into the downstream module (project → invoice → income → dashboard),
   proving cross-module integration, not just isolated screens.
4. **Given** any assertion fails, **When** the run finishes, **Then** the failure names the module,
   the expected-vs-actual, and captures a screenshot/trace for diagnosis.

---

### User Story 2 - Business-logic conformance audit (Priority: P1)

Every module's implementation is read against its `spec-v2` Part III section and the constitution,
producing a severity-ranked list of conformance gaps (missing requirement, wrong math, honesty
violation, security gap) with file:line evidence.

**Why this priority**: The e2e suite proves screens respond; it does not prove the *numbers and
rules* match what the business specified. VAT, HADAF thresholds, pricing percentiles, provenance
labeling, and RLS are correctness questions a click-test can miss.

**Independent Test**: Read the audit document. Each module has a verdict (conforms / partial / gap)
and every gap cites the spec clause it violates and the code location.

**Acceptance Scenarios**:

1. **Given** the audit scope, **When** it completes, **Then** every module M0–M12 plus the Projects
   stack has an explicit conformance verdict.
2. **Given** a money/eligibility rule (VAT 15%, HADAF thresholds, pricing percentile method),
   **When** audited, **Then** the implemented constant/formula is compared to the spec value and any
   mismatch is flagged as high severity.
3. **Given** the honesty principle (every number cites provenance; AI output labeled), **When**
   audited, **Then** any user-facing number or AI output lacking a citation/label is flagged.
4. **Given** each finding, **When** reported, **Then** it carries a severity, the spec clause, the
   code reference, and a concrete failure scenario — no vague "looks off".

---

### User Story 3 - Cross-cutting production guarantees (Priority: P2)

Dedicated suites verify the guarantees that live *across* modules: tenant isolation (RLS),
accessibility, Arabic-first/RTL and dual-locale rendering, mobile-viewport behavior, public
share-token safety, and real-time/optimistic UI feedback (loading, empty, error, toast states).

**Why this priority**: These are the constitution's non-negotiables (Principles I, II, III, V) and
the highest-blast-radius failure classes (a broken RLS policy leaks other users' data). They cut
across every module, so they are tested once as their own suites.

**Independent Test**: Run the cross-cutting suites. RLS is proven by a second user failing to read
the first user's rows. Accessibility is proven by an automated scan per page. RTL is proven by
asserting document direction and both-locale render.

**Acceptance Scenarios**:

1. **Given** two distinct users, **When** user B attempts to read/mutate user A's records (via UI and
   via direct data access), **Then** every attempt is denied.
2. **Given** each authenticated page, **When** an accessibility scan runs, **Then** critical/serious
   violations are reported per page.
3. **Given** the Arabic locale, **When** a page renders, **Then** the document direction is RTL and
   the English locale of the same page also renders without missing-key artifacts.
4. **Given** a mobile viewport, **When** primary pages render, **Then** there is no horizontal
   overflow and primary actions are reachable.
5. **Given** a public share link with a valid token, **When** opened unauthenticated, **Then** it
   renders the shared artifact; **When** the token is altered/guessed, **Then** it does not reveal
   another user's artifact.
6. **Given** a data-mutating action, **When** performed, **Then** the UI reflects the change without a
   manual reload and surfaces a loading state during and a toast/confirmation after.

---

### User Story 4 - Consolidated production-maturity report (Priority: P2)

A single report merges the audit gaps, the e2e pass/fail matrix, and live observations into a
severity-ranked, per-module readiness scorecard with an overall "ship / ship-with-caveats /
not-ready" verdict.

**Why this priority**: The founder asked "is it production-ready?" — this is the one artifact that
answers it. It depends on US1–US3 to have run, so it is prioritized after them.

**Independent Test**: Read the report. It states an overall verdict, a per-module status, the
blocking issues ranked by severity, and links each claim to its evidence (test name or audit finding).

**Acceptance Scenarios**:

1. **Given** the audit and suite results, **When** the report is generated, **Then** each module shows
   a status (green/yellow/red) with the evidence behind it.
2. **Given** all findings, **When** ranked, **Then** blockers (data leak, wrong money math, broken
   core journey) sort above cosmetic issues.
3. **Given** the report, **When** read by a non-engineer, **Then** the overall verdict and the top
   blocking issues are understandable without reading code.

---

### Edge Cases

- **Onboarding gate**: if a fresh user is forced through onboarding before the app is usable, the auth
  fixture must satisfy the minimum to reach each module — the suite documents that minimum.
- **AI latency/failure**: DeepSeek calls are slow or occasionally fail; module tests must wait on real
  async completion and must not hard-fail solely because the model was slow (distinguish "AI degraded
  gracefully" from "feature broken").
- **Empty-state first run**: a brand-new user has no data; each module must show a defined empty state,
  and the suite asserts it before creating data.
- **Disposable-data accumulation**: runs leave orphaned users/rows (accepted ceiling); the suite must
  not depend on a clean database and must not collide across runs (unique identifiers).
- **Locale routing**: every path is locale-prefixed (`/ar`, `/en`); tests must handle the redirect from
  bare paths and assert the correct locale.
- **Protected-route redirect**: hitting a gated route unauthenticated must redirect to login with a
  `returnTo`, and returning after login must land on the intended page.

## Requirements *(mandatory)*

### Functional Requirements

**Automated e2e suite (US1)**

- **FR-001**: The suite MUST auto-start the application locally and run without manual setup beyond a
  populated environment and email-confirmation being disabled.
- **FR-002**: The suite MUST self-provision a fresh, uniquely-identified disposable user each run and
  produce a reusable authenticated session, plus a second independent user for isolation tests.
- **FR-003**: The suite MUST include one coverage spec per module: M0 Dashboard, M1 Proposal Studio,
  M2 Client Book, M3 Income Ledger, M4 Pricing Lookup, M5 HADAF, M6 Invoicing (incl. VAT and DOCX
  export), M7 Methodology, M8 Onboarding, M9 Calendar, M10 Rate Calculator, M12 Document Vault, plus
  the Projects lifecycle (create-from-proposal, wizard, workspace, guided mode, GitHub integration),
  Auth flows, and Upgrade/paywall.
- **FR-004**: Each module spec MUST exercise the primary user flow (create/edit/read), assert on
  visible outcomes, and assert the result persisted (survives navigation/reload).
- **FR-005**: The suite MUST include a cross-module golden-path journey proving a proposal flows into
  a project, invoice, income entry, and the dashboard reflecting it.
- **FR-006**: The suite MUST run under desktop and mobile viewports and under both Arabic and English
  locales for the surfaces where locale/viewport behavior is a stated requirement.
- **FR-007**: On failure, the suite MUST capture diagnostics (screenshot + trace) and identify the
  module and expected-vs-actual.

**Business-logic audit (US2)**

- **FR-008**: The audit MUST assign every module M0–M12 and the Projects stack an explicit
  conformance verdict against its `spec-v2` Part III section.
- **FR-009**: The audit MUST verify money/eligibility constants and formulas (VAT rate, HADAF
  thresholds, invoice totals, pricing percentile method) against the spec's stated values and flag
  mismatches as high severity.
- **FR-010**: The audit MUST verify the honesty layer: every user-facing number declares provenance,
  every AI output is labeled, and uncertainty is declared — flagging violations.
- **FR-011**: Each audit finding MUST include severity, the violated spec/constitution clause, a
  `file:line` code reference, and a concrete failure scenario.

**Cross-cutting guarantees (US3)**

- **FR-012**: The suite MUST prove tenant isolation: a second user cannot read or mutate the first
  user's records through the UI or through direct data access, for every user-owned entity.
- **FR-013**: The suite MUST run an automated accessibility scan on each authenticated page and report
  critical/serious violations.
- **FR-014**: The suite MUST assert Arabic RTL document direction and dual-locale render without
  missing-translation artifacts.
- **FR-015**: The suite MUST assert mobile-viewport primary pages have no horizontal overflow and
  reachable primary actions.
- **FR-016**: The suite MUST verify public share tokens render the intended artifact for a valid token
  and do not leak another user's artifact for an altered/guessed token.
- **FR-017**: The suite MUST verify data/UI feedback is live: a mutation reflects in the UI without a
  manual reload, shows a loading state during, and a toast/confirmation after.

**Report (US4)**

- **FR-018**: The system MUST produce a single consolidated report merging audit gaps, e2e pass/fail,
  and live observations into a per-module readiness scorecard.
- **FR-019**: The report MUST rank findings by severity, sorting blockers (data leak, wrong money
  math, broken core journey) above cosmetic issues.
- **FR-020**: The report MUST state an overall verdict (ship / ship-with-caveats / not-ready) and
  link each module status to its supporting evidence.

### Key Entities *(include if feature involves data)*

- **Disposable Test User**: an ephemeral account created per run, uniquely identified to avoid
  collision; owns the data the power-user journeys create.
- **Isolation User**: a second disposable user used solely to attempt cross-tenant reads (must fail).
- **Finding**: an audit or test result carrying severity, evidence (spec clause + code ref or test
  name), a failure scenario, and a module association.
- **Module Coverage Record**: per-module rollup of automated status, audit verdict, and cross-cutting
  results feeding the final scorecard.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of modules (M0–M12 + Projects + Auth + Upgrade) have at least one automated
  coverage spec that exercises their primary flow.
- **SC-002**: The full suite runs end-to-end from a single command with zero manual steps after
  environment setup, and reports a per-module pass/fail matrix.
- **SC-003**: 100% of modules have an explicit spec-conformance verdict in the audit.
- **SC-004**: Every money/eligibility rule named in scope (VAT, HADAF thresholds, invoice totals,
  pricing percentile) is compared to its spec value with a pass/mismatch result.
- **SC-005**: Tenant isolation is demonstrated: a documented set of cross-user read/write attempts all
  fail, covering every user-owned entity.
- **SC-006**: The cross-module golden path passes, demonstrating a proposal reaching the dashboard via
  project → invoice → income.
- **SC-007**: A single production-maturity report exists with an overall verdict, a per-module
  scorecard, and severity-ranked blockers, each linked to evidence.
- **SC-008**: Every "it works" claim in the report is traceable to a named passing test or a cited
  code reference (no unsupported assertions).

## Assumptions

- **Environment**: tests run against a locally served build at `http://localhost:3000` using the
  existing populated `.env.local` (real Supabase + real DeepSeek). Founder has disabled email
  confirmation in Supabase Auth to allow headless self-signup.
- **Tooling**: the e2e harness uses Playwright (already a dev dependency) and `@axe-core/playwright`
  (already installed) for accessibility. Unit-level money/logic checks continue to live in the
  existing Vitest suite; this feature adds e2e and audit layers on top, not a replacement.
- **Data policy**: test runs create real rows and leave them orphaned (accepted ceiling — no cleanup
  infrastructure is built unless orphan data later causes a problem). Uniqueness prevents collisions.
- **Cost**: real DeepSeek calls during tests incur token cost; this is accepted per founder decision.
- **RLS verification**: tenant isolation is verified via two real users cross-reading through the app
  and through direct data queries; where Supabase admin introspection is available it corroborates.
- **Scope boundary**: this feature validates and reports; it does **not** fix the defects it finds.
  Remediation of discovered gaps is separate, follow-on work (though trivial, unambiguous fixes may be
  proposed alongside the report).
- **Deferred integrations**: Payments (Tap) and email (Resend) are not integrated per the constitution
  and are therefore out of test scope except to confirm they are absent/stubbed as expected.
