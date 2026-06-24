import { describe, it, expect } from "vitest";
import { sanitizeIntentTargets } from "../proposalChatShape";

describe("sanitizeIntentTargets (US4 honesty guard)", () => {
  it("keeps only AI-editable sections", () => {
    expect(sanitizeIntentTargets(["approach", "pricing", "scope_of_work", "terms", "timeline"])).toEqual([
      "approach",
      "scope_of_work",
    ]);
  });

  it("dedupes while preserving order", () => {
    expect(sanitizeIntentTargets(["understanding", "approach", "understanding"])).toEqual([
      "understanding",
      "approach",
    ]);
  });

  it("returns [] for nullish or all-invalid input", () => {
    expect(sanitizeIntentTargets(undefined)).toEqual([]);
    expect(sanitizeIntentTargets(null)).toEqual([]);
    expect(sanitizeIntentTargets(["pricing", "terms", "verification"])).toEqual([]);
  });
});
