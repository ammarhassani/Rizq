---
name: ammar-fix
description: Fix defects the ammar-loop tester filed in drive/basket.md — highest severity first, one at a time, each verified in a real browser before it counts as closed. The counterpart to ammar-loop, and the only half allowed to change product code. Use when asked to fix the basket, clear findings, work the backlog, or after a testing run has filed something.
---

# ammar-fix

The tester finds and never fixes. You fix and never go looking. Splitting them is deliberate:
pass 4 found six defects and *five were created by pass 3's own remediation*, because discovery
and change in one pass means nobody reviews the change.

## 1. Read the basket

```bash
node drive/basket-index.mjs     # counts by severity
```

`drive/basket.md` is the queue. Work **P1 → P2 → P3**, and inside a severity, oldest first.

Take **one finding**. Not a batch. A commit that fixes four things is a commit nobody can
revert cleanly when one of them turns out wrong.

Skip and say so, rather than fixing:

- anything whose description says it needs a **founder decision** — monetization, pricing
  policy, brand, design system. Report it, do not decide it.
- anything you cannot reproduce. Set it `needs-repro` and move on; a fix for a defect you never
  saw is a guess.

## 2. Reproduce it first

Read the finding's `evidence`, `route` and `run`, then see it yourself — the harness in `drive/`
gives you a signed-in browser. A finding you cannot reproduce is not ready to fix, whoever filed
it.

## 3. Fix the cause, not the symptom

Grep every caller of what you are about to change. One guard in the shared function beats a
guard in each caller, and patching only the path the finding names leaves its siblings broken —
RZQ-0004 and RZQ-0007 are the same root cause reached from two directions.

Where the constitution requires a test (money, quotas, eligibility, honesty paths), write it and
watch it fail before it passes.

## 4. Verify in the browser, not just in the suite

**This is the step that pass 3 skipped.** Its fixes type-checked, passed the suite, and broke
the product; the next pass found five defects it had created.

- `pnpm typecheck` clean and `pnpm test` green
- then **drive the flow the finding came from** and see it behave
- then check the flow *next to* it — the one most likely to share the code you touched

## 5. Close it

```js
import { setStatus } from "./drive/basket.mjs";
setStatus("RZQ-0004", "fixed", "one line: what changed, and how it was verified");
```

Then `node drive/basket-index.mjs` and commit — the fix and the basket update together, so the
record and the code never disagree.

Statuses: `fixed` · `withdrawn` (was never a defect) · `wont-fix` (real, deliberately not fixing)
· `accepted` (real, living with it) · `needs-repro`. Never mark `fixed` without step 4.

## 6. Report

Caveman. Which reference, what the cause was, what changed, how it was verified, what is left in
the basket.

## Alternating with the tester

```
node drive/e2e.mjs --p1-stop     # drive until a P1 is filed
/ammar-fix                       # fix it
node drive/e2e.mjs --p1-stop     # keep driving
```

The tester never fixes; you never go hunting. If you notice something while fixing, file it with
`fileFinding` rather than fixing it in the same pass.
