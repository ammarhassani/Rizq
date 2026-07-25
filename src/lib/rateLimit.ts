import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Rate limiting, shared across serverless instances.
 *
 * The counter lives in Postgres (private.rate_limits, via the
 * public.check_rate_limit RPC), because the previous in-process Map was
 * ineffective on Vercel: every lambda instance kept its own buckets and cold
 * starts reset them, so the auth brute-force guards were effectively unenforced
 * in production.
 *
 * The DB path needs SUPABASE_SERVICE_ROLE_KEY: EXECUTE on the RPCs is granted to
 * service_role only and revoked from anon/authenticated, since keys are
 * IP-derived and server-chosen and a client-callable limiter would let anyone
 * burn a victim's budget. Without that env var we fall back to the in-memory
 * limiter and say so once, rather than pretending to enforce something we aren't.
 */

type Bucket = { count: number; expiresAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
};

/** Dev escape hatch: these limits are prod abuse-guards, not dev ergonomics. */
function bypassInDev(): boolean {
  return process.env.NODE_ENV === "development" && process.env.RATE_LIMIT_FORCE !== "1";
}

/**
 * Per-instance limiter. Correct within one process, which makes it fine for
 * tests and a single-instance deploy — but NOT across lambdas. Exported so the
 * unit tests can exercise the window/counting logic directly.
 */
export function checkRateLimitInMemory(
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
    return { allowed: false, remaining: 0, resetInMs: existing.expiresAt - now };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetInMs: existing.expiresAt - now,
  };
}

let adminClient: SupabaseClient | null = null;
let warnedNoServiceKey = false;

/** Service-role client for the private rate-limit RPCs. null when unconfigured. */
function getAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !serviceKey) {
    if (!warnedNoServiceKey) {
      warnedNoServiceKey = true;
      console.warn(
        "[rateLimit] SUPABASE_SERVICE_ROLE_KEY not set — falling back to the in-memory limiter. " +
          "On serverless this is per-instance and does NOT enforce the limit across lambdas."
      );
    }
    return null;
  }
  adminClient ??= createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

/**
 * Count a hit against `key` and report whether it is allowed.
 *
 * Fails OPEN if the DB call errors: the limiter is an abuse guard, and a
 * transient Postgres blip should not lock every user out of signing in. The
 * error is logged so the degradation is observable rather than silent.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  if (bypassInDev()) return { allowed: true, remaining: limit, resetInMs: windowMs };

  const admin = getAdminClient();
  if (!admin) return checkRateLimitInMemory(key, limit, windowMs);

  try {
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("empty rate-limit response");
    return {
      allowed: Boolean(row.allowed),
      remaining: Number(row.remaining ?? 0),
      resetInMs: Number(row.reset_in_ms ?? windowMs),
    };
  } catch (err) {
    console.error("[rateLimit] check failed — allowing the request", err);
    return { allowed: true, remaining: limit, resetInMs: windowMs };
  }
}

/**
 * Give back one hit — used when an attempt failed for a benign reason (a typo'd
 * or already-registered email) that created nothing and isn't abuse, so honest
 * users don't lock themselves out while fixing a mistake.
 */
export async function refundRateLimit(key: string): Promise<void> {
  if (bypassInDev()) return;

  const admin = getAdminClient();
  if (!admin) {
    const b = buckets.get(key);
    if (b && b.count > 0) b.count -= 1;
    return;
  }

  try {
    const { error } = await admin.rpc("refund_rate_limit", { p_key: key });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("[rateLimit] refund failed", err);
  }
}

/**
 * Sweep stale in-memory entries so the Map can't grow unbounded in a long-lived
 * process. No-op for the DB path, which cleans up opportunistically inside the
 * RPC. Kept so existing call sites don't need to care which path is active.
 */
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
