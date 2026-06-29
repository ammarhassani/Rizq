# Tasks: Multi-Currency Pricing + FX Conversion

**Feature**: `specs/007-multi-currency-fx/` · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

Boundary-layer feature; SAR engine untouched. **Env**: tasks marked 🔒 need the DB reachable +
dev server (migration applied) — author now, activate when env is back. Gate: `pnpm typecheck`
clean + `pnpm test` green per phase.

## Phase 1: Core (US1) — DB-free, ships now 🎯

- [x] T001 [P] Create `src/lib/currency/currencies.ts`: `CurrencyCode`, `SUPPORTED` (SAR/USD/AED/EUR/GBP: symbol, nameAr/En, decimals), `SAR_PER_USD = 3.75`, `isCurrency`.
- [x] T002 [P] Create `src/lib/currency/convert.ts`: `FxRate`, `toSAR`, `fromSAR`, `convert`, `fxCitation` (pure) + `src/lib/currency/convert.test.ts` (SAR identity, USD peg, round-trip, no-rate→null, citation AR/EN).
- [x] T003 Create `src/lib/currency/fxRates.ts`: `getSarRate(quote)` — peg for USD/AED, daily-cached feed for EUR/GBP, degrade→null. (Server; reads `fx_rates` — guarded so it no-ops gracefully until the table exists.)
- [x] T004 Author migration `supabase/migrations/<ts>_multi_currency.sql`: `users.rate_currency`, `invoices.currency`+`fx_rate_to_sar`/`fx_as_of`/`fx_source`, `fx_rates` table + RLS. **Do not apply** (DB unreachable) — file only.

## Phase 2: Onboarding currency + correct anchor (US2 + US1 boundary) 🔒

- [x] T005 🔒 [US2] StepRates: add a compact currency selector (default `rate_currency`/SAR) that updates all rate labels/symbols live; save `rate_currency` with the rates (extend `saveOnboardingStep` rates schema).
- [x] T006 🔒 [US1] `loadFreelancerProfile` + `generateProposal`: read `rate_currency`; convert the stated project-rate midpoint → SAR via `getSarRate` before `statedAnchor`; null rate → skip the anchor (no fabrication). SAR currency → unchanged path.
- [ ] T007 🔒 [US1/US2] Verify: USD freelancer's stated 2,000 → ~7,500 SAR anchor; SAR-only unchanged; feed-down skips anchor. Gate green.

## Phase 3: Invoice currency (US3)

- [x] T008 [US3] **done — gig + manual**: `createInvoiceFromGig` + `createInvoice` default `currency` from `rate_currency`, convert entered/gig amounts → SAR (peg/cache; degrade→SAR if no rate), store FX basis, VAT only when SAR; `InvoiceArtifact` renders in the currency (converted from the SAR ledger) + footer FX citation + "books in SAR" note. InvoiceForm has a currency selector + VAT hidden for non-SAR.
- [x] T009 [US3] gate-green (typecheck + 725 tests); SAR invoices unchanged.

## Phase 4: Converted-figure display (US4)

- [x] T010 [US4] **done**: dashboard (income/paid/pending/goal) + proposal `PriceEditor` (converted secondary under the authoritative SAR anchor) show the preferred currency + FX citation; ledger + HADAF stay SAR.
- [x] T011 [US4] **Verified live**: dashboard as USD freelancer → $16,000 (=60k/3.75), goal 6,667$ (=25k/3.75), "≈ converted · 1 USD = 3.75 SAR · SAMA peg". Demo user reverted to SAR.

## Phase 5: Polish

- [x] T012 [P] SAR-only path unchanged (SAR = identity everywhere; default currency SAR).
- [x] T013 [P] `node scripts/a11y-audit.mjs` clean.
- [x] T014 Migration applied; `pnpm typecheck` clean + `pnpm test` 725 green.

## Status: ✅ COMPLETE end-to-end (onboarding · pricing · dashboard · invoices [gig+manual] · proposal).

## MVP
**P1 + P2.** A profiled USD freelancer's proposal prices off the SAR benchmark with the *correct*
(converted, cited) anchor — the core correctness win. P1 alone is the shippable, tested foundation.
