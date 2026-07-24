import { describe, it, expect } from "vitest";
import { isProActive } from "./tier";

const NOW = new Date("2026-07-23T12:00:00.000Z");
const future = new Date("2026-08-23T12:00:00.000Z").toISOString();
const past = new Date("2026-06-23T12:00:00.000Z").toISOString();

describe("isProActive", () => {
  it("admin is always Pro regardless of pro_until", () => {
    expect(isProActive("admin", null, NOW)).toBe(true);
    expect(isProActive("admin", past, NOW)).toBe(true);
  });

  it("pro with a future pro_until is active", () => {
    expect(isProActive("pro", future, NOW)).toBe(true);
  });

  it("pro with a past pro_until has lapsed to free", () => {
    expect(isProActive("pro", past, NOW)).toBe(false);
  });

  it("pro with null pro_until is not active (grant must have an expiry)", () => {
    expect(isProActive("pro", null, NOW)).toBe(false);
  });

  it("pro_until exactly now counts as expired", () => {
    expect(isProActive("pro", NOW.toISOString(), NOW)).toBe(false);
  });

  it("free is never Pro", () => {
    expect(isProActive("free", future, NOW)).toBe(false);
  });
});
