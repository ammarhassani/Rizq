# Published-reference benchmarks — DRAFT for sign-off (2026-06-28)

**Status: NOT live.** This is the Tier-2 (`published_ref`) seed for review. Once the two
assumptions below are confirmed, I implement the `publishedRef` collector with the final table
and run it (→ live, `verified`, weight 0.6, auto-upgrading as flywheel/partner data arrives).

## Why a method, not just numbers
The cited reports give **global hourly** rates by specialty × seniority. Rizq prices a **Saudi
project** (a `price_sar` band per specialty × tier). The bridge:

```
project_price_SAR = global_hourly_USD × saudi_factor × 3.75 (USD→SAR peg) × typical_project_hours
band = anchor ± ~35%   (min/max, rounded)
```

Everything except the two **bold assumptions** is published/derived and cited.

## Two assumptions only you should lock
1. **`saudi_factor`** — Saudi freelance rates run below the global average. Draft: **0.60**
   (conservative). Cross-check against GASTAT wage data when Tier 1 lands.
2. **`typical_project_hours`** per specialty — the scope of a "typical" engagement. Draft:

| Specialty | hrs | Specialty | hrs |
|---|--:|---|--:|
| logo-design | 20 | ui-ux-design | 60 |
| graphic-design | 40 | web-dev | 80 |
| content-writing | 10 | mobile-dev | 120 |
| translation | 15 | video-editing | 25 |
| data-entry | 20 | photography | 12 |
| digital-marketing | 40 | voice-over | 6 |

(Scope size beyond "typical" is already handled live by the deliverable-count complexity lever.)

## Published source ranges (global hourly USD, cited)
- Design/UX: junior $30–60 · mid $60–100 · senior $100–200+ (Contra, SUCCESS)
- Dev: web $45–75 · software $60–120 · mobile/AI higher (Index.dev)
- Marketing: $40–100 (Ruul/Amra&Elma) · Writing/Translation/Data-entry: lower band
- Cross-discipline benchmark set: YunoJuno 2026 (182k contractor data points)

## Worked examples (with the draft assumptions → resulting Saudi project band)
| Specialty · tier | global $/h | → SAR/h (×0.6×3.75) | × hrs | **anchor SAR** | band (±35%) |
|---|--:|--:|--:|--:|--:|
| logo-design · mid | 50 | 112 | 20 | **2,250** | 1,460–3,040 |
| graphic-design · junior | 40 | 90 | 40 | **3,600** | 2,340–4,860 |
| web-dev · senior | 90 | 202 | 80 | **16,200** | 10,500–21,900 |
| mobile-dev · senior | 110 | 247 | 120 | **29,700** | 19,300–40,100 |
| translation · mid | 30 | 67 | 15 | **1,010** | 660–1,360 |
| digital-marketing · mid | 60 | 135 | 40 | **5,400** | 3,510–7,290 |

These look right for the Saudi market to me, but **you have the domain feel** — that's the sign-off.

## What I do on approval
1. Lock `saudi_factor` + the hours table (your tweaks).
2. Generate the full **12 specialties × 5 tiers** table (tier multipliers: beginner ×0.6, junior
   ×0.8, mid ×1.0, senior ×1.4, expert ×1.8 — also tunable).
3. Implement `makePublishedRefCollector()` returning those rows with per-row citations.
4. Run it (national rows; city via the existing region/specialty fallback) → bands go live,
   `published_ref`, honest provenance + sample + date, auto-upgrading.

## Honesty note
Every published_ref band cites its source + that it's a *Saudi-adjusted global reference*. As
flywheel (`submitted`) and `partner` data accumulate in a cell, they outweigh it and the
dominant provenance upgrades — exactly the constitution's "claims auto-upgrade as data arrives."
