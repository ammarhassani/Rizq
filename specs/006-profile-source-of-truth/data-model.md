# Phase 1 — Data Model

**No migration.** Reuses the existing `users` profile (~70 cols). Entities below are a typed
*view* + pure derivations, not new tables.

## FreelancerProfile (typed view of `users`, loaded once)
```
FreelancerProfile {
  userId: string
  // professional
  primarySpecialtySlug: string | null      // from primary_specialty_id → slug
  listedSpecialtySlugs: string[]            // from specialties[] (+ primary)
  experienceTierSlug: string | null         // experience_tier_id → slug, else derived from years (feature 005)
  yearsExperience: number | null
  citySlug: string | null
  // money
  projectRateRange: { min: number; max: number } | null   // current_project_rate_range
  hourlyRate: number | null; dailyRate: number | null      // informational v1
  incomeGoalMonthly: number | null; previousYearIncome: number | null
  // brand + defaults (reuse loadUserBrandDefaults)
  brand: { name; nameAr; logoUrl; colors; taglineAr; taglineEn; bioAr; bioEn; contact }
  defaults: { depositPct; revisions; ipTerms; paymentMethod; paymentDetails; warrantyDays; tone }
  vat: { registered: boolean; number: string | null; verified: boolean }  // vat_*, fl_verified
  // goals + meta
  primaryGoal: string | null; goals: string[]
  completeness: number  // 0..100
}
```
Owner-scoped read. Every field nullable ⇒ each engine must tolerate absence (profile is a prior).

## Pure derivations (tested)
- `resolveSpecialty({primarySlug, listedSlugs, aiSlug, aiConfidence}) → slug` — D2 rule.
- `statedAnchor(projectRateRange) → number | null` — midpoint, appended to pastAnchors (D3).
- `profileCompleteness(profile) → 0..100` — weighted field coverage (D4).
- `prefillFromUrl(url) → { platformField, specialtyHint? } | null` — heuristic URL parse (D5).

## Wiring (where the profile becomes a parameter)
| Engine | Profile inputs | Effect |
|---|---|---|
| `generateProposal` / scope extraction | primary + listed specialties, tier, years, city, project-rate range | specialty prior + tier + city defaults; stated anchor |
| `computeProposalPrice` | `statedAnchor` | added personal anchor point (bounded by personalWeight) |
| invoice create/actions | brand, payment defaults, vat | branded invoice, default terms, correct VAT, verified badge |
| HADAF / dashboard | incomeGoalMonthly, previousYearIncome, primaryGoal | targets/projections |
| AI copy (insights, reminders, prose) | tone | tone-honoring output |
| onboarding | completeness, onboarding_step | strength meter, resume |

## Validation / integrity
- Empty/partial profile → engines fall back (AI extraction, sensible defaults) — no regression.
- Stated anchor bounded by the existing personal-weight cap (one number can't distort the band).
- Existing proposals/invoices keep captured values (no retroactive rewrite).
- VAT applied only when `vat_registered`; verified badge only when `fl_verified`.
