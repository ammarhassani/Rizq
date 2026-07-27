---
name: drive
description: Drive Rizq as a real user through drive/ (Playwright, real browser, real Supabase) to find defects nobody has filed — choosing a persona, a flow and a testing strategy from the coverage ledger. Use when asked to test the app, run the loop, hunt for bugs, check UX/UI, or find what a pass has not covered. Also use for a Ralph-loop iteration.
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

### 2. Choose the road — this is the part that needs judgement

`coverage.mjs` prints three dimensions:

- **persona** (`drive/personas.mjs`) — who is driving; a defect is only visible to someone whose
  expectations it violates
- **flow** (`drive/flows.mjs`) — what they are trying to get done
- **strategy** (`drive/strategies.mjs`) — what KIND of question is being asked

Pick deliberately, and say why in one line before you start:

- An **untried strategy** beats an untouched cell of a strategy already used. Seven strategies
  exist; a persona × flow pair only varies two of the three dimensions.
- **Metamorphic** is the highest-value untried one for this product: Rizq has no ground truth for
  a price, so relations ("more scope must not price lower") are the only oracle available. The
  most expensive defect ever shipped here — every proposal priced at the band ceiling — was
  invisible to every other kind of question.
- Prefer flows that carry **money, a legal obligation, or something a client sees**.
- If the ledger shows a flow driven only by one persona, a different persona on the same flow is
  cheap and often productive.

### 3. Drive

Write a short script (in `drive/` or the scratchpad) modelled on `drive/iteration.example.mjs`:

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

- Fix what is clearly a defect with a clear fix, with a test where the constitution requires one
  (money, quotas, eligibility, honesty paths).
- **Do not fix** monetization semantics, pricing policy, or brand/design-system decisions.
  Record them for the founder with the evidence and the options.
- Merge gate before committing: `pnpm typecheck` clean and `pnpm test` green.

### 6. Record and report

```js
recordRun(`${persona}/${flow}/${strategy}`, { findings });
```

Then update `drive/ledger.md` prose if the run changed what is known, and commit. Report to the
user in caveman: what you drove, what you found, what you verified, what you fixed, what you
left and why.

## What this can and cannot do

It owns: screen-vs-database disagreement, screen-vs-screen disagreement, crashes, dead
navigation, save paths, quota enforcement, the mechanical half of UI/UX, and regressions in
classes already found.

It cannot own: taste (does this proposal read like something a freelancer sends with pride),
monetization decisions, and anything requiring a judgement about what the product *should* be.
Those stay with the founder — say so rather than guessing.
