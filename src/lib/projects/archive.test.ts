import { describe, it, expect } from "vitest";
import { shouldSoftArchive, resolveArchiveMode } from "./archive";

describe("shouldSoftArchive / resolveArchiveMode (FR-017)", () => {
  it("soft-archives when the project has a money record", () => {
    expect(shouldSoftArchive({ hasMoneyRecord: true, invoiceCount: 0 })).toBe(true);
    expect(resolveArchiveMode({ hasMoneyRecord: true, invoiceCount: 0 })).toBe("archived");
  });

  it("soft-archives when the project has invoices (even without a money record)", () => {
    expect(shouldSoftArchive({ hasMoneyRecord: false, invoiceCount: 2 })).toBe(true);
    expect(resolveArchiveMode({ hasMoneyRecord: false, invoiceCount: 2 })).toBe("archived");
  });

  it("soft-archives when both exist", () => {
    expect(resolveArchiveMode({ hasMoneyRecord: true, invoiceCount: 3 })).toBe("archived");
  });

  it("allows hard-delete only for an empty shell (no money, no invoices)", () => {
    expect(shouldSoftArchive({ hasMoneyRecord: false, invoiceCount: 0 })).toBe(false);
    expect(resolveArchiveMode({ hasMoneyRecord: false, invoiceCount: 0 })).toBe("deleted");
  });
});
