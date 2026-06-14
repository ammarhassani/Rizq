import { describe, it, expect } from "vitest";
import { extractProtectedTokens, preservesData } from "./tone";

// ---------------------------------------------------------------------------
// extractProtectedTokens
// ---------------------------------------------------------------------------

describe("extractProtectedTokens", () => {
  it("extracts Western-digit price with comma separator", () => {
    const tokens = extractProtectedTokens("السعر 3,500 ريال");
    expect(tokens).toContain("3,500");
  });

  it("extracts Arabic-Indic digits with percent sign", () => {
    const tokens = extractProtectedTokens("خصم ٥٠٪");
    expect(tokens).toContain("٥٠٪");
  });

  it("returns empty array when text has no numeric runs", () => {
    const tokens = extractProtectedTokens("مرحباً بكم في رِزق");
    expect(tokens).toEqual([]);
  });

  it("extracts multiple numeric tokens from a sentence", () => {
    const tokens = extractProtectedTokens("المشروع 3,500 ريال خلال 2 أسبوع");
    expect(tokens).toContain("3,500");
    expect(tokens).toContain("2");
  });

  it("extracts a plain integer", () => {
    const tokens = extractProtectedTokens("عدد المراجعات: 3");
    expect(tokens).toContain("3");
  });

  it("extracts a decimal price", () => {
    const tokens = extractProtectedTokens("السعر 1250.50 ريال");
    expect(tokens).toContain("1250.50");
  });

  it("extracts a date string", () => {
    const tokens = extractProtectedTokens("تاريخ التسليم 2026-08-15");
    // The date contains digits and separators, at least one numeric run captured
    expect(tokens.some((t) => t.includes("2026"))).toBe(true);
  });

  it("returns empty array for pure whitespace", () => {
    expect(extractProtectedTokens("   ")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// preservesData
// ---------------------------------------------------------------------------

describe("preservesData", () => {
  it("returns true when all numeric tokens from original appear in rewritten", () => {
    const original = "3,500 SAR over 2 weeks";
    const rewritten =
      "نحن نقدّم لكم هذه الخدمة بسعر 3,500 SAR خلال 2 أسابيع.";
    expect(preservesData(original, rewritten)).toBe(true);
  });

  it("returns false when a price is changed (3,500 → 3,000)", () => {
    const original = "3,500 SAR over 2 weeks";
    const rewritten = "3,000 SAR over 2 weeks";
    expect(preservesData(original, rewritten)).toBe(false);
  });

  it("returns false when a number is dropped", () => {
    const original = "3,500 SAR over 2 weeks";
    // rewritten omits "2"
    const rewritten = "السعر 3,500 ريال خلال عدة أسابيع.";
    expect(preservesData(original, rewritten)).toBe(false);
  });

  it("returns true when there are no numbers in original", () => {
    expect(preservesData("مرحباً بكم", "أهلاً وسهلاً بكم")).toBe(true);
  });

  it("returns true for Arabic-Indic tokens preserved verbatim", () => {
    const original = "خصم ٥٠٪ لمدة ٣ أيام";
    const rewritten = "يُتاح لكم خصم بنسبة ٥٠٪ لمدة ٣ أيام فقط.";
    expect(preservesData(original, rewritten)).toBe(true);
  });

  it("returns false when Arabic-Indic digit is altered", () => {
    const original = "خصم ٥٠٪";
    const rewritten = "خصم ٣٠٪";
    expect(preservesData(original, rewritten)).toBe(false);
  });

  it("returns true when rewritten adds extra numbers but all originals present", () => {
    const original = "السعر 4,500 ريال";
    const rewritten = "السعر 4,500 ريال بعد خصم 10%";
    expect(preservesData(original, rewritten)).toBe(true);
  });
});
