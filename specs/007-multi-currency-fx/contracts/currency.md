# Phase 1 — Contracts: currency boundary

App feature → the interface is the typed currency lib + the FX service + where they thread in.

## 1. `src/lib/currency/currencies.ts`
```ts
type CurrencyCode = "SAR" | "USD" | "AED" | "EUR" | "GBP";
const SUPPORTED: { code: CurrencyCode; symbol: string; nameAr: string; nameEn: string; decimals: number }[]
const SAR_PER_USD = 3.75;            // SAMA peg
function isCurrency(x: string): x is CurrencyCode
```

## 2. `src/lib/currency/convert.ts` (pure, tested)
```ts
type FxRate = { quote: CurrencyCode; sarPerUnit: number; asOf: string; source: string };
toSAR(amount: number, currency: CurrencyCode, rate?: FxRate | null): number | null
fromSAR(amountSar: number, currency: CurrencyCode, rate?: FxRate | null): number | null
convert(amount: number, from: CurrencyCode, to: CurrencyCode, rates: Record<string, FxRate>): number | null
fxCitation(rate: FxRate, locale: "ar" | "en"): string
```
Rules: SAR is identity (no rate needed); non-SAR with no rate → `null`; USD uses `SAR_PER_USD` (peg)
when no explicit rate supplied.

## 3. `src/lib/currency/fxRates.ts` (server; daily cache)
```ts
getSarRate(quote: CurrencyCode): Promise<FxRate | null>   // peg for USD/AED; cached feed for EUR/GBP
```
Reads `fx_rates` for today; else fetches the feed, stores, returns; on failure → null (degrade).

## 4. Threading points
- `generateProposal` (P2): `toSAR(midpoint, profile.rate_currency, rate)` → `statedAnchor`; null → skip.
- `StepRates` (P2): currency selector → saves `rate_currency`; labels via `currencies.ts`.
- invoices (P3): totals in `currency`; persist currency + (non-SAR) FX basis; VAT only when SAR.
- proposal/dashboard (P4): `fromSAR` + `fxCitation` for the labeled secondary figure.

## Honesty
No converted figure without a `FxRate`; `fxCitation` always accompanies a converted display; missing
rate degrades to SAR-only.
