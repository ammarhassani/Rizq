# Implementation Plan: Project Lifecycle Wizard

**Branch**: `003-project-wizard` *(work continues on `002-project-reframe-stage1` unless a fresh branch is cut)* | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-project-wizard/spec.md`

## Summary

A guided "Start a project" wizard that walks a freelancer brief → proposal → project → invoice in three resumable, guided-but-skippable stages. It is an **orchestration + guidance layer** over surfaces that already exist (Proposal Studio `ProposalFlow`/`generateProposal`, `createProjectFromProposal`, the gig money form, `createInvoiceFromGig`, the invoice paid-loop). The lifecycle **stage is derived** from real data — a proposal's status, the project + its money child, and the invoice + its status — so there is **no new table, no new migration, and no stored step counter to drift**. The work is a pure, tested lifecycle resolver plus UI: a wizard frame/entry, a lifecycle stepper on the project page (the resumable home base), and a dashboard "continue" list.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 16 App Router (RSC + server actions), React.

**Primary Dependencies**: existing only — `next-intl`, Tailwind v4 + shadcn/ui (RTL), Framer Motion (stepper transitions), Vitest. No new packages.

**Storage**: **None added.** Reads existing `proposals`, `projects`, `gigs`, `invoices`. No schema change.

**Testing**: Vitest. New unit tests for the pure lifecycle resolver (stage derivation + skip + done-signals) — the one piece of real logic (Constitution IV). UI verified via quickstart.

**Target Platform**: Web, mobile-first, Arabic-primary RTL.

**Project Type**: Web application (single Next.js app under `src/`).

**Performance Goals**: No regression; the wizard composes existing screens. Lifecycle resolution is in-memory over already-loaded rows.

**Constraints**: Reuse — do not rebuild — proposal drafting, money setup, and invoice generation/share. Quotas enforced exactly as today at each artifact-creation moment (no bypass/double-count). AI honesty labels preserved. Arabic-first/RTL, mobile-first (≤3 inputs to first value). Owner-scoped throughout (inherited from existing RLS; no new tables).

**Scale/Scope**: Per-user dozens–hundreds of lifecycles; the dashboard "continue" list is bounded (recent, non-terminal).

## Constitution Check

| Principle | Status | How |
|---|---|---|
| **I. Honesty** | ✅ | Reuses the labeled AI proposal as-is; the stepper shows derived truth (done/current/next/**skipped**) — never claims a stage is done when its artifact is absent (FR-006, SC-004). |
| **II. Arabic-first / RTL** | ✅ | New wizard/stepper/dashboard copy is AR-primary + EN, RTL-correct (FR-014). |
| **III. Mobile-first** | ✅ | Stage ① reaches first value from the brief alone; stepper is a mobile-friendly vertical flow; no pre-paywall modals. |
| **IV. Test the money & rules** | ✅ | The lifecycle resolver (stage/skip/done-signal derivation) is pure + unit-tested. No money math changes; quotas reuse existing triggers. |
| **V. Stands on its own feet** | ✅ | Owns its resolver, UX surface (loading/empty/skip/error/resume states), and integrates cross-module (proposals↔projects↔invoices) live. |
| **VI. Halal / PDPL** | ✅ | No new data stored; no payments introduced; existing PDPL export already covers the underlying entities. |
| **VII. AI as multiplier** | ✅ | No new AI; reuses the existing labeled proposal generation. |

**Gate: PASS.** No new tables, no money-engine changes, no quota changes → minimal risk surface. Complexity Tracking omitted.

## Project Structure

### Documentation (this feature)

```text
specs/003-project-wizard/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/lifecycle-and-orchestration.md
└── tasks.md   # /speckit-tasks (not created here)
```

### Source Code

```text
src/lib/projects/
├── lifecycle.ts              # NEW — pure resolver: inputs → { stages, currentStage, nextAction }
└── lifecycle.test.ts         # NEW — unit tests (done/current/next/skipped, all permutations)

src/app/actions/projects/
├── getLifecycle.ts           # NEW — owner-scoped loader: resolve a project's (or draft proposal's) lifecycle
└── listInProgressLifecycles.ts  # NEW — dashboard "continue" list (draft proposals w/o project + unbilled/unpaid projects)

src/components/projects/
└── LifecycleStepper.tsx      # NEW — 3-stage progress + single "continue" CTA (project page + wizard)

src/components/wizard/
├── StartProjectButton.tsx    # NEW — the primary "Start a project" entry (dashboard)
└── ContinueLifecycleList.tsx # NEW — dashboard resume list

src/app/[locale]/projects/
├── start/page.tsx            # NEW — wizard entry: stage ① framing around the existing ProposalFlow
└── [id]/page.tsx             # MODIFY — mount LifecycleStepper as the resumable home base

# Reused unchanged (orchestrated, not rebuilt):
src/components/proposals/ProposalFlow.tsx              # stage ① drafting
src/app/actions/proposals/generateProposal.ts          # stage ① AI
src/app/actions/projects/createProjectFromProposal.ts  # ①→② boundary
src/app/actions/gigs/gigs.ts (gig money update)        # stage ② money details
src/app/actions/invoices/createInvoiceFromGig.ts       # ②→③ boundary
src/app/actions/invoices/markInvoiceStatus.ts          # stage ③ send/paid (loop)

src/app/[locale]/dashboard/page.tsx                    # MODIFY — add Start + Continue
messages/{ar,en}.json                                  # Wizard.* keys (AR primary)
```

**Structure Decision**: Single app. The wizard is a thin frame: a `start` route that wraps the existing `ProposalFlow` with stepper chrome, the project page as the home base, and a dashboard entry. The only non-UI logic is the pure `lifecycle.ts` resolver. Stage-advance CTAs call the existing conversion actions verbatim.

## The lifecycle resolver (the heart)

`resolveLifecycle(input) → { stages: [{key, state}], currentStageKey, nextAction, complete }` where `state ∈ done | current | next | skipped` and inputs are:

| Stage | Inputs | done-signal | skipped |
|---|---|---|---|
| ① Proposal | origin proposal status | status ∈ {final, sent, viewed, accepted} | project exists **and** has no origin proposal |
| ② Project | project + money child (gig) exist | gig exists with amount | (never skipped if reached) |
| ③ Invoice | any invoice on the project; its status | an invoice is `sent`/`viewed`/`paid` | — |

`currentStage` = the first non-done, non-skipped stage; if all done/paid → lifecycle complete. Pure, deterministic, fully unit-tested over every input permutation.

## Stage-advance orchestration (reusing existing actions)

- **①→②**: "Set up the project" → `createProjectFromProposal({proposal_id})` (already rolls back the shell on quota; already marks origin) → route to `/projects/[id]` at stage ②.
- **stage ② money details**: pre-filled deposit %/delivery/payment form → existing gig update action; deposit/remaining recompute via the existing trigger.
- **②→③**: "Create invoice" → `createInvoiceFromGig({gig_id})` (already quota-guarded, sets back-link) → invoice editor/share at stage ③.
- **stage ③**: send/share + mark paid → existing `markInvoiceStatus` (paid-loop already flips the project's money).

No conversion logic is rewritten; the wizard only sequences and frames them, and resolves which CTA to show.

## What is intentionally NOT changed

- No new tables/columns/migrations. No money-engine, view, quota, or paid-loop change.
- Existing standalone create buttons remain (FR-012).
- Proposal Studio, gig money form, and invoice editor/share are reused as-is.

## Phase notes

- Quota: each stage's existing action already raises the existing `53400` → upgrade prompt; the wizard surfaces it and keeps completed stages intact (FR-010/FR-011). Nothing new to enforce.
- Resumability falls out of derivation: re-entering computes the same current stage; the advance actions are idempotent enough — a project already created means stage ② is "done" so the CTA becomes "Create invoice," preventing a duplicate project.
- Draft-only lifecycles (no project yet) appear in the dashboard list by querying recent non-declined proposals with no linked project.
