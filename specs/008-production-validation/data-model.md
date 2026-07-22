# Data Model: Production-Maturity Validation

Two parts: (A) the test-harness's own entities, (B) the app tables the RLS-isolation and integration
tests reason about (source of truth for the isolation matrix and the golden-path integration chain).

## A. Harness entities

### DisposableTestUser
- **Fields**: `email` (`azahrani337+rizqe2e-{ts}-{rand}@gmail.com`, unique), `password`, `locale`
  (`ar`|`en`), `storageStatePath`.
- **Lifecycle**: created in `global-setup` (signup → minimal onboarding → gate cleared), reused via
  `storageState`, never deleted.
- **Rules**: exactly one main user per run; email uniqueness mandatory (rate-limit + collision safety).

### IsolationUser
- Same shape as DisposableTestUser; a **second** independent account used only to attempt cross-tenant
  reads of the main user's data (all must fail). Owns no golden-path data.

### StorageState
- Persisted Supabase auth cookies/localStorage for a user. Files: `e2e/.auth/main.json`,
  `e2e/.auth/isolation.json` (gitignored). Consumed by `playwright.config` projects / per-spec `test.use`.

### Finding
- **Fields**: `id`, `severity` (`blocker`|`high`|`medium`|`low`|`info`), `source` (`audit`|`e2e`|`live`|`advisor`),
  `module`, `specClause` (spec/constitution ref), `evidence` (`file:line` or test name), `failureScenario`,
  `status` (`open`|`confirmed`|`wontfix`).
- **Rules**: every Finding carries severity + evidence; blockers (data leak, wrong money math, broken core
  journey, paywall bypass) sort first.

### ModuleCoverageRecord
- **Fields**: `module`, `specPart`, `e2eStatus` (`pass`|`fail`|`partial`|`n/a`), `auditVerdict`
  (`conforms`|`partial`|`gap`), `crossCutting` (a11y/rtl/mobile/rls rollup), `overall` (`green`|`yellow`|`red`).
- **Role**: one row per module; the rows *are* the report scorecard.

## B. App tables — isolation & integration source of truth

All 42 public tables have RLS enabled. Classified for test purposes:

### User-owned (per-user rows — MUST be isolated; each gets an RLS cross-read test)
`users`, `proposals`, `proposal_versions`, `clients`, `client_timeline`, `gigs`, `income_projections`,
`invoices`, `items`, `fee_presets`, `documents`, `projects`, `project_integrations`, `project_milestones`,
`project_tasks`, `provider_connections` (deny-all, no policy), `dashboard_preferences`,
`calendar_preferences`, `hadaf_preferences`, `hadaf_status_cache`, `dashboard_insights_cache`,
`testimonials`, `queries` (session/user-scoped), `pricing_submissions` (submitter-scoped).

### Reference / shared-read (not user-owned — isolation N/A; read-availability checked instead)
`specialties`, `cities`, `experience_tiers`, `benchmark_records`, `proposal_templates`,
`follow_up_question_templates`, `tone_adjustment_prompts`, `methodology_sections`, `document_categories`,
`rate_calculator_defaults`, `hadaf_rules_config`, `widget_registry`, `onboarding_steps`,
`collector_registry`, `ingestion_runs`.

### Special-posture (audit focus, not plain user rows)
- `waitlist` — insert-only via service_role, RLS locked (verify anon cannot read).
- `fx_rates` — inert (dropped currency feature); **permissive `WITH CHECK (true)` INSERT** policy (advisor).

### Golden-path integration chain (US1 journey — proves cross-module writes link up)
`proposals` → (createProjectFromProposal) → `projects` → `invoices` (+`items`, VAT) →
`income_projections`/`gigs` → dashboard aggregates (`income`, HADAF, goal bar). The journey spec asserts
each hop's row is created and surfaced downstream, not just that each screen renders.

## Key relationships (for assertions)
- `users` 1:1 `auth.users` (populated by `private.handle_new_user` trigger on signup) — the fixture relies
  on this row existing before onboarding writes.
- `proposals` 1:N `proposal_versions`; proposal → optional `projects` link (project-as-umbrella reframe).
- `invoices` 1:N `items`; invoice totals = Σ items × (1 + VAT 15%) — audited constant.
- `clients` 1:N `client_timeline`, `gigs`, `invoices`.
- Public share tokens resolve via SECURITY DEFINER RPCs: `get_shared_proposal`/`_state`,
  `get_shared_invoice`, `get_shared_document`, and `/r/[id]` from `queries`.
