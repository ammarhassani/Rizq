# Phase 1 Contracts: Workspace actions & pure rules

All server actions: `"use server"`, Zod-validated, owner-scoped, `{ok:true,…}|{ok:false,code}` (codes reuse `unauthorized|invalid|not_found|quota_exhausted|error` + noted extras). Pure rules live in `src/lib/projects/` and are unit-tested.

## Pure rules (tested)

- **`docKind.ts`** — `canCategorize(doc): boolean`, `nextKind(...)`; validates `input`/`deliverable` assignment; a doc has exactly one kind at a time.
- **`deliverableState.ts`** — `nextDeliverableState(current, target): {ok}|{err}` enforcing `draft→ready→sent` forward-only, `sent` terminal. Tested across all pairs incl. illegal jumps.
- **`taskStatus.ts`** — `isValidStatus(s)`, `normalizeStatus(s)`; canonical `todo|doing|done`; tested incl. unknown → safe default.

## Files (Phase 1)

- **`attachDocumentToProject({ document_id, project_id, kind })`** — owner-scoped; sets `project_id` + `project_doc_kind`. `not_found` if either isn't the user's.
- **`setDocumentKind({ document_id, kind })`** — flips input↔deliverable; when leaving `deliverable`, clears `handover_state`.
- Upload itself reuses the **existing Document Vault upload action** with `project_id`/`kind` passed through (quota error → `quota_exhausted`, existing 53400).

## Deliverables (Phase 2)

- **`setDeliverableState({ source: 'file'|'link', id, target })`** — validates via `deliverableState.nextDeliverableState`; writes `handover_state` on the underlying `documents` or `project_integrations` row. `invalid_transition` on illegal move.
- **Deliverables list** loader: read view per project (no write); returns unified items with state.

## Tasks & milestones (Phase 3)

- **`createTask({ project_id, title, due_date?, milestone_id? })`** → `{ok, task_id}`.
- **`updateTask({ task_id, title?, status?, due_date?, milestone_id? })`** — status validated via `taskStatus`.
- **`reorderTasks({ project_id, ordered_ids[] })`** — sets `sort_order`; owner-scoped, all ids must belong to the project.
- **`deleteTask({ task_id })`** — owner-scoped delete.
- **`createMilestone({ project_id, name, target_date? })`**, **`assignTaskToMilestone({ task_id, milestone_id|null })`**.
- All owner-scoped; no quota (unlimited per D5).

## Integrations — real OAuth (Phase 4, GATED)

> **Not implemented until the halal/PDPL/security review passes (FR-017/SC-009).**

- **`startProviderConnection({ provider:'github' })`** → returns an OAuth authorize URL (read-only scope). Server-initiated.
- **OAuth callback handler** (route) — exchanges code → tokens; writes **encrypted** tokens to `provider_connections` server-side (service role); never returns tokens to the client.
- **`linkProviderResource({ project_id, connection_id, external_url, display_label })`** — sets `project_integrations.connection_id` (+ existing fields). Manual-link path (no connection) keeps working.
- **`revokeProviderConnection({ connection_id })`** — marks `revoked`, best-effort provider-side revoke; linked integrations show `disconnected` (honest), no further access.
- **Invariant tests/asserts**: `provider_connections` has no `authenticated` grant; `exportMyDataAction` output contains no token field; account delete removes connections.

## UI contracts

- **`ProjectTabs`** — URL-addressable tabs (`?tab=`), Overview default; mobile segmented control, RTL. Renders the active tab's server component.
- **`FilesTab`** — reuses Document Vault upload/list; groups by `input`/`deliverable`; kind toggle.
- **`DeliverablesTab`** — unified list (files + links) with a `draft|ready|sent` control per item.
- **`TasksTab`** — task list with status control + reorder; optional milestone grouping with target date + completion.
- **`IntegrationsTab`** — existing manual-link UI now; a "Connect GitHub" button appears only when the gated phase ships; shows `disconnected` honestly after revoke.

## Reuse / no-rebuild

- Document Vault upload/list/storage/quota/export — reused, extended with project association.
- `project_integrations` manual links — reused; gain `handover_state` and (gated) `connection_id`.
- Money engine, income views, invoice loop — untouched.
