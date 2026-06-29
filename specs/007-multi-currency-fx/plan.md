# Implementation Plan: Multi-Currency Pricing + FX Conversion

**Branch**: `main` (commit + sync) | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

## Summary

Currency becomes first-class. SAR stays the engine/benchmark/HADAF base; conversion happens at the
**boundary** via cited FX (source + as-of; SAR↔USD = fixed SAMA peg 3.75). A pure conversion lib +
an FX service (daily-cached, reproducible) underpin: an onboarding currency selector, the
feature-006 stated-rate→SAR anchor conversion, invoice currency, and labeled converted-figure
display. SAR-only is the default and unchanged. Honesty (Principle I) is enforced: no unsourced
number is ever shown; missing rate → graceful SAR-only.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16 App Router (RSC + server actions)
**Primary Dependencies**: next-intl, Tailwind v4 + shadcn/ui, Supabase (RLS), Vitest. FX via a
server-side `fetch` of a public daily-reference feed (no new runtime dep); SAR↔USD is a constant peg.
**Storage**: Supabase Postgres. **Additive migration** — `users.rate_currency`, `invoices.currency`
(+ `fx_rate_to_sar`, `fx_as_of`, `fx_source`), and an `fx_rates` cache table. **Cannot be applied
until the DB connection / Supabase MCP is restored.**
**Testing**: Vitest pure-logic — conversion (SAR identity, USD peg, round-trip), stated-anchor→SAR,
no-rate degrade, non-SAR invoice totals, VAT-by-currency rule, FX citation formatting.
**Target Platform**: Web, mobile-first, RTL (Arabic primary).
**Project Type**: Web app (single Next.js app).
**Constraints**: SAR remains internal base; convert only at the boundary; never fabricate a rate;
SAR-default path regression-free; owner-scoped new columns; bilingual labels; halal (spot
conversion, no riba).
**Environment blockers**: migration application + live verify require the DB reachable and the dev
server running. Pure libs/tests + the migration file do not.

## Constitution Check

| Principle | Assessment |
|---|---|
| I. Honesty is the moat | Every converted figure cites rate+source+date; missing feed → SAR-only, never a guess. **PASS** |
| II. Arabic-first, RTL | Currency selector + converted-figure labels bilingual, RTL. **PASS** |
| III. Mobile-first | Selector is a compact control; no extra friction for SAR users. **PASS** |
| IV. Test money & rules | Pure tests for conversion, anchor, VAT rule, invoice totals, citation. **PASS** |
| V. Every module on its own | Conversion is a boundary layer; SAR engine untouched; SAR-only unchanged. **PASS** |
| VI. Halal & PDPL | Spot conversion for display/anchoring only (no riba/product); owner-scoped columns; no new PII. **PASS** |
| VII. AI as multiplier | N/A (no AI surface). **PASS** |
| Workflow gates | Additive migration; small commits; typecheck + test gate. **PASS** |

**Result**: No violations.

## Project Structure

```text
src/lib/currency/
├── currencies.ts        # NEW: supported set, symbols, decimals, SAR_PER_USD peg
├── convert.ts           # NEW: toSAR/fromSAR/convert + fxCitation (pure, tested)
├── convert.test.ts      # NEW
└── fxRates.ts           # NEW: server-side daily-cached rate fetch + provenance (P1; runtime)
src/app/actions/proposals/generateProposal.ts  # EDIT (P2): convert stated rate → SAR before anchor
src/components/onboarding/StepRates.tsx         # EDIT (P2): currency selector; rates+currency saved
src/app/actions/invoices/* + src/lib/invoices/artifact.ts  # EDIT (P3): currency + VAT rule
src/components/.../proposal + dashboard                    # EDIT (P4): converted-figure display
supabase/migrations/<ts>_multi_currency.sql                # NEW: additive (apply when DB back)
messages/{ar,en}.json                                      # EDIT: currency + converted-figure labels
```

**Structure Decision**: A new `src/lib/currency/` boundary layer. The SAR engine
(`resolvePrice`/`computeProposalPrice`) is untouched; callers convert at the edge.

## Phasing → user stories
- **P1 (US1 core)**: `currencies.ts` + `convert.ts` (+tests) + `fxRates.ts` service + migration file.
  *DB-free parts ship now; migration application deferred.*
- **P2 (US1 boundary + US2)**: onboarding currency selector + persist `rate_currency`; convert the
  stated anchor → SAR in `generateProposal`. *Needs the migration applied.*
- **P3 (US3)**: invoice `currency` + VAT rule + artifact rendering. *Needs migration.*
- **P4 (US4)**: converted-figure display (proposal + dashboard) with FX citations.

## Complexity Tracking
No violations — section intentionally empty.
