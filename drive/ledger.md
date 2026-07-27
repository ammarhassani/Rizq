# Drive ledger

What the loop has driven, and what it found. Committed on purpose: `drive/.auth/findings.log`
dies with the browser profile, and knowing which parts of the product nobody has opened is worth
more than the account that opened them.

An iteration reads this first, drives the road nobody has driven (`node drive/coverage.mjs`),
and appends what it learned. Findings already listed here are counted but not re-reported, so
each run says what is **new**.

Findings carry a grade, because "we ran out of defects" is meaningless without one — cosmetic
findings never run out. **P1**: money wrong, a legal obligation breached, something private
reaching a client, a screen stating something untrue. **P2**: the product contradicting itself
or losing work. **P3**: cosmetic. The loop stops when three consecutive iterations produce no
new P1 or P2.

## Flow coverage
| flow | last driven | iterations |
|---|---|---|
| `clients-and-projects` | never | 0 |
| `documents-and-catalog` | never | 0 |
| `english-locale` | never | 0 |
| `income-and-hadaf` | 2026-07-27 | 2 |
| `invoice-and-vat` | never | 0 |
| `mobile` | never | 0 |
| `onboarding` | never | 0 |
| `pricing-tool` | never | 0 |
| `proposal-to-client` | never | 0 |
| `recovery` | never | 0 |
| `rusher/onboarding` | 2026-07-27 | 1 |

## Open findings

- 2026-07-27 · **P2 — Mobile tap targets under 44px** across the app shell — the apps-menu and
  theme-toggle icon buttons are 36×36, the locale switch 94×16, filter chips 32px tall. 70%+ of
  traffic is mobile (Principle III). Found by the `rusher` persona at 390px.
- 2026-07-27 · **P2 — Serious colour-contrast violations** on dashboard, income, invoice builder and
  HADAF (axe, WCAG 2 AA) — up to 10 nodes on one screen.
- 2026-07-27 · **P3 — HADAF progress bar has no accessible name** (`aria-progressbar-name`).
- 2026-07-27 · **P3 — Money figures declare a Latin-only font stack** (`font-mono`, `tabular
  font-sans`), so Arabic-Indic digits render in whatever face the device falls back to. Verified
  NOT to be tofu — a 120px zoom shows the real ٠ glyph — but the fallback is undeclared, so the
  numerals differ between a Mac and an Android. Design-system gap; the brand specifies Tajawal.


- 2026-07-27 · **P2 (founder call)** — the paywall meters "المشاريع · ٢٠/شهر" but the quota trigger is on `gigs`, so
  `createBlankProject` ("set up directly") creates unlimited projects on the free tier. Either
  the limit belongs on `projects` too or the paywall should name what is metered. **Founder
  call — monetization, not a bug fix.**
- 2026-07-27 · **P3** — the calendar shows a draft invoice's due date while the dashboard excludes it
  (`status in sent/viewed/overdue`). Two definitions of "upcoming" on one account.

## Known and accepted

- The M4 trend line does not render for the current corpus. No `(specialty, city, tier)` cell
  holds the 8 dated rows a direction needs, and the national fallback is refused because the
  halves price different kinds of work. Correct behaviour; it appears when the benchmark set
  carries dated rows of a consistent basis. See the 010 T027 follow-up.
- A proposal titled `موقع 25 صفحة` shows Latin digits. That is the client's own wording, not the
  app formatting a figure.
- Repeated identical pricing lookups do not consume quota (served from cache). Intended.
