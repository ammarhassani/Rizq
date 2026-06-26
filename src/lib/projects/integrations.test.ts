import { describe, it, expect } from "vitest";
import {
  isValidProvider,
  isValidExternalUrl,
  validateIntegrationInput,
} from "./integrations";

describe("isValidProvider", () => {
  it("accepts known providers", () => {
    for (const p of ["figma", "github", "behance", "adobe", "drive", "other"]) {
      expect(isValidProvider(p)).toBe(true);
    }
  });
  it("rejects unknown providers", () => {
    expect(isValidProvider("dropbox")).toBe(false);
    expect(isValidProvider("")).toBe(false);
  });
});

describe("isValidExternalUrl", () => {
  it("accepts http/https URLs", () => {
    expect(isValidExternalUrl("https://figma.com/file/abc")).toBe(true);
    expect(isValidExternalUrl("http://example.com")).toBe(true);
  });
  it("rejects malformed or non-http(s) URLs", () => {
    expect(isValidExternalUrl("not a url")).toBe(false);
    expect(isValidExternalUrl("ftp://x.com")).toBe(false);
    expect(isValidExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isValidExternalUrl("")).toBe(false);
  });
});

describe("validateIntegrationInput", () => {
  it("accepts a valid integration and trims the label", () => {
    const r = validateIntegrationInput({
      provider: "figma",
      external_url: "https://figma.com/file/abc",
      display_label: "  Design file  ",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.display_label).toBe("Design file");
      expect(r.value.provider).toBe("figma");
    }
  });

  it("rejects an unknown provider", () => {
    const r = validateIntegrationInput({
      provider: "dropbox",
      external_url: "https://x.com",
      display_label: "x",
    });
    expect(r).toEqual({ ok: false, reason: "provider" });
  });

  it("rejects a bad URL", () => {
    const r = validateIntegrationInput({
      provider: "github",
      external_url: "nope",
      display_label: "repo",
    });
    expect(r).toEqual({ ok: false, reason: "url" });
  });

  it("rejects an empty or over-long label", () => {
    expect(
      validateIntegrationInput({ provider: "drive", external_url: "https://x.com", display_label: "  " })
    ).toEqual({ ok: false, reason: "label" });
    expect(
      validateIntegrationInput({
        provider: "drive",
        external_url: "https://x.com",
        display_label: "a".repeat(121),
      })
    ).toEqual({ ok: false, reason: "label" });
  });
});
