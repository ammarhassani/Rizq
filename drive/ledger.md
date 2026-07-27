# Drive ledger

What the loop has driven, and what it found. Committed on purpose: `drive/.auth/findings.log`
dies with the browser profile, and knowing which parts of the product nobody has opened is worth
more than the account that opened them.

An iteration reads this first, drives the flow listed as least recently driven, and appends what
it learned. Findings already listed here are counted but not re-reported, so each run says what
is **new**.

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

## Open findings

- 2026-07-27 · The paywall meters "المشاريع · ٢٠/شهر" but the quota trigger is on `gigs`, so
  `createBlankProject` ("set up directly") creates unlimited projects on the free tier. Either
  the limit belongs on `projects` too or the paywall should name what is metered. **Founder
  call — monetization, not a bug fix.**
- 2026-07-27 · The calendar shows a draft invoice's due date while the dashboard excludes it
  (`status in sent/viewed/overdue`). Two definitions of "upcoming" on one account.

## Known and accepted

- The M4 trend line does not render for the current corpus. No `(specialty, city, tier)` cell
  holds the 8 dated rows a direction needs, and the national fallback is refused because the
  halves price different kinds of work. Correct behaviour; it appears when the benchmark set
  carries dated rows of a consistent basis. See the 010 T027 follow-up.
- A proposal titled `موقع 25 صفحة` shows Latin digits. That is the client's own wording, not the
  app formatting a figure.
- Repeated identical pricing lookups do not consume quota (served from cache). Intended.
