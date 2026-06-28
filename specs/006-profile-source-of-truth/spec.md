# Feature Specification: Profile as Source of Truth + Onboarding Re-engineering

**Feature Branch**: `main` (commit + sync; no feature branch)

**Created**: 2026-06-28

**Status**: Draft

**Input**: User description: "Make the freelancer's profile the single source of truth, captured once in a delightful, data-enriching onboarding and passed as a parameter to every module — so engines default from the profile and AI only fills brief-specific gaps." (Full brief in the triggering chat; grounded in `docs/profile-source-of-truth.md`.)

## Overview

The freelancer's profile is already rich (~70 fields: specialty, experience, city, rates, brand,
payment defaults, goals, tone, platforms, portfolio) and captured across onboarding — but the
highest-stakes flows **re-derive what we already know**: proposals AI-guess the specialty
(ignoring `primary_specialty_id`) and pricing ignores the freelancer's stated rate; brand/defaults/
VAT aren't fully carried into invoices. This feature makes the profile the **single source of
truth, passed as a parameter to every module**, so each engine *defaults from the profile* and AI/
the brief only fills the genuinely situational — ending the loop of downstream patches. It also
**re-engineers onboarding** into a visual, data-enriching experience so the profile ends rich.

Two tracks: **A — universal wiring** (the root fix); **B — onboarding re-engineering** (the wow).
The data model is already sufficient (additive only; no destructive change expected).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - My proposal already knows my discipline (Priority: P1)

A freelancer who set their specialty/experience at onboarding writes a brief. The proposal
defaults the **specialty to their profile** (and tier from their experience), so a graphic
designer's brand-identity brief is priced as graphic-design without the app re-guessing — and a
brief that's clearly a different service can still override.

**Why this priority**: This is the root fix and the highest-leverage slice — it retires the
specialty-disambiguation patch, makes pricing reflect *who the freelancer is*, and proves the
"profile as a parameter" principle. Independently shippable.

**Independent Test**: With a profiled freelancer (primary specialty = graphic-design, 7 years), a
generic "brand identity" brief resolves to graphic-design · senior without relying on AI keyword
disambiguation; a brief clearly for a different listed service still resolves to that service.

**Acceptance Scenarios**:

1. **Given** a freelancer whose profile sets a primary specialty, **When** they generate a
   proposal, **Then** the proposal's specialty defaults to that primary specialty (AI is anchored
   to it, not guessing from scratch).
2. **Given** a multi-discipline freelancer (several listed specialties), **When** a brief clearly
   matches one of their *other* listed specialties, **Then** the proposal resolves to that one.
3. **Given** a freelancer with no profile specialty (skipped onboarding), **When** they generate a
   proposal, **Then** the system falls back to AI extraction exactly as today (profile is a prior,
   never a hard requirement).
4. **Given** a freelancer who stated a current rate, **When** their proposal is priced, **Then**
   that stated rate informs the personal anchor from proposal #1 (not only past proposals).

---

### User Story 2 - My brand and terms flow into everything (Priority: P2)

The freelancer's brand (name, logo, colors, contact), payment defaults (deposit, method, warranty),
VAT status, tone, and income goal — all set once — appear consistently across invoices, the money
setup, AI copy, HADAF, and the dashboard, without re-entry.

**Why this priority**: Extends the principle to the remaining surfaces; high polish + consistency
value, but depends on the P1 profile loader being in place.

**Independent Test**: A profiled freelancer creates an invoice → it carries their brand + payment
defaults + correct VAT automatically; HADAF/dashboard reflect their income goal; AI copy uses their
tone.

**Acceptance Scenarios**:

1. **Given** a profile with brand + payment defaults + VAT registered, **When** an invoice is
   created, **Then** it shows the freelancer's brand, applies their default deposit/payment terms,
   and computes VAT correctly (with a verified badge when their freelance doc is verified).
2. **Given** a profile income goal, **When** the freelancer views HADAF/dashboard, **Then** targets
   and projections use that goal.
3. **Given** a preferred tone, **When** any AI copy is generated, **Then** it honors that tone.

---

### User Story 3 - Onboarding shows me my progress and its payoff (Priority: P3)

A new freelancer goes through onboarding and sees a **profile-strength meter** filling as they
complete steps, each step stating what it unlocks ("accurate pricing," "branded proposals"). It is
Arabic-first, mobile-first, animated, resumable, and skippable-but-nudged.

**Why this priority**: Turns the capture surface into an experience that *motivates* rich data —
the input side of the moat — but the wiring (US1/US2) delivers value even on today's onboarding.

**Independent Test**: Progress through onboarding → the strength meter rises with each saved step,
each step shows its payoff, and leaving + returning resumes at the right step.

**Acceptance Scenarios**:

1. **Given** the onboarding flow, **When** a step is completed, **Then** the profile-strength meter
   visibly increases and the step's payoff line is shown.
2. **Given** a partially-completed onboarding, **When** the freelancer returns later, **Then** they
   resume at the next incomplete step with prior answers intact.
3. **Given** any onboarding screen, **When** viewed in Arabic on mobile, **Then** it renders
   RTL-correct and mobile-first.

---

### User Story 4 - Onboarding fills itself and shows me the payoff live (Priority: P4)

The freelancer pastes a profile URL (Bahr/Mostaql/Khamsat/LinkedIn/Behance/personal site) and the
onboarding **suggests** specialty, years, and samples (clearly labeled, user-confirmed). As they
set brand + specialty + tier, a **live mini preview** of a branded proposal/price updates so they
feel the data feeding the app.

**Why this priority**: The "wow" delight + completion lift, but it's enhancement on top of US3.

**Independent Test**: Paste a supported URL → labeled suggestions appear and require confirmation
before saving; set brand/specialty/tier → a live preview updates accordingly.

**Acceptance Scenarios**:

1. **Given** a pasted supported profile URL, **When** suggestions are produced, **Then** they are
   clearly labeled as suggestions and are written only after the freelancer confirms.
2. **Given** brand + specialty + tier entered, **When** they change, **Then** a live preview of a
   branded proposal/price updates in real time (the preview is ephemeral — nothing is persisted).

### Edge Cases

- **Empty/partial profile** (skipped onboarding) → every engine still works via sensible defaults +
  AI fallback; the profile is a prior, never required.
- **Multi-discipline freelancer** → primary specialty is the default; a brief clearly matching
  another *listed* specialty overrides; an unlisted specialty falls back to AI extraction.
- **Stated rate wildly out of market** → it informs the personal anchor but is bounded (does not
  let one number distort the band beyond the existing personal-weight cap).
- **VAT not registered** → invoices show no VAT; **registered** → VAT applied; verified badge only
  when the freelance doc is verified.
- **Profile changes after artifacts exist** → existing proposals/invoices keep their captured
  values (no retroactive rewrite); new ones use the updated profile.
- **Prefill from an unreachable/unsupported URL** → graceful no-op with a clear message; manual
  entry unaffected.

## Requirements *(mandatory)*

### Functional Requirements

**Profile as parameter (Track A)**
- **FR-001**: The system MUST load the freelancer's profile once per relevant flow as a single
  typed context and pass it into the engines that need it (proposal, pricing, invoice, HADAF,
  dashboard, AI copy).
- **FR-002**: Proposal generation MUST default the specialty from the profile's primary specialty
  (anchored as a prior to extraction), overriding to another of the freelancer's listed specialties
  only when the brief clearly indicates it, and falling back to AI extraction when the profile has
  no specialty.
- **FR-003**: Pricing MUST incorporate the freelancer's stated current rate as a personal-anchor
  signal (in addition to past proposal anchors), bounded by the existing personal-weight cap.
- **FR-004**: Invoices MUST inherit the freelancer's brand, payment defaults, and VAT status/number
  (correct VAT math; verified badge only when the freelance document is verified).
- **FR-005**: HADAF and the dashboard MUST use the profile's income goal and previous-year income
  for targets/projections; AI copy MUST honor the profile's preferred tone.
- **FR-006**: All profile-driven defaults MUST be overridable per artifact, and MUST degrade
  gracefully (sensible defaults + AI fallback) when a profile field is absent.

**Onboarding re-engineering (Track B)**
- **FR-007**: Onboarding MUST display a live profile-strength indicator that increases as steps are
  completed, and MUST show, per step, what completing it unlocks.
- **FR-008**: Onboarding MUST be resumable (return to the next incomplete step with prior answers
  intact) and skippable without blocking access to the app.
- **FR-009**: Onboarding MAY offer to prefill suggestions from a pasted profile URL; any AI-derived
  suggestion MUST be labeled as a suggestion and persisted only after explicit user confirmation.
- **FR-010**: Onboarding SHOULD show a live, ephemeral preview of a branded proposal/price that
  reflects the freelancer's entered brand + specialty + tier (nothing persisted from the preview).
- **FR-011**: All onboarding and profile-surfaced UI MUST be Arabic-first, full-RTL, mobile-first,
  and bilingual.

**Cross-cutting**
- **FR-012**: The feature MUST be additive (no destructive data changes) and reuse existing
  screens/actions/engines, adding parameters/context rather than cloning.
- **FR-013**: All profile reads/writes MUST be owner-scoped; AI suggestions and any displayed price
  MUST carry honest labeling/provenance.

### Key Entities *(include if feature involves data)*

- **FreelancerProfile**: the canonical, typed view of the freelancer used as a parameter everywhere
  — identity, primary + secondary specialties, experience (tier/years), city, stated rates, brand
  (name/logo/colors/contact), payment defaults, VAT status, tone, goals, platforms/portfolio,
  completeness. Sourced from the existing `users` profile; no new store.
- **Profile completeness**: a derived 0–100 strength score over the profile fields, surfaced in
  onboarding (the `profile_completeness_pct` field already exists).
- **Prefill suggestion**: a transient, labeled, user-confirmable proposed value derived from a
  pasted profile URL; never written without confirmation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a profiled freelancer, the proposal's specialty matches their profile discipline
  in ≥95% of single-discipline cases without relying on brief keyword disambiguation.
- **SC-002**: The specialty-disambiguation patch is no longer the primary path — a generic brand
  brief from a graphic designer prices as graphic-design (not logo-design) via the profile prior.
- **SC-003**: A profiled freelancer's first invoice carries their brand, payment terms, and correct
  VAT with zero re-entry.
- **SC-004**: Pricing reflects the freelancer's stated rate from proposal #1 (a freelancer who
  states a higher rate sees a higher personal anchor than an identical freelancer who didn't).
- **SC-005**: Onboarding completion is measurably easier to perceive — the strength meter and
  per-step payoff are present on every step; onboarding is resumable across sessions.
- **SC-006**: A freelancer who skips onboarding still gets working proposals/invoices/pricing
  (no regression; profile is a prior, not a requirement).

## Assumptions

- **Schema is sufficient** — the ~70-field profile already holds everything; this is wiring + UX,
  additive only (add a column only if a genuine gap is found during planning).
- **Multi-discipline override (default)**: primary specialty is the default; the brief overrides to
  another *listed* specialty only on a clear match; unlisted → AI fallback.
- **Live onboarding preview is ephemeral** — it persists nothing.
- **Smart prefill (default)**: v1 uses heuristic mapping from the pasted URL (platform + handle),
  not AI scraping of page content (honesty + cost + no-scraping rule); AI enrichment is a later
  option. Suggestions are always labeled + user-confirmed.
- **profile_completeness weighting (default)**: weight the fields that drive value highest
  (specialty, experience, city, rates, brand) and tunable later.
- **Reuse**: `loadUserBrandDefaults`, `resolvePrice`/`computeProposalPrice`, the scope extractor,
  `saveOnboardingStep`, and the profile writable-columns/RLS pattern are reused, not rebuilt.
- **Platform**: Arabic-first, RTL, mobile-first, owner-scoped; consistent with the constitution.
- **Phasing**: P1 (specialty prior + stated-rate anchor) → P2 (invoices/HADAF/tone) → P3 (meter +
  resumable polish) → P4 (prefill + live preview); P1 alone retires the disambiguation patch.
