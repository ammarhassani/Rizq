# Tasks: Profile as Source of Truth + Onboarding Re-engineering

**Feature**: `specs/006-profile-source-of-truth/` · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

No migration. Reuse-first (add params, don't clone). Profile is a PRIOR — empty profile must not
regress. Merge gate per phase: `pnpm typecheck` clean + `pnpm test` green; verify live (AR+EN).

## Phase 1: Foundational — the profile loader

- [x] T001 Create `src/lib/profile/freelancerProfile.ts`: typed `FreelancerProfile` + `loadFreelancerProfile(supabase, userId)` (owner-scoped, one query; reuse `loadUserBrandDefaults` for brand; map specialty/tier ids → slugs; tolerate nulls).
- [x] T002 [P] Create `src/lib/profile/completeness.ts`: `profileCompleteness(profile) → 0..100` (weighted) + `src/lib/profile/completeness.test.ts`.

## Phase 2: User Story 1 — proposal knows my discipline (P1) 🎯 retires disambiguation

- [x] T003 [P] [US1] Create `src/lib/pricing/specialtyResolve.ts`: `resolveSpecialty({primarySlug, listedSlugs, aiSlug, aiConfidence})` (D2 rule) + `specialtyResolve.test.ts` (no-profile→ai; ai∈listed→ai; else→primary).
- [x] T004 [P] [US1] Edit `src/lib/pricing/proposalPricing.ts`: add optional `statedAnchor` appended to pastAnchors before median/personalWeight; extend `proposalPricing.test.ts` (stated raises anchor; null = unchanged; bounded).
- [x] T005 [US1] Edit `src/lib/ai/scope.ts` `buildScopePrompt` to accept an optional specialty prior (`{primarySlug, listedSlugs}`) and inject "this freelancer's discipline is X — anchor to it unless the brief is clearly a different service".
- [x] T006 [US1] Edit `src/app/actions/proposals/generateProposal.ts`: load `FreelancerProfile`; pass the prior to extraction; apply `resolveSpecialty` to the final specialty; default city/tier from profile (tier already via years — keep); pass `statedAnchor` (project-rate midpoint) to `computeProposalPrice`. Empty profile → unchanged AI path.
- [ ] T007 [US1] Verify live: profiled graphic-designer's "brand identity" brief → graphic-design (no keyword disambiguation); multi-discipline web brief → web-dev; empty profile → AI fallback; higher stated rate → higher anchor. Gate green. *(logic gate ✓ via typecheck + 718 tests + a11y; live UI walkthrough pending a browser session)*

## Phase 3: User Story 2 — brand/terms/VAT flow everywhere (P2)

- [x] T008 [US2] Invoices inherit profile brand + payment defaults + VAT: edit invoice create/actions (`createInvoiceFromGig`/`createInvoiceFromProposal`/`InvoiceForm` defaults) to default from `FreelancerProfile` (brand, deposit/payment/warranty, vat_registered → VAT math, fl_verified → badge); overridable per invoice.
- [x] T009 [P] [US2] HADAF + dashboard consume `income_goal_monthly` + `previous_year_income` + `primary_goal` from the profile for targets/projections.
- [x] T010 [P] [US2] Thread `preferred_tone` into AI copy actions (insights, payment reminder, proposal prose) so output honors it.
- [ ] T011 [US2] Verify live: profiled invoice carries brand + terms + correct VAT (+ badge); HADAF/dashboard use the goal; AI copy honors tone. Gate green. *(logic gate ✓ via typecheck + 718 tests + a11y; live UI walkthrough pending a browser session)*

## Phase 4: User Story 3 — onboarding shows progress + payoff (P3)

- [x] T012 [US3] Add a live profile-strength meter to onboarding (`OnboardingWizard`) driven by `profileCompleteness`; persist `profile_completeness_pct` on save.
- [x] T013 [P] [US3] Add a per-step payoff line ("unlocks accurate pricing / branded proposals") to each step; bilingual i18n.
- [x] T014 [US3] Confirm resumable (next incomplete step via `onboarding_step`) + skippable; RTL + mobile polish (Framer-Motion transitions, shimmer).
- [ ] T015 [US3] Verify live: meter rises per step; payoff shown; resume works; AR + mobile correct. Gate green. *(logic gate ✓ via typecheck + 718 tests + a11y; live UI walkthrough pending a browser session)*

## Phase 5: User Story 4 — prefill + live preview (P4)

- [x] T016 [P] [US4] Create `src/lib/profile/prefill.ts`: `prefillFromUrl(url)` heuristic (platform + handle → field + specialty hint; no scraping) + `prefill.test.ts`.
- [x] T017 [US4] Wire a "paste your profile URL" prefill into the relevant onboarding step: labeled suggestions, written only on confirm.
- [x] T018 [US4] Live ephemeral previews (persists nothing): **brand** preview in StepBrand + **price** preview in StepRates via `previewPrice` action (real resolver + provenance citation — `src/app/actions/pricing/previewPrice.ts` + `OnboardingPricePreview.tsx`). Honest: the shown band comes from the engine and cites its provenance.
- [~] T019 [US4] Verify live: prefill + brand preview. Logic unit-tested; routes render (307 auth-guard, no crash). Interactive UI walkthrough pending a browser session (no Playwright MCP in this tool session).

## Phase 6: Polish

- [x] T020 [P] Standalone/empty-profile regression sweep — every touched engine works with a blank profile (AI fallback + defaults), no regression.
- [x] T021 [P] `node scripts/a11y-audit.mjs` on onboarding + touched surfaces; fix any names/labels.
- [x] T022 Update `docs/profile-source-of-truth.md` status (wired); final `pnpm typecheck` clean + `pnpm test` 718 green.

## Dependencies & order
- Phase 1 (T001–T002) → everything.
- **US1 (T003–T007)** = MVP; depends on the loader. Ship first (retires disambiguation).
- US2 (T008–T011) depends on the loader; independent of US1.
- US3 (T012–T015) + US4 (T016–T019) are the onboarding track; US4 depends on US3.
- Polish last.

## Parallel examples
- T002 ∥ T003 ∥ T004 (pure libs/tests). US2: T009 ∥ T010. US4: T016 alongside US3 polish.

## MVP
**Phase 1 + US1.** Profiled proposals default to the freelancer's specialty/tier/rate — the
disambiguation patch becomes the fallback, not the path. Independently shippable + verifiable.
