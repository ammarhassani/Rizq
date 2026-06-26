# Implementation Plan: Project Workspace (tabs & facets)

**Branch**: `004-project-workspace` *(stacking on the Project-reframe branch unless a fresh one is cut)* | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-project-workspace/spec.md`

## Summary

Turn `/projects/[id]` into a **tabbed workspace** — Overview · Files · Deliverables · Tasks · Integrations — built in dependency order. **Files** extends the existing Document Vault (`documents`) with an optional `project_id` + an input/deliverable *kind* (additive; reuses storage, RLS, quota, export). **Deliverables** is a curated *view* over deliverable-kind documents + the existing `project_integrations` links, with one new per-item `handover_state` (`draft→ready→sent`). **Tasks** adds `project_tasks` + optional `project_milestones` (money-free, schema-ready for later milestone money). **Integrations (real OAuth)** is the final, **security-gated** phase: a new server-only encrypted `provider_connections` store (GitHub read-only first) referenced from `project_integrations.connection_id` — secrets never client-readable, never exported. Tabs are additive and independently shippable.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 16 App Router (RSC + server actions).

**Primary Dependencies**: existing (`next-intl`, Tailwind v4/shadcn RTL, Framer Motion, Supabase, Zod, Vitest). OAuth phase adds a provider OAuth client + token encryption (deferred to that phase).

**Storage**: Supabase Postgres + existing `documents` Storage bucket. Additive columns on `documents` (`project_id`, `project_doc_kind`, `handover_state`) and `project_integrations` (`handover_state`, later `connection_id`). New tables: `project_tasks`, `project_milestones`, and (gated) `provider_connections`.

**Testing**: Vitest. New pure-logic tests: deliverable state machine, task status transitions, document-kind rules. Money/quota math unchanged (files reuse the existing doc quota).

**Target Platform**: Web, mobile-first, Arabic-primary RTL.

**Project Type**: Web app (single Next.js app).

**Performance Goals**: No regression. Each tab loads its own data; Overview unchanged.

**Constraints**: Reuse Document Vault + `project_integrations` + project page (don't rebuild). Additive/idempotent migrations, never drop data. **Secrets server-only, never client-readable, never in the PDPL export.** Files reuse the existing free=10/pro=50 doc cap; tasks/deliverables unlimited (no new quota). Arabic-first/RTL/mobile. Owner-scoped RLS on every new table.

**Scale/Scope**: Per-user dozens of files/tasks per project.

## Constitution Check

| Principle | Status | How |
|---|---|---|
| **I. Honesty** | ✅ | Deliverable/connection states show real status (`disconnected` shown honestly on revoke); no fake "connected." |
| **II. Arabic-first / RTL** | ✅ | All tab/file/task/deliverable copy AR-primary + EN, RTL. |
| **III. Mobile-first** | ✅ | Tabs are a mobile-friendly control; upload/task interactions touch-sized. |
| **IV. Test money & rules** | ✅ | Deliverable state machine, task status, doc-kind rules unit-tested. No money math change (milestone money deferred). |
| **V. Stands on its own feet** | ✅ | Each tab owns data model, RLS, UX states; integrates Document Vault + integrations live. |
| **VI. Halal / PDPL** | ✅ / ⚠️ gated | Files/tasks export+delete like other data. **OAuth phase gated on a documented halal/PDPL/security review (FR-017/SC-009)** before implementation; secrets excluded from export. |
| **VII. AI as multiplier** | ✅ | No new AI (existing doc auto-category remains as-is). |

**Gate: PASS for Files/Deliverables/Tasks. OAuth phase carries an explicit pre-implementation security-review gate** (tracked as a task; implementation paused until it passes).

## Project Structure

```text
specs/004-project-workspace/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/workspace-actions.md
└── tasks.md   # /speckit-tasks

# Migrations (additive, phased)
supabase/migrations/
├── 2026XXXX01_project_documents.sql         # documents: +project_id +project_doc_kind +handover_state; indexes
├── 2026XXXX02_project_tasks_milestones.sql   # project_tasks + project_milestones (+RLS)
└── 2026XXXX03_provider_connections.sql       # GATED — encrypted connection store + project_integrations.connection_id

src/lib/projects/
├── deliverableState.ts (+ .test.ts)   # draft→ready→sent state machine (pure)
├── taskStatus.ts (+ .test.ts)         # todo→doing→done rules (pure)
└── docKind.ts (+ .test.ts)            # input/deliverable category rules (pure)

src/app/actions/projects/
├── documents/{attachDocumentToProject,setDocumentKind}.ts
├── deliverables/setDeliverableState.ts
├── tasks/{createTask,updateTask,reorderTasks,deleteTask}.ts
├── milestones/{createMilestone,assignTaskToMilestone}.ts
└── integrations/connect/* (GATED — OAuth start/callback/revoke)

src/components/projects/tabs/
├── ProjectTabs.tsx           # the tab shell
├── FilesTab.tsx              # reuses Document Vault upload/list
├── DeliverablesTab.tsx
├── TasksTab.tsx
└── IntegrationsTab.tsx       # manual link now; connect button (gated)

src/app/[locale]/projects/[id]/page.tsx   # MODIFY — mount ProjectTabs
src/app/actions/account/dataExport.ts      # MODIFY — include tasks/milestones; documents already covered (+project_id)
messages/{ar,en}.json                       # Workspace.* keys
```

**Structure Decision**: Single app. The project page gains a tab shell; each tab is a component. Files reuses Document Vault components/actions; only project association + kind are new. Deliverables is a read view + one state action. Tasks/milestones are new but self-contained. OAuth lives behind its own gated migration + actions.

## Phased delivery (matches build order)

1. **Files** (P1) — migration 1; doc-kind pure rule + test; attach/kind actions; FilesTab; export already covers documents (add project_id to its select). Ships alone.
2. **Deliverables** (P2) — `handover_state` columns (in migration 1 or a small 1b); state machine pure + test; setDeliverableState action; DeliverablesTab (union view). Depends on Files + existing integration links.
3. **Tasks** (P2) — migration 2; task-status pure + test; task/milestone CRUD actions; TasksTab; export adds tasks/milestones.
4. **Integrations OAuth** (P3, GATED) — security review task FIRST; then migration 3 (`provider_connections` encrypted, `connection_id`); GitHub read-only connect/callback/revoke; IntegrationsTab connect UI. **Implementation does not start until the review passes.**

## What is intentionally NOT changed

- No money-engine/income-view/invoice-loop change. Milestone money is schema-ready only (deferred).
- Standalone Document Vault unchanged for non-project documents.
- Existing `project_integrations` manual-link path keeps working throughout.
- No new file quota (reuse existing doc cap); tasks/deliverables unlimited.

## Security note (OAuth phase)

`provider_connections` holds tokens — it MUST: be `revoke all` from `anon, authenticated` (no client SELECT at all; accessed only via SECURITY DEFINER server functions / service role server-side), store tokens encrypted at rest, be excluded from `exportMyDataAction`, and be covered by the account-delete cascade. A written halal/PDPL/security review is a gating task before any of this is implemented.
