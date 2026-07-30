# Source licensing audit — pre-launch

**Status: NOT CLEARED. Founder/legal decision required before launch.**

This is the one open item on the pricing engine that becomes a lawyer rather than a bug. Nothing
here is a legal opinion — it is an inventory of what the benchmark is built on and what each
source's terms would need to permit.

## What the corpus is made of

| Source | Rows | What we took | Risk |
|---|---:|---|---|
| Rizq founder editorial | 360 | our own judgement | **none** — we own it |
| Legacy "Saudi-adjusted" seed | 180 | our own (undated, unverifiable) | **none** legally; a quality problem, not a rights one |
| Robert Half 2026 Salary Guide | 144 | published salary ranges per role, free web pages | **medium** |
| Robert Walters Middle East 2026 | 136 | published Saudi salary ranges, free PDF | **medium** |
| Stack Overflow Developer Survey 2025 | 96 | published median salaries by role | **low** — historically ODbL-licensed, free to use with attribution |
| YunoJuno 2026 Rates Report | 56 | published day/hourly averages by discipline | **medium** |
| Editorial Freelancers Association 2026 | 40 | published member rate chart | **medium** |
| Saudi agency rate cards | 28 | published package prices from CR-registered firms | **low** — a shop's own advertised price |
| ProCopywriters 2024 | 8 | published survey averages | **medium** |
| IEEE-USA 2025 | 8 | regional median fees quoted in a free article | **medium-high** — underlying report is paid |
| Saudi freelance rate guide (qemma-soft) | 7 | published rate ranges in an article | **low** |
| Nonprofit.ist 2025 | 4 | headline average from a free executive summary | **medium-high** — full report is paid |

**1,067 active rows. Roughly half come from third-party publications.**

## The actual question

We are not redistributing anyone's dataset. We take a small number of **published aggregate
figures** (a median, a range), transform them — currency conversion, employment-to-freelance
bridge, hours mapping — and surface a derived number with the source cited by name and date.

That is closer to citation than to copying, and each individual figure is arguably a fact rather
than a creative work. But three things make it worth a lawyer's twenty minutes rather than a
shrug:

1. **It is commercial.** Rizq charges for the product these figures inform. Several of these
   reports exist as lead generation for the publisher's own paid services, and at least two
   (IEEE-USA, Nonprofit.ist) sell the full report we quoted the headline from.
2. **Systematic extraction of many figures** from one publication reads differently from citing
   one. We took 12 disciplines from YunoJuno and 14 roles from Stack Overflow.
3. **Database rights** exist in some jurisdictions independent of copyright in the figures.

## What to do before launch

**1. Read the terms for the four that matter.** Robert Half, Robert Walters, YunoJuno, EFA are
340 of the 1,067 rows and all are commercial publishers. Look specifically for prohibitions on
commercial reuse or redistribution of figures.

**2. Drop the two paywalled ones.** IEEE-USA (8 rows) and Nonprofit.ist (4 rows) are headline
figures lifted from reports that are sold. Twelve rows out of 1,067 — the cost of removing them is
nil and the exposure is the worst in the table. I would cut these regardless of what the lawyer
says.

**3. Confirm Stack Overflow's licence.** Their survey data has historically been released under
ODbL, which permits commercial reuse with attribution and share-alike on the database. If that
still holds it is the cleanest source we have and worth leaning on harder.

**4. Attribute visibly, not just in the database.** Every figure already carries its source in
`source_ref` and the citation line names the dominant one. A public methodology page listing every
source by name, with links, costs nothing and materially improves the position.

**5. Prefer Saudi rate cards going forward.** A Riyadh studio publishing its own prices to attract
customers has the weakest possible claim against someone citing those prices, and it is also our
best evidence. The incentives point the same way for once.

## What is not at risk

- **No scraping happened.** Every figure came from a page a person read, or a published report.
  The constitution's hard rail was not approached.
- **No personal data.** Nothing in the corpus identifies anyone.
- **The Saudi market lookup ingested nothing** beyond published rate cards and rate guides — see
  [saudi-market-reality-check-2026-07-31.md](saudi-market-reality-check-2026-07-31.md).

## The honest summary

Most likely this is fine — citing published aggregate figures with attribution is ordinary
practice, and the Saudi sources are close to unimpeachable. But "most likely fine" is a founder's
call to make with a lawyer, not an engineer's call to make silently, and the product's entire
positioning is that its numbers are defensible. Being unable to defend where they came from would
be the worst possible failure mode.

Cut IEEE-USA and Nonprofit.ist today. Get twenty minutes of legal time on the other four before
launch.
