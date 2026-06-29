# Feature Specification: Multi-Currency Pricing + FX Conversion

**Feature Branch**: `main` (commit + sync; no feature branch)

**Created**: 2026-06-29

**Status**: Draft

**Input**: User description: "Let a freelancer price and invoice in a currency other than SAR while the pricing engine, benchmarks, and HADAF stay SAR-internal; convert to/from SAR using real, cited exchange rates." (Full brief in the triggering chat.)

## Overview

Rizq is SAR-internal: the pricing engine, benchmark data, and HADAF thresholds are all in Saudi
Riyal. But freelancers who serve international clients price and invoice in USD/AED/EUR/GBP. Today
the rate fields are hard-labeled "(SAR)", and the freelancer's stated rate is fed to the pricing
engine as a SAR anchor — so a USD rate would be mis-read by ~3.75×. This feature makes **currency a
first-class, honest concept**: the freelancer picks a pricing/display currency; Rizq converts
to/from SAR at the boundary using **real exchange rates that carry provenance** (source + as-of
date), never invented numbers. SAR stays the engine's internal base; SAR-only users see no change.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Price in my own currency, still benchmarked correctly (Priority: P1)

A freelancer working with US clients sets their pricing currency to USD and enters their rates in
USD. When they generate a proposal, the engine still compares against the SAR market benchmark — but
their stated rate is converted to SAR (at a cited rate) before it informs the price, so the anchor
is correct, not 3.75× off.

**Why this priority**: This is the core correctness fix + the currency model + FX service that
everything else builds on. Without it, multi-currency silently corrupts pricing. Independently
shippable (the currency model + conversion + the feature-006 anchor boundary).

**Independent Test**: With currency = USD and a stated project rate of 2,000 USD, the personal
pricing anchor reflects ~7,500 SAR (not 2,000); with currency = SAR the behavior is identical to
today. The conversion cites its source + date.

**Acceptance Scenarios**:

1. **Given** a freelancer with pricing currency USD and a stated rate, **When** a proposal is
   priced, **Then** the stated rate is converted to SAR via a cited rate before becoming the anchor.
2. **Given** a freelancer with pricing currency SAR, **When** anything is priced, **Then** behavior
   is byte-for-byte today's (no conversion, no change).
3. **Given** the FX feed is unavailable for a needed currency, **When** a conversion is required,
   **Then** the system degrades gracefully (skips the anchor / shows SAR only) rather than inventing
   a rate.
4. **Given** any converted figure shown to the user, **When** it is displayed, **Then** it is
   labeled as converted and cites the rate, source, and as-of date.

---

### User Story 2 - Choose my currency during onboarding (Priority: P2)

In onboarding, the freelancer picks their pricing currency from a small selector (default SAR). All
rate-field labels/symbols update live, the entered rates are stored in that currency, and the choice
persists to their profile.

**Why this priority**: The capture point for the currency; depends on the P1 model. High-visibility
but the engine correctness (P1) is what makes it safe.

**Independent Test**: Select USD in onboarding → rate labels switch to USD live → save → re-open →
currency + rates persisted.

**Acceptance Scenarios**:

1. **Given** the rates step, **When** the freelancer picks a currency, **Then** every rate label/
   symbol updates immediately and the selection is saved with the rates.
2. **Given** a returning freelancer, **When** they revisit, **Then** their currency is preserved.

---

### User Story 3 - Invoice in my currency (Priority: P3)

A freelancer invoices an international client in their currency. The invoice totals and the rendered
artifact show that currency. VAT (KSA 15%) applies only in the SAR/registered context.

**Why this priority**: High client-facing value; depends on the currency model. Money math must be
correct per currency.

**Independent Test**: Create an invoice in USD → totals + artifact render in USD; VAT behavior
follows the defined rule; a SAR invoice is unchanged.

**Acceptance Scenarios**:

1. **Given** pricing currency USD, **When** an invoice is created, **Then** its currency defaults to
   USD and totals/artifact render in USD.
2. **Given** a non-SAR invoice, **When** totals are computed, **Then** VAT follows the rule
   (suppressed for non-SAR by default — see Assumptions) and the currency is stored on the invoice.

---

### User Story 4 - See converted figures with their source (Priority: P4)

On the proposal and dashboard, the SAR market band stays authoritative with its provenance, and the
freelancer can also see the equivalent in their currency, clearly labeled as a converted figure with
the FX citation.

**Why this priority**: Presentation polish + transparency; depends on P1–P3.

**Acceptance Scenarios**:

1. **Given** a priced proposal, **When** viewed by a non-SAR freelancer, **Then** the SAR band shows
   with provenance and a converted equivalent shows labeled "≈ converted (1 USD = X SAR, source, date)".
2. **Given** the dashboard, **When** a non-SAR freelancer views income/goal, **Then** their personal
   figures may show in their currency while the SAR-based HADAF threshold stays SAR.

### Edge Cases

- **FX feed down / stale** → degrade: skip conversion-dependent steps, show SAR, never guess; surface
  the staleness.
- **SAR-only freelancer** (default) → zero behavior change anywhere.
- **Currency changed after data exists** → existing proposals/invoices keep the currency + FX basis
  captured at creation (no retroactive re-conversion).
- **SAR↔USD** → use the fixed SAMA peg (3.75), citable as the peg; floating currencies use the feed.
- **Rounding** → converted money rounds to the currency's sensible unit; round-tripping doesn't drift
  the stored SAR base (SAR is the source of truth for the engine).
- **HADAF** → remains a SAR government threshold regardless of display currency.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let a freelancer choose a pricing/display currency (default SAR) from a
  supported set, persisted to their profile.
- **FR-002**: The system MUST keep SAR as the internal base for the pricing engine, benchmarks, and
  HADAF; all conversion happens at the boundary, not inside the engine.
- **FR-003**: The system MUST convert a freelancer's stated rate to SAR (via a cited rate) before it
  becomes a pricing anchor; if no rate is available it MUST skip the anchor rather than fabricate one.
- **FR-004**: Every exchange rate used MUST come from a real source and be stored/displayed with its
  source and as-of date; SAR↔USD MUST use the fixed SAMA peg, citable as such.
- **FR-005**: Any converted figure shown to a user MUST be labeled as converted and cite the rate,
  source, and date (honesty / Principle I).
- **FR-006**: Invoices MUST support a currency (default SAR); totals and the rendered artifact MUST
  reflect that currency, and the invoice MUST store its currency (+ FX basis when non-SAR).
- **FR-007**: VAT MUST follow a defined currency rule (default: applied only for SAR/registered
  context; suppressed for non-SAR — see Assumptions).
- **FR-008**: When the FX source is unavailable, the system MUST degrade gracefully (SAR-only / no
  conversion) and never present an unsourced number.
- **FR-009**: A SAR-only freelancer MUST experience no change anywhere (the default path is identical
  to today).
- **FR-010**: All currency UI and converted-figure labels MUST be Arabic-first, RTL, and bilingual;
  new profile/invoice fields MUST be owner-scoped.

### Key Entities *(include if feature involves data)*

- **Pricing currency (profile)**: the freelancer's chosen pricing/display currency (default SAR).
- **Invoice currency**: per-invoice currency (default SAR) + the FX basis (rate, as-of, source) when
  non-SAR, captured at creation and never silently re-converted.
- **FX rate**: a cited conversion factor between a currency and SAR — value, base/quote, as-of date,
  source; cached (daily) and reproducible. SAR↔USD is the fixed peg.
- **Converted figure**: any amount shown in a non-base currency, always paired with its FX citation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A USD-pricing freelancer's stated rate informs the pricing anchor at its correct SAR
  equivalent (within rounding), never at face value.
- **SC-002**: 100% of converted figures displayed carry a visible source + as-of date.
- **SC-003**: A SAR-only freelancer sees zero difference vs. today (regression-free default path).
- **SC-004**: An invoice created in a non-SAR currency renders end-to-end in that currency with
  correct totals and the defined VAT behavior.
- **SC-005**: When the FX feed is unavailable, no unsourced/guessed number is ever shown; the system
  falls back to SAR-only.

## Assumptions

- **FX source (default)**: a public daily-reference feed (e.g., an ECB/exchangerate-style endpoint),
  fetched server-side and **cached daily**, storing rate + as-of + source; SAR↔USD uses the fixed
  **SAMA peg 3.75**. (Exact provider confirmed at plan time.)
- **Proposal display (default)**: SAR band stays **authoritative** with provenance; the freelancer's-
  currency equivalent is shown as a clearly-labeled **secondary** converted figure.
- **VAT for non-SAR (default)**: **suppressed** (VAT is the KSA/SAR context); SAR + registered keeps
  15%. Revisited if a real non-SAR-with-VAT case arises.
- **Supported currencies (default)**: SAR, USD, AED, EUR, GBP (extensible).
- **Additive only**: new columns (`users.rate_currency`, `invoices.currency` + FX basis) and an FX
  cache; SAR defaults everywhere; **no destructive change**. (Migration can't be applied until the
  DB connection is restored — code + migration authored, application deferred.)
- **Reuse**: `resolvePrice`/`computeProposalPrice`, the invoice artifact, `NumberStepper`,
  `loadFreelancerProfile`, and the profile writable-columns/RLS pattern — add a conversion boundary,
  don't fork the SAR engine.
- **Halal**: FX is spot conversion for display/anchoring only — no riba, not a financial product.

## Dependencies

- Builds on **feature 006** (the stated-rate → SAR pricing anchor is the conversion boundary).
- **Environment**: implementation requires the dev server running + the database reachable (to apply
  the additive migration and live-verify). Spec/plan/tasks do not.
