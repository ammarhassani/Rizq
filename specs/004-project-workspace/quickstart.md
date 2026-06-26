# Quickstart / Validation Guide: Project Workspace

References [data-model.md](./data-model.md) and [contracts/workspace-actions.md](./contracts/workspace-actions.md). Phased — validate each phase as it ships.

## Prerequisites
- Feature 002 applied (projects exist) + Document Vault present. Signed-in test user with a project.

## Phase 1 — Files
- Apply migration `project_documents`; `get_advisors` clean (documents RLS unchanged).
- **V1**: On a project's Files tab, upload a doc as **input** and another as **deliverable** → grouped correctly; both owner-only.
- **V2**: Toggle a doc input↔deliverable → moves group; leaving `deliverable` clears handover_state.
- **V3**: A non-project document (standalone Vault) is unchanged (SC-002).
- **V4**: Data export includes project docs with `project_id`/kind (SC-007). Free-tier user at 10 docs is blocked by the existing cap (SC-008).

## Phase 2 — Deliverables
- **V5**: Unit test `deliverableState.test.ts` green (draft→ready→sent legal; jumps/`sent→*` rejected).
- **V6**: Deliverables tab lists a deliverable file + an attached integration link as one set; mark each draft→ready→sent; illegal transition rejected (SC-003).
- **V7**: Delete the underlying file/link → its deliverable entry disappears (FR-009).

## Phase 3 — Tasks
- **V8**: Unit test `taskStatus.test.ts` green.
- **V9**: Add tasks, set todo→doing→done, reorder, delete; group under a milestone with a target date → milestone shows tasks + completion (SC-004).
- **V10**: Tasks/milestones owner-scoped (user B can't see them, SC-005); included in export, removed on account delete (SC-007).

## Phase 4 — Integrations OAuth (GATED)
- **V0 (gate)**: a written halal/PDPL/security review is recorded and passed BEFORE any of the below (SC-009).
- **V11**: Connect GitHub (read-only) → connection established; tokens stored encrypted server-side.
- **V12 (critical)**: `provider_connections` has **no** authenticated SELECT grant (`get_advisors` / direct check); the data export output contains **no token** anywhere (SC-006).
- **V13**: Link a repo to the project; revoke the connection → linked items show `disconnected`; no further access. Manual-link path still works without a connection.
- **V14**: Account delete removes the connection (cascade).

## Merge gate (per phase)
- `pnpm typecheck` clean; `pnpm test` green incl. new pure-rule tests.
- `get_advisors` clean after each migration; for Phase 4, the connection table shows the deliberate no-client-grant posture.
