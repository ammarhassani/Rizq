import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export type QuotaState =
  | {
      ok: true;
      mode: "anon" | "free" | "pro" | "admin";
      remaining: number | "unlimited";
      /** Total slots available (3 + bonus_quota for free; 1 for anon). */
      limit: number | "unlimited";
      session_id: string | null;
      user_id: string | null;
    }
  | {
      ok: false;
      mode: "anon" | "free";
      reason: "exhausted";
      remaining: 0;
      limit: number;
      // Path to send the user (login or upgrade)
      cta: "signup" | "upgrade";
    };

const ANON_FREE_QUERIES = 1; // PRD §4.4 — 1 free anon query per cookie
// spec-v2 Part IV.1 and the /upgrade page both advertise 5 free lookups / calendar month.
// (Was 3, which silently paywalled free users 2 lookups early — a spec/UI mismatch.)
const FREE_MONTHLY_QUERIES = 5;
const ANON_COOKIE = "rizq_anon_session";

/**
 * Returns the current user's quota state and a session_id (writing the
 * anon cookie if missing). Does NOT increment — call recordQuery() after
 * the calculation succeeds.
 */
export async function getQuotaState(): Promise<QuotaState> {
  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;

  if (user) {
    // Pull role + bonus from public.users
    const { data: profile } = await supabase
      .from("users")
      .select("role, bonus_quota")
      .eq("id", user.id)
      .single();

    const role = (profile?.role ?? "free") as "free" | "pro" | "admin";
    const bonus = profile?.bonus_quota ?? 0;

    if (role === "pro" || role === "admin") {
      return {
        ok: true,
        mode: role,
        remaining: "unlimited",
        limit: "unlimited",
        session_id: null,
        user_id: user.id,
      };
    }

    // Free user — count queries this calendar month (Riyadh time)
    const monthStart = startOfMonthRiyadh();
    const { count } = await supabase
      .from("queries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", monthStart);

    const used = count ?? 0;
    const limit = FREE_MONTHLY_QUERIES + bonus;
    const remaining = Math.max(0, limit - used);

    if (remaining === 0) {
      return {
        ok: false,
        mode: "free",
        reason: "exhausted",
        remaining: 0,
        limit,
        cta: "upgrade",
      };
    }
    return {
      ok: true,
      mode: "free",
      remaining,
      limit,
      session_id: null,
      user_id: user.id,
    };
  }

  // Anon flow — cookie-tracked
  const session_id = await getOrSetAnonSession();
  const { count } = await supabase
    .from("queries")
    .select("*", { count: "exact", head: true })
    .eq("session_id", session_id);

  const used = count ?? 0;
  const remaining = Math.max(0, ANON_FREE_QUERIES - used);

  if (remaining === 0) {
    return {
      ok: false,
      mode: "anon",
      reason: "exhausted",
      remaining: 0,
      limit: ANON_FREE_QUERIES,
      cta: "signup",
    };
  }
  return {
    ok: true,
    mode: "anon",
    remaining,
    limit: ANON_FREE_QUERIES,
    session_id,
    user_id: null,
  };
}

async function getOrSetAnonSession(): Promise<string> {
  const store = await cookies();
  const existing = store.get(ANON_COOKIE)?.value;
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) {
    return existing;
  }
  const fresh = randomUUID();
  try {
    store.set(ANON_COOKIE, fresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });
  } catch {
    // Server Component — cookies are read-only. Server Action will set it.
  }
  return fresh;
}

// Saudi Arabia is UTC+3 year-round (no DST). Hardcoding the offset is
// safe and avoids a date-fns-tz dependency just for this one call.
const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Returns the start of the current month *in Riyadh time*, expressed as
 * a UTC ISO string so it can be compared against `queries.created_at`
 * (which is stored as UTC `timestamptz`).
 *
 * Example: on May 14 2026 at 02:00 Riyadh time (= May 13 23:00 UTC),
 * this returns `2026-04-30T21:00:00.000Z` (= May 1 00:00 Riyadh).
 */
function startOfMonthRiyadh(): string {
  const now = new Date();
  const riyadh = new Date(now.getTime() + RIYADH_OFFSET_MS);
  // First day of month in Riyadh-shifted UTC → subtract offset to get back
  // to true UTC for the DB comparison.
  const firstOfMonthShifted = Date.UTC(
    riyadh.getUTCFullYear(),
    riyadh.getUTCMonth(),
    1
  );
  return new Date(firstOfMonthShifted - RIYADH_OFFSET_MS).toISOString();
}
