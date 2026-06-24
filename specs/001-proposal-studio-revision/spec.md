# Feature Specification: Proposal Studio Revision Round

**Feature Branch**: `001-proposal-studio-revision`

**Created**: 2026-06-24

**Status**: Draft

**Input**: Founder feedback for Proposal Studio (M1): (1) AI-generated clarifying questions instead of fixed ones, (2) a hovering conversational chat that edits the responsible proposal sections, (3) show the freelancer's phone on the proposal, (4) a proper "sharing disabled" state instead of a 404, (5) fix "create a gig from this proposal" (404), (6) inherit years-of-experience and projects-completed into the proposal, (7) manage notable clients as separate entries, (8) fix Studio profile saving ("Something went wrong").

## Clarifications

### Session 2026-06-24

- Q: When the hovering chat is told something that changes scope or price (e.g. "add a control panel"), how should it behave? → A: Propose → confirm → auto re-price — the AI proposes the deliverable change; on the freelancer's confirmation it is applied and the price re-resolves from the market band, shown for a final confirmation.
- Q: How should AI-generated clarifying questions be presented? → A: Mixed — quick-select options when the question is categorical, free-text when it is open-ended.
- Q: On which proposal states is the hovering edit-chat available? → A: Wherever the proposal is already editable (draft, final, and sent); every edit is version-snapshotted for recovery.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable profile & onboarding saving (Priority: P1)

A freelancer edits their Studio profile (or completes an onboarding step) and saves. The save succeeds and every field persists.

**Why this priority**: Saving currently fails with a generic error, and the same failure blocks onboarding — a freelancer cannot establish the profile that every proposal draws from. Nothing else in the Studio is trustworthy until this works.

**Independent Test**: Open the Studio profile, change several fields (brand, bio, years of experience, projects completed, notable clients), save, reload — all values persist and no error is shown.

**Acceptance Scenarios**:

1. **Given** a signed-in freelancer on the Studio profile with valid edits, **When** they save, **Then** all fields persist and a success confirmation appears.
2. **Given** a freelancer completing any onboarding step, **When** they continue, **Then** the step's data is saved without error.
3. **Given** valid input and a healthy connection, **When** the save completes, **Then** the generic "Something went wrong" message never appears.

---

### User Story 2 - Convert a proposal into a gig (Priority: P1)

From a proposal, the freelancer creates a gig and lands on the newly created gig.

**Why this priority**: This closes the proposal → gig → income loop and is currently broken (it dead-ends on a not-found page).

**Independent Test**: Open a proposal, choose "Create gig from this proposal," and confirm you arrive on the new gig's page with details prefilled.

**Acceptance Scenarios**:

1. **Given** a proposal, **When** the freelancer creates a gig from it, **Then** a gig is created and they are navigated to that gig's detail page.
2. **Given** the resulting navigation, **When** the page loads, **Then** it shows the gig — not a not-found page.
3. **Given** the new gig, **When** it opens, **Then** it is prefilled from the proposal and its client.

---

### User Story 3 - Relevant, AI-generated clarifying questions (Priority: P2)

When generating a proposal from a brief, the freelancer is asked only a few clarifying questions that are genuinely relevant to that brief.

**Why this priority**: Today's fixed questions are frequently irrelevant ("meaningless"), wasting time and eroding trust; brief-specific questions raise proposal quality.

**Independent Test**: Submit two different briefs (e.g., a logo design vs. a gym-management system); confirm the questions differ, each targets information actually missing from that brief, there are at most 3, and each can be skipped.

**Acceptance Scenarios**:

1. **Given** a brief missing key scope or price details, **When** generation starts, **Then** the freelancer is asked 1–3 clarifying questions specific to that brief.
2. **Given** a brief that is already detailed, **When** generation starts, **Then** few or no clarifying questions are asked.
3. **Given** any clarifying question, **When** the freelancer skips it, **Then** generation proceeds using best-available assumptions.
4. **Given** AI is unavailable, **When** generation starts, **Then** the flow still completes without blocking the freelancer.

---

### User Story 4 - Conversational in-place proposal editing (Priority: P2)

While a proposal is editable (draft, final, or sent), the freelancer opens a hovering chat, types extra context in natural language, and the AI updates the responsible section(s) in place.

**Why this priority**: Real briefs evolve through client messages; editing should absorb new context fluidly rather than via manual section-by-section rewrites. This is a headline founder ask.

**Independent Test**: On a gym-system proposal draft, type "the client now wants this to also be a mobile app with a control panel"; confirm the relevant narrative sections update (with animation) while price, dates, and terms stay untouched, and the new deliverable is surfaced for confirmation before it affects scope/price.

**Acceptance Scenarios**:

1. **Given** a draft, **When** the freelancer sends a message describing a change to wording/understanding/approach, **Then** the AI edits only the responsible narrative section(s) and reveals the change with animation.
2. **Given** a message that would change price, dates, milestones, or legal/terms, **When** processed, **Then** those values are never altered by the AI.
3. **Given** a message implying a new or removed deliverable (scope/price impact), **When** processed, **Then** the change is presented for the freelancer's explicit confirmation before it is applied and before any price recomputation.
4. **Given** an applied chat edit, **When** the freelancer reviews history, **Then** the prior version is recoverable.

---

### User Story 5 - Correct share-link states (Priority: P2)

A viewer opening a shared proposal link sees the right state: the proposal when active, a clear "sharing disabled" message when the owner turned sharing off, and not-found only when the link never existed.

**Why this priority**: A disabled link currently shows a generic not-found, which looks broken and hides that the owner intentionally revoked access.

**Independent Test**: Enable sharing and open the link (see proposal); disable sharing and reopen the same link (see "publisher disabled this link"); open a random invalid link (see not-found).

**Acceptance Scenarios**:

1. **Given** sharing is enabled, **When** a viewer opens the link, **Then** the proposal is shown.
2. **Given** sharing was enabled then disabled, **When** a viewer opens the same link, **Then** a clear bilingual "the publisher has disabled this link" message is shown — distinct from not-found.
3. **Given** a link that never existed (or whose proposal was deleted), **When** opened, **Then** a not-found state is shown.

---

### User Story 6 - Complete contact & credibility on the proposal (Priority: P3)

The generated proposal shows the freelancer's phone, years of experience, and projects completed, inherited from their profile.

**Why this priority**: Enables phone contact and strengthens credibility; the phone is captured today but not shown on the artifact.

**Independent Test**: With phone, years, and projects set in the profile, generate a proposal and confirm all three appear on-screen and in the export; with phone unset, confirm no empty contact line appears.

**Acceptance Scenarios**:

1. **Given** a profile with a phone number, **When** a proposal is generated, **Then** the phone appears as a usable contact in the proposal (on-screen and exported).
2. **Given** years of experience and projects completed in the profile, **When** a proposal is generated, **Then** both appear on the proposal.
3. **Given** a missing phone, **When** a proposal is generated, **Then** no blank or placeholder phone line is shown.

---

### User Story 7 - Manage notable clients as separate entries (Priority: P3)

In the Studio profile, the freelancer adds and removes notable clients as individual entries.

**Why this priority**: A single comma-separated field is fragile and awkward; separate entries are clearer and avoid delimiter bugs.

**Independent Test**: Add three notable clients as separate entries (including one name containing a comma), remove one, save, reload; confirm exactly the two intended entries remain, intact.

**Acceptance Scenarios**:

1. **Given** the Studio profile, **When** the freelancer adds a notable-client entry, **Then** it appears as a distinct, removable item.
2. **Given** multiple entries, **When** one is removed and saved, **Then** only the remaining entries persist.
3. **Given** an entry containing punctuation (e.g., a comma), **When** saved, **Then** it is preserved as a single entry.

---

### Edge Cases

- AI is unavailable or slow during question generation or chat editing → the flow degrades gracefully, the freelancer is never blocked, and nothing is fabricated.
- A chat instruction targets price, timeline, milestones, or terms → the AI refuses to alter the protected value and says so.
- A chat instruction adds or removes a deliverable (scope/price impact) → explicit confirmation is required; price recomputes only after confirmation.
- A chat instruction is ambiguous about which section it concerns → the AI asks a brief follow-up or edits the best-matching section and clearly states what it changed.
- A share link points to a proposal that was deleted entirely → not-found (distinct from disabled).
- Profile save with empty optional fields → succeeds; empty values do not render on the proposal.
- Notable-client entries: duplicates, blank entries, Arabic/Latin punctuation, very long names.
- Mixed RTL/LTR content (Arabic text with Latin client names and phone numbers) renders correctly.
- Concurrent edits to the same proposal (chat plus manual) → no lost updates; the latest state is consistent and recoverable through version history.

## Requirements *(mandatory)*

### Functional Requirements

**Profile & data integrity**

- **FR-001**: The system MUST persist all Studio profile fields when a signed-in freelancer saves with valid input, with no spurious failure.
- **FR-002**: The system MUST persist all onboarding step data without error.
- **FR-003**: The system MUST show a clear success confirmation on save and a specific, actionable message on genuine failure (no generic catch-all on valid input).

**Proposal → gig**

- **FR-004**: Freelancers MUST be able to create a gig from a proposal and be navigated to the newly created gig.
- **FR-005**: The created gig MUST be prefilled from the proposal and its client.

**AI clarifying questions**

- **FR-006**: The system MUST generate clarifying questions tailored to the specific brief, targeting only information that is genuinely missing or ambiguous and that affects scope or price.
- **FR-007**: The system MUST ask at most 3 clarifying questions, each individually skippable, presented as quick-select options when the question is categorical and as free-text when it is open-ended.
- **FR-008**: The system MUST incorporate answered clarifications into the resulting proposal and its pricing.
- **FR-009**: The system MUST complete proposal generation even when AI question generation is unavailable (graceful fallback).
- **FR-010**: AI-originated questions MUST be labeled consistently with the product's honesty rules so the freelancer knows when AI is speaking.

**Conversational editing**

- **FR-011**: While a proposal is editable (draft, final, or sent), freelancers MUST be able to submit free-text context through a hovering chat dialog.
- **FR-012**: The system MUST determine which proposal section(s) a message concerns and edit only those.
- **FR-013**: The system MUST reveal applied changes with animation.
- **FR-014**: The system MUST NOT allow AI to alter prices, dates, milestones, or legal/terms text.
- **FR-015**: Any change that adds or removes a deliverable, or otherwise affects scope or price, MUST require the freelancer's explicit confirmation before it is applied; upon confirmation, the price MUST re-resolve from the market band and be shown for a final confirmation before taking effect.
- **FR-016**: The system MUST preserve prior versions so chat edits are recoverable.
- **FR-017**: AI-edited sections MUST remain labeled as AI-assisted, consistent with existing proposal labeling.

**Share-link states**

- **FR-018**: Viewers opening an active shared link MUST see the proposal.
- **FR-019**: Viewers opening a link whose sharing was disabled MUST see a clear bilingual "the publisher has disabled this link" message, distinct from not-found.
- **FR-020**: Viewers opening a link that never existed (or whose proposal was deleted) MUST see a not-found state.
- **FR-021**: Disabling sharing MUST NOT expose any proposal content to viewers.

**Contact & credibility on the artifact**

- **FR-022**: When present in the profile, the freelancer's phone MUST appear as a usable contact on both the on-screen and exported proposal.
- **FR-023**: When the phone is absent, the proposal MUST NOT render an empty or placeholder phone line.
- **FR-024**: Years of experience and projects completed MUST be inherited from the profile and shown on the proposal; if such profile fields do not exist, they MUST be added.

**Notable clients**

- **FR-025**: Freelancers MUST be able to add and remove notable clients as individual, separately-editable entries.
- **FR-026**: Each entry MUST preserve its exact text, including punctuation, with no corruption from delimiters.
- **FR-027**: The separate-entry model MUST be consistent between onboarding and the Studio profile.

**Cross-cutting**

- **FR-028**: All new user-facing copy MUST be provided in Arabic (primary) and English.
- **FR-029**: All new surfaces MUST present usable loading, empty, and error states on mobile.

### Key Entities *(include if feature involves data)*

- **Freelancer Profile**: brand, bio, contact (including phone), years of experience, projects completed, and notable clients (a list of distinct entries).
- **Proposal**: a bilingual document of ordered sections; some are narrative (AI-editable), others are protected (price, timeline, milestones, terms).
- **Proposal Section**: a unit of the proposal with content and an "AI-editable" vs "protected" designation.
- **Clarifying Question**: a brief-specific question targeting a missing or ambiguous scope/price factor; skippable.
- **Chat Edit Request**: a free-text instruction mapped to one or more responsible sections, with a confirmation gate for scope/price-affecting changes.
- **Share Link**: a token granting public read access to a proposal, with a state of active, disabled, or absent.
- **Gig**: a unit of work created from a proposal, prefilled from proposal and client data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of valid Studio-profile and onboarding saves persist successfully; the generic "Something went wrong" no longer occurs for valid input.
- **SC-002**: 100% of "create gig from proposal" actions navigate to the new gig with zero not-found errors.
- **SC-003**: For any given brief, every clarifying question asked pertains to information genuinely missing from that brief, with no more than 3 questions, each skippable.
- **SC-004**: In conversational editing, zero instances of AI altering price, dates, milestones, or terms; scope/price-affecting changes are applied only after explicit confirmation.
- **SC-005**: Disabled share links show the "publisher disabled" message (not not-found) 100% of the time, while truly missing links show not-found.
- **SC-006**: When set in the profile, phone, years of experience, and projects completed appear on 100% of newly generated proposals (on-screen and exported); when unset, no empty contact line appears.
- **SC-007**: Freelancers can add and remove notable clients as separate entries, and an entry containing a comma survives a save-and-reload intact.
- **SC-008**: A freelancer can complete the full journey — generate (with relevant questions) → refine via chat → see complete contact/credibility → save profile → share correctly → convert to gig — without encountering an error.

## Assumptions

- The protected (non-AI-editable) parts of a proposal are price, timeline/dates, milestones, and legal/terms; the narrative sections (cover letter, understanding, approach, scope description, assumptions) are AI-editable. This matches the existing proposal honesty model.
- Chat-driven changes that affect scope or price (e.g., adding a "control panel" deliverable) follow propose-then-confirm with automatic re-pricing: the AI proposes the change; on confirmation it is applied and the price re-resolves from the market band, shown for a final confirmation. The freelancer stays in control. (Clarified 2026-06-24.)
- Phone, years of experience, projects completed, and notable clients already exist on the profile; this round ensures they save reliably, render correctly, and are edited well. If any are truly absent, they are added.
- Years of experience and projects completed remain in the proposal's "About" area by default; elevating them into the header is optional and not required for success.- Existing authentication, localization (Arabic-first RTL), version history, and the proposal export pipeline are reused.
