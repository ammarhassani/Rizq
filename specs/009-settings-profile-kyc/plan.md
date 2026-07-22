# Implementation Plan: Profile as Single KYC Source of Truth (Settings)

**Branch**: `009-settings-profile-kyc` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-settings-profile-kyc/spec.md`

## Summary

Add **Settings → Profile** as the one authoritative place to view, complete, and backfill the whole
freelancer profile, with a strength meter + "what's missing" list, by reusing the existing onboarding
section editors and their per-section save action. Retire the duplicate **studio profile** (page, form,
Proposals button, command-palette entry) after confirming every field it edited still has an editor —
adding a **Testimonials** section (the only studio-only concept) to the Settings profile. Replace the
Proposals studio-profile button with a small **strength nudge** that hides at/above an optimal threshold
(80%). Extract the profile-snapshot loader + strength mapping into a shared lib so onboarding and this
page compute strength identically. No new fields, no new DB columns, no migration.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16 App Router (React 19 server + client components).

**Primary Dependencies**: existing only — onboarding `Step*` editors, `saveOnboardingStep`,
`lib/profile/completeness.ts` (`profileCompleteness`), `TestimonialsEditor` + `listTestimonials`,
`AppShell`, `next-intl`. No new packages.

**Storage**: existing Supabase `users` columns (identity/brand/tagline/bio/contact/rates/portfolio/
defaults/goals) + existing `testimonials` table. **No schema change.**

**Testing**: Vitest for the pure `snapshot → completeness` mapping (new `lib/profile/snapshot.ts`);
typecheck for the UI; the e2e harness's M8/onboarding pattern extended with a settings-profile smoke.

**Target Platform**: Web, Arabic-first RTL + English, mobile-first.

**Project Type**: Web application (existing Next.js monolith).

**Performance/Constraints**: server component computes strength from the DB profile; a section save →
`router.refresh()` recomputes strength server-side (no client strength-state duplication). Honesty layer
untouched (no numbers/claims added).

**Scale/Scope**: 1 new page, ~3 new components, 1 new shared lib (+test), ~3 edits, ~2 deletions.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Honesty is the moat | No new numbers/claims; strength % is a factual completeness score. | ✅ Neutral |
| II. Arabic-first / RTL | New page, missing-list, nudge all ship ar (RTL) + en. | ✅ Compliant |
| III. Mobile-first | Stacked editable cards + nudge designed mobile-first. | ✅ Compliant |
| IV. Test money & rules | No money/quota/eligibility logic; the pure strength mapping gets a unit test. | ✅ Compliant |
| V. Module stands alone | Reuses existing editors/actions; loading/empty/error come from the reused editors; testimonials section closes the last gap. | ✅ Compliant |
| VI. Halal/Saudi-compliant | No scraping; PDPL-neutral (user editing own data). | ✅ Neutral |
| VII. AI as multiplier | Reuses existing brand-kit AI in StepBrand unchanged; no new AI. | ✅ Neutral |

**No new dependency, no stack change, no migration. No violations.**

## Project Structure

### Documentation (this feature)

```text
specs/009-settings-profile-kyc/
├── plan.md            # this file
├── research.md        # Phase 0 — reuse decisions, threshold, deletion set
├── data-model.md      # Phase 1 — profile fields ↔ sections ↔ strength dims (no new columns)
├── quickstart.md      # Phase 1 — how to validate
├── contracts/
│   └── profile-surface.md   # Phase 1 — section→fields→save map + strength-dim→field map + nudge rule
└── tasks.md           # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
NEW
  src/lib/profile/snapshot.ts            # loadProfileSnapshot(supabase,userId) + snapshotToCompleteness(snapshot)
  src/lib/profile/snapshot.test.ts       # unit test for the mapping
  src/app/[locale]/settings/profile/page.tsx        # server: load snapshot, strength, render sections
  src/components/settings/ProfileSections.tsx        # client: stacks Step* editors + Testimonials as cards
  src/components/settings/ProfileStrengthPanel.tsx   # strength bar + "what's missing (+X%)" list
  src/components/proposals/ProfileStrengthNudge.tsx  # small nudge; hidden when strength ≥ threshold

EDIT
  src/app/[locale]/onboarding/page.tsx    # use shared loadProfileSnapshot (behavior unchanged)
  src/components/settings/SettingsClient.tsx (or settings/page.tsx)  # strength % + "Complete your profile →" CTA
  src/app/[locale]/proposals/page.tsx      # remove studio-profile Link (lines ~91-99); mount ProfileStrengthNudge
  src/components/shell/CommandPalette.tsx  # remove the /proposals/profile entry

DELETE
  src/app/[locale]/proposals/profile/page.tsx
  src/components/settings/StudioProfileForm.tsx

KEEP (reused)
  src/components/settings/TestimonialsEditor.tsx + listTestimonials  # now surfaced in the profile page
  src/components/onboarding/Step*.tsx  # reused as section editors (StepBrand already exposes tagline/bio/contact)
```

**Structure Decision**: A new `settings/profile` route composes the existing section editors non-linearly
(each saves itself; the page refreshes to recompute strength). The snapshot/strength logic moves to a
shared lib so onboarding and settings never diverge. The studio profile is deleted once testimonials —
its only unique field — is re-homed into the profile page.

## Complexity Tracking

No constitution violations. Table intentionally empty.
