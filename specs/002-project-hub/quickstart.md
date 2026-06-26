# Quickstart / Validation Guide: Project as the umbrella hub

How to prove the feature works end-to-end. References [data-model.md](./data-model.md) and [contracts/server-actions.md](./contracts/server-actions.md).

## Prerequisites

- Local env configured for Supabase (or use the MCP Supabase tools against the dev project).
- `pnpm install` done; able to run `pnpm typecheck` and `pnpm test`.
- A test user with at least: 1 accepted proposal, 1 existing gig (with money + delivery date), 1 invoice linked to that gig.

## Apply migrations

Apply the three migrations in order (additive, each safe alone):

1. `create_projects` — creates `projects`, enums, RLS, indexes.
2. `link_and_backfill_projects` — adds `project_id`/role columns, backfills.
3. `project_integrations` — creates the registry.

Re-run the backfill migration a second time → it must be a no-op (idempotency check).

## Validation scenarios

### V1 — Backfill correctness (SC-001, SC-002)
- Every `gigs` row has a non-null `project_id`; `select count(*) from gigs where project_id is null` → **0**.
- `select count(*) from projects` equals the pre-migration `count(*) from gigs`.
- Each project's `origin_proposal_id`, `client_id`, `title`, `created_at` equal its gig's.
- **Income unchanged**: `monthly_income`, `income_rolling_avg`, and `client_gig_summary` return identical rows/figures before vs. after (snapshot compare). Client totals (`clients.total_value_sar`, `total_gigs`, `avg_payment_days`) unchanged to the riyal.

### V2 — Invoices resolve to project (SC-003)
- Every invoice with a `gig_id` now has `project_id = that gig's project`; `select count(*) from invoices where gig_id is not null and project_id is null` → **0**.
- Mark a `sent` invoice **paid** → its linked gig flips to `paid` exactly once (existing loop), and the project page money panel reflects paid. Reversing the invoice does **not** un-pay the gig.

### V3 — Project page (SC-004)
- Open `/projects/[id]` for the test project: money panel matches the old `/income/[id]` view (deposit, remaining, status, timeline); origin proposal shown; both/all invoices listed; integrations slot visible and clearly labeled "not connected / coming soon" with no broken action.
- Verify Arabic (primary) + RTL rendering, then English toggle.

### V4 — Create project from proposal
- From an accepted proposal, run "Create project from this proposal":
  - a `projects` row is created with `origin_proposal_id` = that proposal;
  - the proposal's `proposal_role='origin'`, `project_id` set;
  - a money-child gig is created with `project_id`;
  - free-plan user at 20 gigs/month is blocked with `quota_exhausted` (quota fired once, no orphan project).

### V5 — Soft-archive (SC-008)
- `archiveProject` on a project **with** invoices/money → `mode:'archived'`; project `is_active=false`, gig + invoices still present and queryable; income history unchanged.
- `archiveProject` on an empty project (no money/invoices) → `mode:'deleted'`.
- Archiving an already-archived project → idempotent success.

### V6 — Integrations registry (SC-005)
- `addProjectIntegration` with `provider='figma'`, a URL, a label → row inserted, `status='linked'`.
- Duplicate `(project_id, provider, external_url)` → `duplicate` code.
- Adding a hypothetical new provider value requires only extending the enum + (optionally) `config` keys — **no** change to `projects`/`gigs`/`invoices`/`proposals` structure. Confirm by inspection.

### V7 — Ownership isolation (SC-006)
- As user B, attempt to read/modify user A's project, gig-via-project, invoice, or integration → no rows / denied (RLS).

## Merge gate

- `pnpm typecheck` clean.
- `pnpm test` green, including new unit tests: backfill projection mapping, `createProjectFromProposal` conversion, `archiveProject` eligibility, integration provider/URL validation.
- Supabase advisors (`get_advisors`) show no new RLS/security warnings on the three new/changed surfaces.
