import { describe, it, expect } from "vitest";
import { formatInvoiceNumber } from "./number";

// ---------------------------------------------------------------------------
// formatInvoiceNumber
// ---------------------------------------------------------------------------

describe("formatInvoiceNumber", () => {
  it("pads sequence 1 to 4 digits: INV-2026-0001", () => {
    expect(formatInvoiceNumber(2026, 1)).toBe("INV-2026-0001");
  });

  it("pads sequence 42 to 4 digits: INV-2026-0042", () => {
    expect(formatInvoiceNumber(2026, 42)).toBe("INV-2026-0042");
  });

  it("pads sequence 999 to 4 digits: INV-2026-0999", () => {
    expect(formatInvoiceNumber(2026, 999)).toBe("INV-2026-0999");
  });

  it("does NOT truncate 5-digit sequence: INV-2026-12345", () => {
    expect(formatInvoiceNumber(2026, 12345)).toBe("INV-2026-12345");
  });

  it("does NOT truncate 6-digit sequence: INV-2026-100000", () => {
    expect(formatInvoiceNumber(2026, 100000)).toBe("INV-2026-100000");
  });

  it("uses the correct year: INV-2025-0001", () => {
    expect(formatInvoiceNumber(2025, 1)).toBe("INV-2025-0001");
  });

  it("exactly 4 digits (1000): INV-2026-1000", () => {
    expect(formatInvoiceNumber(2026, 1000)).toBe("INV-2026-1000");
  });

  it("sequence 0 pads to 4 zeros: INV-2026-0000", () => {
    // Edge case — DB sequences start at 1, but function should not crash for 0.
    expect(formatInvoiceNumber(2026, 0)).toBe("INV-2026-0000");
  });
});
