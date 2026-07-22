# Quickstart: Running the Validation Suite

Run the harness end-to-end and read the outputs. Details live in [plan.md](./plan.md),
[research.md](./research.md), and [contracts/coverage-matrix.md](./contracts/coverage-matrix.md).

## Prerequisites (one-time)

1. **Email confirmation OFF** in Supabase Auth (rizq project `qjtisvfjhqizvtqrixut`) — done by founder.
   Without it, headless self-signup cannot produce a session.
2. Populated `.env.local` (already present: Supabase URL + anon key, DeepSeek key).
3. Install the test runner + browser:
   ```bash
   pnpm add -D @playwright/test
   npx playwright install chromium
   ```

## Run

```bash
# full suite (auto-starts `next dev`, self-provisions users, runs all projects)
npx playwright test

# one module
npx playwright test e2e/modules/m6-invoicing.spec.ts

# only the golden path
npx playwright test e2e/journeys/golden-path.spec.ts

# only cross-cutting (a11y, rls, rtl, mobile, tokens, realtime)
npx playwright test e2e/cross-cutting/

# open the HTML report after a run
npx playwright show-report
```

`playwright.config.ts` `webServer` starts the app; no separate `pnpm dev` needed. Global setup signs up
the main + isolation users once and saves `e2e/.auth/*.json` (gitignored).

## Expected outcomes (validation scenarios)

- **Setup passes**: two users created, onboarding gate cleared, `main.json`/`isolation.json` written.
  A `rate_limited` here means two full runs happened inside 5 min (D4 ceiling) — wait and rerun.
- **Per-module specs**: each module's primary create/read flow completes and asserts persisted results;
  failures name the module + capture screenshot/trace (`test-results/`).
- **Golden path passes**: a proposal reaches the dashboard via project → invoice → income.
- **RLS isolation passes**: every cross-read by user B fails (UI + direct anon-key query).
- **Cross-cutting**: axe reports per page; `ar` renders RTL; mobile has no horizontal overflow; altered
  share tokens do not leak; mutations reflect without reload with a loading state + toast.
- **AI-dependent specs**: tolerate DeepSeek latency (web-first waits); a graceful-degradation fallback is a
  pass, only a broken/error-boundary state fails.

## Outputs to read

- `docs/validation/business-logic-audit.md` — per-module spec-conformance verdicts + severity-ranked findings.
- `docs/validation/production-maturity-report.md` — the final merged scorecard + ship verdict.
- `playwright-report/` — interactive pass/fail with traces.

## Ceilings (accepted)

- Test runs create real Supabase rows and leave them orphaned (no cleanup). Uniqueness prevents collisions.
- Real DeepSeek calls cost tokens.
- Signup rate limit is 5 / 5 min / IP; the suite uses 2 per run — space back-to-back full runs.
