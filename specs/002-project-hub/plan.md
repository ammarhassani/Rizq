# Implementation Plan: Project as the umbrella hub

**Branch**: `002-project-reframe-stage1` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-project-hub/spec.md`

## Summary

Promote **Project** from a relabeled concept (Stage 1) to a real parent entity. Introduce a `projects` table that owns: its origin proposal, its money (the existing `gigs` row, kept as a 1:1 child), its invoices, and a pluggable `project_integrations` registry. The migration is strictly **additive and non-destructive**: add `project_id` foreign keys to `gigs`, `invoices`, `proposals`, and `client_timeline`; backfill one project per existing gig; never drop the existing `gig_id`/`proposal_id` links. The money engine (deposit/remaining triggers, client rollups, monthly quotas, the invoice-paid → gig-paid loop) stays byte-for-byte unchanged because money still lives on `gigs`. A new `/projects/[id]` page surfaces the whole engagement; `/income` stays the cross-project portfolio view. Integrations ship as schema + a labeled stub slot only (no OAuth, no secrets).

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 16 App Router, React Server Components.

**Primary Dependencies**: Supabase (Postgres + Auth + RLS), `next-intl`, Tailwind v4 + shadcn/ui (base-nova, RTL), Framer Motion, Zod, Vitest. Server logic = Next.js server actions (`"use server"`).

**Storage**: Supabase Postgres. New tables: `projects`, `project_integrations`. New enums: `project_status`, `project_proposal_role`, `project_integration_provider`, `project_integration_status`. Additive columns on `gigs`, `invoices`, `proposals`, `client_timeline`. DB queries are **untyped** in this codebase (no generated `Database` type; actions cast as needed) — no type-generation gate.

**Testing**: Vitest. New unit tests for: backfill idempotency/correctness (pure SQL-shape logic mirrored in TS where applicable), `createProjectFromProposal` conversion, project soft-archive eligibility, integration provider validation. Suite must stay green (600 → 600+).

**Target Platform**: Web (mobile-first), Arabic-primary RTL.

**Project Type**: Web application (Next.js monorepo-style single app under `src/`).

**Performance Goals**: No regression. Project page loads with the same query budget as today's income detail page plus one invoices list + one integrations list (both indexed by `project_id`).

**Constraints**: RLS owner-scoped on every new table; additive migrations first, never drop data; Arabic-first bilingual copy; AI/estimate honesty labels preserved; halal/PDPL posture unchanged (soft-archive over destructive delete).

**Scale/Scope**: Per-user dozens–hundreds of projects. Backfill touches every existing `gigs` row once.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How this plan satisfies it |
|---|---|---|
| **I. Honesty is the moat** | ✅ | No fabricated data. Income figures are unchanged (same views over `gigs`). AI projections keep their `تحليل رِزق —` label. Integration slot is explicitly labeled "not connected" — no fake connection state. |
| **II. Arabic-first, RTL** | ✅ | New project page + integration slot ship AR (primary) + EN via `next-intl`, RTL verified. Keys added to `messages/ar.json` + `messages/en.json`. |
| **III. Mobile-first** | ✅ | Project page designed mobile-first (stacked sections: money → proposal → invoices → integrations), verified at mobile width. |
| **IV. Test the money and the rules** | ✅ | Backfill correctness, conversion, soft-archive eligibility, and integration validation are unit-tested. Money math itself is untouched (no new money triggers). |
| **V. Stands on its own feet** | ✅ | Projects module owns its tables, RLS, indexes, server actions, full UX surface (loading/empty/error), and an extensibility design (integration registry). |
| **VI. Halal & Saudi-compliant** | ✅ | Soft-archive preserves financial history (PDPL export/delete still works via existing account RPCs, extended to projects). No riba/haram framing. No scraping. |
| **VII. AI as multiplier, not decoration** | ✅ | No new AI in this feature. Existing labeled AI (income projection, anomaly) carries over unchanged. |

**Gate result: PASS.** No violations; Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/002-project-hub/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions & rationale
├── data-model.md        # Phase 1 — tables, enums, FKs, backfill, RLS, indexes
├── quickstart.md        # Phase 1 — validation guide
├── contracts/
│   └── server-actions.md # Phase 1 — server action contracts
└── tasks.md             # Phase 2 — /speckit-tasks (NOT created here)
```

### Source Code (repository root)

```text
supabase/migrations/
├── 20260626NNNN01_create_projects.sql            # projects table + enums + RLS + indexes
├── 20260626NNNN02_link_and_backfill_projects.sql # add project_id FKs; backfill 1 project/gig; backfill links
└── 20260626NNNN03_project_integrations.sql        # project_integrations registry + RLS + indexes

src/app/actions/projects/                          # NEW module
├── createProjectFromProposal.ts                   # supersedes createGigFromProposal flow (project-first)
├── getProject.ts                                  # owner-scoped project + money + invoices + integrations
├── archiveProject.ts                              # soft-archive (delete-with-money path)
└── integrations/
    ├── addIntegration.ts                          # validate provider, insert (stub — no OAuth)
    └── removeIntegration.ts

src/app/[locale]/projects/
├── page.tsx                                       # (optional) projects index — defer; income stays portfolio
└── [id]/
    ├── page.tsx                                   # Project detail (money tab + proposal + invoices + integrations)
    └── loading.tsx

src/components/projects/
├── ProjectMoneyPanel.tsx                          # reuses income-detail money UI
├── ProjectInvoicesList.tsx
└── ProjectIntegrationsSlot.tsx                    # labeled stub

src/app/actions/gigs/createGigFromProposal.ts      # kept; internally delegates to project-first creation
messages/ar.json, messages/en.json                 # new Projects.* keys (AR primary)

tests/ (vitest, co-located *.test.ts)
├── backfill projection correctness
├── createProjectFromProposal conversion
├── archiveProject soft-archive eligibility
└── integration provider validation
```

**Structure Decision**: Single Next.js app. New `projects` action module + `projects/[id]` route mirror the existing `income`/`invoices` module shape. The existing `income` routes and `gigs` actions stay in place (money is still on `gigs`); the project page composes the same money UI. The integration registry mirrors `collector_registry` (text-keyed config table, `config_json`, `enabled`-style discriminator) for zero core churn when providers are added.

## Migration sequence (additive, reversible-by-design)

1. **`create_projects`** — new `projects` table + enums + RLS + indexes. No writes to existing tables. Safe to deploy alone.
2. **`link_and_backfill_projects`** — add nullable `project_id` to `gigs`, `invoices`, `proposals`, `client_timeline` (+ `origin_proposal_id` on `projects`, `proposal_role` on `proposals`); backfill one project per existing gig; set `gigs.project_id`, then `invoices.project_id` (from `invoices.gig_id`), `proposals.project_id`/`role='origin'` (from `gigs.proposal_id`), and `client_timeline.project_id` (from event_data/gig). Existing `gig_id`/`proposal_id` columns are **retained**. All new columns nullable → no constraint break on partial data.
3. **`project_integrations`** — registry table + RLS + indexes. Independent; safe to deploy alone.

Each migration is idempotent (`if not exists`, `on conflict do nothing`, guarded `do $$`) following the repo's established style.

## Phase notes

- **No money-engine changes.** `gig_compute_before`, `gig_rollup_client`, `enforce_gig_quota`, `monthly_income`/`income_rolling_avg`/`income_projections`, and the `markInvoiceStatus` paid-loop are untouched. The project is a parent shell; money stays on the child gig. This is the crux of the low-risk decision.
- **Quota stays on gigs.** Creating a project creates its gig, so the existing 20-gig/month free quota fires exactly once via the gig insert — no new quota, no double count (FR-014).
- **`createGigFromProposal` is preserved** and becomes the internal money-child step of project-first creation, so the existing entry point and its tests keep working while the user-facing flow is "Create project."
