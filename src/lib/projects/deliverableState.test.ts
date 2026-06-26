import { describe, it, expect } from "vitest";
import { canAdvance, nextState, normalizeState } from "./deliverableState";

describe("normalizeState", () => {
  it("treats null/unknown as draft", () => {
    expect(normalizeState(null)).toBe("draft");
    expect(normalizeState(undefined)).toBe("draft");
    expect(normalizeState("nope")).toBe("draft");
  });
  it("keeps ready and sent", () => {
    expect(normalizeState("ready")).toBe("ready");
    expect(normalizeState("sent")).toBe("sent");
  });
});

describe("canAdvance (forward-only, adjacent, sent terminal)", () => {
  it("allows the adjacent forward steps", () => {
    expect(canAdvance("draft", "ready")).toBe(true);
    expect(canAdvance(null, "ready")).toBe(true); // null = draft
    expect(canAdvance("ready", "sent")).toBe(true);
  });
  it("rejects skips", () => {
    expect(canAdvance("draft", "sent")).toBe(false);
  });
  it("rejects backward moves", () => {
    expect(canAdvance("ready", "draft")).toBe(false);
    expect(canAdvance("sent", "ready")).toBe(false);
    expect(canAdvance("sent", "draft")).toBe(false);
  });
  it("rejects no-op and unknown targets", () => {
    expect(canAdvance("ready", "ready")).toBe(false);
    expect(canAdvance("draft", "shipped")).toBe(false);
  });
  it("sent is terminal", () => {
    expect(canAdvance("sent", "sent")).toBe(false);
  });
});

describe("nextState", () => {
  it("walks draft→ready→sent→null", () => {
    expect(nextState(null)).toBe("ready");
    expect(nextState("draft")).toBe("ready");
    expect(nextState("ready")).toBe("sent");
    expect(nextState("sent")).toBe(null);
  });
});
