# Phase 1 — Contracts: profile loader + pure resolvers + wiring

App feature → the "interface" is the typed loader + pure resolvers + where they're threaded.

## 1. `src/lib/profile/freelancerProfile.ts`
```ts
type FreelancerProfile = { /* see data-model.md */ }
loadFreelancerProfile(supabase, userId): Promise<FreelancerProfile>   // owner-scoped, one query
```

## 2. `src/lib/pricing/specialtyResolve.ts` (pure, tested)
```ts
resolveSpecialty(input: {
  primarySlug: string | null;
  listedSlugs: string[];
  aiSlug: string;            // what extraction proposed
  aiConfidence?: number;
}): string                    // the slug to price with
```
Rules (D2): no primary → aiSlug · aiSlug ∈ listedSlugs → aiSlug · else → primarySlug.

## 3. `src/lib/pricing/proposalPricing.ts` (edit, tested)
`computeProposalPrice(market, mods, pastAnchors, statedAnchor?)` — when `statedAnchor` is a
positive number it's appended to `pastAnchors` before median + personalWeight. Behavior unchanged
when null. (Bounded by the existing 0.5 personal-weight cap.)

## 4. `src/lib/profile/completeness.ts` (pure, tested)
```ts
profileCompleteness(p: Partial<FreelancerProfile>): number   // 0..100, weighted
```

## 5. `src/lib/profile/prefill.ts` (pure, tested) — Phase 4
```ts
prefillFromUrl(url: string): { platform: string; field: string; specialtyHint?: string } | null
```
Heuristic only (platform + handle); no page fetch/scrape.

## 6. Scope extraction (edit)
`buildScopePrompt(brief, ctx, prior?)` — `prior = { primarySlug, listedSlugs }` injected so the
model anchors to the freelancer's discipline; `resolveSpecialty` makes the final call after.

## 7. Wiring points (thread the profile)
- `generateProposal`: load profile → pass specialty prior + tier + city + statedAnchor.
- invoice create/actions: brand + payment defaults + VAT from profile (override per invoice).
- HADAF/dashboard: income goal + previous-year + primary goal.
- AI copy actions: pass `tone`.
- onboarding page/components: completeness meter, per-step payoff, resume, prefill, live preview.

## Honesty
Profile defaults are overridable + visible; AI prefill suggestions labeled + confirmed before
write; the live preview price carries the same provenance/citation as any Rizq price.
