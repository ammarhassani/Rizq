# Feature Specification: Gap Remediation & Growth

**Feature Branch**: `010-gap-remediation`

**Created**: 2026-07-23

**Status**: Draft

**Input**: Post-009 gap research (`docs/validation/production-maturity-report.md` +
`docs/validation/business-logic-audit.md`) surfaced open correctness defects, i18n drift,
unenforced monetization rules, two deferred dependencies (Tap payments, Resend email), and
two spec'd-but-unbuilt features (M4 AI-trend, M8 FL verification). Founder direction:
"put all in one plan."

## Overview

This is a **remediation + growth** feature that closes the highest-ratio gaps found after
009 shipped. It is deliberately organized as independent, priority-ordered slices so that
shipping any single slice leaves the app strictly better and none blocks another.

**Scope boundary — payments:** the Tap integration (US4) is **founder-gated** per the
constitution ("no scope inflation without founder approval"; Tap/Resend are constitution-
declared *deferred* dependencies). It is specified here for completeness and planning, but
MUST NOT be implemented until the founder explicitly greenlights the monetization phase.
Every other slice is implementable now with no external-dependency or founder gate.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Honest error states, not false "you have nothing" (Priority: P1)

Five surfaces (M7 Methodology, M9 Calendar, M12 Document Vault, Projects list, and any
remaining dashboard widgets) currently swallow a failed DB read and render an empty state.
A user with real data sees "you have nothing" when a query transiently fails. This violates
Constitution Principle I (no false claims) and Principle V (error states are part of "done").

**Why this priority**: It is an honesty-principle violation (NON-NEGOTIABLE) on multiple
surfaces, the fix pattern already exists (`WidgetError` shipped for the dashboard in 008),
and it is a small, no-migration diff. Highest ratio.

**Independent Test**: Force each page's primary query to fail (revoke/kill the connection);
the surface MUST render an error+retry affordance, never an empty-state CTA. A user with
existing rows never sees a "create your first…" prompt on a transient failure.

**Acceptance Scenarios**:

1. **Given** a user with ≥1 project, **When** the projects query errors, **Then** the page
   shows "Couldn't load — retry", not "No projects yet".
2. **Given** any of M7/M9/M12, **When** its primary read errors, **Then** an error+retry
   state renders and the empty-state CTA does not.
3. **Given** the query later succeeds on retry, **When** the user taps retry, **Then** the
   real data renders.

---

### User Story 2 — Both languages read correctly (Priority: P1)

English users currently see raw DB enum values (`draft`, `sent`, `viewed`, `declined`,
`expired`) in the Recent Proposals widget, and 735 hardcoded `isAr ? : ` strings across
144 files bypass the `next-intl` catalog, so the two string systems drift. Proper English
labels already exist unused at `Proposals.list.status.*`.

**Why this priority**: Direct Principle II violation (both languages first-class) visible on
a primary dashboard surface; the enum-label fix is a few lines. Broad ternary migration is
larger and can land incrementally behind the same slice.

**Independent Test**: Switch locale to English on the dashboard; every proposal status
renders a localized label (never a raw enum). A key-parity/enum-leak check over changed
files passes.

**Acceptance Scenarios**:

1. **Given** locale `en` and a proposal with status `viewed`, **When** the Recent Proposals
   widget renders, **Then** it shows "Viewed" (from the catalog), not `viewed`.
2. **Given** locale `ar`, **When** the same widget renders, **Then** it shows the Arabic
   label (behavior unchanged).

---

### User Story 3 — Monetization rules are actually enforced (Priority: P2)

Two tier rules are advertised but not enforced: a granted `pro_until` never lapses (a Pro
user stays Pro forever), and the tone-AI per-tier quota is unwired. The pricing-lookup free
tier (3 vs advertised 5) was already corrected in 008 — verify it holds.

**Why this priority**: Revenue-integrity + honesty (we advertise limits we don't enforce),
but lower blast radius than P1 and gated by no external dependency.

**Independent Test**: Set a user's `pro_until` to the past; their next gated action resolves
as free tier (paywall applies). Exhaust the tone-AI quota; the next call is refused with an
upgrade CTA.

**Acceptance Scenarios**:

1. **Given** a user with `pro_until` in the past, **When** they hit a Pro-gated feature,
   **Then** the free-tier limit applies (not Pro).
2. **Given** a free user at the tone-AI quota, **When** they request another tone rewrite,
   **Then** it is refused with the standard quota/upgrade response.
3. **Given** §IV.1 advertises 5 pricing lookups/mo, **When** a free user runs 5, **Then**
   the 6th is refused (not the 4th).

---

### User Story 4 — Paid checkout via Tap (Priority: P3 — FOUNDER-GATED, DO NOT BUILD YET)

The paywall gates but dead-ends: there is no way to actually pay. A halal, riba-free Tap
checkout would let a free user upgrade to Pro, with a webhook that grants `pro_until`.

**Why this priority**: Biggest product gap, but it pulls a migration + external dependency +
transactional email into scope and the constitution declares Tap **deferred to the
monetization phase**. Specified for planning; **implementation blocked on explicit founder
approval**.

**Independent Test**: (When greenlit) a free user completes a sandbox Tap payment and their
`pro_until` advances; a webhook replay does not double-grant.

**Acceptance Scenarios** (deferred):

1. **Given** a free user, **When** they complete a Tap sandbox payment, **Then** `pro_until`
   advances one billing period and the paywall lifts.
2. **Given** a duplicate/replayed webhook, **When** it arrives, **Then** the grant is
   idempotent (no double extension).
3. **Given** the payment flow, **When** copy/terms render, **Then** they are riba-free and
   PDPL-compliant (Principle VI).

---

### User Story 5 — Spec'd-but-unbuilt intelligence (Priority: P3)

Two spec'd features were never built: the **M4 AI market-trend layer** (the resolver ships;
the AI-trend half does not), and the **M8 onboarding platforms step** (schema + columns exist,
never wired into the wizard) plus the dropped step-5 rate-reasonability insight. (FL-document
"verification" is **dropped permanently** — see FR-010: faking it violates Principle I.)

**Why this priority**: Real product value but not a correctness/honesty defect; larger build
touching DeepSeek (M4) and storage/verification (M8). Sequenced last.

**Independent Test**: M4 — a lookup returns an AI-trend annotation, labeled per Principle I
and degrading gracefully when DeepSeek is unavailable. M8 — uploading an FL document sets
`fl_verified` and the onboarding meter reflects it.

**Acceptance Scenarios**:

1. **Given** a pricing lookup with sufficient data, **When** the result renders, **Then** an
   AI-trend line appears with the `تحليل رِزق —`/`Rizq Insight —` prefix and a graceful
   fallback when the model is slow/unavailable.
2. **Given** the onboarding platforms step, **When** a user enters their Bahr/Mostaql/LinkedIn/
   etc. profile links, **Then** they persist and completeness reflects them.
3. **Given** the rates step with a market band, **When** the user enters their own floor rate,
   **Then** an honest reality-check line shows whether it sits below/within/above the cited band.

---

### Edge Cases

- A query that returns **zero rows legitimately** (genuinely empty) MUST still show the
  empty-state CTA — the error path and the empty path are distinct and must not collapse.
- Locale fallback: an unknown/new proposal status enum with no catalog key MUST degrade to a
  humanized label, never crash or leak the raw enum.
- `pro_until` exactly equal to "now": treat as expired (`<= now` = free) to avoid a
  one-instant grandfathering ambiguity.
- Tap webhook arriving before the redirect return, or out of order, MUST still converge to a
  single correct grant (idempotency key on the payment/charge id).
- M4 AI-trend when DeepSeek times out: render the resolver result **without** the trend line;
  never block the price on the AI call.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: M7 Methodology, M9 Calendar, M12 Document Vault, and Projects list MUST
  distinguish a failed primary read from an empty result and render an error+retry state on
  failure (reuse the dashboard `WidgetError` pattern).
- **FR-002**: No surface may render an empty-state/"create your first…" CTA when the
  underlying query errored.
- **FR-003**: The Recent Proposals widget MUST render proposal status via the `next-intl`
  catalog for **both** locales; no raw DB enum reaches the user.
- **FR-004**: A check MUST fail if a changed dashboard/list widget renders a raw status enum
  to the `en` locale.
- **FR-005**: Tier resolution MUST treat `pro_until <= now` as free tier (expiry enforced at
  the single shared resolution point, so every caller inherits it).
- **FR-006**: The tone-AI feature MUST enforce its per-tier quota and return the standard
  quota-exhausted/upgrade response when exceeded.
- **FR-007**: The pricing-lookup free-tier limit MUST match the advertised value (5/month) in
  both the app-level check and the DB trigger (regression-guard 008's fix).
- **FR-008** *(founder-gated)*: The system MUST provide a Tap checkout that, on confirmed
  payment, idempotently advances `pro_until` by one billing period. **Blocked until founder
  approval.**
- **FR-009**: M4 pricing results MUST offer an AI-trend annotation that is Principle-I
  labeled and degrades gracefully (result still renders if the model is unavailable).
- **FR-010**: M8 onboarding MUST restore the step-6 platform URLs (already schema/column-backed)
  and surface the step-5 rate-reasonability insight (compare the freelancer's own rate to the
  cited market band). **FL-document "verification" is explicitly OUT of scope, permanently** — a
  boolean flipped on upload would be a false credibility claim (Principle I, NON-NEGOTIABLE).
  `fl_number` stays plain text; nothing asserts "verified".
- **FR-011**: Every new user-facing string ships Arabic + English via the catalog
  (Principle II); every new AI output is labeled (Principle I).
- **FR-012**: All money/quota/eligibility changes (FR-005–FR-008) MUST carry unit tests with
  hand-built fixtures before shipping (Principle IV).

### Key Entities

- **Tier resolution** *(existing)*: the single function/point that decides a user's effective
  tier from `role` + `pro_until`. FR-005 adds the expiry branch here so all callers inherit it.
- **Payment / Charge** *(new, founder-gated)*: a record of a Tap charge (provider id, amount,
  status, idempotency key) that maps a confirmed payment to a `pro_until` grant.
- **FL verification** *(existing column `fl_verified`)*: boolean on the user/profile set when a
  valid freelancer document is uploaded; feeds onboarding completeness.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 surfaces render a false empty state on a failed read (all of M7/M9/M12/
  Projects show error+retry under a forced-failure test).
- **SC-002**: 0 raw status enums reach the `en` locale on the dashboard (asserted by test).
- **SC-003**: A user whose `pro_until` has passed resolves as free tier on 100% of gated
  actions.
- **SC-004**: Advertised limits equal enforced limits for pricing lookups (5=5) and tone-AI.
- **SC-005**: `pnpm typecheck` clean and `pnpm test` green, including new regression tests for
  every FR touching money/quota/eligibility and the error/enum paths.
- **SC-006** *(when US4 greenlit)*: a sandbox Tap payment advances `pro_until` and a replayed
  webhook does not double-grant.

## Assumptions

- The dashboard `WidgetError` component + error/retry pattern from 008 is reusable as-is for
  the four remaining surfaces (no new component needed).
- English proposal-status labels already exist at `Proposals.list.status.*` and only need to
  be wired (no new copy/translation for US2's enum fix).
- Tier resolution flows through a single shared function today, so FR-005 is one guarded
  branch, not a per-caller patch.
- No new DB columns are required for US1–US3 and US5 (M8 `fl_verified` column already exists).
  Only US4 (payments) introduces a migration (Payment/Charge table).
- US4 stays **not started** until the founder greenlights the monetization phase; the plan
  marks its tasks blocked.
- The 735-ternary migration (US2 broad half) is incremental and out of scope for a single PR;
  US2's shippable slice is the enum-label fix + a guard check. Full catalog migration is a
  follow-up tracked, not a blocker.
