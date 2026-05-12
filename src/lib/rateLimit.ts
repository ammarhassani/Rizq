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
