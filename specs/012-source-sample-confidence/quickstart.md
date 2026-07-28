# Quickstart: verifying source sample confidence

How to prove this feature works. Every step is runnable; none requires reading the
implementation.

## Prerequisites

- `.env.local` with Supabase credentials (the repo's normal dev setup)
- Supabase MCP or `psql` access to the `rizq` project for the SQL checks
- Baseline captured **before** the migration runs — the whole verification is a comparison

## 0. Capture the baseline (before migrating)

```sql
-- Per-cell evidence score today. Save the output; step 3 compares against it.
with w as (
  select sp.slug, c.slug city, t.slug tier,
    case b.provenance when 'published_ref' then 0.6 when 'founder' then 0.3 else 0.4 end
      * b.confidence
      * greatest(0.1, 1.0 - 0.5 * (extract(epoch from (now() - b.captured_at)) / 2629800) / 18) as weight,
    b.price_sar
  from public.specialties sp
  cross join public.cities c cross join public.experience_tiers t
  join public.benchmark_records b on b.specialty_id = sp.id
   and b.active and b.verified and not b.flagged_as_outlier
   and (b.city_id = c.id or b.city_id is null)
   and (b.experience_tier_id = t.id or b.experience_tier_id is null)
   and (b.project_size = 'medium' or b.project_size is null)
  where sp.active and c.active
)
select round(avg(score) * 100, 1) avg_pct, count(*) cells
from (
  select slug, city, tier, avg(weight) * least(1.0, count(*) / 10.0) as score
  from w group by 1, 2, 3
) cell;
```

Expected today: **12.1%** across **700** cells.

## 1. Unit level — the mapping

```bash
pnpm vitest run src/lib/pricing/sourceConfidence.test.ts
```

Passes when every band boundary in [contracts/source-confidence.md](contracts/source-confidence.md)
holds, including `null`, `0`, `-1`, `NaN` → `0.5`.

## 2. Merge gate

```bash
pnpm typecheck && pnpm test
```

Both must be clean. `evidenceStrength.test.ts` is the one to watch: it asserts the top band is
reachable at `MAX_ATTAINABLE_SCORE`, so it fails if the constant was not moved 0.36 → 0.54.

## 3. Data level — after the migration

**a. Confidence now tracks sample**

```sql
select source_ref, published_sample, min(confidence), max(confidence), count(*)
from public.benchmark_records
where active and verified and provenance = 'published_ref'
group by 1, 2 order by published_sample desc nulls last;
```

Expect YunoJuno `182000 → 0.90`, Stack Overflow `23928 → 0.80`, Robert Half `4200 → 0.70`,
EFA `1100 → 0.70`, Nonprofit.ist `300 → 0.60`, ProCopywriters `220 → 0.60` and `38 → 0.50`,
IEEE-USA and the seed `NULL → 0.50`.

**b. Prices did not move (FR-006, SC-003)**

```sql
select count(*) from public.benchmark_records
where active and verified and price_sar is null;   -- expect 0
```

Then re-run the *band* portion of any pricing lookup and compare min/anchor/max against the
values recorded in step 0. They must be identical — this migration never writes `price_sar`.

**c. Editorial rows untouched (research.md Decision 2)**

```sql
select provenance, min(confidence), max(confidence)
from public.benchmark_records where active and verified group by 1;
```

`founder` must still be `0.30 / 0.30`. If it reads `0.50`, the backfill's provenance filter is
missing and the weakest evidence in the corpus was just promoted.

**d. The expected decrease actually happened (SC-002a)**

Re-run step 0's query. Expect **~13.4%** average — a rise of about **11%**, not 40%. Then:

```sql
-- Cells fed only by the unstated-sample seed must not have risen.
select round(avg(confidence), 2) from public.benchmark_records
where active and verified and source_ref like 'Saudi-adjusted global freelance reference%';
```

Expect `0.50`, down from `0.60`. **A run where nothing decreased is a failed run** — 315 of 700
cells are supposed to fall, because they were over-trusted.

**e. Bands still discriminate (FR-008, SC-005)**

Post-change scores should span roughly 8.7%–23.2%, straddling the 0.10 and 0.20 thresholds, so
`limited`, `moderate` and `good` all remain reachable. If every cell lands in one band, the
thresholds must be recalibrated before this ships.

## 4. Product level — nothing changed

```bash
pnpm dev
```

Open `/ar/tool`, run any lookup. The band (low / median / high) must be identical to before.
The evidence line may change band — that is the feature. Check one specialty fed by a large
survey (`web-dev`, Stack Overflow + YunoJuno) and one fed mainly by the seed (`photography`);
the first should hold or improve, the second may drop.

## Rollback

The column is additive and the derivation is pure, so rollback is a single UPDATE restoring the
prior constants (0.60 for `published_ref`, 0.40 for `ingested`) and dropping the column. No
price data is touched at any point, so nothing about a rollback can corrupt a band.
