# Phase 0 — Research & Decisions

No open `NEEDS CLARIFICATION` — decisions locked by the brief or resolvable from code.

## D1 — `FreelancerProfile` loader
**Decision**: One typed `FreelancerProfile` + `loadFreelancerProfile(supabase, userId)` in
`src/lib/profile/freelancerProfile.ts`, returning the fields engines need (primary/secondary
specialty slugs, tier slug, years, city, stated project-rate range, brand, payment defaults, VAT,
tone, income goal, completeness). Reuses `loadUserBrandDefaults` for the brand block; one query.
**Rationale**: single source passed as a parameter; engines stop re-loading/guessing.

## D2 — Specialty prior resolution (the disambiguation killer)
**Decision**: pure `resolveSpecialty({ primarySlug, listedSlugs, aiSlug, aiConfidence })`:
- no profile specialty → use `aiSlug` (today's behavior, AI fallback);
- `aiSlug` ∈ `listedSlugs` (the freelancer does that discipline) → use `aiSlug` (multi-discipline);
- else → use `primarySlug` (anchor to who they are; ignore an off-discipline guess).
Also feed `primarySlug` + `listedSlugs` into the scope-extraction prompt as a prior so the model
anchors. **Rationale**: a graphic designer's brand brief stops mis-classifying as logo-design;
multi-discipline still works; empty profile unaffected.
**Alternatives rejected**: always trust AI (today's bug); always force primary (breaks
multi-discipline + different-service briefs).

## D3 — Stated-rate personal anchor
**Decision**: use the freelancer's `current_project_rate_range` **midpoint** as an extra personal
anchor point appended to `pastAnchors` before the existing median + `personalWeight` blend in
`computeProposalPrice`. Hourly/daily rates are NOT project prices, so they don't seed the project
anchor directly (a later option: hourly × typical hours). Bounded by the existing personal-weight
cap (0.5) — one stated number can't distort the band.
**Rationale**: reuses the proven personal-anchor machinery; reflects the freelancer from proposal #1.

## D4 — Profile completeness
**Decision**: pure `profileCompleteness(profile)` → 0..100, weighting value-driving fields highest
(specialty, experience, city, rates, brand) over nice-to-haves (platforms, portfolio, goals);
tunable weights. Surfaced via the existing `profile_completeness_pct` column.

## D5 — Smart prefill (v1)
**Decision**: heuristic URL mapping only — parse the platform + handle from a pasted Bahr/Mostaql/
Khamsat/LinkedIn/Behance/site URL → suggest the matching platform field + (where inferable) a
specialty hint; **no page scraping** (no-scraping rule + cost + honesty). Suggestions are labeled
and written only on confirm. AI enrichment of pasted *text the user provides* is a later option.

## D6 — Live onboarding preview
**Decision**: ephemeral — computes a mini proposal/price preview from the in-progress profile;
persists nothing; cites provenance like any Rizq price.

## D7 — No migration
**Decision**: schema already has every field (verified). Additive-only; add a column only if a
genuine gap surfaces in planning (none found).
