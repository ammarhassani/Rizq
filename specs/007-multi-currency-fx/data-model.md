# Phase 1 — Data Model

**Additive migration** (apply when DB reachable). SAR defaults everywhere → SAR-only path unchanged.

## users (add)
- `rate_currency text not null default 'SAR'` — the freelancer's pricing/display currency.

## invoices (add)
- `currency text not null default 'SAR'` — per-invoice currency.
- `fx_rate_to_sar numeric null` — SAR-per-unit used (null when SAR).
- `fx_as_of date null` — the rate's as-of date.
- `fx_source text null` — e.g. 'SAMA peg' / feed name.
(Captured at creation; never silently re-converted. Existing `invoices_compute_before` trigger stays
SAR-internal — totals are computed in the invoice's own currency unit.)

## fx_rates (new — daily cache)
- `quote text not null` (e.g. 'USD'), `sar_per_unit numeric not null`,
  `as_of date not null`, `source text not null`, `created_at timestamptz default now()`,
  unique(quote, as_of). RLS: readable by authenticated; writes via service path only.

## Typed model (code)
```
type CurrencyCode = "SAR" | "USD" | "AED" | "EUR" | "GBP";
type FxRate = { quote: CurrencyCode; sarPerUnit: number; asOf: string; source: string };
```

## Pure functions (tested) — src/lib/currency/convert.ts
- `toSAR(amount, currency, rate?) → number | null` — SAR→identity; else amount × sarPerUnit; null if
  no rate for a non-SAR currency.
- `fromSAR(amountSar, currency, rate?) → number | null` — inverse.
- `convert(amount, from, to, rates) → number | null`.
- `fxCitation(rate, locale) → string` — "1 USD = 3.75 SAR · SAMA peg · 2026-06-29".
- `SAR_PER_USD = 3.75` (SAMA peg constant).

## Wiring (boundary)
| Surface | Conversion |
|---|---|
| generateProposal (P2) | stated project-rate midpoint × rate → SAR, then `statedAnchor`; null → skip anchor |
| StepRates (P2) | selector sets `rate_currency`; labels/symbols reflect it |
| invoices (P3) | totals in invoice `currency`; store currency + FX basis; VAT only when SAR |
| proposal/dashboard (P4) | SAR authoritative + `fromSAR` secondary labeled with `fxCitation` |

## Integrity
- Missing rate → null → caller degrades to SAR-only; no fabricated number.
- SAR is the engine source of truth; conversions never mutate stored SAR benchmarks.
- New columns owner-scoped (reuse writable-columns/RLS pattern).
