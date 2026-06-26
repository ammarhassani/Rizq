# Phase 1 Contracts: Server actions

All actions are Next.js server actions (`"use server"`), Zod-validated input, owner-scoped via Supabase auth + RLS, returning a discriminated `{ ok: true, … } | { ok: false, code }` result (matching the existing `createGigFromProposal` / `markInvoiceStatus` convention). Codes reuse the existing vocabulary: `unauthorized | invalid | not_found | quota_exhausted | invalid_transition | error` plus action-specific additions noted below.

## `createProjectFromProposal(input)`

Project-first replacement for the create flow. Internally creates the project shell, then the money child via the preserved `createGigFromProposal` logic (so quota + deposit math + client rollup + timeline fire exactly as today).

- **Input**: `{ proposal_id: uuid }`
- **Behavior**:
  1. Load owner's proposal (RLS + explicit `eq user_id`). `not_found` if missing.
  2. Insert `projects` row: `title` (first deliverable › specialty › "مشروع"), `client_id`, `origin_proposal_id = proposal_id`, `status='active'`.
  3. Set `proposals.project_id = project.id`, `proposal_role='origin'` for that proposal (best-effort idempotent).
  4. Create the money child gig (existing logic) with `project_id = project.id`. **Quota (`53400`) surfaces here** → `quota_exhausted` and the project shell is rolled back (or created only after the gig succeeds — see note).
  5. Insert `client_timeline 'gig_created'` with `project_id` (best-effort).
- **Returns**: `{ ok: true, project_id, gig_id }` | `{ ok: false, code }`.
- **Ordering note (task decision)**: create the gig **first** (to trip quota before inserting the project), then the project, then link — OR wrap in a single RPC for atomicity. Tasks will pick the atomic-RPC route if the two-insert race is a concern; default is gig-first to preserve the exact quota behavior with no orphan project.
- **Revalidates**: `/[locale]/projects/[id]`, `/[locale]/income`.

## `getProject(input)` (server loader; may be a direct RSC query)

- **Input**: `{ project_id: uuid }`
- **Returns**: `{ ok: true, project, gig, originProposal, invoices[], integrations[], timeline[] }` | `{ ok:false, code }`.
  - `gig`: the 1:1 money child (amount, deposit, remaining, status, dates) — feeds the money panel.
  - `invoices`: all `invoices where project_id = :id` (fallback to `gig_id` for any not-yet-backfilled).
  - `integrations`: all `project_integrations where project_id = :id`.
- **Access**: owner-scoped; `not_found` for someone else's project (RLS returns no row).

## `archiveProject(input)` (the delete path)

- **Input**: `{ project_id: uuid }`
- **Behavior**:
  - Load project + its gig + invoice count.
  - **If** the project has a money record with non-trivial money OR any invoices → **soft-archive**: set `projects.is_active=false`, `archived_at=now()`, `status='archived'`. Linked gig/invoices preserved. `{ ok:true, mode:'archived' }`.
  - **Else** (empty money shell, no invoices) → hard-delete the project (cascades to the empty gig). `{ ok:true, mode:'deleted' }`.
- **Never** deletes invoices or paid/in-progress money. Forward-safe, idempotent (archiving an archived project is a no-op success).
- **Returns**: `{ ok:true, mode:'archived'|'deleted' }` | `{ ok:false, code }`.
- **Tested**: eligibility rule (archive vs. delete) is unit-tested with fixtures (Constitution IV).

## `addProjectIntegration(input)` (stub — no OAuth)

- **Input**: `{ project_id: uuid, provider: enum, external_url: url, display_label: string(1..120), config?: object }`
- **Behavior**: validate provider ∈ enum and `external_url` is a well-formed URL; verify project ownership; insert `project_integrations` with `status='linked'`. Unique-violation on `(project_id, provider, external_url)` → `duplicate`.
- **Returns**: `{ ok:true, integration_id }` | `{ ok:false, code: 'duplicate' | … }`.
- **No** token/credential handling. The UI slot may be display-only in this release (listing supported providers as "coming soon"); the action exists so the schema is exercised and tested.

## `removeProjectIntegration(input)`

- **Input**: `{ integration_id: uuid }`
- **Behavior**: owner-scoped delete. Idempotent.
- **Returns**: `{ ok:true }` | `{ ok:false, code }`.

## Compatibility

- **`createGigFromProposal`** is retained and unchanged in signature; it is now invoked by `createProjectFromProposal` as the money-child step (or refactored to accept an optional `project_id`). Existing tests for it stay valid.
- **`markInvoiceStatus`** is unchanged (paid-loop keyed on `gig_id`).
- UI copy: `createGig` / `creatingGig` message keys already read "Create project from this proposal" (Stage 1); the proposal detail action wires to `createProjectFromProposal`.
