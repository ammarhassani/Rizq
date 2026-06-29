/**
 * Currency conversion (feature 007) — pure boundary helpers. SAR is the base.
 * A non-SAR amount needs a cited FxRate (sar_per_unit + as-of + source); without
 * one, conversion returns null and the caller degrades to SAR-only (honesty —
 * never fabricate a rate). USD/AED fall back to the fixed SAMA peg chain.
 */

import { SAR_PER_USD, SAR_PER_AED, type CurrencyCode } from "./currencies";

export type FxRate = {
  quote: CurrencyCode;
  sarPerUnit: number;
  asOf: string; // YYYY-MM-DD
  source: string; // e.g. "SAMA peg", or a feed name
};

/** The pegged SAR-per-unit for currencies that don't float, else null. */
function pegSarPerUnit(currency: CurrencyCode): number | null {
  if (currency === "SAR") return 1;
  if (currency === "USD") return SAR_PER_USD;
  if (currency === "AED") return SAR_PER_AED;
  return null; // EUR/GBP float → need an explicit rate
}

function sarPerUnit(currency: CurrencyCode, rate?: FxRate | null): number | null {
  if (currency === "SAR") return 1;
  if (rate && rate.quote === currency && rate.sarPerUnit > 0) return rate.sarPerUnit;
  return pegSarPerUnit(currency);
}

/** Convert an amount in `currency` to SAR. SAR → identity. null if no rate. */
export function toSAR(amount: number, currency: CurrencyCode, rate?: FxRate | null): number | null {
  const r = sarPerUnit(currency, rate);
  if (r == null) return null;
  return amount * r;
}

/** Convert a SAR amount into `currency`. SAR → identity. null if no rate. */
export function fromSAR(amountSar: number, currency: CurrencyCode, rate?: FxRate | null): number | null {
  const r = sarPerUnit(currency, rate);
  if (r == null || r === 0) return null;
  return amountSar / r;
}

/** Convert between any two supported currencies via SAR. null if a leg has no rate. */
export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Partial<Record<CurrencyCode, FxRate>> = {}
): number | null {
  const sar = toSAR(amount, from, rates[from]);
  if (sar == null) return null;
  return fromSAR(sar, to, rates[to]);
}

/** Human, cited FX string: "1 USD = 3.75 SAR · SAMA peg · 2026-06-29". */
export function fxCitation(rate: FxRate, locale: "ar" | "en"): string {
  const n = rate.sarPerUnit.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 4,
  });
  return locale === "ar"
    ? `١ ${rate.quote} = ${n} ر.س · ${rate.source} · ${rate.asOf}`
    : `1 ${rate.quote} = ${n} SAR · ${rate.source} · ${rate.asOf}`;
}
