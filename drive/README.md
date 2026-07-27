# `drive/` — the Ralph loop's browser

A real Chromium, signed in as a real freelancer, doing a freelancer's work against real
Supabase and real DeepSeek. Each loop iteration writes a short script here, runs it, and turns
what the product got wrong into a fix.

## Why this is not `e2e/`

`e2e/` asserts things we already decided are true. That is worth having — it is how a shipped
fix stays fixed — but it is structurally incapable of finding the next defect, because every
assertion encodes an expectation someone already had.

Every defect in passes 2 through 6 type-checked, unit-tested and conformed to spec while being
visibly wrong to a person holding the product:

- the Arabic pricing screen read "based on **NaN** Saudi freelancers" while English read "based
  on 5" — invisible to every test that asserted in English
- HADAF said "you have no recorded projects" for a week while the dashboard showed the real
  figure on the same account
- logging income saved the row and returned a blank form, inviting a duplicate save
- a proposal shared with a client disclosed the freelancer's price floor and their login email

None of those were assertion failures. They were things a person would notice in a second and a
suite would never ask about. So this harness drives, and the iteration notices.

## Prerequisites

- `pnpm dev` running (or set `RIZQ_BASE_URL`)
- `.env.local` with the Supabase + DeepSeek keys
- Email confirmation **off** in Supabase Auth, so the driver can hold a session

## Running an iteration

```bash
node drive/iteration.example.mjs      # the shape every iteration takes
RIZQ_HEADED=1 node drive/…            # watch it happen
```

State lives in `drive/.auth/` (gitignored): a disposable account, its browser profile, its
screenshots, and `findings.log` — an append-only record so a later iteration can see what an
earlier one already noticed.

## The shape of an iteration

1. **Ask the ledger who drives what** (`ledger.mjs` + `personas.mjs` + `flows.mjs`).
   `nextAssignment()` returns the persona × flow pair untouched longest — six people × ten flows
   is sixty distinct runs before anything repeats, and "never" sorts before every date, so the
   parts nobody has opened get opened first.
   **Six people, not one tester.** A defect is only visible to someone whose expectations it
   violates: the rusher finds the double-submit, the accountant finds the halala that does not
   add up, the sceptic finds the number with no provenance, the newcomer finds the screen that
   assumes you already know what HADAF is.
2. **Do a freelancer's work through the forms** (`work.mjs`). This builds the state everything
   else needs, and the doing is itself under test: two of pass 5's findings were in the act of
   saving, not in what was saved.
3. **Check the product against itself and against the database.** Two screens disagreeing, or a
   screen disagreeing with its row, is the finding. This is where the next defect comes from.
4. **Review how it LOOKS** (`ux.mjs`) at that persona's device size — sideways scroll, tap
   targets under 44px, focus you cannot see, a dead end, a disabled control that explains
   nothing, serious axe violations. Taste stays human; the mechanical half does not have to.
5. **Run the standing sweeps** (`sweeps.mjs`) for the classes earlier passes already paid for.
6. **Record the run** with `recordRun(assignment.key, { findings })`, so the next iteration
   starts where this one stopped.

## The locked search space

Seven axes (`axes.mjs`), closed on purpose: every earlier pass "finished" and then found more the
moment someone invented a new way of looking, so "done" never meant anything. Adding an axis now
reopens the search and resets the dry counter — allowed, but deliberate.

Crossed fully they are hundreds of thousands of runs. `plan.md` is a **pairwise covering set: 88
runs containing every reachable pair**, with impossible combinations excluded by `isValid()` (an
anonymous visitor cannot log income; a DOCX exists only for a proposal). A row nobody can execute
is worse than a missing one, because a skipped row still looks covered.

| axis | varies |
|---|---|
| persona | who drives — device, pace, what they are suspicious of |
| flow | what they are trying to get done |
| strategy | what kind of question is asked |
| surface | where the output lands — screen, print, DOCX, share page, CSV |
| state | empty, minimal, realistic, heavy, unicode-edge, degraded profile |
| tier | anon, free, exhausted, pro, lapsed pro |
| entry | direct URL, in-app, shared link, back/refresh mid-flow, guided context |

## Three axes, not one

| axis | file | varies |
|---|---|---|
| persona | `personas.mjs` | **who** drives — device, pace, what they are suspicious of |
| flow | `flows.mjs` | **what** they are trying to get done |
| strategy | `strategies.mjs` | **what kind of question** is being asked |

Personas and flows alone re-ask the same question in new places. Strategies change the question,
which is why an untried strategy is worth more than an untouched persona × flow cell:

- **metamorphic** — when the input changes this way, how must the output change? The only oracle
  available for a price nobody can call correct. Would have caught the band-ceiling P0.
- **differential** — two renderings of one truth must agree; the client's copy must be a strict
  subset of the owner's. This is the shape of every leak found so far.
- **time-travel** — quotas reset on the Riyadh month boundary, Pro lapses, invoices turn overdue,
  HADAF counts consecutive months. None of it is exercised by driving on a Tuesday.
- **adversarial**, **fuzz**, **state-machine**, **scale** — the world misbehaving, input nobody
  expected, transitions nobody legalised, and a real amount of data.

```bash
node drive/coverage.mjs    # what has been driven, and what nobody has
```

## Running the loop

Invoke the skill (`.claude/skills/drive/`), which tells the agent how to lead a session —
choose the road, drive, verify, fix or record, update the ledger:

```
/drive
```

As a Ralph loop:

```
/loop 30m /drive
```

Intervals under ~10 minutes are a false economy: Supabase rate-limits signups to 5 per 5
minutes per IP, and each iteration burns real DeepSeek tokens. The driver reuses its account
between runs, so that limit only bites when `drive/.auth` has been cleared.

## Rules that came from being wrong

- **Never seed through the database what the iteration is testing.** An insert skips the code
  that would have been wrong. `session.mjs` clears exactly one thing directly — the onboarding
  gate — and says why in a comment.
- **Onboarding gets its own iteration, driven through the UI.** Three of pass 2's defects lived
  in those eleven steps and none was visible from the row.
- **A silent run is a failed run.** Every run prints how many routes it visited and how many
  redirected away, because the first version of this harness reported "0 findings" while a
  brand-new account was being bounced to `/onboarding` from all of them.
- **A fresh account hides almost everything.** Every defect so far needed data to exist first —
  a proposal to leak a price floor, income to contradict HADAF, an invoice to carry VAT it
  should not. Work first, then look.
- **When an iteration finds a new class, add a sweep for it.** Pass 6 turned two one-off numeral
  bugs into seven found at once by checking every route instead of the two already known to be
  broken.
- **Report what is new, not what is unfixed.** `note()` checks the finding against the ledger
  and stays quiet about one already written down. A loop that re-reports a known defect every
  half hour teaches the next iteration nothing.
- **Verify before you report, especially a visual one.** The font check first said "Arabic in a
  Latin font", which reads as breakage. Blowing the glyph up to 120px showed the real ٠ from a
  fallback — true finding, wrong severity. It now describes the actual risk: an undeclared
  fallback that differs between a Mac and an Android.
- **Distinguish the app's numbers from the user's words.** `موقع 25 صفحة` is a client's own
  wording, not a numeral bug; `+966` is a phone prefix. The numeral sweep runs only on routes
  whose figures belong to the app.

## What lives where

| File | Purpose |
|---|---|
| `session.mjs` | Signed-in browser, run accounting, findings log, matching DB client |
| `work.mjs` | A freelancer's actions through the real forms — client, income, invoice, lookup |
| `sweeps.mjs` | Standing checks worth re-running everywhere, one per defect class found |
| `flows.mjs` | What a freelancer does, as a rotation — with what a lie looks like on each screen |
| `personas.mjs` | Six people with different devices, paces and suspicions |
| `ux.mjs` | The measurable half of "looks wrong" — layout, touch, focus, dead ends, axe |
| `ledger.mjs` / `ledger.md` | The loop's memory: coverage, open findings, what is known and accepted |
| `axes.mjs` / `plan.md` | The closed search space and its 88-run pairwise covering set |
| `telemetry.mjs` / `runs.jsonl` | One record per run — what it drove, opened, closed |
| `scoreboard.mjs` / `scoreboard.md` | Per-axis yield, dry streak and verdict: burn it or retire it |
| `iteration.example.mjs` | The whole shape, runnable as-is |
