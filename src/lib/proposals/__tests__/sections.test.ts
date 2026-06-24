import { describe, it, expect } from "vitest";
import {
  AI_EDITABLE_SECTION_IDS,
  isAiEditableSection,
  assertNoProtectedSections,
} from "../sections";

describe("AI-editable section allowlist (honesty guard)", () => {
  it("contains exactly the five prose sections", () => {
    expect([...AI_EDITABLE_SECTION_IDS].sort()).toEqual(
      ["approach", "assumptions", "cover_letter", "scope_of_work", "understanding"].sort(),
    );
  });

  it("excludes protected sections (price/timeline/milestones/terms/etc.)", () => {
    for (const id of ["pricing", "timeline", "milestones", "terms", "about", "next_steps", "verification", "cover"]) {
      expect(isAiEditableSection(id)).toBe(false);
    }
  });

  it("accepts editable prose sections", () => {
    for (const id of AI_EDITABLE_SECTION_IDS) {
      expect(isAiEditableSection(id)).toBe(true);
    }
  });

  it("assertNoProtectedSections passes for editable targets", () => {
    expect(() => assertNoProtectedSections(["approach", "scope_of_work"])).not.toThrow();
  });

  it("assertNoProtectedSections throws when a protected target is present", () => {
    expect(() => assertNoProtectedSections(["approach", "pricing"])).toThrow(/pricing/);
    expect(() => assertNoProtectedSections(["terms"])).toThrow(/terms/);
  });
});
