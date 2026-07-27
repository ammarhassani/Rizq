# Rizq — Power-User Validation, Passes 5 and 6

**Date:** 2026-07-27 · **Method:** the app driven in Arabic on a real account against live
Supabase + DeepSeek, findings confirmed against the database · **Scope:** the modules passes 3
and 4 never opened (income ledger, HADAF, catalog, documents, projects, calendar, settings,
upgrade), then a systematic sweep rather than a walk.

> Passes 3 and 4 are in [`power-user-pass-3-2026-07-26.md`](./power-user-pass-3-2026-07-26.md).

---

## Pass 5 — the untouched modules

Five defects, all fixed and verified in the browser (commit `1895d17`).

### 1. HADAF served a week-old "you have no recorded projects yet" · P1

The dashboard read `١٢٬٣٤٦ ريال` for the month while HADAF — the screen that decides whether a
freelancer qualifies for a government subsidy — said they had earned nothing. `monthly_income`
already had the row; `hadaf_status_cache` held `current_month_status = no_data`,
`current_month_income = 0`, `valid_until` seven days out, and nothing invalidated it when income
changed. A freelancer who logs their first payment would have been told they had none for a week.

**Fix:** the cache is trusted only while no gig has changed under it (compared against the most
recent `gigs.updated_at`). Verified: the same account now reads "شهر ١ من ٣" with July eligible.

### 2. Logging income left the freelancer on a blank form · P2

The row saved; the UI returned to an empty `/income/new`. The natural response is to fill it in
and save again — the duplicate-save trap the code comment in `GigForm` explicitly warned about.

The navigation was not missing, it was **undone**: `createGig` calls `revalidatePath`, and a
revalidation re-renders the route the action was invoked from, so the push to the ledger
flickered and reverted. Confirmed by removing the `revalidatePath` and watching the push stick.

**Fix:** navigate once the transition has settled, keeping the revalidation.

### 3. Income accepted three decimals · P2

`12345.678` saved as typed and flowed into the ledger, the dashboard total and the HADAF
eligibility view. The halala rule from feature 011 had only been applied to invoice items and
catalog prices. The constraint now lives in `lib/money/schema.ts` and the gig schemas use it, so
it holds even if the form is bypassed.

### 4. "١ عملًا" / "1 gigs" · P3

A number concatenated with an invariant noun — the exact pattern feature 011's US1 made a rule
against. Now an ICU plural.

### 5. "شهر 1 من ٣" · P3

Latin and Arabic-Indic digits in one sentence: next-intl formats a raw number with plain `ar`,
which CLDR resolves to Latin digits. Both figures pre-formatted, and the required-months count
now comes from the rules rather than being hardcoded in the copy.

---

## Pass 6 — sweep, not walk

Pass 5's last two findings were the same defect in two places, which suggested there were more.
Rather than opening screens one at a time, every Arabic route was swept for numerals.

**Eleven routes came back dirty. Seven were real** — the app printing its own figures in Latin
digits beside Arabic-Indic ones (commit `f2985a2`):

| Surface | What it printed |
|---|---|
| Settings summary, Settings → Profile, proposals nudge | `58%` |
| "What's still missing" list | `+10%`, `+8%`, `+6%` |
| Arabic VAT label | `ضريبة القيمة المضافة (15%)` |
| Income chart heading | `الدخل الشهريّ · 2026` |
| Guided project wizard | `الخطوة 1 من ٣` |
| Calendar day overflow | `+3` |
| Catalog tab counts | `1`, `0` |

Years needed their own formatter: `fmtCount(2026)` renders `٢٬٠٢٦`, because it groups thousands
and a year is an identifier, not a quantity.

The other four hits were correct and are deliberately outside the guard: a proposal titled
`موقع 25 صفحة` is the client's own wording, and `+966` is a phone prefix. The committed guard
now covers the nine routes whose numbers belong to the app, and walks **text nodes** rather than
splitting `innerText` — `أيام ضمان ما بعد التسليم0` hides from a whitespace split, which is how
that one survived the first sweep.

### Advertised limits vs enforced limits

Every number on the upgrade page was checked against its database trigger.

| Advertised (free / pro) | Enforced | Verdict |
|---|---|---|
| Clients 10 / unlimited | `enforce_client_quota` — 10, pro returns early | ✅ |
| Documents 10 / 50 | `enforce_document_quota` — 10 / 50, excludes soft-deleted | ✅ |
| Invoices 3/mo / 30/mo | `enforce_invoice_quota` — 3 / 30, Riyadh month | ✅ |
| Proposals 2/mo / 30/mo | `enforce_proposal_quota` — 2, pro unlimited | ✅ |
| Pricing lookups 5/mo / unlimited | `enforce_query_quota` — 5 + bonus, anon 1 | ✅ |
| **Projects 20/mo / unlimited** | `enforce_gig_quota` — on **gigs**, not projects | ⚠️ **gap** |

All six that are enforced also handle a lapsed Pro correctly — they count from the later of
month-start and the moment `pro_until` passed, so a lapsed grant does not retroactively exhaust
the free allowance.

**The gap:** the paywall meters "المشاريع" but the trigger is on the money child.
[`createBlankProject`](../../src/app/actions/projects/createBlankProject.ts) states in its own
docstring that no quota path is touched, so the "set up directly" route creates unlimited
projects on the free tier. Either the limit belongs on `projects` too, or the paywall line
should name what is actually metered. **Left for the founder — it is a monetization decision,
not a bug fix.**

### Verified sound

- **PDPL export** delivers what it claims: profile, proposals, proposal versions, clients,
  client timeline, gigs, projects, integrations, tasks, milestones, invoices, documents and
  every preference table, scoped to the requesting user.
- **Dashboard deadlines** correctly exclude draft invoices (`status in sent/viewed/overdue`) — a
  draft is not owed yet.
- **Currency columns** dropped from the project after verifying 0 non-SAR values; invoices list,
  detail, builder, dashboard and settings all still render.

### Noted, not fixed

- The **calendar** surfaces a draft invoice's due date while the dashboard does not. Two
  definitions of "upcoming" on one account. Harmless today, but they should agree.

---

## Merge gate

`tsc --noEmit` clean · `pnpm test` **907 passing** · Playwright e2e green, including the
widened Arabic-numeral guard (19 assertions across 9 routes) and the feature-011 guards
(client-facing redaction, VAT eligibility).
