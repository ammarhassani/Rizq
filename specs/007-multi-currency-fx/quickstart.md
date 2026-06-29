# Quickstart — validating Multi-Currency + FX

Prereqs (P2+): dev server running + DB reachable + the additive migration applied. P1 is verifiable
by tests alone.

## P1 — conversion core (tests only, no DB)
1. `pnpm test src/lib/currency` → conversion (SAR identity, USD peg = 3.75, round-trip), no-rate →
   null, citation formatting all green.

## P2 — onboarding currency + correct anchor *(needs migration + dev)*
2. Onboarding → Rates → pick USD → all rate labels switch to USD live; save → `rate_currency`='USD'.
3. As that freelancer, generate a proposal with stated rate 2,000 USD → personal anchor reflects
   ~7,500 SAR (converted), not 2,000. SAR-only freelancer → identical to today.
4. Feed unavailable → anchor is skipped, SAR band still shown; no invented number.

## P3 — invoice currency *(needs migration + dev)*
5. Create an invoice as a USD freelancer → totals + artifact render in USD; VAT suppressed (non-SAR);
   currency + FX basis stored. A SAR invoice is unchanged (15% VAT when registered).

## P4 — converted-figure display *(needs migration + dev)*
6. Proposal → SAR band authoritative + a secondary "≈ X USD (1 USD = 3.75 SAR · SAMA peg · date)".
7. Dashboard → personal income/goal may show in USD; HADAF threshold stays SAR.

## Gate
- `pnpm typecheck` clean; `pnpm test` green (currency units).
- Live (when env back): USD anchor correctness; USD invoice; SAR-only regression-free; feed-down
  degrade.
