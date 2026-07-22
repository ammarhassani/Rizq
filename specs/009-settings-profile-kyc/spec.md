# Feature Specification: Profile as Single KYC Source of Truth (Settings)

**Feature Branch**: `009-settings-profile-kyc`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "There is no profile section in settings where users can complete and improve their profile strength and backfill missing onboarding fields, like an HR/ERP system. Make it the single source of truth (KYC), remove the separate studio profile, and replace its button with a small strength nudge that hides when the profile is already strong."

## Overview

Today a freelancer's profile can only be filled during the linear onboarding wizard, and a *second,
overlapping* editor ("studio profile" under Proposals) edits a subset of the same fields. There is no
single place to **come back later and complete, improve, or backfill** the profile. This feature makes
**Settings → Profile** the one authoritative place (KYC record) to view and edit every profile field,
shows how complete the profile is, and retires the duplicate studio profile so there is exactly one
source of truth. A small strength nudge invites users with weak profiles to improve, and stays silent
for users who are already strong.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete & backfill the profile from one place (Priority: P1)

A freelancer who skipped fields during onboarding (or whose situation changed) opens Settings → Profile
and sees a strength meter, a clear "what's still missing" list, and every profile field grouped into
editable sections. They fill or update any field; each section saves on its own; the strength updates.

**Why this priority**: This is the core value — a durable, HR/ERP-style profile record the user can
return to any time. Without it, profile data can only be captured once, during onboarding.

**Independent Test**: Open Settings → Profile with a partially-filled profile; confirm the strength
meter, the missing-fields list, and editable sections render; edit and save a section; confirm the
value persists and the strength recomputes.

**Acceptance Scenarios**:

1. **Given** a signed-in user with a partial profile, **When** they open Settings → Profile, **Then**
   they see a profile-strength percentage, a list of what's missing (with the value each adds), and all
   profile fields grouped into editable sections.
2. **Given** an empty field, **When** the user fills it and saves that section, **Then** the value
   persists and the strength percentage increases to reflect it — without leaving the page.
3. **Given** an already-filled field, **When** the user changes it and saves, **Then** the new value
   replaces the old one and is reflected everywhere the profile is used.
4. **Given** a fully complete profile, **When** the user opens the page, **Then** strength shows 100%,
   the missing list is empty, and every field is still editable.

---

### User Story 2 - One source of truth: retire the duplicate studio profile (Priority: P1)

The separate "studio profile" editor under Proposals is removed. Every field it edited remains editable
in Settings → Profile, so nothing loses its only editor — including testimonials, which the studio
profile owned and onboarding never covered.

**Why this priority**: Two overlapping editors for the same data is a correctness and trust hazard
(which one wins?). Consolidating to one record is the point of "single source of truth (KYC)".

**Independent Test**: Confirm the studio profile page and its entry points are gone; confirm every
field the studio profile used to edit (name, brand, tagline, logo, bio, contact, years, total projects,
notable clients, portfolio samples, and testimonials) is editable in Settings → Profile.

**Acceptance Scenarios**:

1. **Given** the studio profile is removed, **When** a user navigates to its old location or looks for
   its button in Proposals or the command palette, **Then** it no longer exists and no link 404s.
2. **Given** testimonials were only editable in the studio profile, **When** the user opens Settings →
   Profile, **Then** they can view, add, edit, and remove testimonials there.
3. **Given** any field the studio profile edited, **When** the user opens Settings → Profile, **Then**
   that field has an editor there (no field is orphaned by the removal).

---

### User Story 3 - Strength nudge that respects strong profiles (Priority: P2)

Where the studio-profile button used to be (Proposals), a small nudge shows the user's profile strength
and encourages improvement — but disappears entirely once the profile is already strong, so a
well-completed profile is never nagged. The Settings summary also shows the strength with a shortcut to
complete it.

**Why this priority**: Gentle, honest encouragement to complete KYC without pestering users who already
have a strong profile. Depends on US1's strength being available.

**Independent Test**: With a weak profile, confirm the nudge appears in Proposals showing the strength
and an improve message + a link to Settings → Profile; raise the profile above the optimal threshold and
confirm the nudge disappears.

**Acceptance Scenarios**:

1. **Given** a profile below the optimal threshold, **When** the user views Proposals, **Then** a small
   widget shows their profile strength, a "more complete is better" message, and a link to complete it.
2. **Given** a profile at or above the optimal threshold, **When** the user views Proposals, **Then** no
   nudge is shown.
3. **Given** any profile, **When** the user views the Settings summary, **Then** the profile strength
   percentage is shown with a "Complete your profile" shortcut to Settings → Profile.

---

### Edge Cases

- **Brand-new / empty profile**: every section renders with empty editable fields and 0% strength; the
  missing list contains all dimensions.
- **Field editable in the profile but not surfaced by an existing editor**: every field the studio
  profile edited must have an editor in Settings → Profile; if an existing section editor does not expose
  a given field, that field is added to the appropriate section (no field is left without an editor).
- **Save failure / validation error on a section**: only that section reports the error; other sections
  and their saved values are unaffected.
- **Optimal threshold boundary**: exactly at the threshold, the nudge is hidden (at-or-above = strong).
- **Locale**: the page, strength labels, missing list, and nudge all render in Arabic (RTL) and English.

## Requirements *(mandatory)*

### Functional Requirements

**Settings → Profile page (US1)**

- **FR-001**: Users MUST have a single Settings → Profile page that displays their current profile
  strength as a percentage and a list of the missing items with the value each adds.
- **FR-002**: The page MUST present every profile field, grouped into editable sections covering
  identity, location, professional details, rates, portfolio, brand, business defaults, goals, and
  testimonials.
- **FR-003**: Each section MUST be independently editable and savable; saving one section MUST NOT
  require or disturb the others.
- **FR-004**: Users MUST be able to fill previously-empty fields (backfill) and change previously-filled
  fields at any time; changes MUST persist and be reflected wherever the profile is used.
- **FR-005**: After a successful section save, the displayed profile strength and missing list MUST
  update to reflect the change without a full manual reload.
- **FR-006**: The strength value MUST be computed from the existing profile-strength model (the same
  model used during onboarding), so onboarding and this page always agree.

**Single source of truth (US2)**

- **FR-007**: The separate studio profile editor MUST be removed — its page, its form, its entry button
  in Proposals, and its command-palette entry — with no remaining links that break.
- **FR-008**: Every field the studio profile edited MUST remain editable in Settings → Profile after the
  removal, including testimonials (view/add/edit/remove).
- **FR-009**: There MUST be exactly one editor for each profile field (no duplicate editors for the same
  data after this feature).

**Strength nudge + summary (US3)**

- **FR-010**: Proposals MUST show a small profile-strength nudge (strength + an "improve" message + a
  shortcut to Settings → Profile) when the profile is below the optimal threshold.
- **FR-011**: The nudge MUST be hidden when the profile is at or above the optimal threshold.
- **FR-012**: The existing Settings summary MUST show the profile strength percentage with a shortcut to
  Settings → Profile.

**Cross-cutting**

- **FR-013**: All new surfaces MUST render in Arabic (RTL, primary) and English, mobile-first.
- **FR-014**: The feature MUST NOT add new profile fields or new stored data beyond what already exists;
  it only surfaces existing fields for editing.

### Key Entities *(include if feature involves data)*

- **Freelancer Profile**: the existing per-user profile record (identity, location, specialty/experience,
  rates, portfolio, brand, defaults, goals, contact) — now edited from one authoritative place.
- **Profile Strength**: a 0–100 completeness score derived from weighted profile dimensions; drives the
  meter, the missing list, and the nudge visibility.
- **Testimonial**: a piece of client social proof (previously studio-only) now managed within the
  profile record.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of profile fields are editable from the single Settings → Profile page (a user never
  needs another screen to complete their profile).
- **SC-002**: After the studio profile is removed, 100% of the fields it previously edited — including
  testimonials — remain editable in Settings → Profile, and there are zero broken links to the old
  location.
- **SC-003**: Editing and saving a field updates the displayed profile strength within the same visit
  (no manual full reload required).
- **SC-004**: The profile strength shown on the Settings summary, the Settings → Profile page, and the
  onboarding wizard are always the same value for the same profile.
- **SC-005**: The Proposals nudge is shown for profiles below the optimal threshold and hidden for
  profiles at or above it (verified at the boundary).
- **SC-006**: A user can raise their profile from partial to 100% entirely within Settings → Profile,
  and the completeness is reflected across the app.

## Assumptions

- **Optimal threshold** for hiding the nudge defaults to **80%** strength (tunable); at-or-above is
  treated as "strong / no nudge".
- The existing onboarding section editors and their per-section save behavior are reused; where an
  editor does not already expose a studio-owned field (e.g. tagline, bio, testimonials), that field is
  added to the appropriate section so nothing loses its editor.
- The profile-strength model and its weights are the existing ones; this feature does not re-weight them.
- No schema change: all fields shown already exist as profile columns / related records (testimonials).
- The studio profile's remaining scalar fields are all already onboarding-covered columns, so removing
  the studio profile loses no data — only the duplicate editor.
- Reflecting profile changes "wherever used" relies on the existing places that already read these
  fields (proposals, invoices, pricing); no new consumers are introduced.
