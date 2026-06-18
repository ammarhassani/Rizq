import { describe, it, expect } from "vitest";
import { normalizeSearch } from "./normalizeSearch";

describe("normalizeSearch", () => {
  it("lowercases and trims Latin text", () => {
    expect(normalizeSearch("  Proposals ")).toBe("proposals");
  });

  it("folds alef variants so أحمد matches احمد", () => {
    expect(normalizeSearch("أحمد")).toBe(normalizeSearch("احمد"));
    expect(normalizeSearch("إيمان")).toBe(normalizeSearch("ايمان"));
  });

  it("strips tashkeel diacritics", () => {
    expect(normalizeSearch("مُحَمَّد")).toBe(normalizeSearch("محمد"));
  });

  it("strips the tatweel", () => {
    expect(normalizeSearch("فــــاتورة")).toBe(normalizeSearch("فاتورة"));
  });

  it("folds taa marbuta and alef maqsura", () => {
    expect(normalizeSearch("فاتورة")).toBe(normalizeSearch("فاتوره"));
    expect(normalizeSearch("مصطفى")).toBe(normalizeSearch("مصطفي"));
  });

  it("supports substring matching after normalization", () => {
    const haystack = normalizeSearch("عروضي التقديمية");
    expect(haystack.includes(normalizeSearch("عروض"))).toBe(true);
  });
});
