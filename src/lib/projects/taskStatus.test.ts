import { describe, it, expect } from "vitest";
import { isValidStatus, normalizeStatus, completionRatio } from "./taskStatus";

describe("isValidStatus", () => {
  it("accepts the kanban statuses", () => {
    expect(isValidStatus("todo")).toBe(true);
    expect(isValidStatus("doing")).toBe(true);
    expect(isValidStatus("done")).toBe(true);
  });
  it("rejects anything else", () => {
    expect(isValidStatus("blocked")).toBe(false);
    expect(isValidStatus("")).toBe(false);
  });
});

describe("normalizeStatus", () => {
  it("defaults null/unknown to todo", () => {
    expect(normalizeStatus(null)).toBe("todo");
    expect(normalizeStatus(undefined)).toBe("todo");
    expect(normalizeStatus("nope")).toBe("todo");
  });
  it("keeps doing/done", () => {
    expect(normalizeStatus("doing")).toBe("doing");
    expect(normalizeStatus("done")).toBe("done");
  });
});

describe("completionRatio", () => {
  it("is 0 for an empty set", () => {
    expect(completionRatio([])).toBe(0);
  });
  it("counts only done", () => {
    expect(completionRatio(["done", "done", "todo", "doing"])).toBe(0.5);
    expect(completionRatio(["todo", "doing"])).toBe(0);
    expect(completionRatio(["done"])).toBe(1);
  });
  it("treats unknown as not-done", () => {
    expect(completionRatio(["done", "weird"])).toBe(0.5);
  });
});
