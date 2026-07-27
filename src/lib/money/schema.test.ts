import { describe, it, expect } from "vitest";
import { moneySarSchema } from "./schema";

describe("moneySarSchema", () => {
  // Found by logging income of 12345.678 through the ledger UI: it saved, and the row,
  // the dashboard total and the HADAF income view all carried a third decimal that can
  // never be paid in halalas.
  it("rounds a user-entered amount to halalas", () => {
    expect(moneySarSchema.parse(12345.678)).toBe(12345.68);
    expect(moneySarSchema.parse(10450.555)).toBe(10450.56);
    expect(moneySarSchema.parse(0.005)).toBe(0.01);
  });

  it("leaves an already-exact amount alone", () => {
    expect(moneySarSchema.parse(6000)).toBe(6000);
    expect(moneySarSchema.parse(12.34)).toBe(12.34);
  });

  it("rejects zero and negative amounts", () => {
    expect(moneySarSchema.safeParse(0).success).toBe(false);
    expect(moneySarSchema.safeParse(-500).success).toBe(false);
  });

  it("rejects a non-number", () => {
    expect(moneySarSchema.safeParse("1000").success).toBe(false);
    expect(moneySarSchema.safeParse(Number.NaN).success).toBe(false);
  });
});
