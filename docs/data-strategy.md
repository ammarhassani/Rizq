# Rizq data strategy — making the pricing data "insane" (2026-06-27)

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
