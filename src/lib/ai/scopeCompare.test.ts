import { describe, it, expect } from "vitest";
import { canCompare } from "./scopeCompare";

// ---------------------------------------------------------------------------
// canCompare — spec M1.11-C: minimum 3 past proposals required
// ---------------------------------------------------------------------------

describe("canCompare", () => {
  it("returns false when pastCount is 0", () => {
    expect(canCompare(0)).toBe(false);
  });

  it("returns false when pastCount is 1", () => {
    expect(canCompare(1)).toBe(false);
  });

  it("returns false when pastCount is 2", () => {
    expect(canCompare(2)).toBe(false);
  });

  it("returns true when pastCount is exactly 3", () => {
    expect(canCompare(3)).toBe(true);
  });

  it("returns true when pastCount is 5", () => {
    expect(canCompare(5)).toBe(true);
  });

  it("returns true for large counts", () => {
    expect(canCompare(100)).toBe(true);
  });
});
