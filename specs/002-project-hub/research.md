# Phase 0 Research: Project as the umbrella hub

All open questions from the spec are resolved (the founder pre-locked the major decisions; this records rationale and the few derived choices).

## D1 — Parent/child vs. absorb

**Decision**: New `projects` parent; keep `gigs` as a 1:1 money child (FK `gigs.project_id`). Do **not** absorb money columns into `projects`.

**Rationale**: `gigs` is the money engine — three triggers (`gig_compute_before`, `gig_rollup_client`, `enforce_gig_quota`), three income views (`monthly_income`, `income_rolling_avg`, `income_projections`), the `client_gig_summary` view, and the `markInvoiceStatus` paid-loop all read/write `gigs`. Absorbing would force rewriting every one of them in a single risky migration. Keeping money on `gigs` makes the change additive and keeps 600 tests green. The 1:1 join cost is negligible and the schema is forward-compatible with 1-project→many-gigs (milestones).

**Alternatives considered**: (a) Absorb gigs into projects — rejected: high blast radius, violates additive-first. (b) Virtual project = a view over gigs — rejected: a view can't own invoices/integrations or be soft-archived independently.

## D2 — Proposal cardinality & roles

**Decision**: `projects.origin_proposal_id` (nullable, one canonical origin) **plus** `proposals.project_id` + `proposals.proposal_role` enum (`origin` | `change_order` | `sub_scope`, default `origin`). Backfill sets only `origin`.

**Rationale**: Founder wants PMO/Jira-grade structure (change orders / sub-scopes attach to the same engagement). Modeling the role now costs one enum + one column and avoids a second migration later; surfacing change-order UI is deferred. The `origin_proposal_id` on the project gives a fast canonical pointer; `proposals.project_id` lets many proposals hang off one project later.

**Reference pattern**: Jira issue-type / change-order register — a parent work item with typed related items. We mirror only the data shape, not the workflow.

**Alternatives considered**: Many-proposals with no canonical origin — rejected: loses the "which quote started this" answer the UI needs today.

## D3 — Invoices ↔ project

**Decision**: Add `invoices.project_id` (nullable FK), backfilled from `invoices.gig_id → gigs.project_id`. **Retain** `invoices.gig_id` (no drop). A project has many invoices.

**Rationale**: Additive and reversible. The paid-loop in `markInvoiceStatus` keys off `gig_id` and stays unchanged; `project_id` is for grouping/display on the project page. Dropping `gig_id` later (if ever) is a separate, deliberate migration.

## D4 — Timeline events

**Decision**: Add `client_timeline.project_id` (nullable), backfill from `event_data->>'gig_id'` (→ gig → project) and from any `proposal_id`/`invoice_id` in `event_data`. Existing rows keep their `client_id`; events stay client-scoped, gain an optional project link.

**Rationale**: The timeline is owned by Client Book and keyed by `client_id`; adding an optional `project_id` lets the project page show its own history without restructuring the timeline. Best-effort backfill (some legacy events may lack a resolvable project — left null).

## D5 — Income Ledger placement

**Decision**: `/income` stays the top-level portfolio route (unchanged views). Per-project money is a section/tab on `/projects/[id]`. Income rows link to their project.

**Rationale**: Income aggregates are inherently cross-project (monthly totals, rolling averages); burying them under one project is the wrong altitude. The project page reuses the existing income-detail money UI for the single-project view.

## D6 — `project_integrations` shape & pattern

**Decision**: A registry-style table mirroring `collector_registry`: `id uuid`, `user_id`, `project_id`, `provider` (enum), `external_url`, `display_label`, `status` (enum `linked|disconnected|error`, default `linked`), `config jsonb default '{}'`, `created_at`, `updated_at`, `unique(project_id, provider, external_url)`. **No credentials/tokens** — deferred to a future `*_connections` table. Build schema + a labeled stub UI slot; no OAuth.

**Rationale**: Matches the established "registry + config_json" extensibility pattern (collectors, and the config-seed style used for tone prompts / HADAF rules) so new providers don't churn the core schema. Keeping secrets out now respects the constitution's compliance posture and avoids designing a half-baked credential store.

**Alternatives considered**: One row per provider type with typed columns — rejected: schema churn per provider. Storing tokens now — rejected: out of scope, security risk, premature.

## D7 — Project deletion

**Decision**: Soft-archive (`is_active=false` + `archived_at`) when a project has a money record and/or invoices; preserve all linked records. A project with no money/invoices may be hard-deleted. Explicit permanent-delete deferred.

**Rationale**: Constitution "never drop data" + PDPL history integrity; reuses the `is_active` pattern already on `clients`. Hard-deleting would distort historical monthly income totals (the views read `gigs`).

## D8 — Free-tier quota

**Decision**: No new quota. Project creation creates its gig; the existing `enforce_gig_quota` (20/month free) fires on the gig insert. Client limit unchanged.

**Rationale**: Avoids double-counting (FR-014). A project without a gig is not a normal creation path; the create-from-proposal flow always makes the money child.

## D9 — Backfill grouping

**Decision**: Exactly one project per existing `gigs` row (1:1). Project title = gig title; client_id = gig.client_id; origin_proposal_id = gig.proposal_id; status mapped from gig.status; created_at preserved.

**Rationale**: Today gigs already play the project role 1:1, so 1:1 backfill is the faithful, lossless mapping. Multi-gig projects only arise from future explicit user action.

## Open risks / watch-items (for tasks)

- Backfill must run **after** the FK columns exist and be **idempotent** (re-runnable). Guard with `where project_id is null`.
- `client_timeline.project_id` backfill is best-effort; document that legacy events may stay null.
- Confirm `invoices` has the columns referenced by `markInvoiceStatus` (it selects `fees`) — already present; no change.
- Add `project_id` indexes mirroring existing `idx_gigs_proposal` style for the project page queries.
