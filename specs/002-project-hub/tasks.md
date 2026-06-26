---
description: "Task list for Project-as-umbrella-hub (Stage 2)"
---

# Tasks: Project as the umbrella hub

**Input**: Design documents from `specs/002-project-hub/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions.md, quickstart.md

**Tests**: Included for money/conversion/eligibility logic only (Constitution Principle IV — "Test the money and the rules"). UI is verified via quickstart, not unit tests.

**Branch**: `002-project-reframe-stage1` (continues the Project reframe; Stage 1 already committed here).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete-task dependency)
- **[Story]**: US1–US4 from spec.md; Setup/Foundational/Polish carry no story label

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffolding the feature needs before schema/logic work.

- [ ] T001 Create the actions module folders `src/app/actions/projects/` and `src/app/actions/projects/integrations/`, and the route folder `src/app/[locale]/projects/[id]/`, and the components folder `src/components/projects/` (empty placeholder dirs with a short `// module: Project hub (spec 002)` header file where a dir would otherwise be empty).
- [ ] T002 [P] Add `Projects.*` i18n keys (Arabic primary + English) to `messages/ar.json` and `messages/en.json`: page title/subtitle, money panel labels (reuse Income.detail wording), origin-proposal label, invoices-list header/empty, integrations slot header + "coming soon / not connected" label + provider names, archive/delete confirm copy, and create-from-proposal success/error toasts. Keep keys consistent with existing `Income`/`Invoices` namespaces.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The additive schema everything else reads. **⚠️ No story work begins until migrations 1–3 apply cleanly and backfill is verified.** Money engine (triggers/views/quota/paid-loop) is deliberately untouched.

- [ ] T003 Write migration `supabase/migrations/20260626120000_create_projects.sql`: create enums `project_status`, `project_proposal_role`, `project_integration_provider`, `project_integration_status` (guarded `do $$`); create `public.projects` table per data-model.md; owner-scoped RLS (`projects_owner`, `auth.uid()=user_id`); indexes `(user_id,is_active,created_at desc)`, `(client_id)`, `(origin_proposal_id) where not null`; `updated_at` maintenance (trigger or action-set). Idempotent (`if not exists`).
- [ ] T004 Write migration `supabase/migrations/20260626120100_link_and_backfill_projects.sql`: add nullable FK columns `gigs.project_id` (on delete cascade), `invoices.project_id` (set null), `proposals.project_id` (set null) + `proposals.proposal_role` (default `origin`), `client_timeline.project_id` (set null); add the four `project_id` indexes; backfill one project per gig using a **stable per-gig surrogate** (add temp `projects.seed_gig_id`, insert `where g.project_id is null`, link gigs on `seed_gig_id`, then backfill `invoices`/`proposals`(role=origin)/`client_timeline`, then drop `seed_gig_id`). All steps guarded `where … is null` for idempotency. **Do not drop** `gigs.proposal_id`/`gigs.invoice_id`/`invoices.gig_id`.
- [ ] T005 [P] Write migration `supabase/migrations/20260626120200_project_integrations.sql`: create `public.project_integrations` per data-model.md (registry shape, `config jsonb`, `unique(project_id,provider,external_url)`, NO credentials column); owner-scoped RLS; index `(project_id)`. Idempotent.
- [ ] T006 [P] Extract the gig-status → project-status mapping into a pure helper `src/lib/projects/statusMapping.ts` (`gigStatusToProjectStatus(s): ProjectStatus`) so the backfill rule is unit-testable and reused by actions.
- [ ] T007 [P] Unit test `src/lib/projects/statusMapping.test.ts`: every `gig_status` value maps to the documented `project_status` (paid→completed, cancelled→cancelled, else→active) — guards SC-001/SC-002 mapping.
- [ ] T008 Apply migrations 1–3 to the Supabase dev project (MCP `apply_migration`, in order), then run `get_advisors` and confirm no new RLS/security warnings on `projects`/`project_integrations`/changed FK columns.
- [ ] T009 Verify backfill (quickstart V1/V2 SQL checks via MCP `execute_sql`): `gigs where project_id is null` = 0; `count(projects)` = pre-migration `count(gigs)`; `invoices where gig_id is not null and project_id is null` = 0; re-running migration 2 is a no-op; snapshot-compare `monthly_income`/`client_gig_summary` rows unchanged.

**Checkpoint**: Projects exist for all data; schema ready. User stories can proceed.

---

## Phase 3: User Story 1 — Every engagement becomes a Project (Priority: P1) 🎯 MVP

**Goal**: Each existing engagement is exactly one Project (done by backfill), and new work creates a Project (carrying origin proposal + money child) via one tap.

**Independent Test**: After migration, every engagement has one project with identical money/client/origin; tapping "Create project from this proposal" yields a project + linked gig and marks the proposal as origin; free-tier quota blocks at 20/month with no orphan project.

### Tests for User Story 1

- [ ] T010 [P] [US1] Unit test `src/app/actions/projects/createProjectFromProposal.test.ts`: given a proposal, the action returns `{ok,project_id,gig_id}`, sets `origin_proposal_id`, marks `proposal_role='origin'`, and on quota error (`53400`) returns `quota_exhausted` with no orphan project (mock supabase, fixture proposal).

### Implementation for User Story 1

- [ ] T011 [US1] Implement `src/app/actions/projects/createProjectFromProposal.ts` per contracts: gig-first (to trip quota), then project insert, then link gig.project_id + proposal.project_id/role + `client_timeline 'gig_created'` (best-effort); reuse `gigStatusToProjectStatus`; Zod input `{proposal_id}`; discriminated result; `revalidatePath` projects + income.
- [ ] T012 [US1] Refactor `src/app/actions/gigs/createGigFromProposal.ts` to accept an optional `project_id` (insert it on the gig) without changing its existing return shape, so `createProjectFromProposal` reuses it and existing tests stay green.
- [ ] T013 [US1] Wire the proposal-detail CTA in `src/components/proposals/ProposalDetailActions.tsx` to call `createProjectFromProposal` (label already says "Create project" from Stage 1) and route to `/projects/[id]` on success.
- [ ] T014 [P] [US1] Implement `src/app/actions/projects/getProject.ts` (owner-scoped loader): returns project + money-child gig + origin proposal + invoices (`project_id`, fallback `gig_id`) + integrations + project timeline; discriminated result.

**Checkpoint**: New + existing work both resolve to Projects; the loader feeds the page.

---

## Phase 4: User Story 2 — The Project page (Priority: P1)

**Goal**: One page shows the engagement's money, origin proposal, invoices, and a labeled integrations slot; plus the delete→soft-archive path.

**Independent Test**: Opening any project shows money identical to the old income detail, the origin proposal, all its invoices, and a clearly-labeled non-functional integrations area; deleting a project with money/invoices soft-archives it and preserves the records.

### Tests for User Story 2

- [ ] T015 [P] [US2] Unit test `src/app/actions/projects/archiveProject.test.ts`: project with invoices/non-trivial money → `mode:'archived'` (records preserved, `is_active=false`); empty shell → `mode:'deleted'`; archiving an archived project → idempotent ok.
- [ ] T016 [P] [US2] Unit test `src/app/actions/projects/integrations/addProjectIntegration.test.ts`: valid provider+URL inserts `status='linked'`; bad provider/malformed URL → `invalid`; duplicate `(project_id,provider,external_url)` → `duplicate`.

### Implementation for User Story 2

- [ ] T017 [US2] Implement `src/app/actions/projects/archiveProject.ts` (soft-archive vs hard-delete eligibility per contracts/FR-017); `revalidatePath` projects + income.
- [ ] T018 [P] [US2] Implement `src/app/actions/projects/integrations/addProjectIntegration.ts` and `removeProjectIntegration.ts` (Zod-validated, owner-scoped, no credentials).
- [ ] T019 [P] [US2] Build `src/components/projects/ProjectMoneyPanel.tsx` reusing the money UI from `src/app/[locale]/income/[id]/page.tsx` (deposit/remaining/status/payment timeline) — keep AI/anomaly honesty labels.
- [ ] T020 [P] [US2] Build `src/components/projects/ProjectInvoicesList.tsx` (lists the project's invoices, links to each invoice).
- [ ] T021 [P] [US2] Build `src/components/projects/ProjectIntegrationsSlot.tsx` — labeled stub listing supported providers as "coming soon / not connected"; no real connection action (honesty: not a fake connected state).
- [ ] T022 [US2] Build the route `src/app/[locale]/projects/[id]/page.tsx` (RSC using `getProject`) composing money panel + origin proposal + invoices list + integrations slot, mobile-first stacked, RTL; plus `loading.tsx` skeleton and not-found/empty/error states.
- [ ] T023 [US2] Add the delete→archive control on the project page wired to `archiveProject` with a bilingual confirm dialog.

**Checkpoint**: The project page is the everyday surface; delete is data-safe.

---

## Phase 5: User Story 3 — Income Ledger as portfolio money view (Priority: P2)

**Goal**: `/income` stays the cross-project portfolio view (figures unchanged) and each row navigates to its project.

**Independent Test**: Income figures identical to before; selecting a row lands on that project; per-project money on the project page matches the ledger line.

### Implementation for User Story 3

- [ ] T024 [US3] Update income list navigation in `src/components/income/IncomeListClient.tsx` (and the income card) so each entry links to `/projects/[project_id]` (resolve project_id via the gig→project link) instead of `/income/[gig_id]`; keep `/income` route + figures unchanged.
- [ ] T025 [P] [US3] Update the dashboard `MonthlyIncomeWidget` / calendar `gig` deep-links (`src/components/calendar/CalendarClient.tsx` `case "gig"`) to resolve to the project page where appropriate, preserving existing behavior if no project link exists.
- [ ] T026 [US3] Reframe `/income` copy as the portfolio view (already "Your projects." from Stage 1) and confirm the eyebrow "Income Ledger / دفتر الدخل" remains; verify monthly/rolling/projection numbers are byte-identical (quickstart V1).

**Checkpoint**: Income is honestly the projects' portfolio money; navigation flows to projects.

---

## Phase 6: User Story 4 — Proposals as origin / change order / sub-scope (Priority: P3)

**Goal**: The model records a proposal's role relative to a project; only `origin` is populated now, richer roles are schema-ready.

**Independent Test**: Each migrated project has exactly one origin proposal; a proposal can carry role origin/change_order/sub_scope without error; existing proposal flows unaffected.

### Implementation for User Story 4

- [ ] T027 [US4] Verify (quickstart) that backfill set `proposal_role='origin'` + `project_id` for every proposal that spawned a gig, and that the `origin_proposal_id` on each project matches; add a query check to quickstart results.
- [ ] T028 [P] [US4] Surface the origin proposal on the project page as the canonical "origin" (label it), leaving change-order/sub-scope as schema-only (documented as a later release in spec Assumptions) — no new UI to create them yet.

**Checkpoint**: PMO-grade proposal roles are modeled and origin is live.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T029 [P] Update `docs/domain-model.md`: flip "Direction → Stage 2" to "done", document the `projects` parent + `project_integrations` registry + role discriminator and the retained `gig_id`/`proposal_id` links.
- [ ] T030 [P] Extend the PDPL data-export (`src/app/actions/account/dataExport.ts`) and account-delete RPC to include `projects` + `project_integrations` (owner-scoped), so export/delete stays complete (Constitution VI).
- [ ] T031 Run the merge gate: `pnpm typecheck` clean and `pnpm test` green (incl. new tests T007/T010/T015/T016); fix any fallout.
- [ ] T032 Run quickstart.md V1–V7 end-to-end against the dev project and record results; confirm `get_advisors` clean.

---

## Dependencies & Execution Order

### Phase dependencies
- **Setup (P1)** → no deps.
- **Foundational (P2)** → after Setup; **blocks all stories**. T003 → T004 (FKs need the table) → T008/T009 (apply+verify). T005, T006, T007 are [P] within P2.
- **US1 (P3)** → after Foundational. T011 needs T012 (gig action refactor) + T006.
- **US2 (P4)** → after Foundational; T022 needs T014 (loader) + T019–T021. Independent of US1 except create-flow entry (can demo backfilled projects without US1).
- **US3 (P5)** → after US2 (needs the project page to link to).
- **US4 (P6)** → after Foundational (schema done in T004); thin.
- **Polish (P7)** → after desired stories.

### MVP scope
**US1 + US2** (both P1): every engagement is a project AND the project page works. That is the demoable MVP. US3 (income relink) and US4 (roles) are incremental.

### Parallel opportunities
- P2: T005, T006, T007 in parallel (different files); T003 must precede T004.
- US1: T010 (test) ∥ T014 (loader) while T011/T012 proceed.
- US2: T015, T016 (tests) ∥; T019, T020, T021 (components) ∥ before T022 composes them; T018 ∥.
- Polish: T029, T030 ∥.

---

## Parallel Example: User Story 2

```text
# Tests together:
Task: "archiveProject.test.ts eligibility"
Task: "addProjectIntegration.test.ts validation"
# Components together (different files):
Task: "ProjectMoneyPanel.tsx"
Task: "ProjectInvoicesList.tsx"
Task: "ProjectIntegrationsSlot.tsx"
```

---

## Notes

- Money engine, income views, and the invoice paid-loop are **not** modified — do not touch `gig_compute_before`/`gig_rollup_client`/`enforce_gig_quota`/`monthly_income`/`markInvoiceStatus`.
- Every new table ships owner-scoped RLS; migrations are additive and idempotent; never drop `gig_id`/`proposal_id`.
- All new user-facing copy is AR-primary + EN, RTL-correct.
- Commit after each task or logical group; merge gate (typecheck + test) is non-negotiable.
