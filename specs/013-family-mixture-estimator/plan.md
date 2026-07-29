# Implementation Plan: Price the disagreement, not around it

**Branch**: `013-family-mixture-estimator` | **Date**: 2026-07-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/013-family-mixture-estimator/spec.md`

## Summary

Replace the pooled weighted-percentile band with a bias-adjusted log-normal mixture over evidence
families, collapse the unsupported city axis to national, and install the instrumentation that
makes future calibration meaningful — all before any transaction exists to calibrate on.

The organising finding: `3.75 ÷ 1.85 = 2.03`, and the measured Saudi-vs-PPP disagreement
(1.88–2.76×) brackets it. The regime conflict is mostly one currency assumption, so it becomes one
parameter (λ) rather than a fight to be adjudicated. See [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 16 App Router, Node runtime

**Primary Dependencies**: None added. Existing: `@supabase/supabase-js`, `next-intl`, `vitest`.
Every calculation is closed-form — no sampling, no fitting, no numerical library.

**Storage**: Supabase Postgres. `benchmark_records` (2,112 live rows, 14 sources), plus three new
tables (`band_snapshots`, `pricing_calibration`, `project_hours`) and two new columns.

**Testing**: Vitest for the pure estimator (the bulk of the work is pure functions); SQL
verification for migrations; Playwright + browser for the card states.

**Target Platform**: Server-side pricing lib + one client card. Mobile-first, Arabic-first RTL.

**Project Type**: Web application; library-shaped change inside `src/lib/pricing/`.

**Performance Goals**: Unchanged. The mixture is closed-form; band quantiles by bisection over a
monotone CDF (~40 iterations, microseconds). No added round-trips — `published_sample`,
`source_ref` and the new columns come back in the existing `fetchRows` select.

**Constraints**: No new runtime dependency. No new personal data, no new sharing surface. Prices
must remain identical while calibration is empty (FR-015/SC-005). Client-facing redaction must
strictly widen (FR-023).

**Scale/Scope**: 4 new modules, ~5 modified, 4 migrations, 1 card rebuilt, 2 message catalogues.
Touches every price the product shows — the highest-blast-radius change in the repo to date.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| **I. Honesty is the moat** | ✅ **Driving principle** | The feature exists because the product shows a confident figure over sources that disagree 2-to-1, and asks users to pick a city no source distinguishes. FR-003 (disagreement widens the band), FR-007 (editorial may not anchor), FR-008 (national, and say so), FR-016 (never "verified"), FR-021/022 (lead with evidence, never rank derivations) are all honesty gates. Phase 0 deleted three mechanisms shipped days earlier for failing this test. |
| **II. Arabic-first, RTL** | ✅ Pass | FR-024. New card states ship in both catalogues; Arabic-Indic digits and counted-noun agreement enforced by the existing `src/lib/format/count.test.ts` guard. |
| **III. Mobile-first** | ✅ Pass | The disagreement state adds a stacked two-reading block — designed at mobile width, label right / tabular figure left in RTL. |
| **IV. Test the money and the rules** | ✅ Pass | Pricing is named explicitly in this principle. The estimator is pure and unit-tested; SC-001 (±20% reweight moves headline <5%) and SC-005 (inert calibration is byte-identical) ship as regressions, both replaying measured incidents. |
| **V. Modules stand alone** | ✅ Pass | Confined to the pricing module's data model, lib and card. The one cross-module touch (onboarding step order, FR-013) is a reorder, not a new surface. |
| **VI. Halal / Saudi-compliant** | ✅ Pass | No new data acquired, no scraping, no new personal data. k-anonymity ≥ 3 reused unchanged and now doubles as the geography gate. Consent machinery untouched. |
| **VII. AI as multiplier** | ➖ N/A | Deliberately deterministic. Phase 0 used an AI council to *design* the estimator; the estimator itself contains no model call. |

**Gate result: PASS.** No violations, so Complexity Tracking is omitted.

**Post-design re-check**: PASS. Design adds no dependency and no abstraction with one
implementation. The largest structural question — bias-adjusted mixture vs simpler alternatives —
resolved toward the option that *degrades* most honestly at zero data rather than the most
sophisticated one; DerSimonian–Laird and expert-panel elicitation were both rejected in Phase 0
for claiming authority the data cannot support.

## Project Structure

### Documentation (this feature)

```text
specs/013-family-mixture-estimator/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — council decisions + what died
├── data-model.md        # Phase 1 — tables, columns, invariants
├── quickstart.md        # Phase 1 — how to verify end to end
├── contracts/
│   └── estimator.md     # Phase 1 — the pure estimator contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/lib/pricing/
├── bridges.ts               # NEW — applyBridges(row, calibration); λ interpolation, composite bridge
├── bridges.test.ts          # NEW
├── familyBias.ts            # NEW — cited prior per family {mu, tau, rationale, source_ref, as_of}
├── familyBias.test.ts       # NEW
├── latentTruth.ts           # NEW — family summaries → bias-adjusted mixture → band + composition
├── latentTruth.test.ts      # NEW
├── projectHours.ts          # NEW — hours loader, precedence measured > stated > reasoned
├── aggregate.ts             # EDIT — delegate to latentTruth; delete noisy-or, agreement, sample factor
├── evidenceStrength.ts      # DELETE — tiers die with the score they read
├── evidenceFamily.ts        # KEEP — promoted from score input to estimation unit
├── resolve.ts               # EDIT — drop city/region passes; expose families, composition, band_kind
└── calibration.ts           # NEW — per-family offsets from deviations; inert at n=0

src/components/tool/
└── ResultCard.tsx           # EDIT — state machine on composition; two-readings; national line

src/app/actions/proposals/
└── generateProposal.ts      # EDIT — write band_snapshots at creation

src/lib/proposals/artifact.ts # EDIT — extend forClientAudience() exclusions

supabase/migrations/
├── ..._price_original_columns.sql
├── ..._collapse_city_axis.sql
├── ..._band_snapshots.sql
└── ..._project_hours_and_calibration.sql
```

**Structure Decision**: Existing layout. Pricing stays pure TypeScript in `src/lib/pricing/` with
the database reached only through `resolve.ts` and migrations — the shape every prior pricing
feature followed. The four new modules are all pure; only `calibration.ts` reads a table, and only
on a schedule.

## Implementation Phases

### P1 — Geography (US2) — ships first, alone, and is net deletion

City collapse is independent of the estimator, is the largest honesty win, and *shrinks* the
problem the estimator must solve (700 cells → ~100, concentrating contributors ~7× toward the
k-anonymity gate). Migration dedupes fanned editorial/founder rows to one national triple per
(specialty, tier, size) and deactivates the copies. `resolve.ts` loses the city and region passes.
Card gains the national-scope line.

**The trap** (research.md D4): do not NULL `city_id` — that converts duplicates into wildcards and
inflates evidence 7×. Dedupe, then deactivate. SC-004 is the assertion.

### P2 — Transforms at read time (US5, partial)

`price_original` / `original_unit` columns, backfilled from the ingestion migrations.
`bridges.ts` applies currency (λ-interpolated), composite employment bridge and hours at
aggregation. Prerequisite for everything after: without it, revising λ means re-importing 2,112
rows.

### P3 — The estimator (US1) — the MVP

`familyBias.ts` priors, `latentTruth.ts` mixture, `aggregate.ts` delegating to it. Deletes
noisy-or, agreement multiplier, standalone sample factor and `evidenceStrength.ts`. `resolve.ts`
returns `families[]`, `evidence_composition` and `band_kind`.

Two regressions ship with it, both replaying measured incidents: perturb any source weight ±20%
and assert headline moves <5% (SC-001, against the 199-of-700 lurch); and for content-writing ·
mid, assert the band spans both the editorial cluster (500–1,050) and the converted cluster
(3,330–4,440) rather than sitting inside one.

### P4 — Instrumentation (US3) — must precede any calibration

`band_snapshots` written at proposal creation with `saw_band_first`; onboarding reordered so
`StepRates` elicits before `OnboardingPricePreview` renders. Then `pricing_calibration` +
`calibration.ts` ship **inert** — empty table means byte-identical bands (SC-005), so it lands at
zero risk and is ready when the first k-anonymous cell appears.

### P5 — Display (US4)

`ResultCard` becomes a state machine on evidence composition: derived-only (evidence sentence
first, ≈ prefix, round to 500, negotiation-floor framing), disagreement (two named readings),
transaction-backed (solid figure). Composition labels name derivation, never rank.
`forClientAudience()` exclusions extended to readings, composition, band and progress.

### P6 — Hours (US5, remainder)

`project_hours` table seeded with today's 8/24/60/160 as `reasoned`, n=0; loader with precedence;
optional `expected_hours` on proposals and `actual_hours` at gig completion. Never invoice-implied.

## Risks

| Risk | Mitigation |
|---|---|
| Every price in the product moves | Expected and intended — the current bands are the defect. P1 and P3 land separately so each shift is attributable; quickstart captures a before/after table per specialty. |
| The band becomes uselessly wide where regimes disagree | Spec edge case: past a threshold the honest output is "the evidence does not support a single price", not an 8× range. `band_kind` carries that state; the card refuses rather than emits. |
| City collapse inflates evidence | The precise trap research.md D4 names. Dedupe-then-deactivate, with SC-004 asserted in SQL before and after. |
| Calibration ships and quietly changes prices | FR-015: inert at n=0, asserted byte-identical. It cannot change anything until a k-anonymous cell exists. |
| Deleting `evidenceStrength` breaks the card | Its tiers are read in exactly one place. Composition replaces it in the same commit; the file goes with its test. |
| Reflexivity instrument lands after the first proposals | Sequenced P4 before any calibration consumption, and P4 is independent of P3 — it can ship even if the estimator slips. |
