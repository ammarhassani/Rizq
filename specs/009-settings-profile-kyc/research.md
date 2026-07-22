# Research: Profile as Single KYC Source of Truth

Phase 0 decisions. Grounded in the existing code (onboarding wizard, `completeness.ts`, studio profile).

## D1 — Reuse the onboarding Step editors non-linearly

- **Decision**: Compose the existing `Step*` editors (Identity, Location, Professional, Rates, Portfolio,
  Brand, Defaults, Goals) as independent, stacked cards in the settings page. Each already reads a
  `ProfileSnapshot`, edits locally, and saves its own columns via `saveOnboardingStep("<section>", …)`.
- **Wiring**: pass `onNext = () => router.refresh()` (persist + recompute strength; optionally collapse),
  `onSkip`/`onBack` = collapse / no-op. The editors keep their "Save" button; the wizard-only "Back/Skip"
  semantics become "collapse" in this context.
- **Rationale**: zero duplication of ~8 field editors + their validation + their save schemas. The
  editors are already self-contained controlled components.
- **Alternatives**: a bespoke grouped form (duplicates every editor) — rejected (YAGNI, drift risk).

## D2 — Strength is computed server-side; refresh on save

- **Decision**: `settings/profile/page.tsx` is a server component that loads the profile and computes
  strength via `profileCompleteness`. A section save calls `router.refresh()`, re-running the server
  component so strength + the missing list update. No client-side strength state to keep in sync.
- **Rationale**: the Step editors don't hand their patch back to a parent, so re-deriving from the DB is
  simpler and always correct. Matches the app's server-component pattern.

## D3 — "What's missing" list from the strength dimensions

- **Decision**: `completeness.ts` already defines the 10 weighted dimensions (specialty 15, experience 15,
  rate 15, brand 15, city 10, defaults 10, vat 5, bio 5, goals 5, portfolio 5). Render each *unmet*
  dimension as a row: label + "+X%". This is the backfill checklist.
- **Rationale**: reuses the exact weights users see in onboarding, so the number always reconciles.

## D4 — Optimal threshold for the nudge = 80%

- **Decision**: the Proposals nudge shows when strength `< 80` and is hidden when `>= 80` (at-or-above =
  strong). Threshold is a single named constant (tunable).
- **Rationale**: 80% ≈ all high-value dimensions filled (specialty+experience+rate+brand = 60, +city/
  defaults = 80) without demanding every nice-to-have. Honest encouragement, no nagging strong profiles.

## D5 — Extract the snapshot loader + strength mapping (DRY)

- **Decision**: move the `users` select + `ProfileSnapshot` builder + the `snapshot → CompletenessInput`
  mapping out of `onboarding/page.tsx` into `src/lib/profile/snapshot.ts`
  (`loadProfileSnapshot(supabase, userId)`, `snapshotToCompleteness(snapshot)`), and have both the
  onboarding page and the new settings page use it. Behavior-preserving refactor.
- **Rationale**: the two pages MUST compute identical strength (SC-004). One source removes drift.
- **Test**: `snapshot.test.ts` unit-tests `snapshotToCompleteness` (each dimension true iff its fields
  present) + `profileCompleteness` composition on representative snapshots.

## D6 — Testimonials become a profile section

- **Decision**: add a Testimonials section to the profile page reusing the existing `TestimonialsEditor`
  (client) fed by `listTestimonials` (loaded in the server page). It is the ONLY studio-profile concept
  not already covered by a Step editor.
- **Rationale**: the merge requirement — no field loses its editor. All other studio fields (name, brand,
  tagline, bio, logo, contact, years, total projects, notable clients, samples) are already edited by the
  reused Step editors (verified: `StepBrand` exposes brand_name/tagline/bio/contact; `StepPortfolio`
  exposes samples/notable_clients/total_projects; `StepProfessional` years; `StepIdentity` name).

## D7 — Deletion set (single source of truth)

- **Delete**: `src/app/[locale]/proposals/profile/page.tsx`, `src/components/settings/StudioProfileForm.tsx`.
- **Edit-to-remove references**: the "Studio profile" `Link` in `proposals/page.tsx` (≈ lines 91–99) and
  the `/proposals/profile` entry in `CommandPalette.tsx`.
- **Keep**: `TestimonialsEditor` (reused by the profile page), all `Step*` editors, `saveOnboardingStep`.
- **Verification (FR-008/009)**: after deletion, grep for `proposals/profile` → zero references; every
  studio field maps to a live editor in the profile page (see contracts/profile-surface.md).

## D8 — Settings summary + nudge placement

- **Decision**: the existing Settings profile summary gains the strength % + a "Complete your profile →"
  link to `/settings/profile` (keep the rest of the summary). The Proposals page mounts
  `ProfileStrengthNudge` where the studio-profile button was.
- **Rationale**: matches the approved entry-point choice (Settings tab + strength on summary).
