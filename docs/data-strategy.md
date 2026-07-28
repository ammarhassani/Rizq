# Rizq data strategy — making the pricing data "insane" (2026-06-27)

## Measured state of the corpus (2026-07-28 — check this before trusting anything below)
1,621 rows: `published_ref` 1,260, `founder` 360, `submitted` 1, and **zero** `ingested` /
`partner` / `reasoned`. Counted against the live DB, not the plan:

- The 1,260 `published_ref` rows share **one** `source_ref` and **one** capture date. They are
  ~420 min/median/max triples derived from a single draft document — not 1,260 observations.
  Per cell: **240 of 420 cells hold 3 rows from 1 source**; 179 hold 5 rows from 2 sources.
- Every cell therefore clears `MIN_SAMPLE = 3`, so `resolvePrice` has never widened and has
  never returned `insufficient_data`. The fallback ladder and k-anonymity are unexercised.
- The trend layer cannot fire: `sameBasis()` compares `founder` rows (sized) against
  `published_ref` rows (`project_size` NULL) and rejects every national pool.
- Tier 3 is **not running**: `contribute_benchmarks` is true for 0 of 53 users and no UI sets it,
  so `contribute_benchmark` no-ops on every paid invoice. The single `submitted` row came from a
  test account — and test accounts are indistinguishable (51/53 are gmail.com, `role` is only
  free/pro/admin). **Any consent default flipped on would let the e2e harness write fabricated
  prices into the corpus.** A test-account exclusion has to ship with the consent toggle, not after.
- Every `proposals` / `gigs` row in the DB today is test data. Do not backfill the flywheel from it.

### Where it stands after 2026-07-29

| | before | after |
|---|---|---|
| rows | 1,621 | **1,824** |
| distinct sources | 3 (2 unverifiable) | **12** (7 cited + 3 legacy + 2 retired) |
| active specialties | 12 | **20** |
| live cells resolving | 420 / 420 | **700 / 700** |
| avg sources per cell | 1.0 | **2.42** |

1. **The citation counts sources, not just rows** (`aggregate.source_count`). "3 records" now
   reads "3 records from 1 source". Verified in-browser in both locales.
2. **National rows.** `city_id` / `experience_tier_id` are nullable and mean "applies to any" —
   a published report says "Software Engineering, £533/day", not "Riyadh, senior". Storing them
   this way is what made the sources below usable without fanning one figure across 35 cells.
3. **Six cited sources ingested**, all national, all with a real publication date:
   YunoJuno 2026 (182k data points) · EFA 2026 (1,100+ respondents) · Stack Overflow 2025
   (23,928) · ProCopywriters 2024 (298) · Nonprofit.ist 2025 (300+) · IEEE-USA 2025.
4. **Everything foreign converts at purchasing power**, never the SAMA peg: World Bank
   `PA.NUS.PPP` — Saudi 2024 = 1.85, UK 2024 = 0.664153. Salaried sources additionally pass the
   employment→freelance bridge (`÷1250 billable h × 1.25 overhead × 1.30 premium`). Every row
   carries its own arithmetic in `notes`.
5. **Specialties expanded 12 → 22, then trimmed to 17.** Five were deactivated (not deleted)
   for sitting under the 3-record floor: product-management, project-management, proofreading,
   transcription, motion-graphics. Each needs 1–2 more sources and flips back automatically.
6. **Monthly refresh agent** — `.claude/skills/refresh-pricing-sources/` + a scheduled cloud
   routine. Re-reads every source, diffs against `docs/validation/source-checks.jsonl`, opens a
   PR. **Never ingests**; the PR is the approval gate.
7. **Copy corrected across the app.** "Real Saudi data", "based on N Saudi freelancers", "higher
   than X% of freelancers", "every contribution is hand-reviewed", "the index updates continuously
   as new submissions come in" — all were false, all replaced with what is actually true.

8. **Test-account firewall** (`users.is_test_account`, enforced inside `contribute_benchmark`
   before consent is even read). The e2e harness drives invoice→paid, which calls that RPC;
   only the opt-in default was stopping it, and test accounts are indistinguishable (51/53
   gmail.com, `role` is only free/pro/admin). The harness now declares itself. The one existing
   `submitted` row — contributed by a test account on 2026-05-14 — is deactivated.
9. **Robert Half 2026 Salary Guide** added (placements + Textkernel validation + ~4,200
   surveyed, Sept 2025), reactivating product-management, project-management and proofreading.
   Only `transcription` and `motion-graphics` remain off, each needing one more source.

Still weakest, in order:

- **The 1,260-row unverifiable seed.** Measured, not guessed: retiring it today drops **310 of
  700 cells** below the floor across 10 specialties. It stays until cited sources cover those
  cells; replace it incrementally, never in one move.
- `PROJECT_HOURS` (8/24/60/160) as the hours-per-project assumption — the weakest number in the
  stack, and the first thing real `submitted` data should replace with a regression.
- Stack Overflow's global medians treated as international dollars.
- `photography` and `voice-over` still rest on a single source.
- **Confidence renders 9–14%** on live results. That is the formula being honest
  (`provenance 0.6 × confidence 0.5 × freshness × sample/10`), not a bug — with ≤5 records and
  no first-party data it cannot go higher. Left alone deliberately: every way to make that
  number look better is a way of inflating it.


## Goal
Turn Rizq's pricing from a thin editorial estimate into the **most credible, freshest,
most granular freelance price-discovery dataset in Saudi Arabia** — and a compounding moat.

## Hard rails (non-negotiable — constitution VI + I)
- **No marketplace scraping. Ever.** (PDPL + Anti-Cyber Crime Law.) All data is **licensed,
  editorial/published, model-reasoned, open-government, or user-consented.**
- Every number cites **dominant provenance + sample size + date range** and declares
  uncertainty; AI/reasoned output is labeled; claims auto-upgrade as real data arrives.

## What already exists (the engine is built — it's starved, not missing)
- `src/lib/pricing/aggregate.ts` — weighted aggregation with **freshness decay**
  (`freshness.ts`), **provenance weighting** (`provenance.ts`), confidence scoring, sample
  size, and date range. (This is the Levels.fyi-grade methodology — recency-weighted, not
  Glassdoor's stale 5-year blend.)
- Pluggable **collector interface** (`collectors/types.ts`) with `openData`, `publishedRef`,
  `reasoned` collectors. **`openData` and `publishedRef` are stubs** (the open-data one throws
  "not implemented", seeded disabled). Only `reasoned` is live → hence the thin band.
- Provenance weights already tuned: `published_ref 0.6 · partner 0.5 · submitted 0.5 ·
  ingested 0.4 · founder 0.3 · reasoned 0.2`, with bilingual honesty labels — **including
  `submitted` = "verified freelancer submissions."** The flywheel was anticipated in the design.

**Conclusion:** we don't rebuild — we **feed** the engine from four tiers and sharpen the
methodology.

---

## Tier 1 — Open government data (`ingested`) — *quick win, PDPL-clean*
Saudi open data is rich, free, machine-readable (CSV/JSON/XML + **APIs**), and fully compliant:
- **GASTAT** (stats.gov.sa) — labor-market stats + **average monthly wage by specialization &
  education level** (the granular cut we need).
- **Saudi Open Data Portal / SDAIA** (`data.gov.sa`) — 11,439+ datasets, APIs; Labor Force
  Survey + wage-by-specialization.
- **DataSaudi** (datasaudi.sa, MEP) — wages by quarter/region/occupation (aggregate).
- **KAPSARC** data portal — Labor Force Survey API.

**Method (documented + honest):** wages are employment, not freelance, so convert via a
transparent model: `freelance_rate ≈ (annual_salary / billable_hours) × (1 + overhead) ×
freelance_premium`, with billable-hours/overhead/premium constants published in the methodology
page. Implement `makeOpenDataCollector` (currently the stub) against the GASTAT/data.gov.sa
wage dataset; normalize → `ingested` rows keyed by specialty × region. This **replaces the
6-record seed with a national wage-grounded floor for every specialty/city.**

**Status 2026-07-28 — built, blocked on the dataset.** `makeOpenDataCollector` now implements the
conversion (`wageToHourlyRate` / `wageToProjectRate`, constants exported and unit-tested; each row
records its own derivation in `notes`). What is missing is the data, and it cannot be fetched
programmatically from here:

- `open.data.gov.sa` (which carries *Average monthly wages for paid employees*) rejects automated
  requests at the WAF; `od.data.gov.sa` 302s onto it. Not a scraping target either way.
- KAPSARC's Opendatasoft API *is* reachable but carries no occupation-granular wage set —
  `wages-and-salaries-by-establishment-size-and-economic-activity` is a 2017 sector wage bill and
  `labor-force-survey-data` is unemployment rates by age.
- The GASTAT figure that is publicly quotable (10,238 SAR average monthly wage across four
  sectors) is **Q2 2018** and has no occupation dimension.

So the export is downloaded by hand and passed to the collector. Two founder decisions are still
open and neither should be guessed in code: the **occupation → specialty mapping**, and whether one
national wage may be fanned across the city × tier grid (the collector deliberately refuses to do
this on its own). Ingesting also needs a `collector_registry` row of its own — `open_data_etimad`
is a different source (procurement) and stays disabled.

## Tier 2 — Published references (`published_ref`) — *cite, don't scrape*
Reputable, citable rate reports (their **published aggregate numbers**, not scraped listings):
- **YunoJuno 2026 Contractor & Freelancer Rates Report** — 182,000 contractor data points by
  discipline (AI/creative/digital/engineering/marketing/tech).
- **Index.dev** developer rates by country, **Contra** UX rate guide, SUCCESS/Ruul marketing
  rates, etc.
These are global → apply a transparent **Saudi adjustment factor** (PPP / cost-of-living /
local-market) and tag `published_ref` (weight 0.6 — our highest). Implement `makePublishedRefCollector`
(stub today) as a small editorial table refreshed quarterly with citations.

## Tier 3 — The proprietary flywheel (`submitted`) — **the moat / the "insane" part**
Rizq sits on the **actual transaction**, which salary sites never see:
- the **asked price** (every proposal),
- the **outcome** (sent → accepted / declined = market clearing),
- the **paid amount** (invoice marked paid = ground truth).

Wire every proposal/invoice into a **consented, anonymized** `submitted` benchmark observation,
tagged `specialty × city × experience_tier × deliverable_count × outcome × captured_at`. This is
better than crowdsourced salaries because:
1. **It's real accepted/paid prices**, not aspirational self-reports.
2. **It captures outcome** → enables *price-to-win* intelligence ("65% of clients accept at ≤ X")
   — a thing no salary database can do.
3. **It's Saudi-specific and scope-aware** (calibrates the `deliverable_count` complexity curve
   we just shipped with real data instead of a guessed +10%).
4. **Network effect:** more users → denser the specialty×city×scope grid → tighter bands →
   more value → more users. Data compounds.

**Verification ladder** (the Levels.fyi "upload your W-2" trick, Rizq-native): a price backed by
a **paid invoice** > an **accepted proposal** > a **sent** one > a **draft estimate**. Weight
`submitted` rows by verification tier × recency. PDPL: opt-in consent at onboarding, aggregate-only,
k-anonymity (suppress cells with < k contributors), never expose another user's figure.

## Tier 4 — Partnerships (`partner`)
Licensed aggregate bands from institutions that hold real Saudi freelance volume:
- **HRSD freelance platform / مرن (freelance.sa)** — **2.25M+ registered freelancers** (Vision 2030).
- **Monsha'at** (SME authority), Saudi **design/dev guilds, bootcamps, agencies**, and a Saudi
  **payment processor / fintech** (anonymized invoice-value bands by category).
Editorial/data partnerships → `partner` rows (weight 0.5). Highest credibility per data point;
slowest to land.

---

## Methodology upgrades to be genuinely best-in-class
1. **Recency weighting** — already have `freshnessDecay`; tune the half-life per tier (submitted
   decays slower than published).
2. **Verification-tier weighting** for `submitted` (paid > accepted > sent).
3. **Bayesian backoff / shrinkage** — a sparse cell (e.g. Riyadh × logo × senior) borrows from
   its parents (national × logo, Riyadh × design) instead of going thin; report the borrow in
   provenance. Removes "only 6 records" embarrassment.
4. **Outcome-aware pricing** — expose a *price-to-win* percentile alongside the band (from Tier 3
   outcome data): "price at X → ~70% acceptance."
5. **Scope calibration** — replace the heuristic complexity curve with a regression on
   `submitted` price vs deliverable_count.
6. **Auto-upgrade thresholds** — as a cell's `submitted`/`partner` N crosses a threshold, the
   dominant provenance and confidence auto-upgrade (the constitution's "claims auto-upgrade").

## Honesty surfaced (the moat, already 80% wired)
The pricing card already shows provenance + sample + date. Add: **verification mix**
("3 paid · 5 accepted"), **recency** ("median age 4 months"), and the **price-to-win** line —
so the number doesn't just look credible, it *is*, transparently.

## Roadmap
- **Now (quick wins, weeks):** implement `openData` (Tier 1) + `publishedRef` (Tier 2)
  collectors → replaces the thin seed immediately; wire the `submitted` flywheel (Tier 3) so
  data compounds from today; ship k-anonymity + consent.
- **Next (methodology):** verification weighting, Bayesian backoff, outcome-aware percentile,
  scope calibration.
- **Ongoing (partnerships):** pursue HRSD/مرن + 1–2 community/fintech `partner` deals.

The flywheel (Tier 3) is the part that becomes *insane*: every proposal written in Rizq makes the
next proposal's price smarter — a compounding, Saudi-specific, outcome-aware price graph that
**cannot be scraped or bought**, only grown.

## Sources
- [GASTAT Labor Market Statistics Q3 2025](https://www.stats.gov.sa/en/w/news/146)
- [2.25m freelancers join the national economy (Arab News)](https://www.arabnews.com/node/2584265/business-economy)
- [Saudi Open Data Portal / National Data Bank](https://data.gov.sa/en) · [open.data.gov.sa (Wikipedia)](https://en.wikipedia.org/wiki/Open.data.gov.sa)
- [DataSaudi](https://datasaudi.sa/en) · [KAPSARC Labor Force Survey](https://datasource.kapsarc.org/explore/dataset/labor-force-survey-data/)
- [YunoJuno 2026 Contractor & Freelancer Rates Report (182k data points)](https://www.yunojuno.com/freelancer-rates-report)
- [Index.dev freelance developer rates by country](https://www.index.dev/blog/freelance-developer-rates-by-country) · [Contra UX rate guide 2025](https://contra.com/p/E76BRgUW-freelance-ux-rate-guide-2025-pricing-your-design-services-for-profit-and-value)
- [Levels.fyi real-time compensation benchmarking (verified, network-effect model)](https://www.levels.fyi/offerings/data/)
