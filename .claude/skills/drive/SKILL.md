---
name: drive
description: Drive Rizq as a real user through drive/ (Playwright, real browser, real Supabase) to find defects nobody has filed. Takes the next row of a locked seven-axis plan, does a freelancer's work through the real forms, checks the product against itself and the database, reviews UI/UX, then records per-axis telemetry. Use when asked to test or QA the app, run the loop or a Ralph-loop iteration, hunt for bugs, review UX/UI, or find what earlier passes did not cover.
---

# Driving Rizq

You are leading a testing session, not executing a checklist. The harness in `drive/` gives you
a real browser signed in as a real freelancer; your job is to choose where to point it, notice
what a person would notice, verify what you noticed, and leave the product and the ledger better
than you found them.

## Why this exists

`e2e/` asserts things we already decided are true. It cannot find the next defect, because every
assertion encodes an expectation someone already had. Every defect in passes 2–6 type-checked,
unit-tested and conformed to spec while being obvious to a person holding the product.

So: drive, then look.

## The session

### 1. Preflight

```bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ar   # must be 200
node drive/coverage.mjs
```

If the dev server is down, start it (`pnpm dev`) before anything else — the harness fails fast
on this, but a dead server wastes a signup.

### 2. Take the next row of the locked plan

The search space is **seven axes, and only these seven** (`drive/axes.mjs`):

| axis | question it varies | values |
|---|---|---|
| `persona` | who is driving | rusher · meticulous · newcomer · veteran · sceptic · english-first |
| `flow` | what they are trying to do | onboarding · proposal-to-client · invoice-and-vat · income-and-hadaf · pricing-tool · clients-and-projects · documents-and-catalog · mobile · english-locale · recovery |
| `strategy` | what KIND of question is asked | metamorphic · differential · time-travel · adversarial · fuzz · state-machine · scale |
| `surface` | where the output lands | screen-desktop · screen-mobile · print-pdf · docx-export · share-anonymous · csv-export |
| `state` | what shape the account is in | empty · minimal · realistic · heavy · edge-unicode · degraded-profile |
| `tier` | which entitlement | anon · free · free-exhausted · pro-active · pro-lapsed |
| `entry` | how they arrived | direct-url · in-app-navigation · shared-link · back-or-refresh-midflow · guided-context |

> **The axis list is CLOSED. Do not add, rename or remove an axis — or a value — on your own.**
>
> Adding one invalidates `plan.md`, resets the dry counter, and makes every "we covered the
> space" claim before it meaningless. If a defect class genuinely does not fit these seven,
> **stop and put the case to the person who invoked you**: what the class is, why no existing
> axis holds it, and what it would cost to reopen the plan. They decide, not you. Adding a value
> to an existing axis is the same conversation, one size smaller.

Crossed fully that is hundreds of thousands of runs. `drive/plan.md` is a pairwise covering set —
**88 runs that contain every reachable pair** — so "we have covered the space" is a claim that can
actually be reached and checked. `coverage.mjs` prints the next unticked row.

Follow the plan. Deviate only for a reason you can state in one line, such as:

- a P1 from the last run needs its flow re-driven (that outranks new coverage)
- the row is blocked by something broken, in which case say so and take the next one

Two notes on judgement within a row:

- **Metamorphic** is the highest-value strategy for this product: Rizq has no ground truth for a
  price, so relations ("more scope must not price lower") are the only oracle available. The most
  expensive defect ever shipped here — every proposal priced at the band ceiling — was invisible
  to every other kind of question.
- Prefer to spend the run's depth on **money, a legal obligation, or something a client sees**.

**Adding an axis is allowed but expensive**: it reopens the search space, invalidates the plan,
and resets the dry counter. Do it when a defect class genuinely does not fit the seven — and say
that is what you are doing, rather than slipping it in.

### 3. Drive

Copy `drive/iteration.example.mjs` and rewrite only its **work** section for the assigned flow —
everything around it (plan row, telemetry, ticking, sweeps) is already correct and must stay:

```js
import { open } from "./session.mjs";
import { standardSweeps } from "./sweeps.mjs";
import { uxReview } from "./ux.mjs";
import { addClient, logIncome, createInvoice, priceLookup } from "./work.mjs";
import { nextAssignment, recordRun } from "./ledger.mjs";
```

Rules that came from being wrong:

- **Build state by USING the product**, never by inserting rows — the act of saving is where two
  of pass 5's findings were. The only sanctioned shortcut is the onboarding gate, and onboarding
  itself gets its own UI-driven iteration.
- **A fresh account hides almost everything.** Do the work first, then look.
- **Review how it looks** (`uxReview`) at the persona's device size, not only what it stored.
- **Check the product against itself and against the database.** Two screens disagreeing, or a
  screen disagreeing with its row, is the finding.

### 4. Verify before you believe it

This is the discipline that separates a finding from noise. Every reported defect must survive:

- **Is it real, or is it my check?** A floor of 4321 "leaking" into a quote of 54321 was a
  substring collision. Two VAT tests fighting over one profile was a parallelism bug in the test.
- **Is the severity right?** "Arabic in a Latin font" read as breakage; zooming the glyph to
  120px showed the real ٠ arriving from a fallback — a true finding at the wrong severity.
- **Is it the product's number or the user's?** `موقع 25 صفحة` is a client's own wording.
- **Confirm against the database** with the signed-in client from `tools.db()`.

Say plainly which findings you confirmed and which you could not.

### 5. Fix, or record — and be honest about which

**Re-drive what you fixed, before you commit.** This is not optional. Pass 4 found six defects
and *five of them were created by pass 3's own remediation* — the fixes type-checked, passed the
suite, and broke the product. A fix is not done until the flow it touched has been driven again
in the browser and seen to work.

- Fix what is clearly a defect with a clear fix, with a test where the constitution requires one
  (money, quotas, eligibility, honesty paths).
- **Do not fix** monetization semantics, pricing policy, or brand/design-system decisions.
  Record them for the founder with the evidence and the options.
- Merge gate before committing: `pnpm typecheck` clean and `pnpm test` green.

### 6. Grade what you found

Tag every finding, because "we ran out of defects" is meaningless without it — cosmetic findings
never run out, and a loop chasing them churns the repo for no value.

- **P1** — money is wrong, a legal obligation is breached, something private reaches a client, a
  screen states something untrue, or a core flow cannot be completed.
- **P2** — the product contradicts itself, loses work, or misleads without lying.
- **P3** — cosmetic, inconsistent, or annoying.

Write the grade into the ledger entry.

### 7. Record the telemetry — this is not optional

A loop without feedback cannot tell a mature axis from an untested one, and both look like
"no findings". Every run appends one line to `drive/runs.jsonl`:

```js
import { recordRun } from "./telemetry.mjs";
recordRun({
  run,                                   // the full seven-axis assignment
  findings: [{ text: "…", severity: "P1" }],   // what THIS run opened
  closed: ["…"],                         // findings this run fixed, whenever they were opened
  notes: "one line on what was driven",
});
```

Then regenerate the scoreboard and read it before choosing anything next run:

```bash
node drive/scoreboard.mjs
```

It reports, per axis value: runs, P1/P2/P3 opened, fixes landed, **yield** (findings per run),
**dry streak** (runs since it last found anything), days since its last finding, and a verdict —
`untested`, `thin`, `fertile — burn it more`, `productive`, `cooling`, `mature — consider
retiring`. A long dry streak with twenty runs behind it means field-tested; the same streak with
two runs behind it means untested. Deciding which axis to burn and which to retire is the whole
point, and it is impossible without this record.

### 8. Report

```js
recordRun(runKey(run), { findings });   // persona/flow/strategy/surface/state/tier/entry
```

Then tick the row in `drive/plan.md`, update `drive/ledger.md` prose if the run changed what is
known, and commit. Report to the
user in caveman: what you drove, what you found, what you verified, what you fixed, what you
left and why.

## When to stop looping

Do not loop "until there are no defects" — there will always be a P3. The space is exhausted when
**every row of `drive/plan.md` is ticked** AND **three consecutive runs produced no new confirmed
P1 or P2**. Say that plainly rather than manufacturing work to look busy.

Stop early and escalate when:

- the open-findings list grows several entries that need a founder decision (monetization,
  pricing policy, brand) — the loop cannot proceed on those, and piling them up wastes runs
- two iterations in a row find defects *introduced by the previous iteration's fixes* — that is
  the signal to slow down and consolidate, not to keep going
- the merge gate is red for a reason the iteration did not cause

## What this can and cannot do

It owns: screen-vs-database disagreement, screen-vs-screen disagreement, crashes, dead
navigation, save paths, quota enforcement, the mechanical half of UI/UX, and regressions in
classes already found.

It cannot own: taste (does this proposal read like something a freelancer sends with pride),
monetization decisions, and anything requiring a judgement about what the product *should* be.
Those stay with the founder — say so rather than guessing.
