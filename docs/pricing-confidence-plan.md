# Plan: raise pricing confidence honestly (2026-07-29)

## The number today

```
confidence_score = mean(provenanceWeight × row.confidence × freshnessDecay) × min(1, n / 10)
```

Measured across all 700 live cells: **7%–20%, average 12%.** Every specialty, every tier
— not just the thin ones. Best cell's mean weight is 0.35, cells hold 3–8 rows.

Three factors, and it is worth being exact about which one is actually holding the score
down, because two of them are fixable without a single new user.

| Factor | Today | Ceiling | Headroom |
|---|---|---|---|
| `provenanceWeight` | 0.6 (`published_ref`) | 0.6 — the top of the taxonomy | none, by construction |
| `row.confidence` | 0.5–0.6, flat per source | 1.0 | **large, and free** |
| `min(1, n/10)` | 0.3–0.8 (n = 3–8) | 1.0 at n ≥ 10 | **large** |
| `freshnessDecay` | ~0.95 (sources are 2024–26) | 1.0 | negligible |

So `confidence_score` is not low because the sources are bad. It is low because each cell
holds too few rows and because every source is trusted identically regardless of how much
evidence it actually carries.

## The line this plan will not cross

Every one of these makes the number go up, and only some of them are honest:

| Move | Verdict |
|---|---|
| More cited sources per cell | ✅ real |
| Weight a source by the sample size it actually published | ✅ real |
| Per-tier rows instead of one national wildcard | ✅ real |
| First-party paid-invoice data | ✅ real, and the only structural fix |
| Lower the sample target from 10 | ❌ inflation |
| Raise `PROVENANCE_WEIGHT` because the number looks low | ❌ inflation |
| Renormalise so 0.36 renders as 100% | ❌ inflation, and worse than the disease |

The test for each phase below is the same: **would the claim still be true if a client
asked where the number came from?**

---

## Phase 1 — weight a source by the evidence it carries (no new data, ships now)

Today YunoJuno's **182,000 data points** and ProCopywriters' **298 respondents** both land
at `confidence` 0.5–0.6. That is not caution, it is a missing feature: the column exists
precisely to express this and we set it by hand to a constant.

Introduce a deterministic mapping from a source's published sample size to `row.confidence`:

| Published sample | `row.confidence` |
|---|---|
| ≥ 50,000 | 0.90 |
| 5,000 – 49,999 | 0.80 |
| 500 – 4,999 | 0.70 |
| 50 – 499 | 0.60 |
| < 50 or unstated | 0.50 |

Sources whose sample is not stated stay at 0.50 — the rule doubles as a filter, since a
report that will not say how many people it asked has told you something.

Effect on mean weight: `0.6 × 0.9 = 0.54` for the Stack Overflow and YunoJuno rows, against
`0.6 × 0.6 = 0.36` before.

> **Shipped 2026-07-29 — and the +40% written here was wrong.** Measured against the live
> corpus, the actual effect is **+10.7%** (12.1% → 13.4%), and **315 of 700 cells went DOWN**.
> The estimate above was arithmetic over the large surveys alone; it ignored that the 1,260-row
> unverifiable seed is 69% of all rows and held the joint-*highest* confidence (0.60) while
> publishing no sample at all. Under the rule it correctly falls to 0.50, cancelling most of the
> gain. Phase 1's value is **accuracy, not uplift** — the corpus was rating its least verifiable
> source as its most trustworthy. The volume increase belongs to Phase 2. See
> [`specs/012-source-sample-confidence/research.md`](../specs/012-source-sample-confidence/research.md).

Work: a `sourceConfidence()` helper + unit test, a column of sample sizes in
`source-checks.jsonl`, one backfill migration. No product change.

## Phase 2 — get n per cell to 10 (needs sourcing work, not engineering)

`min(1, n/10)` is currently halving most cells. Two ways up, in order of value:

**2a. Harvest the per-tier splits we already have access to.** YunoJuno publishes role and
seniority breakdowns "where there is sufficient and statistically meaningful volume", and
Robert Half publishes low/mid/high per role. Ingesting those as **tier-specific** rows does
two things at once: it multiplies n, and it replaces a national wildcard with a row that
genuinely describes that tier. Higher relevance and higher n from sources already cited.

**2b. Four more cited sources.** Each currently adds ~1 row per cell. Named targets with
verified methodology, in priority order:
- a Gulf/MENA rate report — closest to the market and still entirely missing
- a design-specific survey (AIGA or equivalent) for the four design specialties
- a photography rate survey — `photography` still rests on one source
- a voice-over rate card with a stated basis — `voice-over` likewise

Target: **n ≥ 10 in every live cell**, `sampleFactor` = 1.0. Combined with Phase 1 the
score reaches **~0.50** — four times today's average, all of it real.

## Phase 3 — first-party transactions (the only thing that breaks 0.6)

`published_ref` at 0.6 is the taxonomy's ceiling. Nothing sourced from a report can exceed
it, and that is correct: a report describes a market, it does not record a deal.

A **paid invoice is the actual transaction.** It is stronger evidence than any published
aggregate, and the current weights say the opposite (`submitted` = 0.5, below
`published_ref` = 0.6). That inversion should go, but only once the rows exist and only
with the verification ladder attached:

| Verification | Weight | Why |
|---|---|---|
| Paid invoice | 0.85 | the money moved; nothing beats it |
| Accepted proposal | 0.65 | a client agreed to the number |
| Sent proposal | 0.40 | an ask, not a clearing price |
| Draft estimate | — | never contributed |

Prerequisites, in order: consent toggle in Settings → the flywheel starts recording →
k-anonymity (already built) holds the cell back until 3 contributors → then re-weight.
**The test-account firewall is already shipped**, so the first rows to arrive will be real.

At `0.85 × 0.9 × fresh ≈ 0.75` mean weight with n ≥ 10, the score reaches **~0.75** — and
at that point the word "confidence" is finally describing something a freelancer would
recognise as confidence.

## Phase 4 — recalibrate the display, once, at the end

`evidenceStrength()` thresholds (0.10 / 0.20) and `MAX_ATTAINABLE_SCORE` (0.36) are pinned
to today's ceiling. Each phase moves that ceiling, so both must be re-derived — not nudged
— when Phase 3 lands, or every result will read "good" and the band will stop discriminating.
`evidenceStrength.test.ts` already fails if the top band becomes unreachable; add the
mirror assertion that the bottom band stays reachable, so the calibration cannot silently
drift to "everything is good".

Only once the score genuinely reaches ~0.75 does putting a percentage back on the card
become defensible.

---

## Trajectory

| Stage | Mean weight | n | Score | Reads as |
|---|---|---|---|---|
| today | 0.30–0.35 | 3–8 | **0.12** | limited / moderate |
| + Phase 1 *(shipped, measured)* | 0.24–0.42 | 3–8 | **0.134** | limited / moderate / good |
| + Phase 2 | 0.54 | ≥10 | **0.54** | good |
| + Phase 3 | 0.75 | ≥10 | **0.75** | good, and true |

## Superseded 2026-07-29 — the formula was most of the problem, not the data

The phases above assume the scoring formula is sound and only the corpus is thin. Measuring
said otherwise. Three separate things were wrong, and fixing them moved the average from
**16.1% to ~55%** without adding a single row:

1. **The sample factor counted rows.** `min(1, n/10)` was a stand-in for "how much evidence is
   behind this" — obsolete once every source records its published sample. The average cell
   rests on ~130,000 published observations and the row count was calling it thin because it
   held five rows. Now log-scaled on observations, floored at 0.25 for sources that state no
   sample (unquantified evidence is not absent evidence, and it is already penalised once at
   `sourceConfidence`).
2. **The score averaged rows**, so adding a mediocre source *lowered* confidence — the engine
   punished corroboration. It now accumulates the strongest row of each independent evidence
   family (`evidenceFamily.ts`). Not over rows: three rows from one document would otherwise
   read as three agreeing witnesses.
3. **`submitted` was weighted 0.5, below `published_ref` 0.6** — a paid Saudi invoice ranked
   below a US salary survey. Now 0.85, with the paid/quoted tiers separated by row confidence
   (0.70 vs 0.40) rather than by weight.

**The known weakness in this**: family accumulation assumes families fail independently. The
`editorial` family — the 1,260-row seed — is treated as an independent check on the foreign
reports, and it is not really evidence at all. It is the reason the average is ~55% rather
than the ~45% the cited sources alone would justify. Retire the seed and the number falls; that
was measured and reversed on the same day. Watch this if the seed ever leaves.

Phase 1 is engineering and ships in a day. Phase 2 is sourcing work, and the monthly
refresh agent already reports which specialties are starving. Phase 3 is gated on having
real users, and no amount of engineering shortens it.
