---
description: "Task list for Project Lifecycle Wizard (Stage 3)"
---

# Tasks: Project Lifecycle Wizard

**Input**: Design docs in `specs/003-project-wizard/`

**Tests**: pure-logic only — the lifecycle resolver (Constitution IV); UI via quickstart. **No migration** (derived lifecycle).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 [P] Add `Wizard.*` i18n keys (AR primary + EN): stage labels (① price & propose / ② set up the work / ③ get paid), stage states (done/current/next/skipped), per-stage CTAs (finalize/set-up-project/create-invoice/send/mark-paid), Start-a-project, continue-list, complete state.

---

## Phase 2: Foundational — the resolver (blocks all stories)

- [X] T002 Pure resolver `src/lib/projects/lifecycle.ts` per contracts: `resolveLifecycle(input) → { stages, currentStageKey, complete, nextAction }`; derivation rules from data-model (done/current/next/skipped; declined-after-project stays done; no-origin-proposal ⇒ stage① skipped).
- [X] T003 [P] Unit test `src/lib/projects/lifecycle.test.ts`: every stage × {done,current,next,skipped}, declined-after-project, direct-bill (skipped ①), all-paid complete. (SC-004)
- [X] T004 [P] `src/app/actions/projects/getLifecycle.ts` (owner-scoped; resolves a project's or draft proposal's lifecycle; returns lifecycle + ids for CTAs).
- [X] T005 [P] `src/app/actions/projects/listInProgressLifecycles.ts` (dashboard: unpaid active projects ∪ draft-only proposals without a project, excluding declined/expired; bounded, recency-ordered).

**Checkpoint**: lifecycle truth is computable and loadable.

---

## Phase 3: US1 — Brief → finalized proposal (P1) 🎯 MVP

- [X] T006 [US1] Route `src/app/[locale]/projects/start/page.tsx`: wraps the existing `ProposalFlow` in stepper chrome (stage ① current); brief carries through; on finalize, surface the ①→② CTA. Reuse `generateProposal` — do not rebuild drafting.
- [X] T007 [US1] `StartProjectButton.tsx` (primary "Start a project" entry) wired into the dashboard.

**Checkpoint**: from the dashboard, brief → finalized proposal, resumable.

---

## Phase 4: US2 — Proposal → set-up project (P1) 🎯 MVP

- [X] T008 [US2] ①→② CTA "Set up the project" calls existing `createProjectFromProposal` (already quota-guarded + rolls back shell); route to `/projects/[id]`. Dedup: if a project already exists for the proposal, show stage ② done (no second project).
- [X] T009 [US2] Stage ② money details: pre-filled deposit %/delivery/payment form saving via the existing gig update action (deposit/remaining recompute via existing trigger). Reuse, don't rebuild.

**Checkpoint**: brief → proposal → live project (demoable MVP).

---

## Phase 5: US3 — Project → invoice → paid (P1)

- [X] T010 [US3] ②→③ CTA "Create invoice" calls existing `createInvoiceFromGig` (quota-guarded; sets back-link); route to the invoice editor/share.
- [X] T011 [US3] Stage ③ surface: send/share + mark paid via existing `markInvoiceStatus` (paid-loop already flips project money); reflect complete in the stepper.

**Checkpoint**: lifecycle visibly closes at paid.

---

## Phase 6: US4 — Resume, skip, enter midway (P2)

- [X] T012 [US4] `LifecycleStepper.tsx` (presentational): 3 stages with state badges (done/current/next/skipped) + one primary CTA mapped from `nextAction`; AR/RTL, mobile-first.
- [X] T013 [US4] Mount `LifecycleStepper` at the top of `src/app/[locale]/projects/[id]/page.tsx` (the resumable home base), fed by `getLifecycle`.
- [X] T014 [US4] `ContinueLifecycleList.tsx` on the dashboard from `listInProgressLifecycles` (incl. draft-only proposals); each item resumes its current stage.
- [X] T015 [US4] Verify skip/midway: project with no origin proposal renders stage ① skipped; quickstart V3–V5.

---

## Phase 7: Polish

- [X] T016 [P] Update `docs/domain-model.md` with the lifecycle (derived, single source of truth) + the wizard front door.
- [X] T017 Merge gate: `pnpm typecheck` + `pnpm test` green (incl. T003 resolver tests); quickstart V1–V8 walkthrough.

---

## Dependencies & order
- Setup → Foundational (resolver) blocks all stories.
- US1→US2→US3 are the linear happy path; US4 (stepper/resume/dashboard) builds on the loaders + the project page.
- MVP = US1 + US2 (brief → proposal → live project). No migration anywhere.

## Notes
- Pure orchestration: every stage transition reuses an existing action (`createProjectFromProposal`, `createInvoiceFromGig`, `markInvoiceStatus`). No new conversion logic, no money/quota change.
- Stage is always derived — re-entry never duplicates a proposal/project/invoice.
- AR-primary + RTL; small atomic commits.
