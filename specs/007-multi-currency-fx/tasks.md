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

## Phase 3: Invoice currency (US3) 🔒

- [ ] T008 🔒 [US3] Invoice create/actions + `artifact.ts`: default `currency` from `rate_currency`; compute totals in that currency; store currency + FX basis (non-SAR); VAT only when SAR (suppress non-SAR). InvoiceForm currency-aware labels.
- [ ] T009 🔒 [US3] Verify: USD invoice renders in USD, VAT suppressed, basis stored; SAR invoice unchanged. Gate green.

## Phase 4: Converted-figure display (US4) 🔒

- [ ] T010 🔒 [US4] Proposal view + dashboard: SAR authoritative + a labeled secondary converted figure via `fromSAR` + `fxCitation`; HADAF stays SAR. i18n labels (AR/EN).
- [ ] T011 🔒 [US4] Verify: converted equivalents show with FX citation; HADAF SAR. Gate green.

## Phase 5: Polish 🔒

- [ ] T012 [P] SAR-only regression sweep — every touched surface identical to today for SAR users.
- [ ] T013 [P] `node scripts/a11y-audit.mjs` on the selector + converted-figure labels.
- [ ] T014 Apply the migration (when DB back); final `pnpm typecheck` + `pnpm test` + quickstart walkthrough.

## Dependencies & order
- **P1 (T001–T004)** ships now (no DB). T002 is the tested core.
- P2–P5 (🔒) are gated on the migration being applied (DB reachable) + the dev server.
- US3 and US4 depend on P1; US4 also wants P2 (so a currency exists to display).

## MVP
**P1 + P2.** A profiled USD freelancer's proposal prices off the SAR benchmark with the *correct*
(converted, cited) anchor — the core correctness win. P1 alone is the shippable, tested foundation.
