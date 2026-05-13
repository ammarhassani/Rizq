import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export type QuotaState =
  | {
      ok: true;
      mode: "anon" | "free" | "pro" | "admin";
      remaining: number | "unlimited";
      session_id: string | null;
      user_id: string | null;
    }
  | {
      ok: false;
      mode: "anon" | "free";
      reason: "exhausted";
      remaining: 0;
      // Path to send the user (login or upgrade)
      cta: "signup" | "upgrade";
    };

const ANON_FREE_QUERIES = 1; // PRD §4.4 — 1 free anon query per cookie
const FREE_MONTHLY_QUERIES = 3; // PRD §4.4 — 3 / calendar month
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
      return { ok: false, mode: "free", reason: "exhausted", remaining: 0, cta: "upgrade" };
    }
    return {
      ok: true,
      mode: "free",
      remaining,
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
    return { ok: false, mode: "anon", reason: "exhausted", remaining: 0, cta: "signup" };
  }
  return {
    ok: true,
    mode: "anon",
    remaining,
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

function startOfMonthRiyadh(): string {
  // Approximation: KSA is UTC+3 year-round (no DST). Compute month-start in Riyadh time
  // expressed as a UTC ISO string for the DB comparison.
  const now = new Date();
  // Shift to Riyadh, take year+month, build back as UTC
  const riyadhNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const year = riyadhNow.getUTCFullYear();
  const month = riyadhNow.getUTCMonth();
  // Month start in Riyadh = year-month-01 00:00:00 +03 = year-month-(00:00 - 3h) UTC
  const utcMonthStart = new Date(Date.UTC(year, month, 1, -3, 0, 0));
  return utcMonthStart.toISOString();
}
