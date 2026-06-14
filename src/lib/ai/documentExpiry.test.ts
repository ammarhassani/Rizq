import { describe, it, expect } from "vitest";
import { buildExpiryPrompt } from "./documentExpiry";

describe("buildExpiryPrompt", () => {
  it("includes title", () => {
    const prompt = buildExpiryPrompt({ title: "شهادة ضريبية 2026" });
    expect(prompt).toContain("شهادة ضريبية 2026");
  });

  it("includes optional description when provided", () => {
    const prompt = buildExpiryPrompt({
      title: "عقد",
      description: "عقد سنة كاملة",
    });
    expect(prompt).toContain("عقد سنة كاملة");
  });

  it("includes category when provided", () => {
    const prompt = buildExpiryPrompt({ title: "tax", category: "tax_cert" });
    expect(prompt).toContain("tax_cert");
  });

  it("does not include description/category lines when absent", () => {
    const prompt = buildExpiryPrompt({ title: "doc" });
    expect(prompt).not.toContain("Description:");
    expect(prompt).not.toContain("Category:");
  });

  it("mentions YYYY-MM-DD format requirement", () => {
    const prompt = buildExpiryPrompt({ title: "cert" });
    expect(prompt).toContain("YYYY-MM-DD");
  });

  it("instructs to return null when no basis for expiry", () => {
    const prompt = buildExpiryPrompt({ title: "portfolio work" });
    expect(prompt).toContain("null");
  });
});
