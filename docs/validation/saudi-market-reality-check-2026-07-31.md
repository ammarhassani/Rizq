# Saudi market reality check — 2026-07-31

Nine agents looked up what Saudi and Arabic freelance work publicly sells for, and compared it
against our published bands. **Observation only. Nothing here was ingested**, and nothing here is
cited by the engine — this was a check on our own arithmetic, in the same spirit as the audit that
found the flat-hours error worth 2.4× on every writing price.

Rules held: no listing enumeration, no dataset assembly, published aggregates preferred over
browsing, blocked sites reported rather than worked around.

## What it caught in our own data

**Four specialties priced a few days below a few hours.** Visible to any user who moves the size
slider.

| | small | medium |
|---|---|---|
| mobile-dev | 14,096 | 12,658 |
| photography | 3,991 | 3,667 |
| translation | 1,110 | 865 |
| voice-over | 2,579 | 2,118 |

Traced to the founder editorial seed: in **11 of 12** specialties it covers, its medium sits below
its small. Fixed by clearing its size claim — see
`20260731090000_retire_founder_seed_size_claim.sql`. Inversions now **0 of 20**.

## Where our numbers survive

Two figures, and only on magnitude:

- **Logo, medium (2,304 SAR)** — a Saudi freelance guide puts a complete logo at 500–3,000, and a
  Riyadh agency's top package (5 concepts, all formats, brand book, 10–14 days) at 2,499. We sit
  just under the agency ceiling.
- **Mobile, small (14,096)** — Saudi agencies floor a shipped simple app at ~15,000, freelance
  8,000–30,000. Right magnitude, wrong label: only true if "small" means a whole app.

## Where our numbers are wrong

One direction throughout: **too high, on small work.**

| specialty | we say (small) | Saudi market | scope |
|---|---|---|---|
| logo-design | 2,013 | **1,000–1,199** | complete logo, 3–4 concepts, revisions, files, 7–10 days |
| content-writing | 1,273 | **150–400** | one 1,000-word Arabic article |
| video-editing | 3,435 | **300–1,200** | 3-minute freelance edit |
| translation | 1,110 | **~150–600** | 3–5 pages at 40–120 SAR/page |
| voice-over | 2,579 | **200–2,000** | 1–2 minute read at 200–1,000/finished minute |
| web-dev | 7,291 | **2,000–8,000** | entire 5-page bilingual site |
| digital-marketing | 6,884 | **1,500–5,000 per month** | wrong unit entirely |

**The structural finding**: nothing in the Saudi market is sold by the few-hour. The smallest
advertised unit is a complete deliverable — one logo, one article, one page, one finished video.
Our entire "small" column is priced in a unit the market does not transact in. That is one design
flaw, not seven bad numbers.

## What could not be seen

- **Bahr publishes nothing.** The government's own freelance platform has cleared 20,000+ projects
  and every fixed-price posting reads "budget not specified" — including brand-identity jobs
  sitting exactly on our logo scope. The best possible source of real Saudi prices is closed.
- **The Arabic marketplaces are the wrong market, not a weak one.** Khamsat and Mostaql price in
  dollars, show asks and client ceilings rather than paid prices, and their supply is largely
  Egyptian and Moroccan. Saudi voice-over runs 200–1,000 SAR/minute against a ~19 SAR pan-Arab
  micro-gig; that 25× gap is two economies. **Nothing from those platforms should ever be used to
  argue our numbers down.**
- **Most Saudi "price guides" are SEO marketing.** Only two pages in the exercise were real price
  lists a buyer can transact against. Three Saudi sources price the identical "5–8 page company
  website" at 1,500–3,000, 8,000–20,000 and 21,000–60,000 — a 40× spread with no visible scope
  difference. They copy each other, so agreement between them is not confirmation.
- **Ten specialties returned no Saudi price at all**: ai-automation, business-strategy,
  cloud-devops, data-analytics, data-entry, product-management, project-management, proofreading,
  ui-ux-design, commercial photography. Five of our six largest figures live there —
  product-management 17,029, project-management 12,853, data-analytics 9,519, business-strategy
  9,075, ui-ux-design 8,156. **Silence is not agreement.**

## One flag, not a finding

A Saudi client on Mostaql budgeted **375–938 SAR for ten days** of government-tender proposal
writing. One posting, a client ceiling rather than a paid price — but it is the only unambiguously
Saudi *demand* the exercise surfaced, and it sits an order of magnitude below our
business-strategy medium of 9,075.

## What this changes

1. ~~Fix the four inversions~~ — **done**, same day.
2. **Redefine the small column, or drop it.** Price the smallest real Saudi unit instead of a few
   hours of nothing. Most of the overpricing above is this one design flaw.
3. **The two Saudi agency rate cards are the highest-value ingest available.** Published, dated,
   riyal-denominated, no currency bridge anywhere near them — the first Saudi-priced evidence
   about *creative* work, which every recruiter survey misses. Not ingested here because this
   exercise promised it would not; that is a separate decision with its own verification.
4. **Say "we don't know" for the ten unpriced specialties.** They carry our largest numbers and
   zero evidence, and Principle I already requires it.

Nothing in this check produced a reason to *raise* a figure, or a single Saudi transaction to build
on. Real numbers come from our own users' invoices.
