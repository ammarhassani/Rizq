---
name: ammar-loop-e2e
description: Drive the whole ammar-loop plan end to end — every remaining row, or until a P1 is filed — in one long background run. Use when asked to run the loop e2e, drive all rows, run the full plan, batch test, or cover the remaining plan. For a single row use ammar-loop; to fix what it files use ammar-fix.
---

# ammar-loop-e2e

Batch driving. Same rules as `ammar-loop` — **find and file, never fix** — but many rows in one
run instead of one.

Read `.claude/skills/ammar-loop/SKILL.md` for the axes, the verification discipline and the
severity grades. Everything there applies. This file is only about running it long.

## The one thing that breaks this

**It takes hours.** A row is roughly four minutes; the remaining plan is several hours. A
foreground shell call will be killed by its timeout mid-row, and the run will look like a
failure when it was only interrupted.

So **always run it in the background** and poll it. Never wrap it in a timeout you are not
prepared to lose.

## 1. Preflight

```bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ar   # must be 200
node drive/basket-index.mjs                                       # unfinished invocation?
node drive/coverage.mjs                                           # rows left
```

Dev server down → start `pnpm dev` first. An unfinished invocation is fine: the run resumes it.

## 2. Start it in the background

```bash
node drive/e2e.mjs > /tmp/ammar-e2e.log 2>&1    # every remaining row
node drive/e2e.mjs --p1-stop                     # stop at the first P1 so it can be fixed
node drive/e2e.mjs 10                            # a fixed number of rows
```

`--p1-stop` is the right default when someone is waiting to fix things; a full run is right when
the goal is coverage and the basket will be worked later.

## 3. While it runs

Poll the log and the counters rather than blocking on it:

```bash
tail -5 /tmp/ammar-e2e.log
node drive/basket-index.mjs
```

Report progress as rows tick over — which row, what was filed — instead of going silent for an
hour.

## 4. When it stops

It stops for one of four reasons, and they are not the same:

- **plan complete** — every row ticked
- **P1 filed** (`--p1-stop`) — hand over to `ammar-fix`, then start another batch
- **limit reached** — the row count you asked for
- **aborted** — a crash. The invocation stays open on purpose so the next run resumes it rather
  than re-driving a row that may already have been filed. Say what the error was.

Then:

```bash
node drive/scoreboard.mjs      # which axis values are producing, which are spent
node drive/basket-index.mjs
```

Commit `drive/` only — the plan ticks, the basket, the telemetry. Never product code.

## 5. Report

Caveman. Rows driven, why it stopped, findings by reference and severity, plan progress, basket
counts, and anything the scoreboard now says is fertile or spent.

## Batch is shallower than a hand-driven row

Batch mode runs the generic work section on every row — sweeps, UX review, the ledger-versus-
database check. It does not write the flow-specific driving a hand-driven row gets, so it covers
ground rather than depth. When a row's flow deserves real driving (a proposal actually generated,
an invoice actually built, onboarding actually completed), use `ammar-loop` on that row instead.
