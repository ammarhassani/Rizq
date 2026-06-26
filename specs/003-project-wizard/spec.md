# Feature Specification: Project Lifecycle Wizard

**Feature Branch**: `003-project-wizard`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "A guided 'Start a project' wizard that walks a freelancer from zero to paid in three resumable, guided-but-skippable stages — ① price & propose, ② set up the project, ③ get paid — orchestrating the existing Proposal Studio, project, and invoicing surfaces. Stage 3 of the Project reframe."

## Overview

Today a freelancer creating an engagement has to know the path themselves: draft a proposal in one place, remember to turn it into a project in another, then remember to bill it from a third. The pieces connect, but nothing *walks* them through it. This feature adds a **guided Project Lifecycle Wizard** — the primary "Start a project" entry point — that takes a freelancer from a blank client brief all the way to a sent invoice in three clear, resumable stages, always showing where they are and what's next.

It is an **orchestration and guidance layer**, not new core machinery: it reuses the existing proposal drafting, project creation, and invoicing flows and the conversions already wired between them. The project is the spine the wizard walks along; each completed stage fills the project with more of itself (its origin proposal, its money, its invoice).

The wizard is **guided but not a cage**: it recommends the natural order and shows honest progress, but a freelancer can skip a stage (e.g., bill directly without a formal proposal) or enter midway (e.g., from a proposal a client already accepted). Power users keep the existing standalone create buttons.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - From blank brief to a finalized proposal (Priority: P1)

A freelancer taps "Start a project," pastes the client's WhatsApp brief, and is walked into drafting a priced proposal (the existing AI-assisted Proposal Studio). They review, adjust, and finalize it. The wizard shows this as stage ① complete and points clearly at "next: set up the project."

**Why this priority**: This is the front door and the first unit of value. Even if a freelancer stops here, they've produced a real, finalized proposal — and the wizard has proven its guidance. It must stand alone.

**Independent Test**: Tapping "Start a project" and entering a brief leads to a finalized proposal with no dead ends; progress shows stage ① done, stage ② as the next step, and the work is resumable if the user leaves.

**Acceptance Scenarios**:

1. **Given** a freelancer on the dashboard, **When** they tap "Start a project" and enter a brief, **Then** they are taken into proposal drafting with the brief carried over, and a visible 3-stage progress indicator marks ① as the current stage.
2. **Given** a draft proposal in the wizard, **When** the freelancer finalizes it, **Then** stage ① is marked done and the primary call-to-action becomes "set up the project."
3. **Given** a freelancer who leaves after drafting but before finalizing, **When** they return, **Then** they can resume exactly at the proposal stage with their draft intact (no duplicate proposal created).
4. **Given** a free-tier freelancer at their monthly proposal limit, **When** they try to start, **Then** they hit the same upgrade prompt as today — the wizard does not bypass the limit.

---

### User Story 2 - Turn the proposal into a set-up project (Priority: P1)

From a finalized proposal, the freelancer advances to stage ②. The wizard creates the project (carrying the proposal as its origin, pre-filled title/client/amount) and asks only for the money details that matter — deposit %, delivery date, payment method. Stage ② completes and points at "next: get paid."

**Why this priority**: This is the stage that turns a quote into tracked, money-bearing work and is the heart of the "set up the project" promise. Together with US1 it is the demoable MVP (brief → proposal → live project).

**Independent Test**: Advancing from a finalized proposal creates exactly one project with the proposal as origin and the money details the user entered; progress shows ② done; existing income/client totals reflect the new project correctly; no orphan or duplicate project on retries.

**Acceptance Scenarios**:

1. **Given** a finalized proposal in the wizard, **When** the freelancer advances to stage ②, **Then** a single project is created with that proposal as its origin and pre-filled amount/client, and the proposal is marked as the project's origin.
2. **Given** stage ②, **When** the freelancer sets deposit %, delivery date, and payment method, **Then** those are saved on the project's money record and the deposit/remaining split reflects them.
3. **Given** a free-tier freelancer at their monthly project limit, **When** they advance to stage ②, **Then** they are blocked with the existing upgrade prompt and no empty project is left behind.
4. **Given** a freelancer who already advanced to stage ②, **When** they navigate back and forward again, **Then** no second project is created — the wizard recognizes the project already exists.

---

### User Story 3 - Bill the client and close the loop (Priority: P1)

From a set-up project, the freelancer advances to stage ③. The wizard generates an invoice from the project (pre-filled amount/client), they review and send/share it. When the invoice is later marked paid, the project's money is marked paid too (the existing loop), and the wizard shows the whole lifecycle complete.

**Why this priority**: "Bill the client" is the payoff of the whole walk and the moment the freelancer earns their rizq. The lifecycle is only honest if it visibly closes.

**Independent Test**: Advancing from a project generates an invoice tied to that project; sending it and marking it paid flips the project's money to paid and shows all three stages complete.

**Acceptance Scenarios**:

1. **Given** a set-up project in the wizard, **When** the freelancer advances to stage ③, **Then** an invoice is generated tied to that project with pre-filled amount and client.
2. **Given** a generated invoice, **When** the freelancer sends/shares it, **Then** stage ③ shows as "sent" and the lifecycle indicator shows ①②③ with ③ in progress.
3. **Given** a sent invoice, **When** it is marked paid, **Then** the project's money is marked paid (existing loop, once, forward-only) and the lifecycle shows complete.
4. **Given** a free-tier freelancer at their monthly invoice limit, **When** they advance to stage ③, **Then** they hit the existing invoice upgrade prompt — the wizard does not bypass it.

---

### User Story 4 - Resume, skip, and enter midway (Priority: P2)

A freelancer's real workflow rarely runs clean start-to-finish. The wizard lets them: resume an in-progress lifecycle from where they left off (surfaced on the dashboard and on the project's home base), skip the proposal stage to bill directly, or enter at the project stage from a proposal a client already accepted. Skipped stages are shown honestly as "skipped," not "done."

**Why this priority**: This is what makes the wizard usable for real freelancers rather than a rigid funnel, but it builds on US1–US3 existing first.

**Independent Test**: From the dashboard, an in-progress lifecycle can be resumed at its correct current stage; a user can start at the project or invoice stage; a skipped proposal stage renders as "skipped" and the lifecycle still completes.

**Acceptance Scenarios**:

1. **Given** an in-progress lifecycle (e.g., project set up but not billed), **When** the freelancer opens the project's home base or the dashboard, **Then** the current stage and a single clear "continue" action are shown.
2. **Given** a freelancer who wants to bill without a proposal, **When** they start at the project or invoice stage, **Then** the lifecycle proceeds and the proposal stage is shown as "skipped," not blocking completion.
3. **Given** a project created outside the wizard (e.g., before this feature), **When** the freelancer opens it, **Then** its lifecycle progress is shown correctly based on its real data (proposal/money/invoice presence).

### Edge Cases

- **Abandoned at the proposal stage**: only a draft proposal exists (no project yet); resuming returns to the proposal stage and never leaves an empty project behind.
- **Proposal declined after a project exists**: the project and its lifecycle remain valid; a declined origin proposal does not retract the project.
- **Multiple invoices on one project** (e.g., deposit then final): the lifecycle's "get paid" stage reflects the project's overall paid state, not just a single invoice.
- **Quota hit mid-wizard**: the relevant stage is blocked with the existing upgrade prompt; already-completed stages remain intact; nothing partial is left in a broken state.
- **Skipping forward**: a freelancer may jump to a later stage; earlier skipped stages are clearly marked "skipped" and the wizard never claims work was done that wasn't.
- **Concurrent/return navigation**: re-entering a stage already completed must not duplicate its artifact (no second proposal, project, or invoice).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a single "Start a project" entry point (primary on the dashboard) that launches the guided lifecycle wizard at the proposal stage.
- **FR-002**: The wizard MUST present a persistent, honest progress indicator of three stages — ① Proposal (price & propose), ② Project (set up the work), ③ Invoice (get paid) — showing each as done, current, next, or skipped.
- **FR-003**: Stage ① MUST let the freelancer enter a client brief and produce a finalized proposal by reusing the existing proposal drafting experience; the brief MUST carry into that experience.
- **FR-004**: Stage ② MUST create exactly one project from the finalized proposal (origin proposal recorded, title/client/amount pre-filled) and MUST let the freelancer set the money details (deposit %, delivery date, payment method).
- **FR-005**: Stage ③ MUST generate a single invoice tied to the project (pre-filled amount/client) where the freelancer chooses the amount (deposit or full) and can send/share it; billing again for a remainder is available later from the project page (not a forced wizard sub-step). When an invoice is paid, the project's money MUST reflect paid via the existing loop.
- **FR-006**: The wizard MUST determine the current lifecycle stage from the engagement's real data (presence/state of a finalized proposal, a project + money record, and an invoice and its status) rather than a separate stored step counter, so progress can never drift from reality.
- **FR-007**: The wizard MUST be resumable: leaving and returning MUST land the freelancer at the correct current stage with prior work intact, and re-entering a completed stage MUST NOT create a duplicate proposal, project, or invoice.
- **FR-008**: The dashboard MUST surface in-progress lifecycles — including those that are only a draft proposal with no project yet — with a clear way to resume the current stage; the project's detail page MUST serve as the lifecycle home base showing the same progress and a "continue" action.
- **FR-009**: The wizard MUST allow skipping or entering midway (e.g., bill directly with no proposal; start at the project stage from an already-accepted proposal). Skipped stages MUST be shown as "skipped," never as "done," and MUST NOT block lifecycle completion.
- **FR-010**: The wizard MUST enforce all existing free-tier limits (monthly proposals, monthly projects/gigs, monthly invoices) at the moment each stage's artifact is created, surfacing the existing upgrade prompts; it MUST NOT bypass, relax, or double-count any limit.
- **FR-011**: A quota block or failure at one stage MUST leave already-completed stages intact and MUST NOT leave a partial/orphan artifact (e.g., no empty project if its money/quota step fails).
- **FR-012**: The existing standalone create entry points (new proposal, new project, new invoice) MUST remain available for power users who bypass the wizard.
- **FR-013**: All AI-assisted output in the wizard (the drafted proposal) MUST keep its honesty labeling ("تحليل رِزق —" / Rizq Insight) and price provenance, unchanged from the standalone experience.
- **FR-014**: All wizard copy MUST be Arabic-primary with English secondary and correct RTL rendering; the flow MUST be usable on mobile with minimal inputs to first value and no modal interruptions before any paywall moment.
- **FR-015**: Any new stored data introduced for the wizard MUST be owner-scoped and private to its owner (a freelancer only sees their own lifecycles).

### Key Entities

- **Lifecycle (derived, not a new stored record by default)**: The state of one project's journey across the three stages, computed from its origin proposal's status, its money record, and its invoice(s) and their statuses. Drives the progress indicator and the "current stage / next action."
- **Proposal**: The quote (stage ①). Reused as-is; gains no new structure here. Its finalized state is the stage-① done-signal.
- **Project**: The spine (stage ②). Reused from the Project hub feature; its existence + money record is the stage-② done-signal; it hosts the lifecycle home base.
- **Invoice**: The bill (stage ③). Reused as-is; its sent/paid status is the stage-③ progress/done-signal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A freelancer can go from tapping "Start a project" to a sent invoice without leaving the guided flow or needing to find a separate screen on their own.
- **SC-002**: At every point in the lifecycle, the freelancer can see which stage they are on and what the single next action is.
- **SC-003**: Leaving mid-flow and returning resumes at the correct stage 100% of the time, with zero duplicate proposals/projects/invoices created by re-entry.
- **SC-004**: The displayed lifecycle stage always matches the engagement's real data (no case where progress shows a stage done while its artifact is missing, or vice versa).
- **SC-005**: Free-tier limits block at exactly the same effective thresholds inside the wizard as outside it, with no partial/orphan artifacts left after a block.
- **SC-006**: A freelancer can complete the lifecycle while skipping the proposal stage (billing directly), and the skipped stage is shown as skipped, not done.
- **SC-007**: 100% of projects (including those created before this feature) display a correct lifecycle progress when opened.
- **SC-008**: No freelancer can see or resume another freelancer's in-progress lifecycle.

## Assumptions

- **Builds on the Project hub (feature 002)**: the `projects` entity, the proposal→project and project→invoice conversions, and the invoice-paid→money-paid loop already exist and are reused, not rebuilt.
- **Proposal-anchored early**: stage ① works on a draft proposal; the project is created only when the freelancer advances past the proposal stage, so abandoning at stage ① never creates an empty project.
- **Derived stage, single source of truth**: lifecycle stage is computed from real data each time it's shown; no separate "current step" field is stored to drift out of sync. (If a future need arises to remember an explicitly skipped stage, that is the minimal stored state considered — see open question.)
- **Reuse, don't rebuild**: the proposal drafting screen, the project money setup, and invoice generation/share are the existing surfaces; the wizard frames and sequences them.
- **One project per lifecycle**: a lifecycle corresponds to one project; multiple invoices on that project are summarized into the single "get paid" stage state.
- **"Done to first value ≤ 3 inputs"**: starting the wizard asks for at most the brief to reach a drafted proposal, honoring the mobile-first frictionless principle.
- **No new payments**: stage ③ ends at sending/sharing the invoice and tracking paid status; it does not introduce online payment collection (Tap is deferred).

## Resolved decisions (founder, 2026-06-26)

1. **Stage ③ depth** → **single invoice, user picks the amount** (deposit or full); billing the remainder happens later from the project page, not as a forced wizard sub-step (FR-005).
2. **Skipped proposal** → **derived from absence**: a project with no origin proposal renders stage ① as "skipped"; no stored skip flag (keeps the derived-stage single-source-of-truth principle).
3. **Resume surfacing** → the dashboard "continue" list **includes draft-proposal-only lifecycles** (no project yet), so a half-written brief is not forgotten (FR-008).
