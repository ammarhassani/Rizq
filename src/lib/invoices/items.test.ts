import { describe, it, expect } from "vitest";
import {
  lineItemTotal,
  computeTotals,
  computeInvoiceTotals,
  feesSubtotal,
  type InvoiceLineItem,
  type InvoiceFee,
} from "./items";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function item(
  description: string,
  quantity: number,
  unit_price_sar: number
): InvoiceLineItem {
  return {
    description,
    quantity,
    unit_price_sar,
    total_sar: lineItemTotal(quantity, unit_price_sar),
  };
}

// ---------------------------------------------------------------------------
// lineItemTotal
// ---------------------------------------------------------------------------

describe("lineItemTotal", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineItemTotal(3, 1000)).toBe(3000);
  });

  it("rounds to 2 decimal places (333.333 → 333.33)", () => {
    expect(lineItemTotal(1, 333.333)).toBe(333.33);
  });

  it("rounds 1.235 × 1 to 1.24 (half-up)", () => {
    // 1.235 * 100 = 123.5 → Math.round = 124 → 1.24
    expect(lineItemTotal(1, 1.235)).toBe(1.24);
  });

  it("returns 0 for negative quantity", () => {
    expect(lineItemTotal(-1, 500)).toBe(0);
  });

  it("returns 0 for negative unit price", () => {
    expect(lineItemTotal(2, -100)).toBe(0);
  });

  it("returns 0 for NaN quantity", () => {
    expect(lineItemTotal(NaN, 500)).toBe(0);
  });

  it("returns 0 for NaN unit price", () => {
    expect(lineItemTotal(2, NaN)).toBe(0);
  });

  it("returns 0 for zero quantity", () => {
    expect(lineItemTotal(0, 500)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeTotals — DB trigger parity examples
// ---------------------------------------------------------------------------

describe("computeTotals — DB trigger parity", () => {
  it("1000 SAR subtotal @ 15% VAT → {subtotal:1000, vat:150, total:1150}", () => {
    const items: InvoiceLineItem[] = [item("خدمة", 1, 1000)];
    const result = computeTotals(items, 15);
    expect(result).toEqual({ subtotal_sar: 1000, vat_sar: 150, total_sar: 1150 });
  });

  it("500 SAR subtotal @ 0% VAT → {subtotal:500, vat:0, total:500}", () => {
    const items: InvoiceLineItem[] = [item("خدمة", 1, 500)];
    const result = computeTotals(items, 0);
    expect(result).toEqual({ subtotal_sar: 500, vat_sar: 0, total_sar: 500 });
  });
});

// ---------------------------------------------------------------------------
// computeTotals — subtotal sum
// ---------------------------------------------------------------------------

describe("computeTotals — subtotal calculation", () => {
  it("sums multiple items correctly", () => {
    const items: InvoiceLineItem[] = [
      item("تصميم شعار", 1, 2000),
      item("تصميم بطاقة أعمال", 2, 500),
    ];
    // 2000 + 1000 = 3000
    const result = computeTotals(items, 0);
    expect(result.subtotal_sar).toBe(3000);
    expect(result.total_sar).toBe(3000);
  });

  it("sums three items @ 15% VAT", () => {
    const items: InvoiceLineItem[] = [
      item("تصميم موقع", 1, 5000),
      item("صيانة شهرية", 3, 500),
      item("استشارة", 2, 250),
    ];
    // 5000 + 1500 + 500 = 7000 → vat = 1050 → total = 8050
    const result = computeTotals(items, 15);
    expect(result.subtotal_sar).toBe(7000);
    expect(result.vat_sar).toBe(1050);
    expect(result.total_sar).toBe(8050);
  });
});

// ---------------------------------------------------------------------------
// computeTotals — VAT rounding (mirror Postgres round(x,2))
// ---------------------------------------------------------------------------

describe("computeTotals — VAT rounding", () => {
  it("rounds vat_sar to 2dp for fractional amounts", () => {
    // subtotal = 333.33, vat_pct = 15 → vat = 333.33 * 15 / 100 = 49.9995 → round = 50.00
    const items: InvoiceLineItem[] = [{ description: "خدمة", quantity: 1, unit_price_sar: 333.33, total_sar: 333.33 }];
    const result = computeTotals(items, 15);
    expect(result.vat_sar).toBe(50);
  });

  it("rounds vat_sar correctly for a tricky fraction", () => {
    // subtotal = 100, vat_pct = 3 → vat = 3.00
    const items: InvoiceLineItem[] = [item("خدمة", 1, 100)];
    expect(computeTotals(items, 3).vat_sar).toBe(3);
  });

  it("rounds to 2dp: 7% of 1000.01 → 70.00 (rounded from 70.0007)", () => {
    const items: InvoiceLineItem[] = [{ description: "a", quantity: 1, unit_price_sar: 1000.01, total_sar: 1000.01 }];
    const result = computeTotals(items, 7);
    // 1000.01 * 7 / 100 = 70.0007 → round to 2dp = 70
    expect(result.vat_sar).toBe(70);
  });
});

// ---------------------------------------------------------------------------
// computeTotals — empty items guard
// ---------------------------------------------------------------------------

describe("computeTotals — empty items", () => {
  it("returns all zeros for empty items array", () => {
    expect(computeTotals([], 15)).toEqual({
      subtotal_sar: 0,
      vat_sar: 0,
      total_sar: 0,
    });
  });

  it("returns all zeros for empty items at 0% VAT", () => {
    expect(computeTotals([], 0)).toEqual({
      subtotal_sar: 0,
      vat_sar: 0,
      total_sar: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// computeTotals — negative / NaN guards
// ---------------------------------------------------------------------------

describe("computeTotals — negative/NaN guards", () => {
  it("treats negative total_sar on an item as 0", () => {
    const items: InvoiceLineItem[] = [
      { description: "a", quantity: 1, unit_price_sar: 500, total_sar: -500 },
      { description: "b", quantity: 1, unit_price_sar: 500, total_sar: 500 },
    ];
    const result = computeTotals(items, 0);
    // -500 treated as 0, so subtotal = 0 + 500 = 500
    expect(result.subtotal_sar).toBe(500);
  });

  it("treats NaN total_sar on an item as 0", () => {
    const items: InvoiceLineItem[] = [
      { description: "a", quantity: 1, unit_price_sar: 200, total_sar: NaN },
    ];
    const result = computeTotals(items, 15);
    expect(result.subtotal_sar).toBe(0);
    expect(result.vat_sar).toBe(0);
    expect(result.total_sar).toBe(0);
  });

  it("treats negative vatPct as 0", () => {
    const items: InvoiceLineItem[] = [item("خدمة", 1, 1000)];
    const result = computeTotals(items, -5);
    expect(result.vat_sar).toBe(0);
    expect(result.total_sar).toBe(1000);
  });

  it("treats NaN vatPct as 0", () => {
    const items: InvoiceLineItem[] = [item("خدمة", 1, 1000)];
    const result = computeTotals(items, NaN);
    expect(result.vat_sar).toBe(0);
    expect(result.total_sar).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// feesSubtotal + computeInvoiceTotals (VAT base = items + fees) — mirrors the
// DB trigger private.invoice_compute_before.
// ---------------------------------------------------------------------------

describe("feesSubtotal", () => {
  it("sums fee amounts, rounding to 2dp", () => {
    const fees: InvoiceFee[] = [
      { name: "استعجال", category: null, amount_sar: 150.005 },
      { name: "توصيل", category: "لوجستيات", amount_sar: 50 },
    ];
    expect(feesSubtotal(fees)).toBe(200.01);
  });

  it("treats negative/NaN fee amounts as 0", () => {
    const fees: InvoiceFee[] = [
      { name: "a", category: null, amount_sar: -100 },
      { name: "b", category: null, amount_sar: NaN },
      { name: "c", category: null, amount_sar: 80 },
    ];
    expect(feesSubtotal(fees)).toBe(80);
  });

  it("empty fees → 0", () => {
    expect(feesSubtotal([])).toBe(0);
  });
});

describe("computeInvoiceTotals", () => {
  it("applies VAT to items + fees, not items alone", () => {
    const items: InvoiceLineItem[] = [item("خدمة", 1, 1000)];
    const fees: InvoiceFee[] = [{ name: "رسوم استعجال", category: null, amount_sar: 200 }];
    const r = computeInvoiceTotals(items, fees, 15);
    // base = 1000 + 200 = 1200; vat = 180; total = 1380
    expect(r.subtotal_sar).toBe(1000);
    expect(r.fees_sar).toBe(200);
    expect(r.vat_sar).toBe(180);
    expect(r.total_sar).toBe(1380);
  });

  it("0% VAT → fees still added to the total", () => {
    const items: InvoiceLineItem[] = [item("خدمة", 2, 500)];
    const fees: InvoiceFee[] = [{ name: "توصيل", category: null, amount_sar: 75 }];
    const r = computeInvoiceTotals(items, fees, 0);
    expect(r.subtotal_sar).toBe(1000);
    expect(r.fees_sar).toBe(75);
    expect(r.vat_sar).toBe(0);
    expect(r.total_sar).toBe(1075);
  });

  it("no fees behaves like a plain VAT calc", () => {
    const items: InvoiceLineItem[] = [item("خدمة", 1, 1000)];
    const r = computeInvoiceTotals(items, [], 15);
    expect(r.fees_sar).toBe(0);
    expect(r.vat_sar).toBe(150);
    expect(r.total_sar).toBe(1150);
  });
});
