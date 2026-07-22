# Research: Production-Maturity Validation

Phase 0 decisions. Each resolves an unknown that blocks a clean harness.

## D1 — Test runner: add `@playwright/test`

- **Decision**: Add `@playwright/test` as a dev dependency and run `npx playwright install chromium`.
- **Rationale**: Repo has only `playwright` (core, v1.61) — the browser automation library, not the
  test runner (`test`, `expect`, fixtures, `webServer`, projects, HTML reporter). The harness needs the
  runner. `@axe-core/playwright` is already present.
- **Alternatives**: Drive via the Playwright MCP browser tools only — rejected: not committable/repeatable,
  no assertion/reporter/CI story. MCP is used *additionally* for the live eyeball pass (US4), not as the suite.

## D2 — Selector strategy (no `data-testid` exists)

- **Decision**: Select by ARIA role + accessible name (`getByRole`), form labels (`getByLabel`),
  and URL assertions — never by CSS class. For specs whose assertions depend on exact visible copy, run
  them in the **English** locale (deterministic strings) while a dedicated `i18n-rtl` spec covers Arabic
  rendering separately. Only if a control is genuinely unselectable by role/label do we add an accessible
  name to product source (preferred over `data-testid`).
- **Rationale**: Zero `data-testid` in `src/`. Role/label selectors double as a free accessibility signal
  and survive copy changes. Locale-splitting avoids brittle Arabic string matching in flow specs.
- **Alternatives**: Sprinkle `data-testid` across product code — rejected as invasive churn on prod for a
  read-only validation feature (constitution: added complexity must be justified).

## D3 — Disposable email domain (GoTrue blocklist)

- **Decision**: `azahrani337+rizqe2e-{timestamp}-{rand}@gmail.com` (founder's real, GoTrue-accepted
  address with plus sub-addressing). The timestamp+rand guarantees uniqueness across runs.
- **Rationale**: `signUp` surfaces `email_address_invalid` for `@test.com`/`@example.com`; GoTrue accepts
  real MX domains like gmail. Email confirmation is OFF, so **no mail is actually delivered** — the plus
  address never floods the inbox. A single real base address keeps setup dependency-free.
- **Alternatives**: A throwaway-mail domain — rejected: extra moving part, some are on GoTrue blocklists.

## D4 — Auth fixture & session reuse

- **Decision**: `global-setup.ts` performs the signup once for the **main** user and once for the
  **isolation** user, drives the minimal onboarding path to clear the gate, and saves each session to
  `e2e/.auth/main.json` / `e2e/.auth/isolation.json` via `storageState`. Module/journey specs load
  `main.json`; `rls-isolation` loads both. `.auth/` is gitignored.
- **Rationale**: Signup is rate-limited to 5/5 min/IP; centralizing to exactly 2 signups per run keeps
  headroom. The dashboard gate (`onboarded_at`/`onboarding_completed`) must be cleared once; the
  onboarding *module* spec still tests the wizard deeply and independently.
- **Ceiling** (`ponytail:`): back-to-back full runs inside 5 min may hit `rate_limited`; acceptable —
  space runs or the setup surfaces the code clearly. Upgrade path: per-run IP variation only if it bites.

## D5 — Waiting on real AI (DeepSeek) without flaky sleeps

- **Decision**: Web-first assertions with generous timeouts (e.g. `expect(locator).toBeVisible({timeout})`)
  and `expect.poll` for async completion. No fixed `waitForTimeout`. A spec distinguishes **AI-degraded**
  (graceful fallback/label visible per Principle VII) from **broken** (nothing renders, error boundary) and
  only fails on the latter.
- **Rationale**: DeepSeek latency is variable; the constitution requires graceful degradation, so "slow AI"
  is not a product failure. Encodes that distinction into assertions.

## D6 — RLS / tenant-isolation verification (two mechanisms)

- **Decision**: For each user-owned entity, verify isolation two ways:
  1. **UI**: user B navigates to a resource ID/URL owned by user A → expect not-found/empty/redirect.
  2. **Direct data**: an anon-key `supabase-js` client signed in as user B queries user A's row id →
     expect zero rows (RLS filters) or error.
  Supabase MCP corroborates out-of-band (row exists for A, invisible to B).
- **Rationale**: UI-only could pass because a page simply doesn't render an ID it wasn't given; the direct
  query proves the *policy*, not just the page. Two mechanisms catch both app-layer and DB-layer gaps.
- **Note**: `provider_connections` has RLS enabled with **no policy** (advisor `rls_enabled_no_policy`) →
  deny-all by default (safe) but flagged; secrets are additionally gated by a SECURITY DEFINER accessor.

## D7 — Downloads (DOCX/PDF export)

- **Decision**: Capture the Playwright `download` event, save to a temp path, assert non-empty and a valid
  ZIP signature (`PK\x03\x04`) for `.docx`. Do not deep-parse document XML.
- **Rationale**: Proves export produces a real file without coupling tests to document internals.

## D8 — Share-token security probe

- **Decision**: Create an artifact, open its real share link unauthenticated (asserts render), then mutate
  the token's trailing characters and reopen → expect not-found, never another user's artifact. Confirms
  tokens are unguessable and server-validated (`get_shared_*` SECURITY DEFINER RPCs).
- **Rationale**: The public token surface (`/d /i /p /r`) is the main unauthenticated attack surface.

## D9 — Audit method & pre-seeded findings

- **Decision**: The business-logic audit is produced by reading each module's `spec-v2` Part III section
  against its `src/app/actions/*`, `src/lib/*`, and page code, plus cross-checking money constants
  (VAT 15%, HADAF thresholds, percentile method) to spec values. Fan-out is parallelizable per module.
- **Pre-seeded audit inputs** (from Supabase security advisors, already collected — verify each in code):
  - 🔴 `admin_grant_pro(uuid,int)` is a SECURITY DEFINER RPC **executable by `anon` and `authenticated`**
    via `/rest/v1/rpc/admin_grant_pro` — potential **paywall/Pro-grant bypass**. Verify EXECUTE grants and
    any in-function admin check; if a signed-in non-admin can self-grant Pro, this is a blocker.
  - 🟠 `fx_rates_insert` RLS policy is `WITH CHECK (true)` for `authenticated` — unrestricted insert into a
    (currently inert, dropped-currency) table. Low blast radius but a real permissive-policy finding.
  - 🟠 `delete_my_account()` executable by `anon` (no-op without a session, but exposure noted).
  - 🟠 `auth_leaked_password_protection` disabled — HaveIBeenPwned check off.
  - 🟡 `pg_trgm` installed in `public` schema (advisor `extension_in_public`).
  - Many `get_shared_*` / `log_*` SECURITY DEFINER RPCs executable by anon are **intentional** (public
    share surface) — audit confirms they only return token-scoped rows, not enumerable data.
- **Rationale**: Advisors give a free, authoritative security head-start; the audit's job is to confirm
  exploitability in code and rank severity, not re-derive them.

## D10 — Data cleanup

- **Decision**: None. Disposable users + rows are left orphaned (accepted ceiling). Uniqueness prevents
  collisions; specs never assume a clean DB and always scope reads to data they created.
- **Rationale**: Founder-accepted. Building teardown (needs service-role bulk delete) is unjustified now.
  Upgrade path: a dev-only cleanup RPC if orphan volume ever matters.
