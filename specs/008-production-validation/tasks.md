---
description: "Task list — Production-Maturity Validation"
---

# Tasks: Production-Maturity Validation

**Input**: Design documents from `specs/008-production-validation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/coverage-matrix.md

**Tests**: This feature's *deliverable* is a test suite; the Playwright specs below ARE the
implementation, so there are no separate "tests of the tests". The static audit + report are produced
documents.

**Organization**: Grouped by user story (US1 e2e suite · US2 audit · US3 cross-cutting · US4 report).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different file, no dependency on an incomplete task)
- **[Story]**: US1–US4 for story phases; none for Setup/Foundational/Polish

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Add `@playwright/test` dev dependency to `package.json` and run `npx playwright install chromium`
- [ ] T002 Create `playwright.config.ts` at repo root: `webServer` running `next dev` on `http://localhost:3000` (reuseExistingServer), projects for chromium-desktop + mobile-Pixel5 × locales ar/en, per-project `storageState`, HTML + list reporters, `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`, generous `expect` timeout for AI waits
- [ ] T003 [P] Add `e2e/.auth/`, `test-results/`, `playwright-report/`, `.playwright/` to `.gitignore` (SECURITY: session storageState must never be committed)
- [ ] T004 [P] Create `e2e/README.md` documenting run commands, the disposable-user policy, and the accepted ceilings (rate limit, orphaned rows, token cost)
- [ ] T005 [P] Create `docs/validation/` with stub `business-logic-audit.md` and `production-maturity-report.md` (headers only, filled in US2/US4)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: US1 and US3 cannot run until fixtures exist.

- [ ] T006 Create `e2e/fixtures/users.ts`: disposable-user factory — unique email `azahrani337+rizqe2e-{ts}-{rand}@gmail.com` (research D3), signs up via the signup UI, then drives the **minimal onboarding path** to clear the `onboarded_at`/`onboarding_completed` gate (research D4)
- [ ] T007 Create `e2e/setup/global-setup.ts`: create the **main** user and the **isolation** user via T006, save each session to `e2e/.auth/main.json` and `e2e/.auth/isolation.json` via `storageState` (depends on T006; exactly 2 signups per run — rate-limit headroom)
- [ ] T008 [P] Create `e2e/fixtures/auth.ts`: `test.extend` exposing `authedPage` (main storageState) and `isolationPage` (isolation storageState)
- [ ] T009 [P] Create `e2e/fixtures/selectors.ts`: role/label helper utilities + locale-aware accessible-name lookups (research D2 — no `data-testid`)
- [ ] T010 [P] Create `e2e/fixtures/supabaseClient.ts`: anon-key `supabase-js` client + "sign in as user" helper for direct RLS-isolation queries (research D6), reading env from `.env.local`

**Checkpoint**: run `npx playwright test --project=chromium-desktop-en e2e/setup` (or a smoke spec) → `.auth/*.json` written, authenticated `/en/dashboard` reachable without redirect to onboarding.

---

## Phase 3: User Story 1 — Automated power-user e2e suite (Priority: P1) 🎯 MVP

**Goal**: Every module + the golden path drive as a power user and assert persisted, visible results.

**Independent Test**: `npx playwright test e2e/modules e2e/journeys` → per-module pass/fail matrix + a passing cross-module journey.

- [ ] T011 [P] [US1] `e2e/modules/m0-dashboard.spec.ts`: new-user empty state, goal bar renders, AI insight carries `Rizq Insight —` label, HADAF card present
- [ ] T012 [P] [US1] `e2e/modules/m1-proposal-studio.spec.ts`: brief → generate AI proposal (tolerate latency), price shows provenance + sample size, AI output labeled, proposal persists, `/p/[token]` share renders; templates route loads
- [ ] T013 [P] [US1] `e2e/modules/m2-client-book.spec.ts`: create client → set priority → detail + timeline; persists across reload
- [ ] T014 [P] [US1] `e2e/modules/m3-income-ledger.spec.ts`: add income entry → totals update, goal bar moves, anomaly labeled when triggered
- [ ] T015 [P] [US1] `e2e/modules/m4-pricing-lookup.spec.ts`: search specialty/city/tier → min/median/max band, provenance + sample size + date range cited, fallback labeled, `/r/[id]` shareable
- [ ] T016 [P] [US1] `e2e/modules/m5-hadaf.spec.ts`: eligibility status renders, threshold numbers present, AI action plan labeled
- [ ] T017 [P] [US1] `e2e/modules/m6-invoicing.spec.ts`: create invoice with items → assert subtotal + **15% VAT** + total math, invoice-number format, DOCX download is a valid zip (`PK`), overdue state, `/i/[token]` renders
- [ ] T018 [P] [US1] `e2e/modules/m7-methodology.spec.ts`: sections + FAQ render
- [ ] T019 [P] [US1] `e2e/modules/m8-onboarding.spec.ts`: strength meter increases with fields, resume restores step, brand-kit AI generates + labeled, `+966` prefix, email/phone validation, live brand + price preview update
- [ ] T020 [P] [US1] `e2e/modules/m9-calendar.spec.ts`: deadlines render + grouping + empty state
- [ ] T021 [P] [US1] `e2e/modules/m10-rate-calculator.spec.ts`: inputs → computed rate + derived daily, no-max behavior
- [ ] T022 [P] [US1] `e2e/modules/m12-document-vault.spec.ts`: upload doc → AI category suggested + labeled, expiry surfaced, `/d/[token]` renders
- [ ] T023 [P] [US1] `e2e/modules/projects.spec.ts`: create-from-proposal, wizard stages resumable, workspace tabs (Files/Deliverables/Tasks), guided-mode `from=project:` back/return, GitHub connect gated (secret never exported to client)
- [ ] T024 [P] [US1] `e2e/modules/auth-flows.spec.ts` (uses **unauthenticated** context, no storageState): signup→session→logout→login, gated route → `login?returnTo`, login lands on `returnTo`, signed-in on `/login` bounced to dashboard
- [ ] T025 [P] [US1] `e2e/modules/upgrade-paywall.spec.ts`: free-tier quota enforced, paywall at limit, **assert a signed-in non-admin cannot self-grant Pro** (probe the `admin_grant_pro` exposure from research D9)
- [ ] T026 [P] [US1] `e2e/journeys/golden-path.spec.ts`: proposal → project → invoice → income → dashboard, asserting each hop's data flows and the dashboard reflects the income

**Checkpoint**: US1 fully runnable; per-module matrix produced.

---

## Phase 4: User Story 2 — Business-logic conformance audit (Priority: P1)

**Goal**: Every module + the constitution's rules read against `spec-v2`; severity-ranked gaps with evidence.

**Independent Test**: `docs/validation/business-logic-audit.md` — each module has a verdict; each finding has severity + spec clause + `file:line`. Runs independently of the harness (static read).

- [ ] T027 [P] [US2] `docs/validation/_audit/money-math.md`: verify VAT = 15%, HADAF thresholds, invoice totals, pricing percentile method against `spec-v2` values (cross-check `src/lib/invoices/*`, `src/lib/hadaf/*`, `src/lib/pricing/*`)
- [ ] T028 [P] [US2] `docs/validation/_audit/honesty.md`: verify every user-facing number cites provenance and every AI output is labeled (`Rizq Insight —` / `تحليل رِزق —`); flag violations (Principle I)
- [ ] T029 [P] [US2] `docs/validation/_audit/security.md`: confirm advisor pre-seeds in code — `admin_grant_pro` anon/authenticated EXECUTE + in-function admin check, `fx_rates` permissive INSERT, `provider_connections` deny-all, `get_shared_*`/`log_*` token-scoping, leaked-password protection off; rank each
- [ ] T030 [P] [US2] `docs/validation/_audit/i18n.md`: verify both-locale strings present, no missing-key filler, RTL handling (Principle II)
- [ ] T031 [P] [US2] `docs/validation/_audit/modules-a.md`: conformance verdicts for M0–M6 vs their `spec-v2` Part III sections
- [ ] T032 [P] [US2] `docs/validation/_audit/modules-b.md`: conformance verdicts for M7–M12 + Projects vs `spec-v2` / specs 002–005
- [ ] T033 [US2] Merge `_audit/*` fragments into `docs/validation/business-logic-audit.md` — deduped, severity-ranked (depends on T027–T032)

---

## Phase 5: User Story 3 — Cross-cutting production guarantees (Priority: P2)

**Goal**: RLS, a11y, RTL/i18n, mobile, share-token safety, realtime feedback — proven as suites.

**Independent Test**: `npx playwright test e2e/cross-cutting` — isolation cross-reads all fail; axe reports; RTL asserted; no mobile overflow; altered tokens don't leak; mutations reflect without reload.

- [ ] T034 [P] [US3] `e2e/cross-cutting/rls-isolation.spec.ts`: for every user-owned entity (data-model §B), user B cannot read/mutate user A's row — UI path + direct anon-key query (uses `isolationPage` + `supabaseClient`)
- [ ] T035 [P] [US3] `e2e/cross-cutting/a11y.spec.ts`: `@axe-core/playwright` scan each authenticated page; report critical/serious violations
- [ ] T036 [P] [US3] `e2e/cross-cutting/i18n-rtl.spec.ts`: `ar` renders `dir=rtl`, both locales render key pages, no raw missing-key strings
- [ ] T037 [P] [US3] `e2e/cross-cutting/mobile.spec.ts`: Pixel viewport — no horizontal overflow, primary actions reachable
- [ ] T038 [P] [US3] `e2e/cross-cutting/share-tokens.spec.ts`: valid `/d /i /p /r` tokens render; altered/guessed token → not-found, no leak (research D8)
- [ ] T039 [P] [US3] `e2e/cross-cutting/realtime-feedback.spec.ts`: a mutation reflects without manual reload, shows a loading state during, and a toast/confirmation after (research D5)

**Checkpoint**: cross-cutting suites runnable.

---

## Phase 6: User Story 4 — Consolidated production-maturity report (Priority: P2)

**Goal**: One report merging audit + e2e + live observations into a scorecard + ship verdict.

**Independent Test**: `docs/validation/production-maturity-report.md` — overall verdict, per-module green/yellow/red, ranked blockers, each linked to evidence.

- [ ] T040 [US4] Run the full suite (`npx playwright test`), collect the pass/fail matrix + traces (depends on US1 + US3)
- [ ] T041 [US4] Live eyeball pass via Playwright MCP over the golden path — capture realtime/animation/provenance observations assertions can't (screenshots into `docs/validation/`)
- [ ] T042 [US4] Compile `docs/validation/production-maturity-report.md`: per-module `ModuleCoverageRecord` scorecard, severity-ranked findings (blockers first), overall ship / ship-with-caveats / not-ready verdict, every claim linked to a test name or audit finding (depends on T033, T040, T041)

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T043 [P] Add a `test:e2e` script to `package.json` (`playwright test`)
- [ ] T044 Run `quickstart.md` end-to-end on a clean checkout to confirm zero-manual-step execution
- [ ] T045 Confirm `pnpm typecheck` and existing `pnpm test` (Vitest) remain green — the harness must not break the build/merge gate
- [ ] T046 Commit in small atomic groups (config+fixtures / module specs / cross-cutting / audit / report)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (P1)**: no deps — start immediately.
- **Foundational (P2)**: after Setup — **blocks US1 & US3**.
- **US1 (P3)**: after Foundational.
- **US2 (P4)**: independent of the harness (static read) — can run in parallel with Setup/US1.
- **US3 (P5)**: after Foundational.
- **US4 (P6)**: after US1 + US3 (needs suite results) + US2 (needs audit).
- **Polish (P7)**: last.

### Within stories

- US1 specs are all independent files → fully parallel once fixtures exist.
- US2 fragment tasks are independent files → parallel; only the merge (T033) waits.
- US3 specs are independent files → parallel.

### Parallel Opportunities

- Setup T003/T004/T005 in parallel.
- Foundational T008/T009/T010 in parallel (after T006/T007).
- All of US1 (T011–T026) in parallel.
- All of US2 fragments (T027–T032) in parallel — **and US2 can run concurrently with US1** (no shared files).
- All of US3 (T034–T039) in parallel.

---

## Parallel Example: User Story 1

```bash
# After fixtures (T006–T010) exist, all module specs are independent files:
Task: "e2e/modules/m1-proposal-studio.spec.ts"
Task: "e2e/modules/m6-invoicing.spec.ts"
Task: "e2e/modules/m8-onboarding.spec.ts"
# ...and the rest of T011–T026 together.
```

---

## Implementation Strategy

### MVP First (US1)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE**: run
   `npx playwright test e2e/modules e2e/journeys`, read the per-module matrix. This alone answers
   "is it working?".

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → per-module matrix (MVP: is it working?).
3. US2 (parallel) → conformance gaps (does it match spec-v2?).
4. US3 → security/a11y/i18n/mobile/realtime guarantees.
5. US4 → the merged verdict the founder asked for.

### Notes

- [P] = different file, no dependency. [Story] label maps to spec user stories.
- Commit after each logical group. Never commit `e2e/.auth/*` (real session state).
- AI-dependent specs distinguish graceful degradation (pass) from broken (fail) — research D5.
- This feature **validates and reports**; it does not fix the defects it finds (spec Assumptions).
