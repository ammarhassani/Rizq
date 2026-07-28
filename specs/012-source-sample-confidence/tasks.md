---

description: "Task list for 012-source-sample-confidence"
---

# Tasks: Weight each source by the sample size it published

**Input**: Design documents from `/specs/012-source-sample-confidence/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/source-confidence.md](contracts/source-confidence.md), [quickstart.md](quickstart.md)

**Tests**: Included. Constitution Principle IV names pricing explicitly — money and rules
logic is unit-tested before it ships, and FR-007 requires boundary coverage.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in every task

## Path Conventions

Next.js app at repository root: pricing logic in `src/lib/pricing/`, migrations in
`supabase/migrations/`, docs in `docs/`. Per [plan.md](plan.md) — no new directories.

---

## Phase 1: Setup

**Purpose**: Capture the before-state. Without it the central claims (prices unchanged, 315
cells down) cannot be verified afterwards.

- [X] T001 Run the baseline query from [quickstart.md](quickstart.md) step 0 against the `rizq` Supabase project and record the result (expected: 12.1% average across 700 cells) in a scratch note for comparison in T018–T020
- [X] T002 Record the current per-cell band values (min/anchor/max) for three specialties — `web-dev`, `graphic-design`, `photography` — so FR-006 can be checked exactly rather than approximately

**Checkpoint**: Baseline captured. Nothing has changed yet.

---

## Phase 2: Foundational

**Purpose**: The pure mapping every other phase depends on. Blocks all user stories.

- [X] T003 Create `src/lib/pricing/sourceConfidence.ts` exporting `SAMPLE_CONFIDENCE_BANDS`, `UNSTATED_SAMPLE_CONFIDENCE = 0.5` and `sourceConfidence(publishedSample: number | null | undefined): number`, implementing the mapping in [contracts/source-confidence.md](contracts/source-confidence.md); document in the file header why an unstated sample lands at the same value as the weakest stated band rather than lower
- [X] T004 Create `src/lib/pricing/sourceConfidence.test.ts` covering every boundary from the contract table (50000/49999, 5000/4999, 500/499, 50/49), the unstated cases (`null`, `undefined`), the implausible cases (`0`, `-1`, `NaN`, `Infinity`), a non-integer input, and the three guarantees: total, monotonic non-decreasing, never exceeds 0.9
- [X] T005 Run `pnpm vitest run src/lib/pricing/sourceConfidence.test.ts` and confirm green

**Checkpoint**: The mapping is correct in isolation. US3 is already partly satisfied.

---

## Phase 3: User Story 1 — A price backed by a large survey outranks one backed by a small one (P1) 🎯 MVP

**Goal**: Evidence strength beside a price reflects how much sample stands behind it.

**Independent test**: Look up a specialty fed by a large survey and one fed mainly by the
unstated-sample seed; confirm the evidence strength differs in the expected direction while
both price bands are unchanged.

- [X] T006 [US1] Create `supabase/migrations/20260729110000_source_published_sample.sql` adding nullable `public.benchmark_records.published_sample integer` with the column comment from [data-model.md](data-model.md) (state that NULL means the publisher stated none, and that it may differ from a headline total, naming the ProCopywriters 298/220/38 case)
- [X] T007 [US1] In the same migration, set `published_sample` per `source_ref` from the [data-model.md](data-model.md) seed table — YunoJuno 182000, Stack Overflow 23928, Robert Half 4200 (all four role URLs), EFA 1100, Nonprofit.ist 300, ProCopywriters 220 for `copywriting` and 38 for `content-writing`, NULL for IEEE-USA and the `Saudi-adjusted global freelance reference` seed
- [X] T008 [US1] In the same migration, recompute `confidence` from `published_sample` using the mapping, **restricted to `provenance in ('published_ref','ingested')`**; add a comment stating that including `founder` would raise editorial rows 0.30 → 0.50 and why that would be an inflation, per [research.md](research.md) Decision 2
- [X] T009 [US1] Apply the migration to the `rizq` project and verify with [quickstart.md](quickstart.md) step 3a that each source's confidence now matches its recorded sample
- [X] T010 [US1] Update `MAX_ATTAINABLE_SCORE` in `src/lib/pricing/evidenceStrength.ts` from `0.36` to `0.54` (`published_ref` 0.6 × best confidence 0.9), updating the explanatory comment so it states the new ceiling and how it is derived

**Checkpoint**: US1 delivered. Evidence strength now tracks evidence. Verifiable on its own.

---

## Phase 4: User Story 2 — Every source carries its published sample on the record (P2)

**Goal**: The weighting is auditable from the data, and a changed sample is detectable.

**Independent test**: Inspect the recorded sample for every source and confirm each matches
its publisher's stated figure or is explicitly marked unstated.

- [X] T011 [P] [US2] Add a `published_sample` field to every source entry in `docs/validation/source-checks.jsonl` (append new check lines rather than rewriting existing ones, per the file's append-only rule), using the figures from [research.md](research.md) Decision 4 and `null` for IEEE-USA and the legacy seed
- [X] T012 [P] [US2] Update `.claude/skills/refresh-pricing-sources/SKILL.md` so the monthly agent records and diffs each source's published sample, and classifies a changed sample as `revised` drift (FR-010)
- [X] T013 [US2] Verify with [quickstart.md](quickstart.md) step 3a that no active `published_ref` row is left with a NULL `published_sample` unless its publisher genuinely states none

**Checkpoint**: US2 delivered. Sample sizes are data, not prose.

---

## Phase 5: User Story 3 — A newly ingested source is weighted automatically (P3)

**Goal**: The hand-set path stops existing, so the defect cannot return.

**Independent test**: Ingest a source with a known published sample and confirm confidence is
derived without anyone setting it.

- [X] T014 [P] [US3] Add `published_sample?: number | null` to `BenchmarkRow` in `src/lib/pricing/collectors/types.ts` with the contract's doc comment
- [X] T015 [US3] Change `src/lib/pricing/collectors/publishedRef.ts` to accept a published sample per input and set `confidence` via `sourceConfidence()` instead of the hardcoded `0.6`
- [X] T016 [US3] Change `src/lib/pricing/collectors/openData.ts` to set `confidence` via `sourceConfidence()` instead of the hardcoded `0.4`, keeping the wage-bridge behaviour otherwise untouched
- [X] T017 [US3] Extend `src/lib/pricing/collectors/publishedRef.test.ts` and `openData.test.ts` with a case proving a large stated sample produces a higher confidence than an unstated one through the collector, not just through the mapping
- [X] T018 [US3] Add `published_sample` to the `public.run_ingestion` RPC's insert column list in a migration so future ingests persist it; rows omitting it insert NULL and read as unstated

**Checkpoint**: US3 delivered. No collector can hardcode confidence any more.

---

## Phase 6: Polish & Verification

- [!] T019 **FAILED AS WRITTEN — and the requirement was wrong, not the code.** `founder` rows correctly still read 0.30/0.30, and no stored `price_sar` changed. But bands DID move: `confidence` is a factor in the weight `weightedPercentile` uses, so re-weighting evidence necessarily re-places the band. 199 of 700 cells moved (avg −1.3%, extremes −85.9% / +44.4%). FR-006 withdrawn, replaced by FR-006a. Caught in the browser, not by the SQL check — the check compared raw `price_sar`, which was never going to move
- [X] T020 Run [quickstart.md](quickstart.md) step 3d and confirm the average rose to ~13.4% (≈ +11%, SC-002) **and that ~315 cells decreased** (SC-002a) — a run where nothing decreased is a failed run
- [X] T021 Run [quickstart.md](quickstart.md) step 3e and confirm live cells still span more than one evidence band (FR-008, SC-005); if they do not, recalibrate the `evidenceStrength` thresholds in this same change and note the new values in [data-model.md](data-model.md)
- [X] T022 Correct the Phase 1 trajectory row in `docs/pricing-confidence-plan.md` from 0.12 → 0.22 to the measured 0.12 → 0.13, and add one line stating that Phase 1's value is accuracy while Phase 2 (n ≥ 10) carries the volume
- [X] T023 Run the merge gate: `pnpm typecheck && pnpm test`, both clean
- [X] T024 Verify in a real browser per [quickstart.md](quickstart.md) step 4 — `/ar/tool`, one large-survey specialty and one seed-dominated specialty, confirming the price band is unchanged and the evidence line reads sensibly in Arabic
- [X] T025 Update the `specs/012-source-sample-confidence/` entry in `.claude/CLAUDE.md` from "tasks next" to shipped, recording the measured outcome rather than the projected one

---

## Dependencies

```text
Phase 1 (T001–T002)  ─── baseline, must precede everything
        ↓
Phase 2 (T003–T005)  ─── the mapping; blocks all three stories
        ↓
   ┌────┴─────────────────────────────┐
   ↓                                  ↓
Phase 3 US1 (T006–T010)          Phase 5 US3 (T014–T018)
   ↓                                  │
Phase 4 US2 (T011–T013)               │
   └────────────┬─────────────────────┘
                ↓
Phase 6 Polish (T019–T025)
```

- **US1 depends on** Phase 2 only. It is the MVP and ships alone.
- **US2 depends on** Phase 2; T013's verification is easier after US1 but not blocked by it.
- **US3 depends on** Phase 2 only, and is independent of US1/US2 — it changes the write path,
  which no existing row uses.
- **T018** touches the same RPC surface as T008's migration; sequence them to avoid two
  migrations racing on `run_ingestion`.

## Parallel Opportunities

- **T011 and T012** — different files (registry data vs skill doc), no shared state.
- **T014** is independent of the US1 migration work and can run alongside T006–T010.
- **US3 as a whole** can proceed in parallel with US1 once Phase 2 is green; they touch
  disjoint files (collectors + types vs migration + evidenceStrength).
- **T004** is written against the contract, so it can be authored before T003 exists if a
  test-first order is preferred.

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + Phase 3 (US1).** That delivers the whole user-visible change:
confidence tracks published sample, prices untouched. T001–T010, ten tasks.

Stop there and the feature is coherent — US2 makes it auditable and US3 stops it regressing,
but neither changes what a freelancer sees.

**Ship order**: Phase 2 first and alone (pure, reversible, zero risk). Then US1's migration,
which is the only irreversible step and the one to verify hardest. US2 and US3 can follow in
either order.

**The one thing not to get wrong**: T008's provenance filter. Without it, `founder` rows rise
0.30 → 0.50 and the change inflates the weakest evidence in the corpus while claiming to be an
honesty fix. T019 exists specifically to catch that.

---

## Post-implementation finding: the corpus holds two irreconcilable price regimes

Investigating the −85.9% outlier surfaced something larger than this feature, and it was
**pre-existing** — uniform confidence had been masking it.

`content-writing · Riyadh · mid` draws on two clusters that disagree by roughly 4×:

| Source | Prices |
|---|---|
| Saudi-adjusted seed (unverifiable, no stated sample) | 500 · 800 · 1,050 SAR |
| EFA + ProCopywriters (PPP-converted from USD/GBP) | 3,330 · 3,351 · 4,440 SAR |

A weighted median over a bimodal set does not average the two — it lands in whichever cluster
carries more weight. Before this feature the seed's 0.60 held it low; now EFA's 0.70 pulls it
high. Neither answer is a refinement of the other; they are different claims about what the
work is worth.

Open question for the founder, **out of scope for this feature**: either the PPP bridge
overstates Saudi rates for writing work, or the seed understates them. Until that is settled,
bands in the affected cells are unstable under any re-weighting. Candidate causes worth testing
first: `PROJECT_HOURS` (24h assumed for a "medium" project) may not fit writing work, and the
PPP factor converts purchasing power rather than what a Saudi client pays a freelancer.
