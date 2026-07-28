# Phase 0 Research: source sample confidence

## Decision 1 — the projected effect is +11%, not +40%, and that is the finding

**Decision**: Proceed, but restate the objective. This feature is a **correctness** change,
not an uplift change. `SC-002` in the spec was written against an arithmetic estimate and is
wrong; it must be revised to match the measurement below before implementation starts.

**Measurement** (run against the live corpus, simulating the mapping in SQL before writing
any code):

| | today | projected |
|---|---|---|
| average evidence score across 700 live cells | 12.1% | **13.4%** |
| change | — | **+10.7%** |
| cells that go **down** | — | **315** |
| cells that go **up** | — | 385 |
| range | 7–20% | 8.7–23.2% |

**Rationale**: The original +40% estimate came from the good sources alone — YunoJuno at
0.60 → 0.90, Stack Overflow 0.50 → 0.80. It ignored the largest block in the corpus. The
1,260-row `Saudi-adjusted global freelance reference` seed is **69% of all rows** and today
carries **0.60, the joint-highest confidence in the table**, while stating no sample size at
all. Under FR-003 it correctly falls to 0.50. That single correction cancels most of the
gain from the two large surveys.

The 315 cells that decrease are not a regression. They are cells that were over-trusted, and
the whole point of the feature is that the number should track the evidence. A change that
only ever moved confidence upward would be the suspicious one.

**Alternatives considered**:
- *Exempt the seed to protect the headline number.* Rejected outright — it is the single row
  block with no verifiable sample, so exempting it would invert the rule at exactly the point
  the rule exists for.
- *Abandon the feature because +11% is not worth it.* Rejected. The uplift was never the
  point; the corpus currently rates its least verifiable source as its most trustworthy, and
  that is worth fixing on its own. The large uplift belongs to Phase 2 (n ≥ 10 per cell),
  which this feature does not attempt.

**Consequence for the wider plan**: `docs/pricing-confidence-plan.md` shows a trajectory of
0.12 → 0.22 after Phase 1. That is wrong for the same reason and must be corrected to
0.12 → 0.13, with the note that Phase 1's value is accuracy and Phase 2 carries the volume.

## Decision 2 — the mapping applies to published sources only

**Decision**: Derive confidence from published sample size for `published_ref` and
`ingested` rows. `founder`, `reasoned` and `submitted` keep their existing handling.

**Rationale**: A founder editorial row states no sample, so a naive reading of FR-003 would
put it in the "unstated" band at 0.50 — **raising** it from today's 0.30. That would inflate
the weakest evidence in the corpus under the banner of an honesty fix. The `confidence`
column means "how much sample stands behind this source's figure" only for sources that
publish figures; for editorial and model-reasoned rows it encodes something else entirely,
and `PROVENANCE_WEIGHT` is where their weakness is already expressed.

**Alternatives considered**:
- *Apply the mapping to every provenance.* Rejected: silently raises founder rows 0.30 → 0.50.
- *Give founder rows an explicit sample of 0 so they land in the lowest band.* Rejected: 0.50
  is still above 0.30, so it inflates just as much while looking more principled.

## Decision 3 — sample size lives on the row, not in a sources table

**Decision**: Add a nullable `published_sample` integer to `benchmark_records`.

**Rationale**: The spec's edge case is real and decides this — ProCopywriters publishes 298
respondents overall but **220 copywriters and 38 content writers**, and the honest sample for
a content-writing row is 38, not 298. Sample is therefore not purely a property of the source;
it is a property of the figure used. A row-level column represents that directly. A separate
sources table would need a per-row override anyway, which is the same column plus a join.

**Alternatives considered**:
- *`benchmark_sources` lookup table keyed by `source_ref`.* Rejected: cannot express the
  per-discipline sample without a row-level override, so it adds a table and still needs the
  column.
- *Parse the sample out of the existing `notes` prose.* Rejected: unparseable, unqueryable,
  and it is exactly the "recorded in prose, discarded where it matters" failure this feature
  exists to fix.

## Decision 4 — recorded samples for the twelve current sources

Each verified against the publisher's own statement. The conservative end of any approximation
is used, per the spec's edge cases.

| Source | Published sample | Band | Confidence (was) |
|---|---:|---|---|
| YunoJuno 2026 Rates Report | 182,000 data points | ≥50k | **0.90** (0.60) |
| Stack Overflow Developer Survey 2025 | 23,928 respondents | 5k–49,999 | **0.80** (0.50) |
| Robert Half 2026 Salary Guide (×4 role URLs) | 4,200 surveyed | 500–4,999 | **0.70** (0.50) |
| Editorial Freelancers Association 2026 | 1,100 ("over 1,100") | 500–4,999 | **0.70** (0.60) |
| Nonprofit.ist 2025 | 300 ("over 300") | 50–499 | **0.60** (0.50) |
| ProCopywriters 2024 — copywriting | 220 copywriters | 50–499 | **0.60** (0.50) |
| ProCopywriters 2024 — content-writing | 38 content writers | <50 | **0.50** (0.50) |
| IEEE-USA Consultants Fee Survey 2025 | unstated | unstated | **0.50** (0.50) |
| Saudi-adjusted global freelance reference (seed) | unstated | unstated | **0.50** (0.60 ↓) |
| Rizq founder editorial seed | n/a — not `published_ref` | — | 0.30 unchanged |

Robert Half is one publisher under four `source_ref` values (one per role URL); the guide-wide
methodology of ~2,000 workers plus ~2,200 hiring managers applies to all four.

## Decision 5 — display bands need re-checking, not yet recalibrating

**Decision**: Keep the `evidenceStrength` thresholds (0.10 / 0.20) for now; verify against the
post-change distribution and only move them if FR-008 is violated.

**Rationale**: Projected range is 8.7%–23.2%, which still straddles both thresholds, so cells
remain distributed across all three bands. `MAX_ATTAINABLE_SCORE` does change — the ceiling
becomes `0.6 × 0.9 = 0.54` rather than 0.36 — and that constant must be updated because
`evidenceStrength.test.ts` asserts the top band is reachable at the maximum.

**Alternatives considered**:
- *Recalibrate thresholds pre-emptively.* Rejected: the measurement says they still
  discriminate. Moving them now would be tuning against a number nobody has observed yet.

## Open items carried into implementation

None. No `NEEDS CLARIFICATION` markers remained in the spec, and the two design questions
(scope of the mapping, storage location) are decided above.
