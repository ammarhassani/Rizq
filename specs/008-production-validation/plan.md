# Implementation Plan: Production-Maturity Validation

**Branch**: `008-production-validation` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-production-validation/spec.md`

## Summary

Deliver evidence of production readiness in three layers: (1) a committed Playwright e2e harness
that self-provisions a disposable authenticated user and drives every module + the cross-module
golden path as a power user; (2) a static spec-vs-code conformance audit of every module and the
constitution's non-negotiables (money math, honesty/provenance, RLS, i18n/RTL); (3) a single
severity-ranked production-maturity report merging both plus live observations into a ship verdict.

The harness runs against the real running app (`next dev` on `localhost:3000`) hitting real Supabase
(project `qjtisvfjhqizvtqrixut`) and real DeepSeek, with disposable timestamped users (email
confirmation is OFF). Supabase MCP corroborates RLS isolation and feeds the audit with live
security-advisor findings.

## Technical Context

**Language/Version**: TypeScript 5, Node (Playwright Test runner), targeting Next.js 16 App Router app.

**Primary Dependencies**: `@playwright/test` (test runner — **must be added**; repo currently has only
the `playwright` core package), `@axe-core/playwright` (present) for accessibility, `@supabase/supabase-js`
(present) for a direct anon-key client used inside RLS-isolation assertions. Supabase MCP (authed) for
out-of-band corroboration and audit SQL. Existing Vitest suite is unchanged and remains the money-math
unit layer.

**Storage**: Real Supabase Postgres (rizq, `eu-central-1`, ACTIVE_HEALTHY). 42 public tables, RLS
enabled on all. No test-only database; disposable data policy accepted.

**Testing**: Playwright e2e (new) + Vitest unit (existing). Audit is a produced document, not code.

**Target Platform**: Web. Chromium desktop (1280×800) + mobile (Pixel 5, 393×851). Locales `ar` (RTL,
primary) + `en`. Base URL `http://localhost:3000`.

**Project Type**: Web application (existing Next.js monolith). This feature adds a top-level `e2e/`
tree and `docs/validation/` outputs; it does not modify product source except, if unavoidable, adding
stable accessible names — no `data-testid` exists today, so selector strategy is role/label/URL first.

**Performance Goals**: Not a perf feature. Suite should complete a full run in a practical CI window;
AI-dependent specs use generous per-action timeouts (DeepSeek latency) rather than fixed sleeps.

**Constraints**:
- **Signup rate limit**: 5 signups / 5 min / IP (`src/app/actions/auth/signup.ts`). The whole run must
  create ≤2 users (main + isolation) via a single global setup, reused via `storageState`. Back-to-back
  full runs within 5 min risk `rate_limited` — documented ceiling.
- **GoTrue email validation** rejects `@test.com`/`@example.com` (`email_address_invalid`). Disposable
  emails must use a domain GoTrue accepts; resolved empirically in setup (see research.md).
- **Onboarding gate**: `/dashboard` redirects to `/onboarding` until `onboarded_at`/`onboarding_completed`
  is set. Fixture must clear the gate once (drive minimal onboarding or skip path).
- **Locale routing**: every path is `/{ar|en}/...`; bare paths redirect. Tests assert post-redirect URL.

**Scale/Scope**: ~45 page routes, 15 module areas (M0–M12 + Projects + Auth + Upgrade), 42 tables,
~25 server-action groups. Full-breadth coverage is the explicit scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Honesty is the moat | The report itself must be evidence-linked; no unsupported "it works". Audit explicitly checks provenance/AI-labeling. | ✅ Advances |
| II. Arabic-first/RTL | Cross-cutting suite asserts RTL + dual-locale render. | ✅ Advances |
| III. Mobile-first | Mobile-viewport project + no-horizontal-overflow assertions. | ✅ Advances |
| IV. Test the money & rules | Adds e2e on top of existing Vitest money units; audit cross-checks constants to spec. | ✅ Advances |
| V. Every module stands alone | Suite asserts loading/empty/error states per module. | ✅ Advances |
| VI. Halal/Saudi-compliant | Read-only validation; no scraping; PDPL-safe (disposable synthetic data only). | ✅ Neutral |
| VII. AI as multiplier | Tests tolerate AI degradation gracefully (distinguish slow vs broken). | ✅ Neutral |

**Locked-stack check**: adds `@playwright/test` (dev dependency, test-only) — not a stack swap, no
founder approval needed. No product runtime dependency added. **No violations.**

## Project Structure

### Documentation (this feature)

```text
specs/008-production-validation/
├── plan.md              # This file
├── research.md          # Phase 0 — resolved decisions (selector strategy, email domain, fixture, waits)
├── data-model.md        # Phase 1 — test entities + app user-owned tables (RLS matrix source)
├── quickstart.md        # Phase 1 — how to run the suite + read the report
├── contracts/
│   └── coverage-matrix.md   # Phase 1 — the module→spec→test coverage contract
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
e2e/                                 # NEW — Playwright harness (committed)
├── fixtures/
│   ├── auth.ts                      # test.extend: authedPage (main user storageState), isolationPage (user B)
│   ├── users.ts                     # disposable-user factory (unique email, signup+onboarding, cleanup-none)
│   └── selectors.ts                 # shared role/label helpers; locale-aware text lookups
├── setup/
│   └── global-setup.ts              # one signup + minimal onboarding → save storageState/*.json
├── modules/                         # one spec per module (US1)
│   ├── m0-dashboard.spec.ts   m1-proposal-studio.spec.ts   m2-client-book.spec.ts
│   ├── m3-income-ledger.spec.ts   m4-pricing-lookup.spec.ts   m5-hadaf.spec.ts
│   ├── m6-invoicing.spec.ts   m7-methodology.spec.ts   m8-onboarding.spec.ts
│   ├── m9-calendar.spec.ts   m10-rate-calculator.spec.ts   m12-document-vault.spec.ts
│   ├── projects.spec.ts   auth-flows.spec.ts   upgrade-paywall.spec.ts
├── journeys/
│   └── golden-path.spec.ts          # onboarding→proposal→project→invoice→income→dashboard (US1)
├── cross-cutting/                   # US3
│   ├── rls-isolation.spec.ts        # user B cross-read denied (UI + anon-key direct query) per entity
│   ├── a11y.spec.ts                 # axe scan per authenticated page
│   ├── i18n-rtl.spec.ts             # dir=rtl + dual-locale render, no missing-key artifacts
│   ├── mobile.spec.ts               # no horizontal overflow, reachable primary actions
│   ├── share-tokens.spec.ts         # /d /i /p /r valid renders; altered token does not leak
│   └── realtime-feedback.spec.ts    # mutation reflects w/o reload; loading state; toast after
└── README.md                        # run instructions, ceilings

playwright.config.ts                 # NEW — webServer(next dev), projects (desktop/mobile × ar/en), storageState

docs/validation/                     # NEW — outputs (US2 + US4)
├── business-logic-audit.md          # per-module conformance verdicts + findings (severity, spec clause, file:line)
└── production-maturity-report.md    # merged scorecard + overall verdict (final deliverable)
```

**Structure Decision**: Top-level `e2e/` (Playwright convention, kept out of `src/` so it never ships in
the app bundle) with fixtures/setup/modules/journeys/cross-cutting subtrees mirroring the spec's user
stories. Audit + report live under `docs/validation/`. Existing `src/**/*.test.ts` Vitest units are left
untouched. No product-source changes beyond, if strictly necessary, adding accessible names for otherwise
unselectable controls (preferred over `data-testid`, and only when role/label selection genuinely fails).

## Complexity Tracking

No constitution violations. Table intentionally empty.
