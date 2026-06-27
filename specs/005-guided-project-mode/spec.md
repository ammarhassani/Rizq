# Feature Specification: Guided Project Mode

**Feature Branch**: `main` (no feature branch; commit + sync per founder preference)

**Created**: 2026-06-27

**Status**: Draft

**Input**: User description: "Guided Project Mode — make the whole app serve a guided project flow (entry + continuity), while keeping every component fully usable standalone." (Full brief in the chat that triggered this spec; grounded in `docs/guided-vs-standalone-brainstorm.md` and `docs/guided-context-audit.md`. Extends feature 003.)

## Overview

Rizq must support two journeys with the same components:

- **Standalone** — a freelancer creates a single component (e.g. a proposal to win a quick settlement) and may never make a project. Each component delivers value on its own.
- **Guided project** — a freelancer threads several components together "for one cause." A Project is an *optional umbrella*, not a prerequisite.

Today the guided journey is a shell: the entry is hard-wired to "create a new proposal," and once inside any editor the app forgets the project (every screen hardcodes "back to its own list"; the guided flag never reaches editors). This feature makes guided a *real mode the whole app honors* — **without cloning screens**: the same components become *context-aware*. When a guided context is present, screens know which project they serve, where "back" returns, and route success to the project pane; when it is absent, behaviour is exactly as today (standalone).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Back/return always honors where I came from (Priority: P1)

A freelancer working inside a project opens a component (e.g. creates an invoice for the project). The "back" affordance returns them to **the project pane**, not the standalone list. In standalone use (opened from a list), "back" returns to that list exactly as today.

**Why this priority**: This is the reported pain ("I create an invoice for a project and back takes me to the invoice route, not the project") and it is systemic — all 8 detail/editor screens hardcode their own list. Fixing navigation origin is the foundation every later story builds on, ships immediately, and is harmless to standalone use.

**Independent Test**: From a project, trigger "create invoice" → land on the invoice editor → the back control reads "← {Project title}" and returns to `/projects/{id}`. Separately, open an invoice from the Invoices list → back returns to `/invoices`.

**Acceptance Scenarios**:

1. **Given** a project with a gig, **When** the user creates an invoice from the project page, **Then** the invoice screen's back control returns to that project's pane (not the invoice list).
2. **Given** a proposal opened from the Proposals list (no project context), **When** the user taps back, **Then** they return to the Proposals list.
3. **Given** any detail/editor screen reached with a project origin, **When** the page is refreshed or shared by URL, **Then** the back/return destination is preserved (origin survives reload).

---

### User Story 2 - Guided context persists through every step (Priority: P2)

A freelancer in a guided project run moves through the lifecycle (proposal → project → invoice). Each transition carries the project context, and after completing a guided action (invoice created/sent, proposal finalized) the app returns them to the **project pane** to continue, rather than stranding them on a standalone list.

**Why this priority**: Continuity is what makes guided feel like one flow instead of disconnected tools. It depends on the navigation-origin foundation (US1) and directly addresses "10% of each journey."

**Independent Test**: Start/resume a guided project; advance the lifecycle CTA; confirm the next screen carries the project context and, on success, returns to the project pane with the lifecycle advanced.

**Acceptance Scenarios**:

1. **Given** a guided project at the "create invoice" stage, **When** the user completes the invoice, **Then** they are returned to the project pane and the lifecycle shows the invoice stage advanced.
2. **Given** a guided run, **When** the user moves between steps, **Then** the guided indicator persists across those steps (and only during the guided run).
3. **Given** a standalone action (no guided context), **When** the user completes it, **Then** they remain in the standalone area (unchanged behaviour).

---

### User Story 3 - Screens are personalized to the event (Priority: P3)

When a component is opened in a project context, the screen frames itself for that project — a clear breadcrumb naming the project and a visible sense of progress — so the freelancer always knows what they are working on and why, instead of seeing a bare reusable form.

**Why this priority**: Framing turns "cloned and reused" into "personalized to the event." It is valuable polish but depends on US1/US2 and is not required to fix the core navigation/continuity defects.

**Independent Test**: Open an editor in a project context → a project breadcrumb/header is shown and progress is visible; open the same editor standalone → no project framing appears.

**Acceptance Scenarios**:

1. **Given** an invoice opened in a project context, **When** the screen renders, **Then** it shows a breadcrumb naming the project and the current lifecycle position.
2. **Given** the same invoice opened standalone, **When** the screen renders, **Then** no project framing is shown.

---

### User Story 4 - Starting a project asks "do you have a proposal for this?" (Priority: P4)

A freelancer starting a brand-new project is asked, up front, whether they already have a proposal for this cause. They can (a) **pick an existing proposal** to anchor the project, (b) **create a new proposal**, or (c) **set up the project directly** with no proposal yet (money-free). After choosing, the guided flow continues from the right stage.

**Why this priority**: This is the high-value entry experience, but it is sequenced after continuity because (1) the reported bug is continuity, and (2) a clean chooser experience benefits from the context-threading foundation being in place. It is independently testable and shippable.

**Independent Test**: Open "Start a project" → see three choices → exercise each: pick existing (project anchored to it), create new (existing studio path), set up directly (blank project created), and confirm the resulting project lands in the correct lifecycle stage.

**Acceptance Scenarios**:

1. **Given** the user has unanchored proposals, **When** they choose "use an existing proposal," **Then** they see a searchable list sorted accepted › sent › viewed › draft, and selecting one creates a project anchored to it and advances past the proposal stage.
2. **Given** the user chooses "create a new proposal," **When** they finish it, **Then** a project is created anchored to that new proposal (today's behaviour, preserved).
3. **Given** the user chooses "set up directly," **When** confirmed, **Then** a project is created with no proposal and no money; the proposal stage shows as skipped and the project stage is current; money can be added later by invoicing or logging income.
4. **Given** a proposal already anchored to a project, **When** the anchor list is shown, **Then** that proposal does not appear (no double-anchoring).

### Edge Cases

- **No unanchored proposals** when choosing "use existing" → the picker shows an empty state that routes to "create a new proposal."
- **Blank (gig-less, proposal-less) project** → all project surfaces (overview, money, invoices, files, tasks) render without a gig; the lifecycle resolves proposal = skipped, project = current, invoice = next.
- **Stale/invalid origin** (e.g. `from` points to a project the user can't access or that was archived) → silently fall back to the screen's default list; never error.
- **Mixed origin + locale/RTL** → back-control label and direction render correctly in Arabic (primary) and English.
- **Deep link / refresh** mid-flow → origin and guided indicator survive because they live in the URL.
- **Standalone regression guard** → with no origin present, every screen behaves exactly as before this feature.

## Requirements *(mandatory)*

### Functional Requirements

**Navigation origin & contextual return (US1)**
- **FR-001**: The system MUST represent a navigation origin in the URL so that a screen opened within a flow knows where it was opened from, and this origin MUST survive page reload, direct linking, and browser back/forward.
- **FR-002**: Every detail and editor screen (invoice, proposal, income, client, project) MUST present a single, consistent "back" affordance that returns to the origin when one is present, and to that screen's default list when none is present.
- **FR-003**: When the origin is a project, the back affordance MUST be labeled with the project's name and return to that project's pane (preserving the active tab/guided state where applicable).
- **FR-004**: When no origin is present, all screens MUST behave exactly as before this feature (no standalone regression).

**Guided continuity (US2)**
- **FR-005**: Transitions initiated from within a guided project (e.g. "create invoice," "finalize proposal") MUST carry the project origin and guided indicator to the destination screen.
- **FR-006**: On successful completion of a guided action, the system MUST return the user to the project pane with the lifecycle reflecting the new state, rather than to a standalone list.
- **FR-007**: The guided indicator MUST persist across the steps of a guided run and MUST NOT appear outside an explicit guided run.

**Context framing (US3)**
- **FR-008**: When a screen is opened in a project context, it MUST display a breadcrumb identifying the project and MUST convey the current lifecycle position; standalone screens MUST NOT show this framing.

**Entry chooser & anchoring (US4)**
- **FR-009**: Starting a new project MUST present a choice of three paths: use an existing proposal, create a new proposal, or set up the project directly.
- **FR-010**: The "use existing" path MUST present the user's proposals that are not already anchored to a project, sorted by status priority (accepted › sent › viewed › draft) then recency, and MUST be searchable.
- **FR-011**: Selecting an existing proposal MUST create a project anchored to it and advance the lifecycle past the proposal stage.
- **FR-012**: The "set up directly" path MUST create a project with no proposal and no money (money-free); the lifecycle MUST treat the proposal stage as skipped and the project stage as current.
- **FR-013**: The system MUST allow a money-free, proposal-free project to exist and render across all its surfaces, with money added later by invoicing or logging income.
- **FR-014**: The system MUST prevent anchoring a project to a proposal that is already anchored to another project.
- **FR-015**: Standalone components MUST continue to be creatable on their own, and a standalone proposal MUST offer an OPTIONAL (never forced) action to graduate into a project.

**Cross-cutting**
- **FR-016**: All new user-facing copy (chooser, picker, back labels, breadcrumbs, empty states) MUST be provided in Arabic (primary) and English with full RTL support.
- **FR-017**: The feature MUST reuse existing screens and actions (add context, do not clone or rebuild them) and MUST be additive (no destructive data changes); creating a blank project MUST respect owner-only access and MUST NOT consume money-related quotas (no gig is created until money is added).

### Key Entities *(include if feature involves data)*

- **Project**: the optional umbrella for one cause. May exist with or without an anchor proposal, and with or without a money child (gig). Carries its derived lifecycle position.
- **Proposal**: a standalone artifact that MAY anchor at most one project ("origin"). Has a status (draft/sent/viewed/accepted/declined/…) used to prioritize the anchor list.
- **Navigation origin**: a lightweight, URL-borne reference to where the current screen was opened from (e.g. a specific project), used to resolve back/return and framing. Not persisted server-side.
- **Guided run**: the transient state indicating the user is actively setting up a project; expressed in the URL, scoped to the run, never global.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From a project, creating an invoice and tapping "back" returns the user to that project's pane in 100% of cases (0% land on the standalone invoice list).
- **SC-002**: Across all detail/editor screens, "back" returns to the correct destination (origin when present, default list otherwise) in 100% of tested paths, in both Arabic and English.
- **SC-003**: A guided project run can be completed end-to-end (start → proposal/anchor → project → invoice → paid) without the user ever being stranded on a standalone list; every step keeps or returns project context.
- **SC-004**: A new project can be started in three ways (existing proposal, new proposal, set up directly), and a user with an existing winning proposal can anchor a project to it without recreating the proposal.
- **SC-005**: With no guided/origin context, every screen behaves identically to before this feature (verified: no standalone regression).
- **SC-006**: A project can exist with no proposal and no money and remains fully usable (all surfaces render; money can be added later).

## Assumptions

- **Locked decisions (founder, 2026-06-27)**: three-branch chooser (existing / new / set-up-directly); blank project is money-free until invoiced or income is logged (a project does not require a money child); the anchor picker lists all *unanchored* proposals, sorted accepted › sent › viewed › draft, searchable, with no double-anchoring.
- **Origin grammar (default)**: the navigation origin is a typed token `project:{id}` carried in the URL; generalizing to other origins (e.g. `client:{id}`) is out of scope for v1 but the convention is designed to allow it.
- **Editor framing (default)**: in-context editors show a project breadcrumb plus a compact progress indicator; rendering the full lifecycle stepper inside every editor is optional polish and not required for US3 acceptance.
- **Blank project title (default)**: "set up directly" uses a sensible default project title that the user can rename later, rather than blocking on a title prompt up front (keeps the path fast); may be revisited.
- **Existing engine reused**: the derived lifecycle resolver, the anchor-from-proposal action (which already accepts a proposal id), and the skipped-proposal backfill path already exist and are reused unchanged.
- **Standalone-first**: components remain independently valuable; the guided experience never blocks or hides standalone creation.
- **Phasing**: delivered in four shippable phases matching the user stories (P1 navigation origin → P2 continuity → P3 framing → P4 chooser/anchor/blank), where P1 alone resolves the reported bug.
- **Platform**: Arabic-first, RTL by default, mobile-first, owner-scoped access on all data; consistent with the constitution and CLAUDE.md.
