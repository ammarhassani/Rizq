# Implementation Plan: Profile as Source of Truth + Onboarding Re-engineering

**Branch**: `main` (commit + sync) | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/006-profile-source-of-truth/spec.md`

## Summary

Make the freelancer's profile a typed **`FreelancerProfile`** loaded once and **passed as a
parameter** into every engine; each defaults from it, AI/the brief only fills the situational.
Highest-leverage first: the proposal **specialty prior** (retires the disambiguation patch) +
**stated-rate personal anchor**. Then brand/defaults/VAT → invoices, goal/tone → HADAF/dashboard/AI.
Then re-engineer onboarding into a visual, data-enriching experience (strength meter, resumable,
prefill, live preview). Additive only — the ~70-field profile already holds the data.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16 App Router (RSC + server actions)
**Primary Dependencies**: next-intl (AR-first/RTL), Tailwind v4 + shadcn/ui, Framer Motion,
Supabase (RLS), DeepSeek via Vercel AI SDK (existing), Vitest. No new deps.
**Storage**: Supabase Postgres. **No migration expected** — `users` already has every field
(primary_specialty_id, specialties[], experience_tier_id, years_experience, current rates, brand_*,
default_*, vat_*, income_goal_monthly, preferred_tone, profile_completeness_pct, onboarding_step).
**Testing**: Vitest pure-logic units — specialty-prior resolution (incl. multi-discipline),
stated-rate→personal-anchor blend, profile-completeness scoring.
**Target Platform**: Web, mobile-first, RTL (Arabic primary).
**Project Type**: Web application (single Next.js app).
**Performance**: profile loaded once per flow (one query); live onboarding preview debounced.
**Constraints**: profile is a PRIOR, never required — empty/partial profile must degrade to today's
behavior (AI fallback + sensible defaults); per-artifact override preserved; owner-scoped RLS;
honesty (AI suggestions labeled + confirmed; prices cite provenance).
**Scale/Scope**: existing single-account; ~3 new pure libs, edits to generateProposal +
proposalPricing + invoice actions + HADAF/dashboard + AI copy, onboarding UX layer.

## Constitution Check

| Principle | Assessment |
|---|---|
| I. Honesty is the moat | AI prefill suggestions labeled + user-confirmed (never silent); live price preview cites provenance; profile-derived defaults are overridable + transparent. **PASS** |
| II. Arabic-first, RTL | All new/changed onboarding + profile UI bilingual, RTL-first. **PASS** |
| III. Mobile-first | Onboarding re-engineered mobile-first; ≤3 inputs to value; no modal interruptions. **PASS** |
| IV. Test money & rules | Pure tests for specialty resolution, stated-rate anchor blend (bounded by personal-weight cap), completeness scoring, VAT inheritance. **PASS** |
| V. Every module stands on its own | Reuses + threads the profile; adds context, not clones; onboarding gets loading/empty/resume states. **PASS** |
| VI. Halal & PDPL | Owner-scoped reads/writes (existing writable-columns/RLS pattern); no scraping (prefill = heuristic URL mapping, not page scraping); no new personal data. **PASS** |
| VII. AI as multiplier | Specialty prior reduces AI guesswork; prefill suggestions optional + labeled + degrade gracefully. **PASS** |
| Workflow gates | Additive, no destructive migration; small atomic commits; typecheck + test merge gate. **PASS** |

**Result**: No violations. Complexity Tracking not required.

## Project Structure

```text
specs/006-profile-source-of-truth/
├── plan.md · research.md · data-model.md · quickstart.md
├── contracts/profile-and-wiring.md
└── tasks.md  (/speckit-tasks)
```

```text
src/
├── lib/
│   ├── profile/
│   │   ├── freelancerProfile.ts     # NEW: typed FreelancerProfile + loadFreelancerProfile()
│   │   └── completeness.ts          # NEW: profileCompleteness(profile) → 0..100 (+test)
│   └── pricing/
│       ├── specialtyResolve.ts      # NEW: resolveSpecialty(primary, listed, aiSlug, aiConf) (+test)
│       └── proposalPricing.ts       # EDIT: stated-rate → personal anchor (+test)
├── app/
│   ├── actions/
│   │   ├── proposals/generateProposal.ts   # EDIT: specialty prior + profile params
│   │   └── invoices/*                       # EDIT: brand + payment defaults + VAT from profile
│   ├── [locale]/onboarding/page.tsx         # EDIT: strength meter + resumable shell (Track B)
│   └── [locale]/hadaf, dashboard            # EDIT: income goal/previous-year from profile
├── components/onboarding/*                  # EDIT: meter, per-step payoff, prefill, live preview
└── lib/ai/scope.ts                          # EDIT: accept specialty prior in the prompt
messages/{ar,en}.json                        # EDIT: payoff copy, prefill, preview labels
```

**Structure Decision**: Existing single Next.js app. New code = three pure libs
(`freelancerProfile`, `completeness`, `specialtyResolve`) + threaded params into existing engines +
an onboarding experience layer. No new top-level structure; no migration unless a gap surfaces.

## Phasing → user stories
- **Phase 1 (US1)**: `FreelancerProfile` loader; `resolveSpecialty` + feed prior into scope
  extraction in `generateProposal`; stated-rate personal anchor in `proposalPricing`. *(Retires
  the disambiguation patch.)*
- **Phase 2 (US2)**: brand + payment defaults + VAT → invoices; income goal/previous-year → HADAF +
  dashboard; preferred_tone → AI copy.
- **Phase 3 (US3)**: profile-strength meter + per-step payoff + resumable polish (onboarding).
- **Phase 4 (US4)**: smart URL prefill (heuristic, labeled, confirmed) + live ephemeral preview.

## Complexity Tracking
No constitution violations — section intentionally empty.
