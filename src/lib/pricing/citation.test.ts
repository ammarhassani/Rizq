import { describe, it, expect } from "vitest";
import { buildCitation } from "./citation";

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
});
