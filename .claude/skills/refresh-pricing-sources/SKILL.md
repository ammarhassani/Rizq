---
name: refresh-pricing-sources
description: Check every published source behind the pricing benchmark for a new edition or changed figures, and file a drift report for human approval. Never ingests. Use monthly, or when asked to refresh the pricing data, check the rate reports, or verify the benchmark sources are still current.
---

# Refresh pricing sources

A benchmark whose sources are never re-read decays silently: `freshnessDecay` keeps
lowering the weight of every row while the citation keeps naming a report that has since
been superseded. This skill re-reads the sources and reports what moved.

**This skill never writes to `benchmark_records`.** It produces a drift report; a human
decides whether to ingest. That gate is the whole point — an upstream page change, a
paywall, or a bad parse must not be able to rewrite the pricing corpus unattended.

## 1. Read the registry

`docs/validation/source-checks.jsonl` **is** the registry — one JSON object per check,
appended never rewritten. The last entry per `source_ref` is both the list of what to
check and the baseline to compare against. It is a committed file on purpose: this skill
runs as a scheduled cloud agent with no database credentials, and a registry it cannot
read is a registry it cannot use.

When a Supabase connection **is** available (running locally, or with the Supabase MCP
attached), also run the query below to catch sources that entered the corpus without a
registry entry. Treat anything it finds as a baseline run. Without a connection, skip it
— do not block, and say in the report that new-source detection was skipped.

```sql
select source_ref,
       provenance,
       count(*)                     as rows,
       count(distinct specialty_id) as specialties,
       min(captured_at)::date       as captured,
       round(min(price_sar))        as lo,
       round(max(price_sar))        as hi
from public.benchmark_records
where active and verified and not flagged_as_outlier
group by 1, 2
order by rows desc;
```

Any `source_ref` containing a URL is checkable; the rest (founder editorial, freelancer
submissions) are not — list them in the report as unverifiable and move on.

## 2. Re-read each source

Use WebFetch on the URL. Ask it for the *edition or survey year*, the *methodology*
(sample size, period), and the *published figures* for the disciplines Rizq uses. Then
compare against the baseline entry:

| Signal | What it means | Report as |
|---|---|---|
| Edition/year changed | A new report is out | `new_edition` — ingest candidate |
| Figures changed, same edition | Publisher revised, or the old parse was wrong | `revised` — investigate before ingesting |
| **Published sample changed** | The evidence behind the figure grew or shrank | `revised` — it moves confidence, see below |
| Page 404s, paywalls, or blocks the fetch | The citation no longer resolves | `unreachable` — the honesty problem, see below |
| Nothing changed | Still current | `unchanged` |

**Always re-read the published sample size**, not only the rates. Since feature 012 each row's
`confidence` is derived from it (`src/lib/pricing/sourceConfidence.ts`: ≥50k → 0.90 · ≥5k →
0.80 · ≥500 → 0.70 · ≥50 → 0.60 · below or unstated → 0.50), so a survey growing from 298 to
5,200 respondents changes what the app claims even when every published rate is identical.
Record it as `published_sample` in the check line, and use the **discipline-level** figure where
the source gives one — ProCopywriters reports 220 copywriters within 298 total, and 220 is the
number behind the copywriting rows. For an approximation, take the conservative end.

Also re-check the **World Bank PPP factor** (`PA.NUS.PPP`, Saudi Arabia) via
`https://api.worldbank.org/v2/country/SAU/indicator/PA.NUS.PPP?format=json` — it is a
source like any other, every converted row depends on it, and it revises annually.

An `unreachable` source is not a minor finding. Rizq's citations name these documents to
a client; a citation pointing at a dead URL is a claim the reader cannot check. Say so
plainly in the report rather than burying it under the ingest candidates.

## 3. Append the check, then report

Append one line per source to `docs/validation/source-checks.jsonl`:

```json
{"checked_at":"2026-08-29","source_ref":"YunoJuno 2026 …","url":"https://…","status":"unchanged","edition":"2026","methodology":"182,000 data points, 2024–25","figures":{"Software Engineering":88},"note":""}
```

Then write the human-facing summary: what changed, what it would do to the bands, and
what you recommend ingesting. Keep it short — the person reading it wants the diff, not
a tour.

## 4. Hand off, do not ingest

End the report with the exact next step, e.g.:

> `web-dev` and `mobile-dev` currently cite YunoJuno 2026 at $88/hr. The 2027 edition
> publishes $94/hr. Ingesting would move the medium-project anchor from 3,907 to 4,173
> SAR across 2 specialties. Say the word and I'll write the migration.

Never run that migration inside this skill.

Running unattended (the scheduled cloud agent) there is nobody to tell, so land the
output where a human will find it: commit the appended `source-checks.jsonl` plus a
short drift report and open a pull request titled `chore(pricing): source drift <date>`.
A PR is the approval gate. If nothing drifted, still commit the check lines — the record
of "we looked and it was current" is what makes a stale citation detectable later — but
say "no drift" in the PR body and keep it to a few lines.

## 5. Report which specialties still lack a source

Deactivated specialties are waiting on exactly this skill. List any specialty sitting
below the 3-record floor and what it still needs, so the gap stays visible instead of
quietly becoming permanent. As of the 2026-07-29 baseline: `product-management` and
`project-management` need 1 more source each, `proofreading` and `transcription` need a
second source each, `motion-graphics` needs 2.

## Rails

- **No scraping.** Read a publisher's own published aggregate figures. Do not walk
  listings, profiles, or marketplace pages — PDPL and the constitution both forbid it,
  and it is also the fastest way to lose the "cited, not scraped" claim entirely.
- **A source without a sample size or a survey date is not a source.** Sites ranking for
  "2026 freelance rates" publish confident numbers with no method; in the DB their rows
  look identical to YunoJuno's. Reject them at the door.
- **Never lower `MIN_SAMPLE` to make a thin cell resolve.** If a specialty cannot reach 3
  records, the honest answer is the insufficient-data screen and a note in the report
  saying which specialties still need a source.
