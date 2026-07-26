import { describe, it, expect } from "vitest";
import { resolveVatEligibility } from "./vatEligibility";

describe("resolveVatEligibility", () => {
  it("is eligible only when registered AND a number is recorded", () => {
    expect(resolveVatEligibility(true, "310000000000003")).toEqual({
      eligible: true,
      vatNumber: "310000000000003",
    });
  });

  it("rejects an unregistered freelancer even with a number on file", () => {
    expect(resolveVatEligibility(false, "310000000000003")).toEqual({
      eligible: false,
      reason: "not_registered",
    });
  });

  it("rejects an unregistered freelancer with no number", () => {
    expect(resolveVatEligibility(false, null)).toEqual({
      eligible: false,
      reason: "not_registered",
    });
  });

  it("rejects a registered freelancer who never recorded the number", () => {
    // A tax invoice without the seller's registration number is invalid.
    expect(resolveVatEligibility(true, null)).toEqual({
      eligible: false,
      reason: "missing_number",
    });
  });

  it("treats a blank number as missing", () => {
    expect(resolveVatEligibility(true, "   ")).toEqual({
      eligible: false,
      reason: "missing_number",
    });
  });

  it("treats a null/undefined registration flag as not registered", () => {
    expect(resolveVatEligibility(null, "310000000000003").eligible).toBe(false);
    expect(resolveVatEligibility(undefined, "310000000000003").eligible).toBe(false);
  });

  it("trims the recorded number so a padded value still prints cleanly", () => {
    expect(resolveVatEligibility(true, "  310000000000003 ")).toEqual({
      eligible: true,
      vatNumber: "310000000000003",
    });
  });
});
