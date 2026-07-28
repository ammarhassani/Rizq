# Phase 1 Data Model: source sample confidence

## Changed entity: `public.benchmark_records`

One additive column. No table is created, no column is dropped, no type changes.

| Column | Type | Null | Meaning |
|---|---|---|---|
| `published_sample` | `integer` | yes | Number of observations the publisher states stand behind **the figure this row uses**. NULL = the publisher stated none. |

**Column comment (ships with the migration):**

> Number of observations the source's publisher states stand behind the figure this row uses.
> NULL means the publisher stated no sample — which is not the same as a small one, and lands
> in the lowest confidence band. May differ from a source's headline total: ProCopywriters
> surveyed 298 freelancers overall but reports the content-writing rate from 38 of them, and
> 38 is the honest number for a content-writing row.

### Why the row and not a sources table

Sample size is a property of *the figure used*, not purely of the publication. ProCopywriters
publishes 298 overall, 220 copywriters, 38 content writers. A `benchmark_sources` table keyed
on `source_ref` cannot express that without a per-row override column — which is this column,
plus a join. See research.md Decision 3.

### Validation rules

- `published_sample` is either NULL or a positive integer. Zero, negative and non-integer
  values are treated as unstated by the derivation rather than rejected at write time, so a
  bad upstream figure degrades to caution instead of failing an ingest.
- No foreign key. `source_ref` is free text by existing design and this column follows it.
- No index. It is written at ingest and read by migrations, never by a query path.

## Derived attribute: `confidence`

Existing column, now derived rather than hand-set.

```
confidence = sourceConfidence(published_sample)      -- published_ref, ingested
confidence = unchanged                               -- founder, reasoned, submitted
```

### Mapping (FR-002)

| Published sample | Confidence |
|---:|---|
| ≥ 50,000 | 0.90 |
| 5,000 – 49,999 | 0.80 |
| 500 – 4,999 | 0.70 |
| 50 – 499 | 0.60 |
| < 50 | 0.50 |
| NULL / zero / negative / non-finite | 0.50 |

Thresholds are editorial judgement about orders of magnitude, not a statistical derivation.
The spec records this in Assumptions rather than implying rigour the numbers do not have.

### Provenance scope

| Provenance | Derived? | Why |
|---|---|---|
| `published_ref` | ✅ | Publishes a sample; this is the whole target |
| `ingested` | ✅ | Open government data states its survey base |
| `founder` | ❌ | States no sample. Would rise 0.30 → 0.50 — an inflation dressed as an honesty fix |
| `reasoned` | ❌ | Model estimate, fixed at 0.20 by design |
| `submitted` | ❌ | A freelancer's own price. Its strength is verification tier, not sample — that is Phase 3 of the confidence plan |

## Seed values (from research.md Decision 4)

Applied by the backfill, keyed on `source_ref` (and `specialty_id` for ProCopywriters).

| `source_ref` prefix | `published_sample` | → confidence | was |
|---|---:|---|---|
| `YunoJuno 2026…` | 182000 | 0.90 | 0.60 |
| `Stack Overflow Developer Survey 2025…` | 23928 | 0.80 | 0.50 |
| `Robert Half 2026 Salary Guide…` (4 refs) | 4200 | 0.70 | 0.50 |
| `Editorial Freelancers Association 2026…` | 1100 | 0.70 | 0.60 |
| `Nonprofit.ist…` | 300 | 0.60 | 0.50 |
| `ProCopywriters Survey 2024…` + specialty `copywriting` | 220 | 0.60 | 0.50 |
| `ProCopywriters Survey 2024…` + specialty `content-writing` | 38 | 0.50 | 0.50 |
| `IEEE-USA Consultants Fee Survey 2025…` | NULL | 0.50 | 0.50 |
| `Saudi-adjusted global freelance reference…` | NULL | 0.50 | **0.60 ↓** |
| `Rizq founder editorial seed…` | NULL | *(untouched)* | 0.30 |

The last two rows are the ones to read twice. The seed is 1,260 rows — 69% of the corpus —
and it is the one that goes **down**.

## Invariants the backfill must preserve

| Invariant | Check |
|---|---|
| No price moves (FR-006) | `price_sar` is never in the UPDATE's SET list; per-cell min/anchor/max compared before and after |
| Non-published provenance untouched | `founder` rows still all at 0.30; `reasoned` still 0.20 |
| Idempotent | Re-running produces no further change — derivation is a pure function of `published_sample` |
| Bands still discriminate (FR-008) | Post-migration cell scores span more than one `evidenceStrength` band |
| Unstated sources gain nothing (SC-004) | Cells sourced only from NULL-sample sources show no increase |

## Downstream constant

`MAX_ATTAINABLE_SCORE` in `src/lib/pricing/evidenceStrength.ts` moves **0.36 → 0.54**
(`published_ref` weight 0.6 × best confidence 0.9). It is not decoration:
`evidenceStrength.test.ts` asserts the top band is reachable at the maximum, so leaving it
stale would let the bands drift out of calibration without a failing test.
