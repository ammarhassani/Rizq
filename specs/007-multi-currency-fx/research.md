# Phase 0 — Research & Decisions

No open `NEEDS CLARIFICATION` — resolved with documented defaults.

## D1 — FX source + caching
**Decision**: SAR↔USD is the **fixed SAMA peg 3.75** (a constant, citable as "SAMA peg"). Floating
currencies (AED, EUR, GBP) come from a public daily-reference feed fetched server-side and **cached
daily** in an `fx_rates` table (quote, sar_per_unit, as_of, source). AED is also effectively pegged
(~0.9803 SAR? — AED is USD-pegged at 3.6725/USD → SAR per AED ≈ 3.75/3.6725 ≈ 1.0211) — treat AED
via the USD peg chain (citable) rather than the feed where possible.
**Rationale**: reproducible + citable; honest; no runtime dependency on a flaky call per request.
**Alternatives rejected**: per-request live API (latency, no provenance snapshot), hardcoded floats
(dishonest).

## D2 — Conversion boundary (SAR engine untouched)
**Decision**: `src/lib/currency/convert.ts` converts amounts to/from SAR given a rate. Callers convert
at the edge: `generateProposal` converts the stated rate → SAR before `computeProposalPrice`; display
layers convert SAR → the freelancer's currency for *secondary* labels. `resolvePrice`/
`computeProposalPrice`/benchmarks stay pure SAR.

## D3 — Missing rate → degrade
**Decision**: if a needed rate is absent (feed down, unknown currency), conversion returns `null`;
callers **skip** the conversion-dependent step (e.g., drop the personal anchor) and show SAR only.
Never fabricate.

## D4 — Display policy
**Decision**: proposal SAR band stays **authoritative** with its existing provenance; the
freelancer's-currency equivalent is a **secondary**, clearly-labeled converted figure with the FX
citation. Dashboard personal figures may show in the chosen currency; HADAF threshold stays SAR.

## D5 — VAT by currency
**Decision**: VAT (15%) applies only in the SAR + registered context; **suppressed for non-SAR**
invoices by default. Revisit if a real non-SAR-with-VAT case appears.

## D6 — Supported currencies
**Decision**: SAR (base), USD, AED, EUR, GBP. Extensible via `currencies.ts`.

## D7 — Migration deferral
**Decision**: author the additive migration now; **apply when the DB/Supabase MCP is reachable**. No
code path may SELECT/WRITE the new columns until the migration is applied (would error against the
current schema) — so P2–P4 wiring lands after application; P1 (pure libs + service + file) ships now.
