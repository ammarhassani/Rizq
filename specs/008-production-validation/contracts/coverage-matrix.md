# Coverage Matrix (Contract)

The binding contract between the spec and the harness: every row MUST have a passing (or explicitly
failing-with-finding) test and an audit verdict. `tasks.md` derives one task per row. Routes are
locale-prefixed (`/{ar|en}/...`).

## Module e2e coverage (US1)

| Module | Spec Part III | Primary route(s) | Primary power-user flow | Test file | Key assertions |
|---|---|---|---|---|---|
| M0 Dashboard | M0 | `/dashboard` | Land post-onboarding; view goal bar, insights, HADAF card | `modules/m0-dashboard.spec.ts` | empty-state for new user; goal bar renders; AI insight labeled `Rizq Insight —`; HADAF card present |
| M1 Proposal Studio | M1 | `/proposals/new`, `/proposals/[id]`, `/proposals/templates` | Brief → generate AI proposal → see price + provenance → edit → share | `modules/m1-proposal-studio.spec.ts` | proposal persists; price cites provenance/sample; AI output labeled; `/p/[token]` share renders |
| M2 Client Book | M2 | `/clients`, `/clients/new`, `/clients/[id]` | Create client → set priority → view detail + timeline | `modules/m2-client-book.spec.ts` | client persists; priority reflected; timeline entries show |
| M3 Income Ledger | M3 | `/income`, `/income/new`, `/income/[id]` | Add income → see anomaly flag + goal contribution | `modules/m3-income-ledger.spec.ts` | entry persists; totals update; goal bar moves; anomaly labeled if triggered |
| M4 Pricing Lookup | M4 | `/tool`, `/catalog`, `/r/[id]` | Search specialty/city/tier → see percentile band + citation + freshness | `modules/m4-pricing-lookup.spec.ts` | min/median/max shown; provenance + sample size + date range cited; fallback labeled; `/r/[id]` shareable |
| M5 HADAF | M5 | `/hadaf` | View eligibility calc + thresholds + action plan | `modules/m5-hadaf.spec.ts` | eligibility status renders; threshold numbers match spec; AI action plan labeled |
| M6 Invoicing | M6 | `/invoices`, `/invoices/new`, `/invoices/[id]`, `/i/[token]` | Create invoice w/ items → VAT 15% total → export DOCX → share | `modules/m6-invoicing.spec.ts` | subtotal + 15% VAT + total correct; invoice number format; DOCX download valid (PK zip); overdue state; `/i/[token]` renders |
| M7 Methodology | M7 | `/methodology` | Read sections + FAQ | `modules/m7-methodology.spec.ts` | sections render both locales; FAQ present |
| M8 Onboarding | M8 | `/onboarding` | Deep profile: fields, strength meter, resumable, brand-kit AI, +966 phone, WhatsApp checkbox, validation, live preview | `modules/m8-onboarding.spec.ts` | strength meter increases with fields; resume restores step; brand-kit AI generates + labeled; +966 prefix; email/phone validation; live brand + price preview update |
| M9 Calendar | M9 | `/calendar` | View deadlines grouped | `modules/m9-calendar.spec.ts` | deadlines render; grouping correct; empty state |
| M10 Rate Calculator | M10 | `/rate-calculator` | Enter inputs → derived rate + daily | `modules/m10-rate-calculator.spec.ts` | rate computes; derived daily shown; no-max behavior per 007-kept restructure |
| M12 Document Vault | M12 | `/documents`, `/documents/new`, `/documents/[id]`, `/d/[token]` | Upload doc → AI categorize → expiry → share | `modules/m12-document-vault.spec.ts` | upload persists; category suggested + labeled; expiry surfaced; `/d/[token]` renders |
| Projects | 002–005 | `/projects`, `/projects/start`, `/projects/[id]` | Create-from-proposal / wizard / workspace tabs / guided `from=project:` / GitHub OAuth | `modules/projects.spec.ts` | project created from proposal; wizard stages resumable; workspace tabs (Files/Deliverables/Tasks); guided-mode back/return; GitHub connect gated, secrets never exported |
| Auth | Part II | `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password` | Signup → session → logout → login; protected redirect + returnTo; signed-in bounce | `modules/auth-flows.spec.ts` | gated route → login?returnTo; login lands returnTo; signed-in on /login bounced to dashboard; logout clears session |
| Upgrade/Paywall | Part IV | `/upgrade` | Hit a gated/quota action → paywall; tier state | `modules/upgrade-paywall.spec.ts` | free-tier quota enforced; paywall shown at limit; **verify no self-serve Pro grant (admin_grant_pro)** |

## Cross-module journey (US1)

| Journey | Test file | Proves |
|---|---|---|
| Golden path | `journeys/golden-path.spec.ts` | proposal → project → invoice → income → dashboard: each hop's data flows and the dashboard reflects the income |

## Cross-cutting suites (US3)

| Concern | Test file | Assertion |
|---|---|---|
| RLS isolation | `cross-cutting/rls-isolation.spec.ts` | user B cannot read/mutate user A rows — UI path + anon-key direct query — for every user-owned entity in data-model §B |
| Accessibility | `cross-cutting/a11y.spec.ts` | axe scan each authenticated page; report critical/serious violations |
| i18n / RTL | `cross-cutting/i18n-rtl.spec.ts` | `dir=rtl` in `ar`; both locales render key pages; no raw missing-key strings |
| Mobile | `cross-cutting/mobile.spec.ts` | Pixel viewport: no horizontal overflow; primary actions reachable |
| Share tokens | `cross-cutting/share-tokens.spec.ts` | valid token renders; altered token → not-found, no leak (`/d /i /p /r`) |
| Realtime feedback | `cross-cutting/realtime-feedback.spec.ts` | mutation reflects without manual reload; loading state during; toast/confirmation after |

## Audit coverage (US2) → `docs/validation/business-logic-audit.md`

| Lens | What it verifies |
|---|---|
| Per-module conformance | Each module M0–M12 + Projects vs its spec Part III → verdict (conforms/partial/gap) |
| Money math | VAT 15%; HADAF thresholds; invoice totals; pricing percentile method vs spec constants |
| Honesty (Principle I) | Every user-facing number cites provenance; AI output labeled; uncertainty declared |
| Security/RLS in code | Confirms advisor pre-seeds (D9): `admin_grant_pro` anon-exec, `fx_rates` permissive insert, etc. |
| i18n/RTL in code | Both-locale strings present; no machine-translation filler; RTL handling |

## Report (US4) → `docs/validation/production-maturity-report.md`

| Requirement | Content |
|---|---|
| Scorecard | one ModuleCoverageRecord row per module (green/yellow/red) |
| Ranked findings | blockers → high → medium → low, each linked to evidence |
| Verdict | ship / ship-with-caveats / not-ready, understandable by a non-engineer |
