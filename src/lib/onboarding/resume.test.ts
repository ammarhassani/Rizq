import { describe, it, expect } from "vitest";
import { resumeStepIndex } from "./resume";

// The wizard has 11 steps: index 0 = welcome … index 10 = review.
const TOTAL = 11;

describe("resumeStepIndex", () => {
  it("starts at the beginning when nothing has been saved", () => {
    expect(resumeStepIndex(0, TOTAL)).toBe(0);
    expect(resumeStepIndex(null, TOTAL)).toBe(0);
    expect(resumeStepIndex(undefined, TOTAL)).toBe(0);
  });

  it("a brand-new account lands on welcome, not on the step after it", () => {
    // Regression: the page used to normalise a stored 0 up to 1 before calling this, which
    // resolved to index 1 (identity) and skipped the welcome screen entirely.
    const STEP_KEYS = [
      "welcome", "identity", "location", "professional", "rates", "platforms",
      "portfolio", "brand", "defaults", "goals", "review",
    ];
    expect(STEP_KEYS[resumeStepIndex(0, STEP_KEYS.length)]).toBe("welcome");
    // …and the stored value is 1-based, so saving `identity` (2) resumes on `location`.
    expect(STEP_KEYS[resumeStepIndex(2, STEP_KEYS.length)]).toBe("location");
    expect(STEP_KEYS[resumeStepIndex(1, STEP_KEYS.length)]).toBe("identity");
  });

  it("resumes on the step AFTER the one last saved", () => {
    // The regression: saving step 3 then returning landed on step 3 again.
    expect(resumeStepIndex(3, TOTAL)).toBe(3); // 0-based index 3 = the 4th step
    expect(resumeStepIndex(1, TOTAL)).toBe(1);
  });

  it("clamps to the review step at the end", () => {
    expect(resumeStepIndex(TOTAL, TOTAL)).toBe(TOTAL - 1);
    expect(resumeStepIndex(TOTAL + 5, TOTAL)).toBe(TOTAL - 1);
  });

  it("clamps a negative or nonsense stored value to the start", () => {
    expect(resumeStepIndex(-4, TOTAL)).toBe(0);
    expect(resumeStepIndex(Number.NaN, TOTAL)).toBe(0);
  });

  it("is safe with no steps at all", () => {
    expect(resumeStepIndex(3, 0)).toBe(0);
  });
});
