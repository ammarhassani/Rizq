import { describe, it, expect } from "vitest";
import { isValidShareToken } from "../shareToken";

describe("isValidShareToken (share-link state guard)", () => {
  it("accepts a base64url token of valid length", () => {
    expect(isValidShareToken("Abc123_-Def456ghiJKL")).toBe(true);
    expect(isValidShareToken("valid_token-123")).toBe(true);
  });

  it("rejects empty, too-short, and too-long tokens", () => {
    expect(isValidShareToken("")).toBe(false);
    expect(isValidShareToken(null)).toBe(false);
    expect(isValidShareToken(undefined)).toBe(false);
    expect(isValidShareToken("short")).toBe(false);
    expect(isValidShareToken("a".repeat(65))).toBe(false);
  });

  it("rejects injection-shaped / non-base64url input", () => {
    expect(isValidShareToken("abc'; DROP TABLE proposals;--")).toBe(false);
    expect(isValidShareToken("has spaces here")).toBe(false);
    expect(isValidShareToken("emoji😀token")).toBe(false);
  });
});
