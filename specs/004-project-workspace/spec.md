# Feature Specification: Project Workspace (tabs & facets)

**Feature Branch**: `004-project-workspace`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "Turn the project detail page into a tabbed workspace — Overview, Files, Deliverables, Tasks, Integrations — where a freelancer manages everything about one engagement. Stage 4 of the Project reframe. Build order: Files → Deliverables → Tasks → real OAuth integrations (last, security-gated)."

## Overview

A Project today shows its money, origin proposal, and invoices. But a real engagement is more than its money — it has reference documents, deliverables to hand over, a list of work to do, and tools the work lives in. This feature turns the project page into a **tabbed workspace** so a freelancer manages the whole engagement in one place:

- **Overview** — today's view (money, origin proposal, invoices, timeline).
- **Files** — the engagement's documents, split into *inputs* (brief, contract, requirements, notes) and *deliverables* (the output files).
- **Deliverables** — a single curated list of "what I'm giving the client," unifying deliverable files and external links, each with a handover state.
- **Tasks** — the work breakdown (to-dos, optionally grouped into milestones) so the freelancer can plan and track execution.
- **Integrations** — linking the project to the tools the work lives in (Figma, GitHub, Behance, Adobe, Drive), eventually with real provider connections.

It is built in dependency order — Files first (the foundation), then Deliverables (a view over files + links), then Tasks, and finally real provider connections, which are held to a security/compliance gate because they introduce stored credentials. Each tab is additive and independently shippable; existing surfaces (the Document Vault, the integrations registry, the project page) are reused, not rebuilt.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Keep the engagement's files in the project (Priority: P1)

A freelancer opens a project, goes to **Files**, and uploads the client's brief and the signed contract as *inputs*, and later uploads the finished logo pack as a *deliverable*. The files are grouped by input vs. deliverable, and everything they upload is private to them and included in their data export.

**Why this priority**: Files are the foundation the Deliverables tab depends on, and the highest-frequency "where do I keep this?" need. It reuses the existing document store, so it delivers value fast and stands alone.

**Independent Test**: From a project's Files tab a freelancer can upload, categorize (input/deliverable), view, and remove documents scoped to that project; the files appear nowhere for other users and are present in the data export.

**Acceptance Scenarios**:

1. **Given** a project, **When** the freelancer uploads a document on the Files tab and marks it an input, **Then** it appears under "inputs" for that project and only for that owner.
2. **Given** a project with documents, **When** the freelancer marks one a deliverable, **Then** it moves to the "deliverables" group and becomes eligible to appear on the Deliverables tab.
3. **Given** a freelancer who exports their data, **When** the export runs, **Then** project-scoped documents are included with their project association.
4. **Given** the existing standalone Document Vault, **When** this ships, **Then** documents not tied to a project continue to work exactly as before.

---

### User Story 2 - Present everything I'm handing over (Priority: P2)

A freelancer opens **Deliverables** and sees one list combining the files they tagged as deliverables and the external links they attached (e.g., a Figma file), each with a state — draft, ready, or sent/handed-over. They can mark an item "ready," then "sent," to track what the client has received.

**Why this priority**: This is the freelancer-facing payoff of Files + Integrations — a clean "what the client gets" view — but it depends on Files (US1) and the existing link registry existing first.

**Independent Test**: The Deliverables tab lists deliverable files + attached external links as one set; each item's state can move draft → ready → sent and is reflected consistently.

**Acceptance Scenarios**:

1. **Given** a project with a deliverable file and an attached external link, **When** the freelancer opens Deliverables, **Then** both appear as deliverable items in one list.
2. **Given** a deliverable item, **When** the freelancer marks it ready then sent, **Then** the state updates and persists, and an invalid transition is rejected.
3. **Given** a deliverable item marked sent, **When** the freelancer views the project, **Then** the project reflects that something has been handed over.

---

### User Story 3 - Plan and track the work (Priority: P2)

A freelancer opens **Tasks**, adds a short work breakdown (e.g., "wireframes," "first draft," "revisions"), and moves each through to-do → doing → done. Optionally they group tasks under a milestone (e.g., "Phase 1") with a target date. The tab shows progress at a glance.

**Why this priority**: High value and the PMO-grade depth requested, but independent of Files/Deliverables and larger to build, so it follows the foundation.

**Independent Test**: A freelancer can create, reorder, status-change, and delete tasks within a project; optionally group them under a milestone; task and milestone data is owner-scoped and survives reload.

**Acceptance Scenarios**:

1. **Given** a project, **When** the freelancer adds tasks and sets their status, **Then** the Tasks tab shows them with current status and overall progress.
2. **Given** several tasks, **When** the freelancer groups them under a milestone with a target date, **Then** the milestone shows its tasks and completion.
3. **Given** tasks exist, **When** another user views the system, **Then** they never see this freelancer's tasks or milestones.

---

### User Story 4 - Connect the tools the work lives in (Priority: P3, security-gated)

A freelancer opens **Integrations** and connects a provider (e.g., Figma) via that provider's sign-in, then links specific project resources. The connection's secrets are never visible to the client side, never appear in the data export, and can be revoked. Until a provider connection exists, the existing manual "paste a link" path still works.

**Why this priority**: Highest value-per-effort is lowest here and the risk is highest — it introduces stored third-party credentials. It must follow the other tabs and pass a security/compliance review before implementation.

**Independent Test**: A freelancer can initiate a provider connection, see linked resources for the project, and revoke the connection; no credential is ever returned to the browser or included in the export; revoking removes access.

**Acceptance Scenarios**:

1. **Given** the Integrations tab, **When** the freelancer connects a provider, **Then** a connection is established and the project can link that provider's resources, with secrets stored only server-side.
2. **Given** a connected provider, **When** the freelancer exports their data, **Then** no token/secret appears anywhere in the export.
3. **Given** a connection, **When** the freelancer revokes it, **Then** linked resources show as disconnected and no further provider access is possible.
4. **Given** no connection yet, **When** the freelancer uses the manual link option, **Then** it behaves exactly as the existing stub (paste URL + label).

### Edge Cases

- **A file is both reference and output**: a document has exactly one category at a time (input or deliverable); changing it moves it between groups (no duplication).
- **Deliverable item whose underlying file is deleted**: the deliverable entry must not dangle — removing the file removes it from the deliverables list.
- **Large or disallowed uploads**: file size/type limits and errors reuse the existing Document Vault rules; the workspace surfaces the same friendly errors.
- **Task with no milestone**: tasks are valid standalone; milestones are optional grouping.
- **Quota at a free tier**: whatever quota posture is chosen per facet must block consistently and never be bypassed by going through the workspace vs. the standalone surface.
- **Revoking a provider connection used by multiple projects**: revoking affects all projects' links for that provider connection, shown honestly as disconnected (not silently broken).
- **Provider OAuth failure/expiry**: a failed or expired connection shows a clear "reconnect" state; the project's other tabs are unaffected.

## Requirements *(mandatory)*

### Functional Requirements

#### Workspace shell
- **FR-001**: The project detail page MUST present its content as tabs — Overview, Files, Deliverables, Tasks, Integrations — with Overview as the default; tabs MUST be navigable on mobile and RTL-correct.
- **FR-002**: Each tab MUST load and function independently; a tab with no content MUST show a clear empty state, and a failing tab MUST NOT break the others.

#### Files & docs
- **FR-003**: A project MUST be able to own documents, reusing the existing Document Vault storage, upload experience, owner-scoped access, and data-export/delete behavior — extended so a document can be associated with a project.
- **FR-004**: Each project document MUST carry a category of **input** (brief, contract, requirements, notes) or **deliverable** (output), and the Files tab MUST group documents by that category and allow changing it.
- **FR-005**: Documents not associated with any project MUST continue to behave exactly as today (no regression to the standalone Document Vault).
- **FR-006**: Project documents MUST be included in the PDPL data export with their project association, and removed on account deletion, like other owned data.

#### Deliverables
- **FR-007**: The Deliverables tab MUST present, as one list, the project's deliverable-category documents and its attached external links (from the integrations registry).
- **FR-008**: Each deliverable item MUST have a handover state that moves through a defined sequence (draft → ready → sent); invalid transitions MUST be rejected, and state MUST persist.
- **FR-009**: Removing the underlying file or link MUST remove its deliverable entry (no dangling deliverables).

#### Tasks & milestones
- **FR-010**: A project MUST support a list of tasks, each with a title, a status (to-do / doing / done), an optional due date, and a manual order; tasks MUST be creatable, editable, reorderable, and deletable.
- **FR-011**: Tasks MAY be grouped under an optional milestone with a name and target date; a milestone MUST show its tasks and completion; tasks without a milestone MUST remain valid.
- **FR-012**: The task/milestone model MUST be designed so a milestone can LATER carry its own money (a milestone-level amount/payment) without restructuring — but milestone money is **OUT OF SCOPE for this release** (confirmed: schema-ready only; money strictly later, to avoid touching the money engine/income views/quotas this round).
- **FR-013**: Task and milestone data MUST be owner-scoped (only the owner can see or change it) and included in the data export/delete.

#### Integrations (real connections — gated)
- **FR-014**: A freelancer MUST be able to connect a third-party provider account and link specific provider resources to a project; the existing manual "paste a link" path MUST keep working when no connection exists.
- **FR-015**: Provider credentials/tokens MUST be stored only server-side, never returned to the browser, never readable via owner data queries, and MUST NEVER appear in the PDPL data export.
- **FR-016**: A freelancer MUST be able to revoke a provider connection; revoking MUST disconnect its linked resources honestly (shown as disconnected) and prevent further provider access.
- **FR-017**: The integrations connection capability MUST pass a halal/PDPL/security review before its implementation begins. The **first provider is GitHub with read-only scopes** (link repos/PRs, show metadata); additional providers follow the same connection pattern once proven.

#### Cross-cutting
- **FR-018**: Every new stored record type MUST be owner-scoped private and MUST NOT weaken or bypass any existing free-tier limit. **Quota posture (confirmed)**: project files reuse the **existing Document Vault storage cap** (free = 10 total / pro = 50) — no new file quota; **tasks and deliverable items are unlimited** on all tiers (lightweight metadata). No new quota machinery is introduced.
- **FR-019**: All new user-facing copy MUST be Arabic-primary + English with correct RTL; the workspace MUST be mobile-first.
- **FR-020**: New state/eligibility logic (deliverable state machine, task status transitions, document-category rules) MUST be unit-tested.

### Key Entities

- **Project document**: an existing Document Vault document associated with a project and categorized input or deliverable. Reuses existing storage/RLS/export.
- **Deliverable item (derived/curated)**: the unified view entry representing either a deliverable document or an attached external link, plus a handover state (draft/ready/sent).
- **Task**: a unit of work in a project — title, status, optional due date, order; optionally belongs to a milestone. Owner-scoped.
- **Milestone**: an optional grouping of tasks with a name and target date; designed to later carry its own money. Owner-scoped.
- **Provider connection (gated)**: a server-side, encrypted record of a freelancer's authorization to a third-party provider; never client-readable, never exported. Referenced by integration links.
- **Project integration link**: existing registry entry (provider + URL + label + status), optionally associated with a provider connection once real connections exist.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A freelancer can keep a project's inputs and deliverables as files in the project, grouped by category, without leaving the project page.
- **SC-002**: The standalone Document Vault continues to work with zero regression after files become project-associable.
- **SC-003**: A freelancer can see everything they're handing the client (files + links) in one Deliverables list and move each item draft → ready → sent.
- **SC-004**: A freelancer can plan and track a project's work as tasks (and optional milestones) and see overall progress at a glance.
- **SC-005**: No freelancer can ever see or change another freelancer's project files, deliverables, tasks, milestones, or connections.
- **SC-006**: No third-party credential/token is ever exposed to the browser or present in the data export, under any path.
- **SC-007**: Every facet's data is included in the PDPL export and removed on account deletion (except secrets, which are purged but never exported).
- **SC-008**: Free-tier limits behave identically whether a freelancer acts through the workspace or the standalone surfaces.
- **SC-009**: The real-connection (OAuth) capability does not begin implementation until a documented halal/PDPL/security review has passed.

## Assumptions

- **Builds on features 002 + 003**: the `projects` entity, project page, integrations registry, and the Document Vault all exist and are reused, not rebuilt.
- **Tabs, not wizard stages**: the workspace facets are always-available tabs on the project page, independent of the lifecycle wizard (003).
- **Files = extended Document Vault**: documents gain an optional project association + an input/deliverable category; the storage bucket, upload UI, size/type rules, RLS, and export/delete are reused.
- **Deliverables = curated view, not a new store**: it composes deliverable documents + integration links; only the per-item handover state is new state.
- **Deliverable state machine** (assumed; confirm in open questions): exactly `draft → ready → sent`, forward-only with no skips beyond adjacent steps; "sent" is terminal for the item.
- **Tasks ship money-free**; milestone-money is explicitly deferred (FR-012).
- **Integrations OAuth is the final, gated phase**: planned and specified here, but its implementation is held behind a security/compliance review; the manual-link stub remains the interim path.
- **No new payments**: nothing here introduces online payment collection.

## Dependencies

- Document Vault (M12) — extended for project association.
- Project hub (feature 002) — `projects`, `project_integrations`.
- Lifecycle wizard (feature 003) — complementary; the workspace is where the work happens between "set up" and "get paid."

## Resolved decisions (founder, 2026-06-26)

1. **OAuth first provider** → **GitHub, read-only** scopes; others follow the same proven connection pattern (FR-017).
2. **Quota posture** → files reuse the **existing Document Vault cap** (free 10 / pro 50); **tasks & deliverables unlimited**; no new quota machinery (FR-018).
3. **Milestone money** → **strictly later**, schema-ready only this release (FR-012).
4. **Deliverable states** → exactly **`draft → ready → sent`**, forward-only, `sent` terminal; rework re-adds/updates an item back at `draft` (FR-008).
