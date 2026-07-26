import { describe, it, expect } from "vitest";
import { resolvePrefill } from "./toolPrefill";

const SPECIALTIES = new Set(["web-dev", "graphic-design", "translation"]);

describe("resolvePrefill", () => {
  it("uses the profile value when there is no URL parameter", () => {
    expect(resolvePrefill(null, "web-dev", SPECIALTIES)).toBe("web-dev");
  });

  it("lets an explicit URL parameter win over the profile", () => {
    // A "run again" link is a deliberate request for that combination.
    expect(resolvePrefill("translation", "web-dev", SPECIALTIES)).toBe("translation");
  });

  it("falls back to the profile when the URL value is not a known option", () => {
    expect(resolvePrefill("../../etc/passwd", "web-dev", SPECIALTIES)).toBe("web-dev");
  });

  it("returns empty when the profile does not know this field", () => {
    // A partial profile prefills what it knows and leaves the rest to the freelancer.
    expect(resolvePrefill(null, null, SPECIALTIES)).toBe("");
    expect(resolvePrefill(null, undefined, SPECIALTIES)).toBe("");
  });

  it("ignores a stale profile slug that is no longer a known option", () => {
    expect(resolvePrefill(null, "retired-specialty", SPECIALTIES)).toBe("");
  });

  it("returns empty when neither source is valid", () => {
    expect(resolvePrefill("nope", "also-nope", SPECIALTIES)).toBe("");
  });

  it("prefills all three fields from a complete profile", () => {
    const cities = new Set(["jeddah", "riyadh"]);
    const tiers = new Set(["junior", "mid", "senior"]);
    expect([
      resolvePrefill(null, "web-dev", SPECIALTIES),
      resolvePrefill(null, "jeddah", cities),
      resolvePrefill(null, "mid", tiers),
    ]).toEqual(["web-dev", "jeddah", "mid"]);
  });
});
