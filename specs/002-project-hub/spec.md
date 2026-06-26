# Feature Specification: Project as the umbrella hub

**Feature Branch**: `002-project-reframe-stage1`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "Promote Project to a real database hub. Introduce a projects table as the parent entity a freelancer thinks in: it owns its origin proposal, its money (the existing gig), its invoices, and pluggable third-party integrations. Income Ledger becomes an honest view of projects' money. Stage 2 of the Project reframe; Stage 1 (user-facing relabel) is already shipped."

## Overview

Today a freelancer's work is scattered across three sibling records — a proposal (the quote), a gig (the engagement + money), and invoices (the bills) — with no single thing that *is* "the project." Stage 1 relabeled the user-facing word "gig" to "Project," but the underlying model still has no project. This feature introduces **Project** as the real umbrella a freelancer organizes their work around. A Project contains its origin proposal, its money, its invoices, and (as a foundation for the future) a slot for third-party integrations. The freelancer gets one coherent place per engagement; the Income Ledger becomes an honest portfolio view of all projects' money rather than a separate concept.

This is explicitly a **non-destructive, additive** change: no existing data is dropped, the existing money behavior (deposit math, client rollups, monthly limits, the invoice-paid → project-paid loop) is preserved exactly, and existing screens keep working throughout.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every engagement becomes a Project (Priority: P1)

A freelancer who already has logged work opens Rizq after this change ships and finds that each of their existing engagements is now a **Project** with its own page. Nothing they entered is lost: the money, dates, client link, and originating proposal are all attached to the project. New work continues to create a project automatically.

**Why this priority**: This is the foundation — without projects existing (including a clean migration of all current data), nothing else in the feature has anything to attach to. It must deliver value on its own: even with no new UI beyond a project page, the freelancer now has a single record per engagement.

**Independent Test**: After migration, every pre-existing engagement has exactly one project that carries the same money, client, and origin proposal; totals on the Income Ledger and Client Book are unchanged to the riyal.

**Acceptance Scenarios**:

1. **Given** a freelancer with existing logged engagements, **When** the migration runs, **Then** each engagement has exactly one project, and the project shows the same amount, dates, client, and origin proposal as before — with no change to any income or client total.
2. **Given** a freelancer creates work from an accepted proposal, **When** they tap "Create project from this proposal," **Then** a project is created carrying the proposal as its origin and pre-filled money, and the proposal is marked as that project's origin.
3. **Given** a freelancer on the free plan at their monthly creation limit, **When** they try to create another project, **Then** they are blocked with the same upgrade prompt as before (the existing monthly limit is preserved, not doubled or bypassed).

---

### User Story 2 - A Project page that shows the whole engagement (Priority: P1)

A freelancer opens a Project and sees, in one place: its money (amount, deposit, what's paid vs. pending, payment timeline), its origin proposal, all invoices billed against it, and a labeled placeholder for future integrations (Figma, GitHub, Behance, Adobe, Drive). The money section is the same trustworthy view they had on the income detail screen.

**Why this priority**: This is the everyday surface the freelancer lives in and the payoff of the reframe. It is independently testable and valuable even before integrations are real.

**Independent Test**: Opening any project shows its money, origin proposal, and the list of invoices billed to it; an integrations area is visibly present but clearly marked "coming soon" with no broken actions.

**Acceptance Scenarios**:

1. **Given** a project with a deposit-paid status, **When** the freelancer opens its page, **Then** the payment timeline, deposit, remaining, and status read exactly as they did on the prior income detail screen.
2. **Given** a project that has been invoiced twice, **When** the freelancer opens it, **Then** both invoices appear under the project, each linking to its invoice.
3. **Given** any project, **When** the freelancer views the integrations area, **Then** the supported providers are listed as a labeled, non-functional placeholder (no real connection is attempted) consistent with the "AI/feature labeled honestly" principle.

---

### User Story 3 - Income Ledger as the portfolio money view (Priority: P2)

A freelancer opens the top-level Income screen and understands it as "the money across all my projects" — monthly totals, paid vs. pending, rolling averages, and projection. Drilling into any line takes them to that project. Per-project money also lives on the project page itself.

**Why this priority**: Reframing income as a portfolio view (rather than a sibling "gigs" concept) is the conceptual honesty goal, but it builds on Projects existing (P1). The numbers must not change — only the framing and navigation.

**Independent Test**: The Income screen shows the same monthly and rolling figures as before; each row navigates to its project; the project page shows that single project's money consistently with the ledger.

**Acceptance Scenarios**:

1. **Given** existing monthly income data, **When** the freelancer opens the Income screen after the change, **Then** every monthly total, paid/pending split, rolling average, and projection is identical to before.
2. **Given** the Income screen, **When** the freelancer selects an entry, **Then** they land on that entry's project page.

---

### User Story 4 - Proposals can relate to a project as origin or change order (Priority: P3)

A freelancer's winning proposal is the project's **origin**. The model also recognizes that later proposals (a change order or an added sub-scope) can attach to the *same* project, so the engagement stays one coherent thing instead of fragmenting into unrelated quotes. In this release only the origin relationship is populated; the additional roles are recognized by the model and ready for a later release.

**Why this priority**: This is forward-looking PMO-grade structure. It must not block P1/P2 and ships as schema + origin backfill, with the richer roles deferred to UI later.

**Independent Test**: Each migrated project references exactly one origin proposal; the system can record a proposal's role relative to a project (origin / change order / sub-scope) without error, and existing proposal flows are unaffected.

**Acceptance Scenarios**:

1. **Given** a project created from a proposal, **When** inspected, **Then** that proposal is recorded as the project's single origin.
2. **Given** the proposal model, **When** a proposal is associated with a project, **Then** its role relative to that project can be one of origin / change order / sub-scope, defaulting to origin on existing data.

### Edge Cases

- **Engagement with no client or no proposal**: a project must still be created and shown; missing origin proposal or client is allowed (those links are optional), and money totals still roll up correctly.
- **Engagement with no delivery date**: it should behave on the Income Ledger exactly as today (today only dated engagements appear in monthly rollups) — the reframe must not silently change which records count.
- **Invoice already linked to an engagement**: after migration the invoice must resolve to the same project; the existing invoice-paid → engagement-paid behavior must still mark the project's money paid, once, idempotently, forward-only.
- **Free-plan limits**: the monthly creation limit and the total-clients limit must be enforced exactly as before — neither relaxed (because a project and its money are now two rows) nor double-counted.
- **Deleting a project**: deleting a Project that has a money record and/or invoices MUST soft-archive it (mark inactive, hide from active lists) and preserve the linked money and invoice records, so income and client history stay accurate. A project with no money/invoices may be removed outright. A separate, explicit "permanently delete" path is deferred to a later release.
- **Integration placeholder**: selecting a not-yet-available provider must do nothing destructive and must clearly communicate it is not connected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a Project as a first-class record that represents one freelancer engagement and serves as the parent of its money, its origin proposal, and its invoices.
- **FR-002**: The system MUST migrate every existing engagement into exactly one Project without losing or altering any money, date, client, or proposal data, and without changing any existing income or client total.
- **FR-003**: A Project MUST own its money via the existing engagement/money record, preserving unchanged the current deposit/remaining calculation, client rollups (count, paid value, average payment days), and the invoice-paid → money-paid cascade (forward-only, idempotent, best-effort).
- **FR-004**: The data model MUST allow a Project to have more than one money/engagement record in the future (e.g., milestones or phases), even though each migrated project starts with exactly one.
- **FR-005**: A Project MUST reference at most one **origin** proposal, and the proposal model MUST be able to record a proposal's role relative to a project as one of: origin, change order, sub-scope (only origin is populated in this release).
- **FR-006**: Invoices MUST resolve to the Project they belong to; a Project MUST be able to have many invoices; existing invoice→engagement links MUST continue to work after migration (the prior link is retained, not removed).
- **FR-007**: Status-change history (the client timeline) MUST continue to capture project lifecycle events and MUST associate them with the Project after migration, with existing history preserved.
- **FR-008**: The "Create project from this proposal" action MUST create a Project whose origin is that proposal, pre-filled with the proposal's money and client, marking the proposal's role as origin.
- **FR-009**: The system MUST present a Project detail page showing the project's money (matching the prior income detail view), its origin proposal, its invoices, and a clearly labeled integrations placeholder.
- **FR-010**: The Income Ledger MUST remain a top-level portfolio view of all projects' money with identical figures (monthly totals, paid/pending, rolling averages, projection), and each entry MUST navigate to its Project.
- **FR-011**: The system MUST support attaching named third-party integrations to a Project, identified by a provider type (figma, github, behance, adobe, drive, other) with a link, a display label, and a connection status — as an extensible registry that admits new providers without restructuring the core model.
- **FR-012**: Integration records MUST NOT store third-party credentials or secrets; authentication is explicitly out of scope for this release and reserved for a separate future mechanism.
- **FR-013**: Every new stored record type MUST be private to its owner — a freelancer can only ever see or change their own projects, money, invoices, and integrations.
- **FR-014**: Free-plan limits (monthly creation limit, total client limit) MUST be enforced with the same effective thresholds as before, neither relaxed nor double-counted by the introduction of a separate Project record.
- **FR-015**: All new user-facing copy MUST be provided in Arabic (primary) and English with correct right-to-left rendering, consistent with Stage 1.
- **FR-016**: Any displayed money figure or projection MUST retain its existing provenance/labeling (e.g., AI projections remain labeled as estimates); the reframe MUST NOT remove existing honesty labels.
- **FR-017**: Deleting a Project that has a money record and/or invoices MUST soft-archive it and preserve those linked records (no destruction of income or invoice history); only a Project with no money/invoices may be removed outright.

### Key Entities

- **Project**: The umbrella engagement a freelancer organizes work around. Owned by one freelancer. Has a title and lifecycle status, an optional client, an optional single origin proposal, one-or-more money records (one today), zero-or-more invoices, zero-or-more integrations.
- **Money/Engagement record (existing "gig")**: The financial facet of a project — amount, deposit, remaining, payment dates, payment method, status. Remains the source of income figures and client rollups. Becomes a child of a Project (1:1 today, 1:many capable).
- **Proposal**: The quote. Gains an optional association to a Project and a role relative to that project (origin / change order / sub-scope). One proposal is a project's origin.
- **Invoice**: A bill. Resolves to a Project (in addition to retaining its existing engagement link). A project can have many.
- **Project Integration**: A pluggable link from a Project to an external tool, identified by provider type, with a URL, display label, connection status, and provider-specific configuration. No credentials stored. Extensible to new providers without core changes.
- **Income Ledger (view, not a stored entity)**: A read-only portfolio aggregation of all projects' money over time (monthly totals, rolling averages, projection).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of pre-existing engagements map to exactly one Project after migration, with zero orphaned or duplicated records.
- **SC-002**: Every income figure (monthly total, paid, pending, overdue, rolling 3-/6-month average, projection) and every client total (project count, paid value, average payment days) is identical before and after the change — verified to the riyal.
- **SC-003**: 100% of pre-existing invoices resolve to the correct Project, and the invoice-paid → project-money-paid behavior still fires exactly once per invoice, only forward.
- **SC-004**: A freelancer can open any Project and see its money, origin proposal, and invoices in one place; the integrations area is present and clearly labeled as not-yet-connected with no broken actions.
- **SC-005**: A new provider type could be added to the integrations registry without changing the structure of the Project, money, proposal, or invoice records.
- **SC-006**: No freelancer can read or modify another freelancer's projects, money, invoices, or integrations (owner-scoped access verified).
- **SC-007**: Free-plan creation and client limits block at the same effective thresholds as before the change.
- **SC-008**: Deleting a Project that has money or invoices preserves 100% of those linked records (soft-archive), so no past income total or invoice is lost.

## Assumptions

- **Stage 1 is shipped**: user-facing copy already says "Project" (Arabic مشروع); this feature changes the data model and adds the project page, not the vocabulary.
- **Money stays in the existing engagement record**: per the locked decision, the existing "gig" record is kept as the 1:1 money child of a Project rather than absorbed, to preserve the money engine (triggers, views, limits, invoice loop) unchanged.
- **Additive, non-destructive migration**: new records and links are added and backfilled; existing columns/links (e.g., the existing invoice→engagement link) are retained, not dropped, in this release.
- **One money record per project at launch**: the model permits many for the future, but migration creates exactly one per existing engagement.
- **Only the origin proposal role is populated now**: change-order and sub-scope roles are recognized by the model but surfaced in a later release.
- **Integrations are schema + placeholder only**: no OAuth, no live data sync, no credentials; the UI slot is a labeled stub.
- **Income remains a top-level destination** (not folded into a single project) because its figures are inherently cross-project.
- **Which records appear in monthly income is unchanged**: today only engagements with a delivery date roll up; this feature keeps that rule rather than redefining it.
