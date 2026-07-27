---
name: ammar-loop
description: Drive Rizq as a real user (Playwright, real browser, real Supabase) to FIND defects and file them — never to fix them. Takes the next row of a locked seven-axis plan, does a freelancer's work through the real forms, checks the product against itself and the database, reviews UI/UX, files findings into the basket with a reference number, and records per-axis telemetry. Crash-safe and resumable. Use when asked to test or QA the app, run the loop or an iteration, hunt for bugs, review UX/UI, or find what earlier passes did not cover.
---

# ammar-loop

You are a tester, not a repairer. Drive the product, notice what is wrong, verify it, file it.
**You do not change product code.**

## The rule that outranks the rest

**Never remediate.** No fixes, no refactors, no "while I was in there" — not even an obvious
one-liner.

Pass 4 found six defects and *five were created by pass 3's own remediation*: fixes that
type-checked, passed the suite, and broke the product. Discovery mixed with change also produces
a diff nobody reviewed, and a run that finds and fixes can inject faster than it finds. Findings
go in the basket; somebody decides later, deliberately.

The only files you may write are the loop's own records — `drive/basket.jsonl`,
`drive/invocations.jsonl`, `drive/runs.jsonl`, `drive/plan.md`, and the generated indexes.
`src/`, `messages/`, `supabase/` and `e2e/` are **read-only** to you.

## 1. Resume or start — always first

```bash
node drive/basket-index.mjs      # basket state + any unfinished invocation
node drive/coverage.mjs          # next plan row
```

```js
import { startOrResume, checkpoint, complete, abort } from "./invocation.mjs";
const session = startOrResume();   // resumes an unfinished invocation by default
```

Every invocation gets an id (`S-0007`). Every step is appended to `invocations.jsonl` **before**
the work it names, so a crash always looks like "not done" rather than "half done". Steps:
`started → row-claimed → driven → checked → filed → row-ticked → completed`.

If `startOrResume()` returns `resumed: true`, do **not** restart the row. Continue from its last
step:

- stopped before `filed` → re-drive; nothing was recorded
- stopped after `filed`, before `row-ticked` → do not re-file, just tick and complete
- stopped after `row-ticked` → just complete

If you cannot continue — dev server down, quota exhausted, a dependency broken — call
`abort(session.id, reason)` and say so. The next invocation resumes it. A silently abandoned
invocation is a lie in the record.

## 2. Preflight

```bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ar   # must be 200
```

Down → start `pnpm dev`, or abort with that reason. Never burn a signup on a dead server.

## 3. Take the next plan row

The search space is **seven axes, and only these seven** (`drive/axes.mjs`):

| axis | varies | values |
|---|---|---|
| `persona` | who is driving | rusher · meticulous · newcomer · veteran · sceptic · english-first |
| `flow` | what they are doing | onboarding · proposal-to-client · invoice-and-vat · income-and-hadaf · pricing-tool · clients-and-projects · documents-and-catalog · mobile · english-locale · recovery |
| `strategy` | what KIND of question is asked | metamorphic · differential · time-travel · adversarial · fuzz · state-machine · scale |
| `surface` | where the output lands | screen-desktop · screen-mobile · print-pdf · docx-export · share-anonymous · csv-export |
| `state` | shape of the account | empty · minimal · realistic · heavy · edge-unicode · degraded-profile |
| `tier` | entitlement | anon · free · free-exhausted · pro-active · pro-lapsed |
| `entry` | how they arrived | direct-url · in-app-navigation · shared-link · back-or-refresh-midflow · guided-context |

`drive/plan.md` is a pairwise covering set — 88 rows containing every reachable pair. Take the
next unticked one. Deviate only for a reason you can state in one line.

> **The axis list is CLOSED.** Do not add, rename or remove an axis or a value. Doing so
> invalidates the plan and voids every coverage claim made before it. If a defect class genuinely
> does not fit these seven, **stop and put the case to whoever invoked you** — what the class is,
> why no existing axis holds it, what reopening costs. They decide, not you.

## 4. Drive

Copy `drive/iteration.example.mjs` and rewrite only its **work** section for the assigned flow.
Everything around it — plan row, checkpoints, filing, telemetry, ticking — is already correct.

- **Build state by USING the product**, never by inserting rows. The act of saving is where two
  of pass 5's findings were. The only sanctioned shortcut is the onboarding gate.
- **A fresh account hides almost everything.** Do the work first, then look.
- **Review how it looks** (`uxReview`) at the persona's device size, not only what it stored.
- **Sweeps are a floor, not coverage.** They visit a route in whatever state the account is in,
  so anything behind a tier, a toggle, a populated list or an error condition is invisible to
  them — session S-0003 found a Latin VAT rate on a route the numeral sweep already covered,
  because that line only appears once VAT is on. Reach the gated state by driving, then look.
- **Check the product against itself and against the database** (`tools.db()`).

## 5. Verify before you file

The basket is worthless if it fills with noise.

- **Is it real, or is it my check?** A floor of 4321 "leaking" into a quote of 54321 was a
  substring collision. Two VAT tests fighting over one profile was a parallelism bug in the test.
- **Is the severity right?** "Arabic in a Latin font" read as breakage; zooming the glyph to
  120px showed the real ٠ arriving from a fallback — true finding, wrong severity.
- **Is it the product's number or the user's?** `موقع 25 صفحة` is a client's own wording.
- **Confirm against the database**, not only against another screen.

File what you verified. For anything you could not verify, say so in the description rather than
omitting it or dressing it up.

## 6. File into the basket

```js
import { fileFinding } from "./basket.mjs";
fileFinding({
  title: "short, specific, one line",
  description: "what happens, when, why it matters, and what you verified",
  severity: "P1",
  evidence: ["ledger showed 12,346", "database held 12,345.678"],
  route: "/ar/income",
  run: row.run,
  session: session.id,
});
```

- **P1** — money wrong, a legal obligation breached, something private reaching a client, a screen
  stating something untrue, or a core flow that cannot be completed.
- **P2** — the product contradicts itself, loses work, or misleads without lying.
- **P3** — cosmetic, inconsistent, annoying.

Each finding gets a reference (`RZQ-0007`). One already in the basket is recorded as seen again,
not filed twice. Regenerate the index afterwards: `node drive/basket-index.mjs`.

Anything needing a **product decision** — monetization, pricing policy, brand, design system —
is still filed, with the description saying plainly that it needs a founder decision.

**Withdrawing your own finding.** If verification shows something you filed was never a defect,
`setStatus(ref, "withdrawn", reason)` — not `wont-fix`, which means real-but-not-fixing. A
withdrawn finding is excluded from every count, because an axis credited with defects that do
not exist is the loop lying in exactly the way it exists to catch.

## 7. Record the telemetry

```js
import { recordRun } from "./telemetry.mjs";
recordRun({ run: row.run, findings: [{ text, severity }], closed: [], notes: `session ${session.id}` });
```

Then `node drive/scoreboard.mjs`. It reports, per axis value: runs, P1/P2/P3, yield (findings per
run), dry streak, and a verdict — `untested`, `thin`, `fertile — burn it more`, `productive`,
`cooling`, `mature — consider retiring`. A long dry streak with twenty runs behind it means
field-tested; the same streak with two runs behind it means untested. That difference decides
where the next run goes and is invisible without the record.

`closed` stays empty here — it exists for a separate, human-reviewed remediation pass.

**If verification changes what you found after you recorded it**, amend rather than leaving the
scoreboard wrong:

```js
import { amendRun } from "./telemetry.mjs";
amendRun({ session: session.id, findings: [/* the verified truth */], note: "what changed" });
```

The amendment supersedes the original without adding a run — the run happened, the findings it
was credited with did not. Never re-record a run to correct it; that double-counts.

## 8. Tick, complete, commit

```js
tickPlanRow(row.n);                       // only AFTER filing and recording
complete(session.id, { findings: n });
```

Commit `drive/` only. Never product code.

## 9. Report

In caveman: session id, plan row driven, findings with references and severities, what you
verified and what you could not, and what is left — plan rows remaining, open basket count.

## Stopping

Exhausted when **every plan row is ticked** and **three consecutive runs file no new P1 or P2**.
Say that plainly rather than manufacturing work. Stop early and escalate when the basket
accumulates several findings needing a founder decision, or when something external is broken in
a way you cannot work around.
