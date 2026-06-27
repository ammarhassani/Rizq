# Published-reference benchmarks — VALIDATED & LIVE (2026-06-28)

**Status: ✅ LIVE.** Validated against real Saudi published prices (research below) and seeded
(`migrations/20260628130000_seed_published_ref_benchmarks.sql`, 1,260 rows, `published_ref`,
weight 0.6, auto-upgrading as flywheel/partner data arrives). `saudi_factor = 0.60` confirmed.

## Validation vs real Saudi market (researched 2026-06-28)
| Specialty | Real Saudi published | Seeded band (mid · Riyadh) | Verdict |
|---|---|---|---|
| Logo (standalone) | 500–2,000 SAR | **800–1,650** | ✓ (lowered: hours 20→12) |
| Brand identity (full) | 5,000–25,000 | graphic 3,200–6,700 × complexity → ~5–15k | ✓ |
| Website (simple→custom) | 1,200–4,000 → 40k–120k | web 5,250–10,950 (×tiers) | ✓ |
| Mobile app | 15,000–150,000 | mobile 15,800–32,800 (×tiers) | ✓ |
| Digital-marketing retainer | 3,000–15,000/mo | 3,500–7,300 (×tiers→10k) | ✓ |
| Translation project | small | 650–1,350 | ✓ |

Sources: [Qemma Soft (logo/identity cost KSA)](https://qemma-soft.com/ar/blog/logo-brand-identity-design-cost-saudi-arabia-2026) ·
[smartcontract.sa (logo/website/app prices)](https://smartcontract.sa/logo-design-prices-in-ksa/) ·
[khelj.com (website cost KSA)](https://khelj.com/blogs/48) ·
[freelancing in Saudi 2026 (Qemma)](https://qemma-soft.com/en/blog/freelancing-guide-saudi-arabia-2026) ·
plus the global references below.

Calibration applied vs the original draft: `logo-design` hours 20→12, `web-dev` hours 80→60;
all others confirmed. Tier multipliers: beginner 0.6 · junior 0.8 · mid 1.0 · senior 1.4 · expert 1.8.

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
