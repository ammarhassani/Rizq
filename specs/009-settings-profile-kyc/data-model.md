# Data Model: Profile as Single KYC Source of Truth

**No schema change.** Every field shown already exists. This documents the mapping the UI composes.

## Freelancer Profile (existing `users` columns)

Grouped by the section editor that owns it (all reused from onboarding):

| Section (editor) | Fields (existing columns) |
|---|---|
| Identity (`StepIdentity`) | `full_name_ar`, `full_name_en`, `fl_number`, `commercial_reg` |
| Location (`StepLocation`) | `city_id` |
| Professional (`StepProfessional`) | `primary_specialty_id`, `experience_tier_id`, `years_experience` |
| Rates (`StepRates`) | project-rate range / hourly / daily rate fields |
| Portfolio (`StepPortfolio`) | `portfolio_samples`, `notable_clients`, `total_projects_completed` |
| Brand (`StepBrand`) | `brand_name`, `brand_name_ar`, `tagline_ar/en`, `logo_url`, `bio_ar/en`, `contact_phone`, `contact_whatsapp`, `contact_email`, `contact_city` |
| Defaults (`StepDefaults`) | payment method / deposit split / VAT-registered defaults |
| Goals (`StepGoals`) | `income_goal_monthly_sar`, goal/tone prefs |
| Testimonials (`TestimonialsEditor`) | rows in the existing `testimonials` table |

Studio-profile fields ⊆ the above (all covered), so its removal loses no editor. Testimonials is the
only studio-only concept → surfaced as the Testimonials section.

## Profile Strength (existing model — `lib/profile/completeness.ts`)

10 weighted dimensions → 0..100. Each drives a "what's missing (+X%)" row when unmet:

| Dimension | Weight | Met when |
|---|---|---|
| specialty | 15 | primary specialty set |
| experience | 15 | experience tier OR years set |
| rate | 15 | any of project-range / hourly / daily set |
| brand | 15 | brand name (ideally + logo) set |
| city | 10 | city set |
| defaults | 10 | payment/deposit defaults set |
| vat | 5 | VAT registration answered |
| bio | 5 | bio set |
| goals | 5 | income goal set |
| portfolio | 5 | platforms/samples set |

`snapshotToCompleteness(snapshot)` maps the snapshot → these booleans; `profileCompleteness(input)` sums
weights. **Nudge visible when total `< 80`, hidden when `>= 80`.**

## Testimonial (existing `testimonials` table)

Per-user client social proof (quote, author, role/company). Managed via `TestimonialsEditor` +
`listTestimonials`. Unchanged; only re-homed into the profile page.

## Key relationships / invariants

- Strength shown on onboarding, Settings summary, Settings → Profile, and the nudge are the SAME value
  (all via `loadProfileSnapshot` + `snapshotToCompleteness` + `profileCompleteness`) — SC-004.
- Each field has exactly one editor after this feature (FR-009): the Step editor that owns it (or the
  Testimonials editor). The studio profile's duplicate editor is removed.
