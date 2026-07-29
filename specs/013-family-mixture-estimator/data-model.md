# Phase 1 Data Model: family mixture estimator

Two columns, three tables, one large deactivation. No table is dropped; no stored price is
rewritten in place.

## Changed: `public.benchmark_records`

| Column | Type | Null | Meaning |
|---|---|---|---|
| `price_original` | `numeric` | yes | The figure as its publisher printed it, before any Rizq transform. |
| `original_unit` | `text` | yes | What that figure is: `sar_project`, `sar_month`, `usd_hour`, `usd_year`, `gbp_day`. |

`price_sar` stays, and stays authoritative for rows predating the backfill. Where
`price_original` is present the engine recomputes from it; where it is NULL the stored
`price_sar` is used unchanged. That keeps the migration non-destructive and lets the backfill
land incrementally.

**Why the columns exist**: every transform is currently baked in at ingestion, so revising λ — the
whole point of this feature — would mean re-importing 2,112 rows. It also lets the citation print
*"SAR 25,000/month → ÷1250h ×1.25 ×1.30 ×2.63 = …"* against the publisher's actual number.

### The city collapse

No column changes. A migration:

1. Groups active editorial and founder rows by `(specialty_id, experience_tier_id, project_size)`.
2. Keeps **one national triple** (min / median / max) per group with `city_id = NULL`.
3. Deactivates every other copy (`active = false`, note appended).

**Do not simply NULL `city_id`.** `resolve.ts` treats a NULL city as *supports every city*, so
nulling ~7 duplicates per group turns them into 7 wildcards — inflating apparent evidence
sevenfold while preserving the fabricated city deltas as fake spread. Dedupe, then deactivate.

Keeping a **triple** rather than a single row preserves `MIN_SAMPLE = 3` for editorial-only cells,
which would otherwise fall below the floor and go dark.

| | before | after (expected) |
|---|---|---|
| active rows | 2,112 | ~700 |
| cells | 700 | ~100 |
| evidence reported per result | baseline | **≤ baseline** (SC-004) |

## New: `public.band_snapshots`

What the freelancer was shown at the moment they priced. The reflexivity instrument.

| Column | Type | Meaning |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid | owner; RLS `auth.uid() = user_id` |
| `proposal_id` | uuid | the proposal created at that moment |
| `anchor_sar`, `min_sar`, `max_sar` | numeric | the band displayed |
| `band_kind` | text | `agreed` / `disagreement` / `insufficient` |
| `evidence_composition` | jsonb | families and source counts behind it |
| `saw_band_first` | boolean | **the point of the table** |
| `created_at` | timestamptz | |

`saw_band_first = false` marks the only observations that carry information the anchor did not
already contain. Without this column, later calibration measures how persuasive Rizq was rather
than what the market pays — the failure three of five council reviewers caught and none of the
five experts did.

Every proposal created before this table exists is permanently uninformative for calibration.
That is why it is P4 and not P6.

## New: `public.pricing_calibration`

Per-family log-offsets learned from deviations. Ships **empty**.

| Column | Type | Meaning |
|---|---|---|
| `family` | text pk | matches `EvidenceFamily` |
| `delta_log` | numeric | learned offset, log space |
| `n_obs` | integer | observations behind it |
| `distinct_contributors` | integer | k-anonymity accounting |
| `updated_at` | timestamptz | |

**Invariant**: empty table ⇒ every published band byte-identical to today (FR-015 / SC-005).
This is what makes it safe to ship before any data exists.

Update rules, enforced in `calibration.ts`:

- Reads only cells with ≥ 3 distinct contributors — the same gate as k-anonymity.
- Signal is `ln(charged / anchor_shown)` from `band_snapshots`, **never** `ln(charged)`.
- Winsorized at ±ln 3.
- Conjugate update against `FAMILY_PRIORS` with a declared pseudo-count (n₀ ≈ 10–25), so five
  early web-dev invoices cannot swing the corpus.

## New: `public.project_hours`

Hours per project size, carrying provenance.

| Column | Type | Meaning |
|---|---|---|
| `specialty_id` | uuid | |
| `project_size` | project_size | |
| `hours` | numeric | |
| `provenance` | text | `reasoned` \| `stated` \| `measured` |
| `n` | integer | observations behind it |
| `as_of` | timestamptz | |

Seeded with today's 8 / 24 / 60 / 160 as `reasoned`, `n = 0`. Precedence at read:
`measured > stated > reasoned`, overriding at `n ≥ 5` per (specialty × size).

Inputs: optional `proposals.expected_hours`, optional `gigs.actual_hours` at completion.

**Banned**: inferring hours from `paid ÷ hourly anchor`. The freelancer quoted the anchor, so the
"measurement" returns the constant it was built to test. Three critiques caught three separate
experts proposing it (research.md D6).

## Retired

`src/lib/pricing/evidenceStrength.ts` and its test are deleted. The limited/moderate/good tiers
read a score that no longer exists; evidence *composition* replaces them on the card.

## Invariants the migrations must preserve

| Invariant | Check |
|---|---|
| No stored `price_sar` rewritten by the city collapse | Only `active` and `notes` in the UPDATE's SET list |
| Evidence per result does not grow (SC-004) | Row/source counts per cell compared before and after |
| Editorial-only cells stay above `MIN_SAMPLE` | Keep the triple, not a single row |
| Calibration inert (SC-005) | Empty `pricing_calibration` ⇒ bands identical, asserted in unit test |
| No new personal data | `band_snapshots` holds figures already shown to that user; RLS owner-scoped |
