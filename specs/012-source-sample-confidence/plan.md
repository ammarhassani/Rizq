# Implementation Plan: Weight each source by the sample size it published

**Branch**: `012-source-sample-confidence` | **Date**: 2026-07-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/012-source-sample-confidence/spec.md`

## Summary

Every `published_ref` row in the benchmark carries a hand-set `confidence` of 0.50–0.60,
so a 182,000-point survey and a 298-respondent survey are trusted identically. This feature
records each source's **published sample size** on the row and derives `confidence` from it
through one deterministic mapping, applied identically at ingestion and in a backfill.

Phase 0 measurement changed the objective: the projected effect is **+10.7%**, not the +40%
estimated in `docs/pricing-confidence-plan.md`, and **315 of 700 cells go down** — because
the 1,260-row unverifiable seed is 69% of the corpus and currently holds the joint-highest
confidence while publishing no sample. This is therefore an accuracy change, not an uplift
change, and the spec's success criteria were revised to say so.

## Technical Context

**Language/Version**: TypeScript 5.x on Next.js 16 App Router (Node runtime)

**Primary Dependencies**: None added. Existing: `@supabase/supabase-js`, `vitest`.

**Storage**: Supabase Postgres — `public.benchmark_records` (1,824 active rows, 12 distinct
`source_ref` values), `public.collector_registry`, RPC `public.run_ingestion`

**Testing**: Vitest unit tests for the pure mapping; SQL verification queries for the backfill

**Target Platform**: Server-side only. No client bundle change.

**Project Type**: Web application (Next.js), library-style change inside `src/lib/pricing/`

**Performance Goals**: None — the derivation is a pure lookup applied at write time. Read-path
cost is unchanged; `resolvePrice` already selects `confidence`.

**Constraints**: No product or UI change. No new dependency. Prices must not move (FR-006).
The backfill runs once against production data and must be idempotent.

**Scale/Scope**: 1 new pure module + test, 1 additive column, 1 backfill migration, 1 type
extension, 1 constant correction, 2 doc updates. ~12 source rows touched, 1,824 DB rows updated.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| **I. Honesty is the moat** | ✅ **Driving principle** | The feature exists because the corpus rates its least verifiable source as its most trustworthy. FR-003 (absence of evidence is not evidence) and FR-009 (traceable to the publisher's statement) are the honesty gates. Phase 0 explicitly refused to exempt the seed to protect a headline number. |
| **II. Arabic-first, RTL** | ➖ N/A | No user-facing string changes. Existing bilingual evidence-band copy is untouched. |
| **III. Mobile-first** | ➖ N/A | No surface change. |
| **IV. Test the money and the rules** | ✅ Pass | Pricing is explicitly named in this principle. The mapping is a pure function with unit tests at every band boundary including unstated/implausible (FR-007). Backfill verified by SQL assertions on prices being unchanged. |
| **V. Modules stand alone** | ✅ Pass | Change is confined to the pricing module's own data model and lib. No cross-module surface. |
| **VI. Halal / Saudi-compliant** | ✅ Pass | No new data acquired, no scraping, no personal data. Records a figure each publisher already states publicly. |
| **VII. AI as multiplier** | ➖ N/A | No AI involved. Deliberately a deterministic table, not a model judgement. |

**Gate result: PASS.** No violations, so Complexity Tracking is omitted.

**Post-design re-check**: PASS. Design added no new project, no new dependency, and no
abstraction with a single implementation. The one structural question (row column vs sources
table) resolved toward the *smaller* option, and for a correctness reason rather than a
convenience one — see research.md Decision 3.

## Project Structure

### Documentation (this feature)

```text
specs/012-source-sample-confidence/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — measurement + 5 decisions
├── data-model.md        # Phase 1 — column, mapping table, backfill semantics
├── quickstart.md        # Phase 1 — how to verify the change end to end
├── contracts/
│   └── source-confidence.md   # The mapping contract + ingestion contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/lib/pricing/
├── sourceConfidence.ts          # NEW — published sample → confidence, pure
├── sourceConfidence.test.ts     # NEW — band boundaries, unstated, implausible
├── evidenceStrength.ts          # EDIT — MAX_ATTAINABLE_SCORE 0.36 → 0.54
├── collectors/
│   ├── types.ts                 # EDIT — BenchmarkRow gains published_sample
│   ├── publishedRef.ts          # EDIT — derive confidence, stop hardcoding 0.6
│   └── openData.ts              # EDIT — derive confidence, stop hardcoding 0.4
supabase/migrations/
└── 2026072911XXXX_source_published_sample.sql   # NEW — column + backfill + run_ingestion
docs/
├── pricing-confidence-plan.md   # EDIT — correct the Phase 1 trajectory
└── validation/source-checks.jsonl # EDIT — record published_sample per source
.claude/skills/refresh-pricing-sources/
└── SKILL.md                     # EDIT — report a changed sample as drift (FR-010)
```

**Structure Decision**: Existing layout. Pricing logic lives in `src/lib/pricing/` as pure,
unit-tested modules with the database reached only through `resolve.ts` and migrations; this
feature follows that shape exactly — one new pure module, one additive column, no new
directories.

## Implementation Phases

### P1 — the mapping (pure, no DB) — MVP, satisfies User Story 3

`sourceConfidence(publishedSample: number | null): number` plus its test. Bands per FR-002,
with `null`, zero, negative, and non-finite all landing at 0.50. Exported band table so the
migration and the docs quote one source of truth.

Independently shippable and independently testable: the function is correct or not regardless
of whether anything calls it.

### P2 — record the sample (schema + backfill) — satisfies User Stories 1 and 2

Additive nullable `benchmark_records.published_sample`, column comment naming what it means and
that it may differ from a source's headline total. One migration then:

1. sets `published_sample` per `source_ref` from the research.md table (per-discipline for
   ProCopywriters),
2. recomputes `confidence` from it **for `published_ref` and `ingested` rows only**,
3. leaves `founder` / `reasoned` / `submitted` untouched.

Verification queries in the same migration comment: prices unchanged, 315 cells down / 385 up,
no `published_ref` row left with a confidence that contradicts its sample.

### P3 — keep it true for future ingests

`BenchmarkRow.published_sample`, collectors deriving `confidence` via `sourceConfidence()`
instead of the hardcoded constants, `run_ingestion` persisting the new column, and
`MAX_ATTAINABLE_SCORE` corrected to 0.54 so the evidence-band test keeps its meaning.

### P4 — keep it visible

`source-checks.jsonl` gains `published_sample` per source; the refresh skill reports a changed
sample as drift (FR-010); `docs/pricing-confidence-plan.md` trajectory corrected from
0.12 → 0.22 to 0.12 → 0.13 with the reason.

## Risks

| Risk | Mitigation |
|---|---|
| Backfill silently changes prices | FR-006 is asserted by SQL before and after: min/anchor/max per cell must be identical. Prices derive from `price_sar`, which this migration never writes. |
| Every cell lands in one evidence band | Projected range 8.7%–23.2% still straddles both thresholds. Verified post-migration; FR-008 requires recalibration in the same change if violated. |
| A future ingest sets confidence by hand again | P3 removes the hardcoded constants from both collectors, so the hand-set path no longer exists. |
| The seed's drop is mistaken for a regression | research.md Decision 1 and SC-002a state the decrease is the intended, correct outcome and quantify it in advance. |
