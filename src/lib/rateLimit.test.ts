import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkRateLimit } from "./rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first hit and reports remaining", () => {
    const r = checkRateLimit("test:alice", 3, 60_000);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it("counts subsequent hits down to zero", () => {
    const key = "test:bob";
    expect(checkRateLimit(key, 3, 60_000).remaining).toBe(2);
    expect(checkRateLimit(key, 3, 60_000).remaining).toBe(1);
    expect(checkRateLimit(key, 3, 60_000).remaining).toBe(0);
  });

  it("blocks the (limit+1)-th hit and surfaces resetInMs", () => {
    const key = "test:carol";
    for (let i = 0; i < 3; i++) checkRateLimit(key, 3, 60_000);
    const blocked = checkRateLimit(key, 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetInMs).toBeGreaterThan(0);
    expect(blocked.resetInMs).toBeLessThanOrEqual(60_000);
  });

  it("resets after the window expires", () => {
    const key = "test:dan";
    for (let i = 0; i < 3; i++) checkRateLimit(key, 3, 60_000);
    expect(checkRateLimit(key, 3, 60_000).allowed).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(61_000);

    const fresh = checkRateLimit(key, 3, 60_000);
    expect(fresh.allowed).toBe(true);
    expect(fresh.remaining).toBe(2);
  });

  it("keys are isolated — Alice's quota doesn't affect Bob", () => {
    const a = "iso:alice";
    const b = "iso:bob";
    for (let i = 0; i < 3; i++) checkRateLimit(a, 3, 60_000);
    expect(checkRateLimit(a, 3, 60_000).allowed).toBe(false);
    expect(checkRateLimit(b, 3, 60_000).allowed).toBe(true);
  });

  it("respects different limits and window sizes per call", () => {
    const key = "iso:variable";
    // First call sets up the bucket. Subsequent calls reuse that bucket's
    // expiry, but the caller's `limit` is still re-evaluated each call.
    expect(checkRateLimit(key, 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 1, 60_000).allowed).toBe(false);
  });
});
