import { describe, it, expect } from "vitest";
import {
  buildCitation,
  arabicRecordCount,
  arabicSourceCount,
  quoteBasisCitation,
} from "./citation";

describe("buildCitation", () => {
  it("names the dominant provenance, sample size, and year in both languages", () => {
    const c = buildCitation({
      dominant: "founder",
      sample_size: 47,
      source_count: 12,
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

  it("appends a widening note when the size pass widened", () => {
    const c = buildCitation({
      dominant: "submitted",
      sample_size: 6,
      source_count: 6,
      date_range: { earliest: "2026-01-01T00:00:00Z", latest: "2026-06-01T00:00:00Z" },
      fallback_kind: "size",
    });
    expect(c.en.toLowerCase()).toContain("project sizes");
    expect(c.ar).toContain("أحجام المشاريع");
  });

  it("uses the same size note however the widening arose", () => {
    const c = buildCitation({
      dominant: "reasoned",
      sample_size: 4,
      source_count: 1,
      date_range: { earliest: "2026-02-01T00:00:00Z", latest: "2026-06-01T00:00:00Z" },
      fallback_kind: "size",
    });
    expect(c.en.toLowerCase()).toContain("project sizes");
    expect(c.ar).toContain("أحجام المشاريع");
  });
});

describe("buildCitation — rows are not evidence (the published-ref triple)", () => {
  /**
   * The seed that fills every cell today stores ONE reference as a min/median/max
   * triple. Before this, the citation read "based on 3 records" and a reader had no
   * way to tell three findings from one document read three ways.
   */
  it("says how many sources the records came from, not just how many rows", () => {
    const c = buildCitation({
      dominant: "published_ref",
      sample_size: 3,
      source_count: 1,
      date_range: { earliest: "2026-06-27T00:00:00Z", latest: "2026-06-27T00:00:00Z" },
      fallback_kind: "none",
    });
    expect(c.en).toContain("3 records from 1 source");
    expect(c.ar).toContain("٣ سجلات من مصدر واحد");
  });

  it("pluralises the source count independently of the record count", () => {
    const c = buildCitation({
      dominant: "published_ref",
      sample_size: 12,
      source_count: 4,
      date_range: { earliest: "2026-01-01T00:00:00Z", latest: "2026-06-01T00:00:00Z" },
      fallback_kind: "none",
    });
    expect(c.en).toContain("12 records from 4 sources");
    expect(c.ar).toContain("١٢ سجلاً من ٤ مصادر");
    expect(c.ar).not.toMatch(/[0-9]/); // one numeral system per view
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

  it("the same agreement for مصدر", () => {
    expect(arabicSourceCount(1)).toBe("مصدر واحد");
    expect(arabicSourceCount(2)).toBe("مصدرين");
    expect(arabicSourceCount(5)).toBe("٥ مصادر");
    expect(arabicSourceCount(11)).toBe("١١ مصدرًا");
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
