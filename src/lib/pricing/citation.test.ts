import { describe, it, expect } from "vitest";
import { buildCitation, arabicRecordCount, quoteBasisCitation } from "./citation";

describe("buildCitation", () => {
  it("names the dominant provenance, sample size, and year in both languages", () => {
    const c = buildCitation({
      dominant: "founder",
      sample_size: 47,
      date_range: { earliest: "2025-01-01T00:00:00Z", latest: "2026-05-01T00:00:00Z" },
      fallback_kind: "none",
    });
    expect(c.en).toContain("47");
    expect(c.en.toLowerCase()).toContain("editorial");
    expect(c.ar).toContain("تحريري");
    expect(c.ar).not.toContain("undefined");
    // Arabic counted-noun agreement + Arabic-Indic digits (n=47 → tamyīz form).
    expect(c.ar).toContain("٤٧ سجلاً");
    expect(c.ar).not.toContain("47");
  });

  it("appends a widening note when fallback was used", () => {
    const c = buildCitation({
      dominant: "submitted",
      sample_size: 6,
      date_range: { earliest: "2026-01-01T00:00:00Z", latest: "2026-06-01T00:00:00Z" },
      fallback_kind: "region",
    });
    expect(c.en.toLowerCase()).toContain("region");
    expect(c.ar).toContain("المنطقة");
  });

  it("uses the all-cities note for a specialty-level widening", () => {
    const c = buildCitation({
      dominant: "reasoned",
      sample_size: 4,
      date_range: { earliest: "2026-02-01T00:00:00Z", latest: "2026-06-01T00:00:00Z" },
      fallback_kind: "specialty",
    });
    expect(c.en.toLowerCase()).toContain("all cities");
    expect(c.ar).toContain("جميع المدن");
  });
});

describe("arabicRecordCount — counted-noun agreement", () => {
  it("singular / dual / paucity / tamyīz", () => {
    expect(arabicRecordCount(1)).toBe("سجل واحد");
    expect(arabicRecordCount(2)).toBe("سجلين");
    expect(arabicRecordCount(5)).toBe("٥ سجلات");
    expect(arabicRecordCount(10)).toBe("١٠ سجلات");
    expect(arabicRecordCount(11)).toBe("١١ سجلاً");
  });
});

describe("quoteBasisCitation — only a market quote may cite the benchmark", () => {
  const market = "تقدير رِزق بناءً على ٥ سجلات (مراجع منشورة) حتى عام ٢٠٢٦.";
  it("market basis passes the citation through untouched", () => {
    expect(quoteBasisCitation("market", market, "ar")).toBe(market);
  });
  it("scope and budget bases disclaim benchmark backing but keep the reference", () => {
    for (const basis of ["scope", "client_budget"] as const) {
      const c = quoteBasisCitation(basis, market, "ar");
      expect(c).not.toBe(market);
      expect(c).toContain(market);
      expect(quoteBasisCitation(basis, "Rizq estimate based on 5 records.", "en")).toMatch(/single project/);
    }
  });
});
