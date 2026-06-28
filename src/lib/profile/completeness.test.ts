import { describe, it, expect } from "vitest";
import { profileCompleteness } from "./completeness";

describe("profileCompleteness", () => {
  it("empty profile → 0", () => {
    expect(profileCompleteness({})).toBe(0);
  });
  it("fully populated → 100", () => {
    expect(
      profileCompleteness({
        hasSpecialty: true, hasExperience: true, hasCity: true, hasRate: true, hasBrand: true,
        hasDefaults: true, hasVat: true, hasBio: true, hasGoals: true, hasPortfolio: true,
      })
    ).toBe(100);
  });
  it("weights value-driving fields highest", () => {
    const core = profileCompleteness({ hasSpecialty: true, hasExperience: true, hasRate: true, hasBrand: true });
    const nice = profileCompleteness({ hasVat: true, hasBio: true, hasGoals: true, hasPortfolio: true });
    expect(core).toBeGreaterThan(nice);
    expect(core).toBe(60); // 15+15+15+15
  });
  it("monotonic — adding a field never lowers the score", () => {
    const a = profileCompleteness({ hasSpecialty: true });
    const b = profileCompleteness({ hasSpecialty: true, hasCity: true });
    expect(b).toBeGreaterThanOrEqual(a);
  });
});
