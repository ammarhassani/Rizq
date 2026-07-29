# Quickstart: verifying the family mixture estimator

Every step runnable; none requires reading the implementation. This feature moves every price in
the product, so the verification is a **before/after comparison** — capture the baseline first or
most of it is unfalsifiable.

## 0. Capture the baseline (before any migration)

```sql
-- Per-cell band inputs and evidence, today. Save the output.
select sp.slug, c.slug city, t.slug tier,
       count(*) rows, count(distinct b.source_ref) sources,
       round(min(b.price_sar)) lo, round(max(b.price_sar)) hi
from public.benchmark_records b
join public.specialties sp on sp.id = b.specialty_id and sp.active
cross join public.cities c cross join public.experience_tiers t
where b.active and b.verified and not b.flagged_as_outlier and c.active
  and (b.city_id = c.id or b.city_id is null)
  and (b.experience_tier_id = t.id or b.experience_tier_id is null)
  and (b.project_size = 'medium' or b.project_size is null)
group by 1,2,3;
```

Expected today: **700 cells**, ~2,112 active rows, 14 sources.

Also record the rendered band for three specialties via the app: `web-dev`, `content-writing`
(the 4× regime conflict), `photography` (editorial-heavy).

## 1. Unit level — the estimator

```bash
pnpm vitest run src/lib/pricing/latentTruth.test.ts src/lib/pricing/bridges.test.ts src/lib/pricing/familyBias.test.ts
```

The two that matter most, both replaying measured incidents:

- **Stability (SC-001)** — perturb any single source's weight ±20%, assert the anchor moves <5%.
  Baseline being replaced: one confidence change moved 199 of 700 bands, extremes −85.9% / +44.4%.
- **Bracketing (SC-002)** — for `content-writing · mid`, assert the band contains both the
  editorial cluster (500–1,050) and the converted cluster (3,330–4,440). Today's band sits inside
  one of them.

Also assert: `currencyBridge(0.5) ≈ 2.634` (geometric, not 2.80 — arithmetic interpolation would
quietly favour the peg).

## 2. Merge gate

```bash
pnpm typecheck && pnpm test
```

`evidenceStrength.test.ts` disappears with its module in the same commit — a missing file here is
expected, a failing one is not.

## 3. Data level — after each migration

**a. City collapse did not inflate evidence (SC-004)**

Re-run step 0's query. Assert per-cell `rows` and `sources` are **≤** baseline for every cell.
Greater anywhere means `city_id` was nulled rather than deduped — the trap in research.md D4.

```sql
select count(*) cells, sum(case when city_id is null then 1 else 0 end) national
from public.benchmark_records where active and verified;
```

Expect ~700 active rows, all national.

**b. Two cities give the same answer (SC-003)**

```sql
-- Same specialty and tier, different city → identical row sets.
```
Then in the app: run `graphic-design · Riyadh · mid` and `graphic-design · Jeddah · mid`.
Bands must be identical, and both cards must carry the national-scope line.

**c. Prices recompute from the original figure (SC-008)**

```sql
select source_ref, price_original, original_unit, price_sar
from public.benchmark_records
where active and price_original is not null limit 10;
```

Every row must be able to state its published figure, its unit, and the transform chain.

**d. Calibration is inert (SC-005)**

```sql
select count(*) from public.pricing_calibration;   -- expect 0
```

With the table empty, every band must be byte-identical to the value computed immediately before
`calibration.ts` shipped. Assert in a unit test, not by eye.

## 4. Product level

```bash
pnpm dev
```

Check three card states at mobile width, in Arabic:

| Specialty | Expected state |
|---|---|
| `web-dev` | agreed or disagreement, Saudi + foreign families named |
| `content-writing` | **disagreement** — two named readings, band spanning both |
| `photography` | derived-only — evidence sentence *above* the figure, ≈ prefix, rounded to 500 |

Every card carries the national line. No card shows limited/moderate/good.

**Client-facing redaction (SC-007)** — the check that matters most:

Create a proposal, enable sharing, open the public link. It must contain **none** of: the range,
the two readings, the evidence composition, the contribution progress. Only the chosen price.

## 5. Instrumentation (SC-006)

Create a proposal, then:

```sql
select proposal_id, anchor_sar, band_kind, saw_band_first, created_at
from public.band_snapshots order by created_at desc limit 5;
```

A row must exist. Then complete onboarding on a fresh account and confirm `StepRates` asked for
the rate **before** any Rizq estimate rendered — that ordering is the only pre-anchor observation
the system will ever get per user.

## Rollback

Each phase is independently reversible. The city collapse is `active = false` (flip back). The new
columns are additive. The new tables are empty. `latentTruth` is swapped in at one call site in
`aggregate.ts` — reverting that one delegation restores the previous band exactly, since no stored
price was rewritten.
