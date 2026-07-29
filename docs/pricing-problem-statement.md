# The Rizq pricing problem — a statement for someone who has not seen this codebase

**Written 2026-07-29.** Every number here was measured against the live database on that
date, not estimated. Where something is an assumption it is labelled as one.

---

## 1. What the product has to answer

A Saudi freelancer describes a job — "a logo for a Riyadh coffee brand", "a 12-page bilingual
site", "an explainer video" — and Rizq answers **"here is what to charge, in SAR, and here is
why you should believe it."**

The second half is the product. Rizq's stated moat is honesty: every figure cites its
provenance, its sample and its date, or it declares uncertainty. A number without a defensible
origin is worth less than no number, because the freelancer will quote it to a client and be
asked where it came from.

The engine resolves a **cell** — one combination of `specialty × city × experience tier ×
project size` — into a band (low / median / high) plus an evidence score.

Grid: **20 specialties × 7 cities × 5 tiers = 700 live cells** (× 4 project sizes).

---

## 2. The core difficulty

**There is no SAR-native, freelance-native price data available anywhere.** Not behind a
paywall, not for purchase. It does not exist in published form.

Every obtainable source is missing at least one of the three properties that matter:

| Source type | Currency | Employment or freelance | Saudi or foreign | Transform needed |
|---|---|---|---|---|
| Foreign freelance rate reports (YunoJuno, EFA, ProCopywriters) | USD/GBP | freelance ✅ | foreign ❌ | currency bridge |
| Foreign salary surveys (Stack Overflow, Robert Half) | USD | employment ❌ | foreign ❌ | currency **and** employment bridge |
| Gulf salary guides (Robert Walters) | **SAR** ✅ | employment ❌ | **Saudi** ✅ | employment bridge only |
| Editorial seed | SAR ✅ | freelance ✅ | Saudi ✅ | **none — but unverifiable** |
| First-party transactions | SAR ✅ | freelance ✅ | Saudi ✅ | **none — but zero exist** |

The last row is the whole problem. The only source needing no transform is the one with no data
in it.

**Current state: 2,112 live rows, 14 sources, 0 first-party rows, 0 real users.** All 53
accounts are test accounts from automated runs. Not one verified Saudi freelance transaction has
ever passed through this system.

---

## 3. The transforms, and what each one assumes

Every non-Saudi figure passes through one or both of these before becoming a price.

### 3.1 Currency: purchasing power, not exchange rate

```
sar = usd × 1.85          World Bank PA.NUS.PPP, Saudi Arabia, 2024
```

Not the SAMA peg (3.75). Rationale, and it checks out against economic practice: PPP is the
correct bridge for **non-tradable, labour-intensive local services**, while nominal exchange
rates suit tradable goods. Saudi freelancers serving Saudi clients are the textbook non-tradable
case.

**Assumptions embedded:** that Saudi freelance work is genuinely non-tradable (false for anyone
billing international clients); and that a **GDP-wide** deflator applies to one specific service
sector (PPP is computed across an entire consumption basket, not for professional services).

### 3.2 Employment → freelance

```
freelance_hourly = annual_salary / 1250 × 1.25 × 1.30
```

- `1250` — billable hours a freelancer actually invoices per year (vs ~2,080 a salary buys)
- `1.25` — overhead an employer would otherwise carry (leave, GOSI, equipment, software, admin)
- `1.30` — freelance premium (risk, no security, unpaid client acquisition)

**All three constants were chosen by an AI assistant during this session and have never been
calibrated against anything.** They are plausible. They are not measured.

### 3.3 Time → project

```
price = hourly × PROJECT_HOURS[size]        small 8 · medium 24 · large 60 · enterprise 160
```

Also invented in this session. **This multiplies every single price in the product**, and it is
almost certainly wrong per-specialty — a "medium" writing job and a "medium" web build do not
both take 24 hours.

---

## 4. The measured contradiction

Three groups of sources disagree about the same work, in opposite directions, and nothing can
adjudicate between them.

### 4.1 Saudi-priced vs PPP-converted — Saudi is ~2× higher

Robert Walters publishes Saudi salaries already in SAR, so it skips the currency bridge
entirely. Against the PPP-converted sources for the same specialties:

| specialty | Saudi-priced | PPP-converted | ratio |
|---|---|---|---|
| digital-marketing | 10,483 | 3,797 | **2.76×** |
| data-analytics | 12,168 | 4,548 | **2.68×** |
| web-dev | 12,168 | 5,211 | **2.33×** |
| ui-ux-design | 11,232 | 5,489 | 2.05× |
| product-management | 11,232 | 5,973 | 1.88× |

Read one way: **the PPP bridge understates Saudi rates by roughly half.**
Read another: recruiter data skews to large employers and overstates the freelance market.
Both readings are consistent with the evidence. Nothing available distinguishes them.

### 4.2 Editorial seed vs PPP-converted — the seed is ~4× *lower*

For `content-writing · Riyadh · mid`:

- editorial seed: **500 · 800 · 1,050 SAR**
- EFA + ProCopywriters, PPP-converted: **3,330 · 3,351 · 4,440 SAR**

A weighted median over a bimodal set does not average the two — it lands in whichever cluster
carries more weight, so the band *lurches* between regimes under any re-weighting. This was
observed directly: a change to source confidence moved 199 of 700 bands, extremes −85.9% and
+44.4%.

### 4.3 So there are three regimes

1. Editorial Saudi guess — **lowest**, unverifiable, no stated sample, no resolvable citation
2. PPP-converted foreign — **middle**, well-cited, two invented bridges
3. Saudi salary-derived — **highest**, well-cited, one invented bridge, employment-based

They span roughly **8× end to end**. There is no ground truth to rank them.

---

## 5. The structural weakness nobody had noticed

**Not one cited source has ever provided city-level data.**

| source group | rows | rows with a city | distinct cities |
|---|---|---|---|
| cited sources (all 12 real publications) | 492 | **0** | **0** |
| editorial seed (unverifiable) | 1,260 | 1,260 | 7 |
| founder editorial | 360 | 360 | 3 |

Every real publication reports nationally. The **only** thing distinguishing Riyadh from Jeddah
in this product is data nobody can verify.

The city axis is one of three grid dimensions — a **7× multiplier on the cell count** — and it
is supported entirely by guesswork. Retire the seed and Riyadh vs Jeddah becomes literally
undifferentiated, while the UI keeps asking the freelancer to choose.

The tier axis is nearly as thin: only one source (Robert Half) publishes experience-banded
figures, and it covers 3 of the 5 tiers.

---

## 6. The current engine, stated exactly

### Band
Weighted percentile over rows in the cell — p10 / p50 / p90.
`row_weight = provenanceWeight × row_confidence × freshnessDecay`

- `provenanceWeight` — submitted 0.85, published_ref 0.6, partner 0.5, ingested 0.4, founder 0.3, reasoned 0.2
- `row_confidence` — from the source's **published sample size**: ≥50k → 0.90, ≥5k → 0.80, ≥500 → 0.70, ≥50 → 0.60, unstated → 0.50
- `freshnessDecay` — piecewise linear: 1.0 at 0 months, 0.5 at 18, 0.1 at 36

### Evidence score
```
score = accumulate(strongest row per evidence family)   # noisy-or: 1 − Π(1 − w)
      × sampleFactor                                     # log(Σ published sample per distinct source) / log(10,000), floored 0.25
      × agreement                                        # 1.0 if family medians within 1.5×, floored 0.3 by 5×
```

**Evidence families** (rows within a family do not corroborate each other, because they share a
derivation): `first_party`, `gulf_recruiter`, `freelance_rate`, `salary_bridged`, `open_data`,
`editorial`.

Displayed as three bands — limited / moderate / good — not as a percentage, because the raw
number's scale has no meaning a user could interpret.

### Where it currently sits
Average evidence ≈ **38–41%**. 2.0 families/cell for the 14 specialties with no Saudi source,
3.4 for the 6 that have one.

### What this design already gets right
- Adding a mediocre source no longer *lowers* confidence (it did, when the score averaged rows)
- Rows from one document no longer read as independent witnesses
- Disagreement between sources now *reduces* confidence (it used to slightly increase it)
- Sample is counted once per source, not once per row lifted from it

### What it still cannot do
- Decide which of the three regimes is right
- Represent "we have two credible and incompatible answers" — it emits one band
- Say anything defensible about a city
- Learn from a transaction, because none exist

---

## 7. The proposed direction, and what it would require

> *Enrich the USD pool further, treat SAR as a parallel pool, then engineer better logic to
> reconcile them.*

The instinct is sound: keeping the pools separate stops one contaminating the other, and it is
already half-built — the evidence-family split is exactly that separation.

But reconciliation needs a **calibration function** between the pools, and calibration needs
paired observations: the same job, priced both ways. There are none, and no amount of additional
USD data creates one. More USD data makes the USD pool more precise about a market that is not
Saudi Arabia.

There is also a hard limit worth knowing before investing effort: **every purchasable source is
foreign or dollar-denominated.** Khamsat prices from $5, Mostaql $25–$10,000 — the Arabic
marketplaces are USD too. The only SAR-native freelance marketplace is Bahr, which publishes no
rate data. Marketplace scraping is permanently excluded (PDPL + Anti-Cyber Crime Law, and it
would void the "cited, not scraped" claim the product rests on).

---

## 8. The actual open questions

1. **With three mutually inconsistent regimes and no ground truth, what is the right estimator?**
   Pooling them produces a number no source supports. Picking one is an unjustified assertion.
   Is there a defensible third option?

2. **Should the product emit one band at all?** When credible sources disagree 2–4×, a single
   band conceals the disagreement. Would showing the regimes separately — "salary-derived says
   X, freelance-report-derived says Y" — serve the freelancer better, or just move the decision
   onto someone with less information than us?

3. **How should this be built so that first-party data arbitrates as it arrives?** The first
   real invoices will be sparse and non-random (early adopters, certain specialties). What
   structure lets 10 real transactions meaningfully update a corpus of 2,000 derived rows
   without either being drowned or over-fitting?

4. **Is the city dimension defensible?** No cited source distinguishes cities. Options: drop it,
   keep it as an unbacked user preference, or model it from an external cost-of-living index and
   say so. Asking a freelancer to choose a city that changes nothing real is arguably a lie of
   interface.

5. **How should the three invented constants be calibrated?** `PROJECT_HOURS`, the 1.25 overhead
   and the 1.30 premium multiply every price. Proposals carry a `deliverable_count` and invoices
   carry a paid amount — is that enough to regress them out, and how many observations before it
   beats the guess?

6. **What is the right cold-start behaviour?** For 14 of 20 specialties the honest answer today
   is "we have foreign estimates and no local evidence." The current product shows a confident
   band with a quiet evidence label. Is there a presentation that is both honest and still useful
   at the moment of quoting a client?

---

## 9. Constraints any answer must respect

- **No marketplace scraping, ever.** PDPL + Anti-Cyber Crime Law. Non-negotiable, and it is also
  the claim the product's credibility rests on.
- **Every figure cites provenance, sample and date, or declares uncertainty.** A feature that
  cannot be honest about its data does not ship.
- **SAR only.** Multi-currency was built end-to-end and deliberately reverted — Rizq is
  Saudi-domestic by founder decision.
- **Arabic-first, RTL, mobile-first.** Copy ships in both languages.
- **PDPL.** First-party contribution is opt-in, anonymised, and suppressed below 3 distinct
  contributors per cell.

---

## 10. The one-sentence version

*Rizq must publish defensible Saudi freelance prices, but the only sources that exist are
foreign, or measure salaries instead of freelance work, or are unverifiable guesses — they
disagree with each other by up to 8×, no ground truth exists to rank them, three invented
constants sit under every figure, and the single dimension the UI asks users to choose (city) is
supported by no real evidence at all.*
