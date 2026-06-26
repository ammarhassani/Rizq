# Phase 0 Research: Project Lifecycle Wizard

## D1 — Derived stage vs stored step counter

**Decision**: Derive the lifecycle stage from real data every time (proposal status, project+gig presence, invoice presence/status). No stored "current step" column.

**Rationale**: A stored counter is a second source of truth that drifts the moment any artifact changes outside the wizard (delete an invoice, decline a proposal, bill from the project page). Derivation can never disagree with reality (SC-004) and needs no migration. The cost — recomputing on each view — is trivial (a few already-loaded fields).

**Alternatives**: stored `wizard_stage` enum on `projects` — rejected (drift, migration, redundant).

## D2 — Proposal-anchored early (no empty project shells)

**Decision**: Stage ① operates on a draft proposal; the project is created only at the ①→② advance (`createProjectFromProposal`). Abandoning at stage ① leaves only a draft proposal.

**Rationale**: Creating a project shell up-front would litter the system with empty projects on abandonment and complicate income/quota. Anchoring on the proposal until the user commits is cleaner and reuses the existing guarded conversion (which already rolls back on quota).

## D3 — "Skipped" proposal = derived from absence

**Decision** (founder): A project with no `origin_proposal_id` renders stage ① as "skipped." No stored skip flag.

**Rationale**: Consistent with D1. "Billed directly / project without a proposal" is exactly "no origin proposal," which the resolver reads. Distinguishing "skipped on purpose" from "not yet done" is unnecessary because once a project exists, stage ① can no longer be the current step anyway.

## D4 — Stage ③ depth: single invoice

**Decision** (founder): Stage ③ guides one invoice; the user picks deposit or full amount. Remainder billing happens later from the project page, not a forced wizard sub-step.

**Rationale**: Frictionless (Principle III); the deposit+final pattern is still fully supported by billing again, just not forced into the guided flow. Keeps stage ③'s "done/in-progress" state simple: derived from whether the project has an invoice that is sent/paid.

## D5 — Dashboard "continue" list includes draft-only lifecycles

**Decision** (founder): Recent, non-declined proposals **without** a linked project appear in the resume list alongside in-progress projects (project exists but not fully paid).

**Rationale**: Honors the from-the-brief promise — a half-written brief shouldn't be forgotten. Query is owner-scoped and bounded (recent, exclude declined/expired and already-projectized).

## D6 — Reuse, don't rebuild the stage surfaces

**Decision**: Stage ① embeds the existing `ProposalFlow` (brief → `generateProposal` → finalize). Stage ② reuses the gig money form + the existing gig update action. Stage ③ reuses `createInvoiceFromGig` + the invoice editor/share + `markInvoiceStatus`.

**Rationale**: These surfaces are mature and tested; the wizard's value is sequencing and progress, not new editors. Minimizes risk and code.

## D7 — Where the wizard lives

**Decision**: A `/projects/start` route hosts stage ① (ProposalFlow wrapped in stepper chrome). After the project exists, `/projects/[id]` is the home base and shows the stepper + the current "continue" CTA. The dashboard hosts the "Start a project" button + the "continue" list.

**Rationale**: Avoids a parallel multi-route wizard with its own state machine; the project page already exists (feature 002) and is the natural resumable anchor. Pre-project state lives on the proposal it created.

## Open risks / watch-items (for tasks)

- The resolver must treat a `declined`/`expired` origin proposal as still "done" for stage ① if a project already exists (the project outlives a later-declined quote) — encode in tests.
- The dashboard list must exclude terminal lifecycles (fully paid) and noise (declined/expired draft proposals with no project).
- `createProjectFromProposal` is the dedupe guard for ①→②: if a project already exists for the proposal, the wizard shows stage ② done rather than offering to create again.
- Stage ② money form must reuse the existing gig update path so the deposit/remaining trigger stays the single math source.
