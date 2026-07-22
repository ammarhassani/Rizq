---
description: "Task list — Profile as Single KYC Source of Truth (Settings)"
---

# Tasks: Profile as Single KYC Source of Truth (Settings)

**Input**: Design documents from `specs/009-settings-profile-kyc/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/profile-surface.md

**Tests**: Only the pure `snapshot → completeness` mapping is unit-tested (per spec). UI is verified by
typecheck + the quickstart; an e2e smoke is optional polish.

**Organization**: by user story — US1 profile page · US2 consolidation (after US1) · US3 nudge+summary.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different file, no dependency on an incomplete task.
- **[Story]**: US1–US3 for story phases; none for Setup/Foundational/Polish.

---

## Phase 1: Setup

- [ ] T001 [P] Add i18n keys (ar + en) for the new surfaces to the message catalogs: a `SettingsProfile`
  namespace (page title, strength label, "what's missing"/"+X%", section headings, testimonials heading)
  and a `ProfileNudge` namespace (strength label, "the more complete the better", "Complete your profile →").

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ Blocks US1 + US3 (both need the shared strength source).**

- [ ] T002 Create `src/lib/profile/snapshot.ts`: move the `users` select + `ProfileSnapshot` builder and
  add `snapshotToCompleteness(snapshot): CompletenessInput` out of `src/app/[locale]/onboarding/page.tsx`
  (behavior-preserving). Export `loadProfileSnapshot(supabase, userId)`, `snapshotToCompleteness`, a
  `MISSING_DIMENSIONS` label map (dimension → {label_ar, label_en, weight}), and `OPTIMAL_THRESHOLD = 80`.
- [ ] T003 [P] Create `src/lib/profile/snapshot.test.ts`: unit-test `snapshotToCompleteness` (each of the
  10 dimensions is true iff its backing fields are present) and its composition with `profileCompleteness`
  on empty / partial / full snapshots (asserts the exact % for known inputs).
- [ ] T004 Refactor `src/app/[locale]/onboarding/page.tsx` to build its snapshot via
  `loadProfileSnapshot` from T002 — no behavior change (onboarding strength/flow identical).

**Checkpoint**: `pnpm test` green (new mapping test); onboarding unchanged.

---

## Phase 3: User Story 1 — Settings → Profile page (Priority: P1) 🎯 MVP

**Goal**: One page to complete/backfill every profile field, with a strength meter + missing list.

**Independent Test**: open `/settings/profile` with a partial profile → strength + missing list +
editable sections render; save a section → value persists and strength rises without a full reload.

- [ ] T005 [P] [US1] Create `src/components/settings/ProfileStrengthPanel.tsx`: renders the strength %
  bar + one row per UNMET dimension (`"<label> +<weight>%"`) using `MISSING_DIMENSIONS` + the computed
  strength (props from the page). Arabic-first RTL + en, mobile-first.
- [ ] T006 [P] [US1] Create `src/components/settings/ProfileSections.tsx` (client): stack the reused
  `StepIdentity/StepLocation/StepProfessional/StepRates/StepPortfolio/StepBrand/StepDefaults/StepGoals`
  as collapsible cards; wire `onNext = () => router.refresh()` (+ collapse), `onSkip`/`onBack` = collapse.
  Pass the `ProfileSnapshot` to each. (Per contracts/profile-surface.md section→editor map.)
- [ ] T007 [US1] Add the Testimonials section to `ProfileSections.tsx` (section 9): render the reused
  `TestimonialsEditor` fed by testimonials loaded in the page (depends on T006).
- [ ] T008 [US1] Create `src/app/[locale]/settings/profile/page.tsx` (server): auth-gate; call
  `loadProfileSnapshot`; load `onboarding_steps` config (as the wizard does) + `listTestimonials`;
  compute strength via `snapshotToCompleteness` + `profileCompleteness`; render `AppShell` +
  `ProfileStrengthPanel` + `ProfileSections`. (depends on T002, T005, T006, T007)

**Checkpoint**: page renders; each section saves independently; strength recomputes on save.

---

## Phase 4: User Story 2 — Retire the duplicate studio profile (Priority: P1)

**Goal**: one source of truth — delete the studio profile once every field (incl. testimonials) lives in US1.

**Independent Test**: `/proposals/profile` gone, no Proposals button, no command-palette entry;
`grep -r "proposals/profile" src` → 0; every studio field editable in `/settings/profile`.

**⚠️ Depends on US1** (testimonials must be re-homed in T007 before deleting the studio editor).

- [ ] T009 [US2] Delete `src/app/[locale]/proposals/profile/page.tsx`.
- [ ] T010 [US2] Delete `src/components/settings/StudioProfileForm.tsx`.
- [ ] T011 [US2] Remove the "Studio profile" `Link` (to `/proposals/profile`, ≈ lines 91–99) from
  `src/app/[locale]/proposals/page.tsx`.
- [ ] T012 [US2] Remove the `/proposals/profile` entry from `src/components/shell/CommandPalette.tsx`.
- [ ] T013 [US2] Verify no orphans: `grep -r "proposals/profile" src` returns nothing; confirm every
  studio field (name, brand, tagline, logo, bio, contact, years, total projects, notable clients,
  samples, testimonials) maps to a live editor in `/settings/profile`; `pnpm typecheck` clean.

**Checkpoint**: exactly one editor per field; no broken links.

---

## Phase 5: User Story 3 — Strength nudge + summary (Priority: P2)

**Goal**: encourage weak profiles to improve (hidden when strong); show strength on the Settings summary.

**Independent Test**: strength `< 80%` → nudge shows in Proposals; `>= 80%` → nudge gone; Settings
summary shows the strength % + a "Complete your profile →" shortcut.

- [ ] T014 [P] [US3] Create `src/components/proposals/ProfileStrengthNudge.tsx`: props = strength %;
  renders `null` when `strength >= OPTIMAL_THRESHOLD` (80); otherwise a small card with the %, an
  "the more complete, the better" line, and a link to `/settings/profile`. ar (RTL) + en, mobile-first.
- [ ] T015 [US3] In `src/app/[locale]/proposals/page.tsx` compute the strength (via `loadProfileSnapshot`
  in the server component) and mount `ProfileStrengthNudge` where the studio-profile button was
  (depends on T011, T014).
- [ ] T016 [US3] Add the strength % + a "Complete your profile →" link to `/settings/profile` in the
  Settings profile summary (`src/components/settings/SettingsClient.tsx` or `settings/page.tsx`),
  computing strength via `loadProfileSnapshot` (depends on T002).

**Checkpoint**: nudge threshold behaves; summary shows strength.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T017 [P] Confirm both-locale coverage: no missing i18n keys on `/settings/profile`, the nudge, or
  the summary (ar + en).
- [ ] T018 `pnpm typecheck` clean and `pnpm test` green (merge gate).
- [ ] T019 [P] (optional) Extend the e2e M8/onboarding pattern with a `/settings/profile` smoke: open the
  page, save a section, assert the strength label changes; and assert `/en/proposals/profile` 404s.
- [ ] T020 Commit in small atomic groups: (lib+test) / (page+components) / (studio deletion) / (nudge+summary).

---

## Dependencies & Execution Order

- **Setup (T001)**: independent.
- **Foundational (T002–T004)**: T002 blocks US1 + US3; T003 [P] after T002; T004 after T002.
- **US1 (T005–T008)**: after T002. T005/T006 [P]; T007 after T006; T008 after T005–T007.
- **US2 (T009–T013)**: after **US1** (testimonials re-homed). T009/T010 [P]; T011/T012 [P]; T013 last.
- **US3 (T014–T016)**: after T002. T014 [P]; T015 after T011+T014; T016 after T002.
- **Polish (T017–T020)**: last.

### Parallel opportunities

- T003 with T004; T005 with T006; T009/T010 with T011/T012; T014 alongside US1.

## Implementation Strategy

- **MVP** = Foundational + US1 (the profile page). Ship/validate that alone (quickstart US1).
- Then US2 (consolidate — safe only after testimonials live in US1), then US3 (nudge + summary), then polish.
- Commit after each logical group; keep onboarding behavior byte-identical through the T004 refactor.
