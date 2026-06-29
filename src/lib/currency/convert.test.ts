import { describe, it, expect } from "vitest";
import { toSAR, fromSAR, convert, fxCitation, type FxRate } from "./convert";

const eur: FxRate = { quote: "EUR", sarPerUnit: 4.05, asOf: "2026-06-29", source: "ecb" };

describe("currency conversion (feature 007)", () => {
  it("SAR is identity, no rate needed", () => {
    expect(toSAR(100, "SAR")).toBe(100);
    expect(fromSAR(100, "SAR")).toBe(100);
  });
  it("USD uses the SAMA peg (3.75) without an explicit rate", () => {
    expect(toSAR(200, "USD")).toBe(750);
    expect(fromSAR(750, "USD")).toBe(200);
  });
  it("AED uses the USD peg chain", () => {
    // 1 AED ≈ 3.75/3.6725 ≈ 1.0211 SAR
    expect(toSAR(100, "AED")).toBeCloseTo(102.11, 1);
  });
  it("a floating currency needs a cited rate, else null", () => {
    expect(toSAR(100, "EUR")).toBeNull();
    expect(toSAR(100, "EUR", eur)).toBeCloseTo(405, 5);
    expect(fromSAR(405, "EUR", eur)).toBeCloseTo(100, 5);
  });
  it("round-trips through SAR", () => {
    expect(convert(100, "USD", "USD")).toBeCloseTo(100, 6);
    expect(convert(100, "USD", "AED")).toBeCloseTo((100 * 3.75) / (3.75 / 3.6725), 4);
  });
  it("convert returns null when a leg lacks a rate", () => {
    expect(convert(100, "EUR", "USD")).toBeNull(); // EUR has no rate provided
    expect(convert(100, "USD", "EUR")).toBeNull(); // EUR target has no rate
  });
  it("fxCitation is cited + bilingual", () => {
    expect(fxCitation({ quote: "USD", sarPerUnit: 3.75, asOf: "2026-06-29", source: "SAMA peg" }, "en")).toBe(
      "1 USD = 3.75 SAR · SAMA peg · 2026-06-29"
    );
    expect(fxCitation(eur, "ar")).toContain("EUR");
    expect(fxCitation(eur, "ar")).toContain("ecb");
  });
});
