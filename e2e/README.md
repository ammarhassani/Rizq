# Rizq e2e harness (feature 008 — production-maturity validation)

Playwright suite that drives the app as a power user against **real** Supabase + DeepSeek.

## Run

```bash
pnpm add -D @playwright/test      # once
npx playwright install chromium   # once
npx playwright test               # full suite (auto-starts `next dev`)
npx playwright test e2e/modules/m6-invoicing.spec.ts   # one spec
npx playwright show-report        # last HTML report
```

## How it works

- `playwright.config.ts` runs `pnpm dev`, then `e2e/setup/global-setup.ts` signs up two disposable
  users (main + isolation) and saves their sessions to `e2e/.auth/*.json` (gitignored).
- Specs default to the **main** authenticated user. `auth-flows` and `share-tokens` override to an
  anonymous context. `rls-isolation` uses both users.
- Selectors are role/label/URL based (no `data-testid` in the app). Flow specs run the **English**
  locale for deterministic copy; `i18n-rtl` covers Arabic/RTL separately.

## Accepted ceilings (see specs/008-production-validation/research.md)

- **Email confirmation must be OFF** in Supabase Auth, or headless signup can't get a session.
- Signup is rate-limited **5 / 5 min / IP**; the suite uses **2** per run. Space back-to-back full runs.
- Disposable emails: `azahrani337+rizqe2e-<ts>-<rand>@gmail.com`. Confirmation is off so no mail is sent.
- Test runs create real rows and **leave them orphaned** (no cleanup). Uniqueness prevents collisions.
- Real DeepSeek calls cost tokens.

## Layout

```
e2e/
  fixtures/    auth.ts · users.ts · selectors.ts · supabaseClient.ts
  setup/       global-setup.ts
  modules/     one spec per module (M0–M12, projects, auth, upgrade)
  journeys/    golden-path.spec.ts
  cross-cutting/  rls · a11y · i18n-rtl · mobile · share-tokens · realtime
```
