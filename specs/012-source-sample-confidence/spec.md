# Feature Specification: Weight each source by the sample size it published

**Feature Branch**: `012-source-sample-confidence`

**Created**: 2026-07-29

**Status**: Draft

**Input**: User description: "Weight each benchmark source by the sample size it actually published (Phase 1 of docs/pricing-confidence-plan.md). Today every published_ref row carries a hand-set row.confidence of 0.5–0.6 regardless of evidence: YunoJuno's 182,000 data points and ProCopywriters' 298 respondents are trusted identically. Introduce a deterministic sample-size → confidence mapping (>=50k: 0.90, 5k–49,999: 0.80, 500–4,999: 0.70, 50–499: 0.60, <50 or unstated: 0.50), record each source's published sample size, and backfill existing rows. Sources that do not state a sample stay at 0.50. No product/UI change; no new dependency. Raises the confidence score ~40% with zero new evidence because the evidence was always there and the schema flattened it."

## Context

Rizq's pricing benchmark holds 1,824 rows drawn from 12 distinct sources. Each row carries a
`confidence` value that feeds the evidence-strength calculation shown beside every price.
That value is presently set **by hand to a constant** at ingestion — 0.60 for directly
published freelance rates, 0.50 for anything that crossed a salary or currency bridge.

The consequence: a survey of **182,000 booking data points** and a survey of **298
respondents** contribute to a price band with identical trustworthiness. The information
needed to tell them apart was published by both, was read and written into prose during
ingestion, and was then discarded at the one point it mattered.

Measured today, evidence strength lands at 7%–20% across all 700 live cells (average 12%).
This feature addresses one of the three factors behind that figure — the only one
correctable without acquiring a single new data point.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A price backed by a large survey outranks one backed by a small one (Priority: P1)

A Saudi freelancer looks up the market rate for their specialty. Two cells they check rest
on a similar number of records, but one draws on nationwide surveys of tens of thousands of
professionals and the other on a few hundred. The evidence strength shown beside each price
reflects that difference, so the freelancer knows which of the two numbers to lean on when
quoting a client.

**Why this priority**: This is the entire feature. Without it the remaining stories are
bookkeeping. It is also the only story that changes what a user sees.

**Independent Test**: Look up two specialties whose bands are dominated by sources with very
different published sample sizes and confirm the reported evidence strength differs in the
expected direction. Fully testable without either story below.

**Acceptance Scenarios**:

1. **Given** a band dominated by a source that published a sample of 100,000+, **When** the
   freelancer views the result, **Then** the evidence strength shown is higher than before
   this feature, and higher than a comparable band dominated by a source that published a
   sample of a few hundred.
2. **Given** a band dominated by a source that published no sample size, **When** the
   freelancer views the result, **Then** the evidence strength is unchanged — an unstated
   sample earns no promotion.
3. **Given** any band, **When** the freelancer views the result, **Then** the price itself
   (low, median, high) is identical to before this feature.

---

### User Story 2 - Every source carries its published sample size on the record (Priority: P2)

Anyone auditing the benchmark — the founder, a reviewer, a future maintainer — can read each
source's published sample size from the data itself rather than inferring it from prose in a
migration comment or re-opening the original report.

**Why this priority**: Makes the weighting auditable, and lets the monthly refresh detect
when a source's sample changes between editions. Valuable, but the freelancer never sees it,
so it ranks below Story 1.

**Independent Test**: Inspect the recorded sample for every source in the corpus and confirm
each matches the publisher's stated figure or is explicitly marked unstated.

**Acceptance Scenarios**:

1. **Given** a source whose publisher states a sample size, **When** its record is
   inspected, **Then** the recorded sample matches the published figure.
2. **Given** a source whose publisher states none, **When** its record is inspected, **Then**
   it is explicitly marked unstated rather than left blank or guessed at.

---

### User Story 3 - A newly ingested source is weighted automatically (Priority: P3)

When the next rate report is added, its trustworthiness is derived from the sample size it
published rather than chosen by whoever writes the migration.

**Why this priority**: Stops the defect returning. No effect until the next ingestion, so it
ranks last — but it is what makes this more than a one-off cleanup.

**Independent Test**: Ingest a source with a known published sample and confirm the resulting
confidence matches the mapping without anyone setting it by hand.

**Acceptance Scenarios**:

1. **Given** a new source with a stated sample, **When** its rows are ingested, **Then** their
   confidence is derived from that sample.
2. **Given** a new source with no stated sample, **When** its rows are ingested, **Then** their
   confidence is the lowest band.

---

### Edge Cases

- **A source states a range or approximation** ("over 1,100 members", "nearly 2,000 workers").
  The conservative end of the stated figure is used, never the flattering one.
- **A source's headline total is not the sample behind the figure Rizq uses** — a survey of
  4,200 people reporting one discipline's rate from 38 of them. The sample recorded is the one
  behind the figure actually used, not the headline.
- **A source publishes a new edition with a different sample.** The recorded sample must be
  able to change, and the change must flow through to confidence.
- **A stated sample is implausible** (zero, negative, non-numeric). Treated as unstated and
  placed in the lowest band rather than trusted.
- **Existing rows already carry a hand-set confidence.** The backfill must not silently lower
  a row that was already justified, nor raise one whose source states no sample.
- **The change pushes every cell into the top display band.** If every result reads the same,
  the band has stopped discriminating and must be recalibrated rather than left.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST derive each benchmark row's confidence from the published sample
  size of its source, using a single deterministic mapping. This applies to rows sourced from
  published reports and open data. Editorial and model-reasoned rows are **excluded**: they
  publish no sample, and placing them in the "unstated" band would *raise* their confidence
  above the value editorial judgement already assigned. See [research.md](research.md),
  Decision 2.
- **FR-002**: The mapping MUST be: sample ≥ 50,000 → 0.90; 5,000–49,999 → 0.80; 500–4,999 →
  0.70; 50–499 → 0.60; below 50, unstated, or implausible → 0.50.
- **FR-003**: A source that publishes no sample size MUST receive the lowest band. Absence of
  evidence MUST NOT be treated as evidence.
- **FR-004**: The system MUST record, for every source in the corpus, the published sample
  behind the figures Rizq uses, or an explicit marker that none was published.
- **FR-005**: Existing benchmark rows MUST be updated to the derived confidence, so the
  correction reaches the corpus already in place and not only future ingestions.
- **FR-006**: ~~Prices (low, median, high) MUST NOT change as a result of this feature.~~
  **WITHDRAWN — the requirement was impossible.** `confidence` is a factor in the weight
  `provenanceWeight × confidence × freshnessDecay` that `weightedPercentile` uses to place the
  band, so any change to confidence necessarily moves the band. Discovered in the browser after
  implementation: `graphic-design · Riyadh · mid` moved its median from 4,000 to 3,400 SAR while
  every underlying `price_sar` was untouched. Measured across the corpus: **199 of 700 cells
  moved**, average −1.3%, extremes −85.9% and +44.4%. The replacement requirement is FR-006a.
- **FR-006a**: No row's stored `price_sar` may change. Band movement caused by re-weighting is
  expected and MUST be measured and reported, not prevented — a benchmark that re-weights its
  evidence and produces the same answer has not re-weighted anything.
- **FR-007**: The derivation MUST be unit-tested at every band boundary, including the unstated
  and implausible cases.
- **FR-008**: After the change the evidence-strength bands MUST still distinguish between
  cells; if every live cell lands in one band, the bands MUST be recalibrated in the same
  change.
- **FR-009**: Each recorded sample MUST be traceable to the publisher's own statement, so a
  reader can verify it against the original report.
- **FR-010**: The monthly source refresh MUST report a change in a source's published sample
  as drift, exactly as it reports a changed figure.

### Key Entities

- **Source**: A published report standing behind one or more benchmark rows, identified by its
  citation. Gains a *published sample size* — the number of observations its publisher states
  stand behind the figures Rizq uses — or an explicit "unstated".
- **Benchmark row**: A single price observation. Already carries a confidence; that value now
  derives from its source's published sample rather than being set by hand.
- **Confidence band**: The mapping from published sample size to confidence. One table, applied
  identically at ingestion and at backfill.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every source in the corpus has either a recorded published sample matching its
  publisher's stated figure, or an explicit "unstated" marker. None is left blank or guessed.
- **SC-002**: Average evidence strength across all live cells rises by at least 8% relative to
  the pre-change measurement, with no new benchmark rows added. *(Revised during Phase 0 from
  "at least 30%". The original figure was an arithmetic estimate over the large surveys alone;
  measuring the mapping against the live corpus projects **+10.7%**, because the 1,260-row seed
  — 69% of all rows — currently holds the joint-highest confidence while stating no sample, and
  correctly falls. See [research.md](research.md), Decision 1.)*
- **SC-002a**: Cells whose evidence is dominated by a source that states no sample MUST
  **decrease**. A change that only ever moves confidence upward would not be tracking evidence.
  Projected: 315 of 700 cells decrease, 385 increase.
- **SC-003**: No price band's low, median or high value changes by any amount.
- **SC-004**: Cells whose evidence comes only from sources with no published sample show no
  increase in evidence strength.
- **SC-005**: Live cells remain distributed across more than one evidence-strength band.
- **SC-006**: A reviewer can trace any row's confidence to a specific published sample and the
  rule that produced it, without reading application code.

## Assumptions

- Published sample size is a property of the **source**, not the individual row. Where a source
  publishes a per-discipline sample (ProCopywriters reports 220 copywriter respondents within
  298 total), the more specific figure is the honest one to record, and the design allows it.
- The band thresholds (50,000 / 5,000 / 500 / 50) are an editorial judgement about the orders
  of magnitude that matter, not a statistical derivation. They are recorded as such and are
  expected to be revisited alongside the wider confidence work.
- A raised confidence is not a claim that a price is more accurate — only that more observations
  stand behind it. Existing copy already states sample size and source count separately and
  continues to do so.
- The evidence-strength display, its bands, and the aggregation formula are reused unchanged.
  This feature changes one input to that formula.
- No new data source is acquired. Any increase comes from correctly reading evidence already
  ingested.
- Sample sizes for the twelve current sources already exist in prose in the ingestion migrations
  and the source-check registry, so no source needs re-reading from its publisher to complete the
  backfill — though each will be verified against its registry entry.
