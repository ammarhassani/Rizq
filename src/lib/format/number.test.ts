import { describe, it, expect } from "vitest";
import { fmtCount, toArabicIndicDigits } from "./number";

describe("fmtCount", () => {
  it("formats Arabic counts in Arabic-Indic digits", () => {
    expect(fmtCount(1, "ar")).toBe("١");
    expect(fmtCount(1234, "ar")).toBe("١٬٢٣٤");
  });

  it("formats English counts in Latin digits", () => {
    expect(fmtCount(1234, "en")).toBe("1,234");
  });

  it("drops fractions — it is a count, not money", () => {
    expect(fmtCount(2.6, "en")).toBe("3");
  });
});

describe("toArabicIndicDigits", () => {
  it("rewrites digits in Arabic prose", () => {
    // The dashboard's own insight text, as the model and the en-US fallback produced it.
    expect(toArabicIndicDigits("لا يوجد دخل مسجل خلال آخر 6 أشهر.")).toBe(
      "لا يوجد دخل مسجل خلال آخر ٦ أشهر.",
    );
    expect(toArabicIndicDigits("لديك عرض بقيمة 5,400 ريال.")).toBe(
      "لديك عرض بقيمة ٥٬٤٠٠ ريال.",
    );
  });

  it("keeps grouping and decimal marks readable", () => {
    expect(toArabicIndicDigits("31,351.65")).toBe("٣١٬٣٥١٫٦٥");
  });

  it("leaves identifiers, brands and links alone", () => {
    expect(toArabicIndicDigits("STC Pay")).toBe("STC Pay");
    expect(toArabicIndicDigits("راسلنا على ops@rimal.sa")).toBe("راسلنا على ops@rimal.sa");
    expect(toArabicIndicDigits("https://mostaql.com/u/sara123")).toBe(
      "https://mostaql.com/u/sara123",
    );
    expect(toArabicIndicDigits("المرجع RZQ-086D25D1")).toBe("المرجع RZQ-086D25D1");
    expect(toArabicIndicDigits("الرقم الضريبي 399999999900003")).toBe(
      "الرقم الضريبي ٣٩٩٩٩٩٩٩٩٩٠٠٠٠٣",
    );
  });

  it("is a no-op on text that has no digits", () => {
    expect(toArabicIndicDigits("لا توجد أرقام هنا")).toBe("لا توجد أرقام هنا");
  });

  it("is idempotent", () => {
    const once = toArabicIndicDigits("لديك 3 فواتير");
    expect(toArabicIndicDigits(once)).toBe(once);
  });
});
