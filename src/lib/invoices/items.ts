/**
 * Invoice line-item helpers — Phase-4 task 4.2.
 *
 * PURE module: no React, no Supabase, no side-effects. Inputs are plain
 * numbers/objects; outputs are plain serialisable objects. Tests live in
 * items.test.ts and run with Vitest.
 *
 * Rounding contract: all money values are rounded to 2 decimal places using
 * Math.round(x * 100) / 100, which matches the DB trigger:
 *   new.vat_sar := round(subtotal * vat_pct / 100.0, 2)
 * in private.invoice_compute_before (migration 20260613212550_create_invoices.sql).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single line on an invoice. `total_sar` should equal quantity × unit_price_sar
 *  (caller must pre-fill it, or derive via `lineItemTotal`). */
export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unit_price_sar: number;
  total_sar: number;
};

/** Output of `computeTotals`. All values rounded to 2 dp, matching the DB trigger. */
export type InvoiceTotals = {
  subtotal_sar: number;
  vat_sar: number;
  total_sar: number;
};

/**
 * A categorized fixed fee added onto an invoice (stored in invoices.fees jsonb).
 * `amount_sar` is a flat amount, not a rate. Fees are part of the taxable supply.
 */
export type InvoiceFee = {
  name: string;
  category: string | null;
  amount_sar: number;
};

/** Output of `computeInvoiceTotals` — items subtotal + fees, then VAT on both. */
export type InvoiceTotalsWithFees = {
  subtotal_sar: number; // items only (Σ line totals)
  fees_sar: number;     // Σ fee amounts
  vat_sar: number;      // round((subtotal + fees) * vatPct / 100, 2)
  total_sar: number;    // subtotal + fees + vat
};

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

/** Round to 2 decimal places (same arithmetic as Postgres `round(x, 2)`). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Coerce a value to a non-negative, finite number; NaN/negative/Infinity → 0. */
function safeNum(n: number): number {
  if (!isFinite(n) || isNaN(n) || n < 0) return 0;
  return n;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the total for a single line item: quantity × unit_price_sar, rounded
 * to 2 decimal places. Negative or NaN inputs are treated as 0.
 */
export function lineItemTotal(quantity: number, unit_price_sar: number): number {
  return round2(safeNum(quantity) * safeNum(unit_price_sar));
}

/**
 * Compute subtotal, VAT, and grand total for a set of line items.
 *
 * Rules (mirror private.invoice_compute_before in the DB):
 *  - subtotal = Σ item.total_sar   (each item total is taken at face value)
 *  - vat_sar  = round(subtotal * vatPct / 100, 2)
 *  - total    = subtotal + vat_sar   (NO second rounding — matches the trigger)
 *
 * Guards:
 *  - Empty items array → {0, 0, 0}
 *  - Negative or NaN item.total_sar or vatPct → treated as 0
 */
export function computeTotals(
  items: InvoiceLineItem[],
  vatPct: number
): InvoiceTotals {
  // سلامة المدخلات: نسبة الضريبة السالبة أو NaN تُعامل كـ صفر
  const safePct = safeNum(vatPct);

  if (items.length === 0) {
    return { subtotal_sar: 0, vat_sar: 0, total_sar: 0 };
  }

  // جمع إجماليات البنود — القيم السالبة/NaN تُعامل كـ صفر
  const subtotal = round2(
    items.reduce((sum, item) => sum + safeNum(item.total_sar), 0)
  );

  const vat_sar = round2(subtotal * safePct / 100);
  const total_sar = subtotal + vat_sar;

  return { subtotal_sar: subtotal, vat_sar, total_sar };
}

/** Σ of fee amounts, rounded to 2 dp. Negative/NaN amounts treated as 0. */
export function feesSubtotal(fees: InvoiceFee[]): number {
  return round2(fees.reduce((sum, f) => sum + safeNum(f.amount_sar), 0));
}

/**
 * Compute totals for an invoice with both line items AND fees.
 *
 * Mirrors private.invoice_compute_before (migration
 * 20260614111456_items_catalog_fee_presets_and_invoice_fees.sql):
 *  - subtotal = Σ item.total_sar
 *  - fees     = Σ fee.amount_sar
 *  - vat_sar  = round((subtotal + fees) * vatPct / 100, 2)   ← VAT on items+fees
 *  - total    = subtotal + fees + vat_sar
 *
 * In Rizq, VAT is fixed at 15% (toggle on) or 0% (toggle off) at the UI layer,
 * but this fn accepts any vatPct so it stays a faithful mirror of the trigger.
 */
export function computeInvoiceTotals(
  items: InvoiceLineItem[],
  fees: InvoiceFee[],
  vatPct: number
): InvoiceTotalsWithFees {
  const safePct = safeNum(vatPct);
  const subtotal = round2(
    items.reduce((sum, item) => sum + safeNum(item.total_sar), 0)
  );
  const fees_sar = feesSubtotal(fees);
  const vat_sar = round2((subtotal + fees_sar) * safePct / 100);
  const total_sar = subtotal + fees_sar + vat_sar;

  return { subtotal_sar: subtotal, fees_sar, vat_sar, total_sar };
}
