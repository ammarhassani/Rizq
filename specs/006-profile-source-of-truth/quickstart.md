# Quickstart — validating Profile as Source of Truth

Prereqs: dev server running; a profiled freelancer (set primary specialty, years, project-rate
range, brand, VAT) + a freelancer with an empty profile. Verify AR (RTL) + EN, desktop + mobile.

## Phase 1 — specialty prior + stated-rate anchor (US1) — *retires disambiguation*
1. Profiled as graphic-design · 7 years → generate a generic "brand identity" brief →
   **specialty = graphic-design, tier = senior** WITHOUT keyword disambiguation.
2. Multi-discipline (graphic-design + web-dev) → a clearly web brief → **web-dev**.
3. Empty profile → same brief → falls back to AI extraction (today's behavior). No regression.
4. Two identical freelancers, one with a higher stated project-rate range → the higher one gets a
   higher personal anchor.
5. `pnpm test`: `specialtyResolve`, `proposalPricing` (statedAnchor), green.

## Phase 2 — brand/defaults/VAT/HADAF/tone (US2)
6. Profiled freelancer creates an invoice → carries brand + default deposit/payment + correct VAT
   (verified badge when fl_verified); none re-entered.
7. HADAF/dashboard reflect the profile income goal; AI copy uses the profile tone.

## Phase 3 — onboarding meter + resume (US3)
8. Walk onboarding → strength meter rises per saved step; each step shows its payoff; leave +
   return → resumes at next incomplete step with answers intact. RTL + mobile correct.

## Phase 4 — prefill + live preview (US4)
9. Paste a Behance/LinkedIn URL → labeled suggestion(s) appear; written only on confirm.
10. Set brand + specialty + tier → a live mini proposal/price preview updates; nothing persisted.

## Gate
- `pnpm typecheck` clean; `pnpm test` green (new pure-logic units).
- Live: Phase-1 profiled vs empty proposal behavior; invoice VAT/brand; onboarding meter/resume.
- `node scripts/a11y-audit.mjs` clean on touched surfaces.
