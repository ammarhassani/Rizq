import { describe, it, expect } from "vitest";
import { derivePricingJson } from "./templateHelpers";

describe("derivePricingJson", () => {
  it("uses deposit 50 as default", () => {
    const result = derivePricingJson({ scope_json: { revisions: 2, ip_transfer: "full_transfer" } });
    expect(result.deposit_pct).toBe(50);
  });

  it("reads revisions from scope_json when numeric", () => {
    const result = derivePricingJson({ scope_json: { revisions: 3 } });
    expect(result.revisions).toBe(3);
  });

  it("defaults revisions to null when absent", () => {
    const result = derivePricingJson({ scope_json: {} });
    expect(result.revisions).toBeNull();
  });

  it("defaults revisions to null when non-numeric", () => {
    const result = derivePricingJson({ scope_json: { revisions: "many" } });
    expect(result.revisions).toBeNull();
  });

  it("maps full_transfer ip_transfer", () => {
    const result = derivePricingJson({ scope_json: { ip_transfer: "full_transfer" } });
    expect(result.ip_terms).toBe("full_transfer");
  });

  it("maps license ip_transfer", () => {
    const result = derivePricingJson({ scope_json: { ip_transfer: "license" } });
    expect(result.ip_terms).toBe("license");
  });

  it("maps per_project ip_transfer", () => {
    const result = derivePricingJson({ scope_json: { ip_transfer: "per_project" } });
    expect(result.ip_terms).toBe("per_project");
  });

  it("falls back to full_transfer for unclear ip_transfer", () => {
    const result = derivePricingJson({ scope_json: { ip_transfer: "unclear" } });
    expect(result.ip_terms).toBe("full_transfer");
  });

  it("falls back to full_transfer for null ip_transfer", () => {
    const result = derivePricingJson({ scope_json: { ip_transfer: null } });
    expect(result.ip_terms).toBe("full_transfer");
  });

  it("maps formal tone_preference", () => {
    const result = derivePricingJson({ scope_json: {}, tone_preference: "formal" });
    expect(result.tone_preference).toBe("formal");
  });

  it("maps friendly tone_preference", () => {
    const result = derivePricingJson({ scope_json: {}, tone_preference: "friendly" });
    expect(result.tone_preference).toBe("friendly");
  });

  it("maps persuasive tone_preference", () => {
    const result = derivePricingJson({ scope_json: {}, tone_preference: "persuasive" });
    expect(result.tone_preference).toBe("persuasive");
  });

  it("defaults tone_preference to balanced for null", () => {
    const result = derivePricingJson({ scope_json: {}, tone_preference: null });
    expect(result.tone_preference).toBe("balanced");
  });

  it("defaults tone_preference to balanced for unknown value", () => {
    const result = derivePricingJson({ scope_json: {}, tone_preference: "casual" });
    expect(result.tone_preference).toBe("balanced");
  });

  it("returns all four fields", () => {
    const result = derivePricingJson({ scope_json: { revisions: 2, ip_transfer: "license" }, tone_preference: "formal" });
    expect(Object.keys(result).sort()).toEqual(["deposit_pct", "ip_terms", "revisions", "tone_preference"]);
  });
});
