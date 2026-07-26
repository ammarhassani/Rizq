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
