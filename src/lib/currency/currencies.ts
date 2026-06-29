/**
 * Supported currencies (feature 007). SAR is the base/default; the engine,
 * benchmarks, and HADAF are always SAR-internal. SAR↔USD is the fixed SAMA peg.
 */

export type CurrencyCode = "SAR" | "USD" | "AED" | "EUR" | "GBP";

export type CurrencyMeta = {
  code: CurrencyCode;
  symbol: string;
  nameAr: string;
  nameEn: string;
  decimals: number;
};

export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: "SAR", symbol: "ر.س", nameAr: "ريال سعودي", nameEn: "Saudi Riyal", decimals: 0 },
  { code: "USD", symbol: "$", nameAr: "دولار أمريكي", nameEn: "US Dollar", decimals: 2 },
  { code: "AED", symbol: "د.إ", nameAr: "درهم إماراتي", nameEn: "UAE Dirham", decimals: 2 },
  { code: "EUR", symbol: "€", nameAr: "يورو", nameEn: "Euro", decimals: 2 },
  { code: "GBP", symbol: "£", nameAr: "جنيه إسترليني", nameEn: "British Pound", decimals: 2 },
];

/** SAMA peg: 1 USD = 3.75 SAR (fixed). Citable as "SAMA peg". */
export const SAR_PER_USD = 3.75;

/** AED is USD-pegged at 3.6725 AED/USD → SAR per AED via the peg chain. */
export const SAR_PER_AED = SAR_PER_USD / 3.6725;

const CODES = new Set(SUPPORTED_CURRENCIES.map((c) => c.code));

export function isCurrency(x: string | null | undefined): x is CurrencyCode {
  return !!x && CODES.has(x as CurrencyCode);
}

export function currencyMeta(code: CurrencyCode): CurrencyMeta {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) ?? SUPPORTED_CURRENCIES[0];
}
