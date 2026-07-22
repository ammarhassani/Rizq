# Contract: Profile Surface

The binding map the implementation must satisfy. `tasks.md` derives from this.

## Sections → editor → save (US1, FR-002/003)

Each section renders an existing editor and saves independently via that editor's existing call.

| # | Section | Editor (reuse) | Save call | Strength dims touched |
|---|---|---|---|---|
| 1 | Identity | `StepIdentity` | `saveOnboardingStep("identity", …)` | — (name is presence, not weighted) |
| 2 | Location | `StepLocation` | `saveOnboardingStep("location", …)` | city |
| 3 | Professional | `StepProfessional` | `saveOnboardingStep("professional", …)` | specialty, experience |
| 4 | Rates | `StepRates` | `saveOnboardingStep("rates", …)` | rate |
| 5 | Portfolio | `StepPortfolio` | `saveOnboardingStep("portfolio", …)` | portfolio |
| 6 | Brand | `StepBrand` | `saveOnboardingStep("brand", …)` | brand, bio |
| 7 | Defaults | `StepDefaults` | `saveOnboardingStep("defaults", …)` | defaults, vat |
| 8 | Goals | `StepGoals` | `saveOnboardingStep("goals", …)` | goals |
| 9 | Testimonials | `TestimonialsEditor` | its existing add/edit/remove actions | — |

Contract: after any section save, the page calls `router.refresh()` and the strength % + missing list
re-render from the DB (FR-005). A section's validation error is shown by that section only (edge case).

## Strength panel (US1, FR-001)

- Input: `snapshotToCompleteness(snapshot)` → `profileCompleteness(input)` = 0..100.
- Renders: a bar with the %, and one row per UNMET dimension: `"<label> +<weight>%"` (from data-model).

## Nudge (US3, FR-010/011)

- `ProfileStrengthNudge` receives the strength %.
- Visible iff `strength < OPTIMAL_THRESHOLD` (`OPTIMAL_THRESHOLD = 80`). At/above → renders `null`.
- Content: strength %, an "the more complete, the better" line, a link to `/settings/profile`.

## Settings summary (US3, FR-012)

- The existing profile summary shows the strength % + a `"Complete your profile →"` link to
  `/settings/profile`. Existing summary content is retained.

## Deletion / single-source invariants (US2, FR-007/008/009)

- Removed: `proposals/profile` page, `StudioProfileForm`, the Proposals "Studio profile" link, the
  CommandPalette `/proposals/profile` entry.
- Post-condition: `grep -r "proposals/profile" src` → **0 matches**.
- Post-condition: every field previously editable only in the studio profile is editable in a section
  above (testimonials → section 9; all scalars → sections 1/3/5/6).

## i18n / RTL (FR-013)

Every new string ships `ar` (RTL, primary) + `en`; page, panel, missing rows, and nudge are mobile-first.
