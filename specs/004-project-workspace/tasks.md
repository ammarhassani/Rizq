---
description: "Task list for Project Workspace (Stage 4)"
---

# Tasks: Project Workspace (tabs & facets)

**Input**: Design docs in `specs/004-project-workspace/`

**Tests**: pure-logic only (deliverable state machine, task status, doc-kind) per Constitution IV; UI via quickstart.

**Build order**: Files → Deliverables → Tasks → Integrations(OAuth, gated).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup & shell

- [X] T001 Tab shell `src/components/projects/ProjectTabs.tsx` (URL-addressable `?tab=`, Overview default, RTL) mounted on the project page; Overview holds the existing content. SCOPE NOTE: tab set is currently **Overview + Files**; Deliverables/Tasks (and an Integrations tab) are added in their phases (additive).
- [X] T002 [P] i18n keys (AR primary + EN) for the **Files phase** (tab labels Overview/Files, input/deliverable groups, upload, kind toggle, open, empty/error) added to the `Projects` namespace. Deliverable-state / task / OAuth-integration copy is added in those later phases.

---

## Phase 2: US1 — Files (P1, foundation) 🎯

- [X] T003 Write migration `..._project_documents.sql`: enums `project_doc_kind`, `deliverable_state`; add `documents.project_id` (set null), `project_doc_kind`, `handover_state`; index `idx_documents_project`. Additive/idempotent. (Reuses existing documents RLS/quota/soft-delete.)
- [X] T004 [P] Pure rule `src/lib/projects/docKind.ts` + `docKind.test.ts`: a doc has exactly one kind; input↔deliverable toggle; leaving deliverable clears handover_state (rule only).
- [X] T005 [US1] `src/app/actions/projects/documents/attachDocumentToProject.ts` + `setDocumentKind.ts` (owner-scoped; pass-through to existing upload for new files).
- [X] T006 [US1] `FilesTab.tsx` reusing the Document Vault upload/list, grouped input vs deliverable, with kind toggle; empty/error states; RTL.
- [X] T007 [US1] Extend `src/app/actions/account/dataExport.ts` document select to include `project_id`, `project_doc_kind`.
- [X] T008 [US1] Apply migration (MCP), `get_advisors` clean; quickstart V1–V4.

**Checkpoint**: Files tab usable; standalone Vault unaffected.

---

## Phase 3: US2 — Deliverables (P2)

- [ ] T009 Migration `..._project_integration_handover.sql` (or fold into T003's file): add `project_integrations.handover_state`.
- [ ] T010 [P] Pure `src/lib/projects/deliverableState.ts` + `deliverableState.test.ts`: `draft→ready→sent` forward-only, `sent` terminal, illegal jumps rejected.
- [ ] T011 [US2] Deliverables view loader (union of deliverable docs + project integration links per project) — read-only.
- [ ] T012 [US2] `setDeliverableState.ts` action (validates via the pure rule; writes handover_state on the right underlying row; `invalid_transition`).
- [ ] T013 [US2] `DeliverablesTab.tsx`: unified list + per-item state control; deleting underlying file/link removes the entry; quickstart V5–V7.

**Checkpoint**: "What I'm handing over" in one place with states.

---

## Phase 4: US3 — Tasks & milestones (P2)

- [ ] T014 Migration `..._project_tasks_milestones.sql`: `task_status` enum; `project_milestones` + `project_tasks` tables (owner RLS, updated_at trigger, indexes). **No money columns** (deferred).
- [ ] T015 [P] Pure `src/lib/projects/taskStatus.ts` + `taskStatus.test.ts`.
- [ ] T016 [US3] Task actions: `createTask`, `updateTask` (status via rule), `reorderTasks`, `deleteTask` (owner-scoped, no quota).
- [ ] T017 [P] [US3] Milestone actions: `createMilestone`, `assignTaskToMilestone`.
- [ ] T018 [US3] `TasksTab.tsx`: task list with status + reorder; optional milestone grouping (target date + completion); empty/error states.
- [ ] T019 [US3] Extend data export with `project_tasks` + `project_milestones` sections; confirm account-delete cascade.
- [ ] T020 [US3] Apply migration, advisors clean; quickstart V8–V10.

**Checkpoint**: PMO tasks/milestones live; money-free, schema-ready.

---

## Phase 5: US4 — Integrations real OAuth (P3) ⛔ SECURITY-GATED

- [ ] T021 **GATE** — Produce and pass a written halal/PDPL/security review for provider connections: token storage/encryption mechanism, minimal read-only scope, revocation, export-exclusion, no-client-grant RLS. **No task below starts until this is approved.** (SC-009)
- [ ] T022 Migration `..._provider_connections.sql`: `provider_connection_status` enum; `provider_connections` (encrypted token columns) with **no anon/authenticated grant**; `project_integrations.connection_id`. Verify via `get_advisors` that the table has no client SELECT.
- [ ] T023 [US4] GitHub read-only OAuth: `startProviderConnection` + callback route (server-side token exchange, encrypted at rest, never returned to client).
- [ ] T024 [US4] `linkProviderResource` + `revokeProviderConnection` (honest `disconnected` on revoke); manual-link path preserved.
- [ ] T025 [US4] `IntegrationsTab.tsx`: "Connect GitHub" + linked-resource list + revoke; manual link still works with no connection.
- [ ] T026 [US4] Assert invariants: export contains no token (extend a test/check), connection excluded from `exportMyDataAction`, account-delete cascade; quickstart V11–V14.

---

## Phase 6: Polish

- [ ] T027 [P] Update `docs/domain-model.md` with the workspace facets (files/deliverables/tasks/connections) + the provider-connections secret-isolation note.
- [ ] T028 Merge gate: `pnpm typecheck` + `pnpm test` green (incl. T004/T010/T015 tests); `get_advisors` clean across all applied migrations.

---

## Dependencies & order
- Setup (T001–T002) → first.
- Files (P2) before Deliverables (P3, needs deliverable docs).
- Tasks (P4) independent of Files/Deliverables (can parallel after setup).
- OAuth (P5) LAST and **gated on T021**.
- MVP = Files + Deliverables + Tasks (the workspace feels complete); OAuth is the gated add-on.

## Notes
- No money-engine/income/quota change; files reuse the existing doc cap; tasks/deliverables unlimited.
- `provider_connections` is the deliberate exception to owner-SELECT — server-only, never exported.
- Additive idempotent migrations; small atomic commits; AR-primary + RTL throughout.
