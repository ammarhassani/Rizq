/**
 * Trivial in-memory rate limiter — fine for v0.1 single-instance deploys.
 * Swap for Upstash Redis when we go multi-instance.
 *
 * Window-based: counts hits per key in a fixed window; resets when the
 * window expires. NOT a sliding window — that's overkill for waitlist.
 */

type Bucket = { count: number; expiresAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
};

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  // Dev only: don't throttle — these limits are prod abuse-guards, not dev
  // ergonomics. NOT in test (so the limiter's own tests run) or prod. Set
  // RATE_LIMIT_FORCE=1 to exercise it locally.
  if (process.env.NODE_ENV === "development" && process.env.RATE_LIMIT_FORCE !== "1") {
    return { allowed: true, remaining: limit, resetInMs: windowMs };
  }

  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetInMs: windowMs };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: existing.expiresAt - now,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetInMs: existing.expiresAt - now,
  };
}

/**
 * Give back one hit on a key — used when an attempt failed for a benign reason
 * (e.g. a typo'd / undeliverable email, or an already-registered address) that
 * created nothing and isn't abuse. Keeps honest users from locking themselves
 * out while fixing a mistake. No-op if the window already expired.
 */
export function refundRateLimit(key: string) {
  const b = buckets.get(key);
  if (b && b.count > 0) b.count -= 1;
}

// Sweep stale entries occasionally so the Map doesn't grow unbounded
// in a long-lived process. Cheap O(n) walk; we expect <1k keys.
let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 60_000;
export function maybeSweep() {
  const now = Date.now();
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    if (b.expiresAt <= now) buckets.delete(k);
  }
}
