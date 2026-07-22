# Quickstart: Validating the Settings Profile

## Prerequisites

- App running (`pnpm dev`), signed in as a user with a **partial** profile (some onboarding fields empty).

## Validate — the profile page (US1)

1. Go to **Settings → Profile** (`/settings/profile`).
2. Confirm a **strength %** bar and a **"what's missing (+X%)"** list, over editable sections
   (Identity, Location, Professional, Rates, Portfolio, Brand, Defaults, Goals, Testimonials).
3. Fill an empty field (e.g. City) and save that section. Confirm: value persists **and** the strength %
   rises by that dimension's weight, without a manual full reload.
4. Change an already-filled field and save; confirm the new value sticks.
5. With a fully complete profile, confirm strength = 100%, empty missing list, all fields still editable.

## Validate — single source of truth (US2)

6. Confirm the old studio profile is gone: `/proposals/profile` no longer exists, no "Studio profile"
   button in Proposals, no command-palette entry. `grep -r "proposals/profile" src` → 0 matches.
7. In Settings → Profile, confirm **Testimonials** can be viewed/added/edited/removed (the studio-only
   concept, now here).
8. Confirm every studio field (name, brand, tagline, logo, bio, contact, years, total projects, notable
   clients, samples, testimonials) has an editor in the profile page.

## Validate — nudge + summary (US3)

9. With strength `< 80%`, open Proposals: a small nudge shows the strength + an "improve" message + a
   link to Settings → Profile.
10. Raise strength to `>= 80%` (fill sections), reopen Proposals: the nudge is **gone**.
11. Open the Settings summary: it shows the strength % + a "Complete your profile →" shortcut.

## Automated checks

- `pnpm test` — includes `src/lib/profile/snapshot.test.ts` (snapshot→completeness mapping).
- `pnpm typecheck` — clean.
- (Optional) e2e: extend the M8/onboarding smoke to open `/settings/profile`, save a section, assert the
  strength label changes.
