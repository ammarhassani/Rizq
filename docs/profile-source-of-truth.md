# Profile as the single source of truth (2026-06-28)

> **STATUS: WIRED (spec 006).** The headline gaps below are now closed —
> proposals default the specialty from the profile (prior + `resolveSpecialty`,
> retiring the disambiguation patch), pricing seeds a personal anchor from the
> freelancer's stated rate, invoices inherit VAT (KSA 15% when registered) +
> payment terms, the dashboard shows progress to the personal income goal, and
> onboarding gained a profile-strength meter + per-step payoff + URL prefill +
> a live brand preview **and a live price preview** (StepRates → real resolver +
> provenance, ephemeral). All four phases are wired. See `specs/006-*`.

## The principle (stop the loop)
A freelancer **is** "a senior graphic designer in Riyadh who charges ~X, transfers IP, takes
50% deposit, and writes in this tone." That truth should be **captured once at onboarding** and
**passed as a parameter** to every module — functional (pricing, proposals, HADAF, invoices) and
cosmetic (brand on the artifact). Engines **default from the profile**; AI/extraction only fills
what is genuinely *brief-specific*. We keep patching downstream (specialty disambiguation,
years→tier derivation) because the profile data isn't being threaded through. Thread it, and the
downstream guesswork disappears.

## The proof
- `primary_specialty_id` is captured at onboarding **and consumed by dashboard + rate-calculator
  — but NOT by the proposal/pricing engine**, which AI-extracts the specialty every time. The
  mis-classification we just fixed (logo vs graphic) only existed because we re-derived a known fact.
- The `users` table already has the fields (≈70 cols). The model is ready; the **flow** is partial.

## Profile → component contract (captured vs consumed → gap)

| Profile data | Captured (onboarding) | Consumed today | Gap → wire it |
|---|---|---|---|
| `primary_specialty_id`, `specialties[]` | StepProfessional | dashboard, rate-calc | **Proposal engine ignores it** → feed as the specialty prior/default (AI overrides only if the brief is clearly a different service) |
| `experience_tier_id`, `years_experience` | StepProfessional | pricing (now ✓ via years→tier) | confirm everywhere; surface in profile |
| `city_id` | StepLocation | pricing, proposals | ✓ (keep) |
| `current_hourly/daily_rate`, `project_rate_range`, `rate_confidence` | StepRates | rate-calc | **Pricing ignores the freelancer's own rate** → blend as a personal-anchor signal (we already have `personalWeight`; seed it from stated rate, not just past anchors) |
| `previous_year_income`, `income_goal_monthly` | StepRates/Goals | HADAF (partial) | feed HADAF targets + dashboard projections directly |
| brand: `brand_name(_ar)`, `logo_url`, `brand_colors`, `tagline_*`, `bio_*`, `contact_*` | StepBrand/Identity | proposal artifact ✓ | extend to **invoices** + share pages (cosmetic wow everywhere) |
| defaults: `deposit_pct`, `revisions`, `ip_terms`, `milestone_structure`, `payment_method/details`, `warranty_days` | StepDefaults | proposals ✓ | extend to invoices + the project money-setup |
| `preferred_tone` | StepDefaults | proposal prose ✓ | confirm across AI copy (insights, reminders) |
| platforms, `platform_ratings`, `portfolio_samples`, `notable_clients`, `total_projects_completed` | StepPlatforms/Portfolio | proposal artifact (some) | feed credibility into proposal + a public profile; ratings → trust signal |
| identity: `fl_number`, `commercial_reg`, `vat_*`, `fl_verified` | StepIdentity | invoices (VAT) partial | wire VAT into invoice math + verified badge |
| `primary_goal`, `goals` | StepGoals | dashboard (some) | drive the dashboard's "what to do next" + HADAF framing |

**Headline gaps:** (1) proposals ignore the freelancer's own specialty; (2) pricing ignores the
freelancer's own stated rate; (3) brand/defaults/VAT not fully carried into invoices.

## Re-engineering — two tracks

### Track A — Universal wiring (the root fix)
Make the profile a typed `FreelancerProfile` object loaded once and **passed as a parameter** into
every engine. Each module defaults from it; AI/brief only overrides the genuinely situational.
First and highest-leverage: **proposal specialty defaults to `primary_specialty_id`** (feed it +
`specialties[]` as a strong prior to scope extraction) → kills the disambiguation dependency.
Then: stated-rate → personal pricing anchor; brand/defaults/VAT → invoices.

### Track B — Onboarding UX re-engineering (the "wow")
Today's 12 steps are functional but flat. Re-engineer to be **visual, progressive, and data-
enriching** so the freelancer *wants* to complete it and the profile ends up rich:
- A live **profile-strength meter** (`profile_completeness_pct` exists) that visibly fills as they
  go — and a "this unlocks accurate pricing / branded proposals" payoff per step.
- **Smart prefilling**: paste a Bahr/LinkedIn/Behance URL → suggest specialty, years, samples.
- **Live preview of the payoff**: as they set brand + specialty, show a *mini proposal/price
  preview* updating in real time — so they feel the data feeding the app.
- Arabic-first, RTL, mobile-first, Framer-Motion transitions, shimmer skeletons (brand principles).
- Resumable (the `onboarding_step` cursor already exists); skippable but nudged.

## The payoff
Onboarding becomes the **spine**: one delightful capture → every component personalized, no
re-guessing. The pricing engine's three inputs (specialty × experience × scope) all come from the
freelancer's own truth; brand makes every artifact theirs; defaults make every money flow theirs.
The loop ends.

## Recommendation
This is a foundational, multi-surface feature → **Spec Kit** (`/speckit.specify` → plan → tasks →
implement). Track A (wiring) can ship incrementally and independently of Track B (UX). Suggested
first slice: wire `primary_specialty_id` as the proposal specialty prior — small, proves the
principle, and retires the disambiguation patch.
