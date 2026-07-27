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

1. **Ask the ledger what to drive** (`ledger.mjs` + `flows.mjs`). A Ralph loop fires an
   identical prompt every time, so the variety has to come from state, not from the prompt.
   `leastRecentlyDriven()` returns the flow untouched longest — and "never" sorts before every
   date, so the parts nobody has opened get opened first.
2. **Do a freelancer's work through the forms** (`work.mjs`). This builds the state everything
   else needs, and the doing is itself under test: two of pass 5's findings were in the act of
   saving, not in what was saved.
3. **Check the product against itself and against the database.** Two screens disagreeing, or a
   screen disagreeing with its row, is the finding. This is where the next defect comes from.
4. **Run the standing sweeps** (`sweeps.mjs`) for the classes earlier passes already paid for.
5. **Record the run** with `recordRun(flow, { findings })`, so the next iteration starts where
   this one stopped.

## Running the loop

```
/loop 30m read drive/ledger.md, drive the least-recently-driven flow through drive/,
fix what you find, update the ledger, commit
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
| `ledger.mjs` / `ledger.md` | The loop's memory: coverage, open findings, what is known and accepted |
| `iteration.example.mjs` | The whole shape, runnable as-is |
