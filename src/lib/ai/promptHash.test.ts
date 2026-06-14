import { describe, it, expect } from "vitest";
import { promptHash } from "./promptHash";

describe("promptHash", () => {
  it("is deterministic and 16 hex chars", () => {
    const a = promptHash("hello world");
    const b = promptHash("hello world");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });
  it("differs for different inputs", () => {
    expect(promptHash("a")).not.toBe(promptHash("b"));
  });
});
