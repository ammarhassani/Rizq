---

description: "Task list for 013-family-mixture-estimator"
---

# Tasks: Price the disagreement, not around it

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/estimator.md](contracts/estimator.md), [quickstart.md](quickstart.md)

**Tests**: Included. Constitution IV names pricing explicitly, and SC-001/SC-005 are regressions replaying measured incidents.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [ ] T001 Capture the baseline from [quickstart.md](quickstart.md) step 0 (700 cells, ~2,112 rows, 14 sources) and the rendered bands for `web-dev`, `content-writing`, `photography`

---

## Phase 2: Geography — US2 🎯 ships first, net deletion

- [ ] T002 [US2] Migration `..._collapse_city_axis.sql`: dedupe active editorial + founder rows to ONE national min/median/max triple per (specialty, tier, size) with `city_id = NULL`; deactivate the copies with a note. Do NOT null `city_id` in place — comment must state why (wildcards inflate evidence 7×)
- [ ] T003 [US2] Apply and verify per [quickstart.md](quickstart.md) 3a: per-cell rows and sources ≤ baseline (SC-004); all active rows national
- [ ] T004 [US2] `src/lib/pricing/resolve.ts`: delete the city and region passes; fallback ladder collapses to size → national. Add `city_backed: boolean` to `ResolveResult`
- [ ] T005 [US2] National scope line in both catalogues + rendered on `ResultCard`; verify two cities return identical bands (SC-003)

---

## Phase 3: Transforms at read time — US5 (part)

- [ ] T006 [US5] Migration `..._price_original_columns.sql`: add `price_original numeric`, `original_unit text`; backfill from the ingestion migrations where derivable
- [ ] T007 [P] [US5] `src/lib/pricing/bridges.ts` + test: `currencyBridge(λ)` log-interpolating 1.85↔3.75 (assert 0.5 → ≈2.634, NOT 2.80), composite employment bridge as ONE constant, `applyBridges(row, cal)` returning `{price_sar, transforms[]}`

---

## Phase 4: The estimator — US1 🎯 MVP

- [ ] T008 [P] [US1] `src/lib/pricing/familyBias.ts` + test: `FAMILY_PRIORS` with `{mu, tau, rationale, source_ref, as_of}` per family; `TRADABILITY_DEFAULT = 0.5`
- [ ] T009 [US1] `src/lib/pricing/latentTruth.ts`: `summariseFamilies()` + `combine()` → bias-adjust, precision-weight, log-normal mixture, p10/p50/p90 by bisection, `band_kind` classification (≤1.5 agreed / ≤5 disagreement / >5 insufficient), editorial never anchors where a cited family exists
- [ ] T010 [US1] `src/lib/pricing/latentTruth.test.ts`: every invariant in [contracts/estimator.md](contracts/estimator.md), including **SC-001** (perturb any source weight ±20% → anchor moves <5%) and **SC-002** (content-writing · mid band contains both 500–1,050 and 3,330–4,440)
- [ ] T011 [US1] `src/lib/pricing/aggregate.ts`: delegate to `latentTruth`; delete the noisy-or block, the agreement multiplier and the standalone sample factor; expose `families[]`, `evidence_composition`, `band_kind`
- [ ] T012 [US1] Delete `src/lib/pricing/evidenceStrength.ts` and its test; remove its use from `ResultCard`
- [ ] T013 [US1] `resolve.ts` passes the new fields through `ResolveResult`

---

## Phase 5: Instrumentation — US3 (must precede any calibration)

- [ ] T014 [US3] Migration `..._band_snapshots.sql`: table + owner RLS
- [ ] T015 [US3] Write a snapshot at proposal creation in `src/app/actions/proposals/generateProposal.ts`, including `saw_band_first`
- [ ] T016 [US3] Reorder onboarding so `StepRates` elicits the stated rate BEFORE `OnboardingPricePreview` renders
- [ ] T017 [P] [US3] Migration `..._pricing_calibration.sql` + `src/lib/pricing/calibration.ts` shipping **inert**; unit test asserts empty table ⇒ bands byte-identical (SC-005)

---

## Phase 6: Display — US4

- [ ] T018 [US4] `ResultCard` state machine on composition: derived-only (evidence sentence first, ≈ prefix, round to 500, negotiation framing), disagreement (two named readings), transaction-backed
- [ ] T019 [US4] Composition labels naming derivation not rank; both catalogues; Arabic-Indic digits and counted-noun agreement
- [ ] T020 [US4] Extend `forClientAudience()` in `src/lib/proposals/artifact.ts` to exclude readings, composition, band and progress (SC-007)

---

## Phase 7: Hours — US5 (remainder)

- [ ] T021 [P] [US5] Migration `..._project_hours.sql` seeded 8/24/60/160 as `reasoned`, n=0
- [ ] T022 [US5] `src/lib/pricing/projectHours.ts` loader, precedence measured > stated > reasoned, override at n ≥ 5

---

## Phase 8: Verification

- [ ] T023 Merge gate: `pnpm typecheck && pnpm test`
- [ ] T024 Quickstart 3a–3d + 4: city parity, recompute from original, calibration inert, three card states in Arabic at mobile width
- [ ] T025 Client-facing redaction check (SC-007) on a real shared proposal link
- [ ] T026 Update `.claude/CLAUDE.md` 013 entry to shipped with measured outcomes

---

## Dependencies

```text
T001 baseline
  ↓
Phase 2 (US2) ──→ shrinks the grid 7×, unblocks everything
  ↓
Phase 3 (US5 part) ──→ prerequisite for λ ever being revisable
  ↓
Phase 4 (US1) 🎯 MVP
  ↓
Phase 5 (US3) ── independent of Phase 4; ship even if the estimator slips
  ↓
Phase 6 (US4) ── needs composition data from Phase 4
Phase 7 (US5 rest)
  ↓
Phase 8
```

## Implementation Strategy

**MVP = Phases 1–4.** City collapsed, transforms at read time, mixture estimator live. That is the
whole user-visible correction; Phases 5–7 make it learnable, legible and calibratable.

**The one thing not to get wrong**: T002's dedupe. Nulling `city_id` instead turns ~7 duplicates
per group into 7 wildcards, inflating evidence sevenfold while preserving the fabricated city
deltas as fake spread. T003 is the assertion that catches it.
