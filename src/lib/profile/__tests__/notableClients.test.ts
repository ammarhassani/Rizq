import { describe, it, expect } from "vitest";
import { normalizeNotableClients } from "../notableClients";

describe("normalizeNotableClients (bug ⑦)", () => {
  it("preserves an entry that contains a comma (no splitting)", () => {
    expect(normalizeNotableClients(["Acme, Inc."])).toEqual(["Acme, Inc."]);
    expect(normalizeNotableClients(["شركة الرزق، المحدودة"])).toEqual(["شركة الرزق، المحدودة"]);
  });

  it("trims, drops empties, and dedupes (keeping first)", () => {
    expect(normalizeNotableClients(["  Beta ", "", "Beta", "Gamma", "   "])).toEqual([
      "Beta",
      "Gamma",
    ]);
  });

  it("caps at the maximum", () => {
    const many = Array.from({ length: 25 }, (_, i) => `c${i}`);
    expect(normalizeNotableClients(many)).toHaveLength(20);
  });

  it("returns an empty array for all-empty input", () => {
    expect(normalizeNotableClients(["", "  "])).toEqual([]);
  });
});
