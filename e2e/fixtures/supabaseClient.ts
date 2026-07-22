import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import type { DisposableUser } from "./users";

/**
 * Anon-key supabase-js clients signed in as the disposable test users, used by the
 * RLS-isolation spec to prove tenant isolation at the DATABASE layer (not just the UI):
 * user B queries user A's row id and must get zero rows. Reads creds from
 * e2e/.auth/users.json written by global-setup. Env comes from playwright.config's loader.
 */

const USERS_FILE = "e2e/.auth/users.json";

export function loadUsers(): Record<"main" | "isolation", DisposableUser> {
  return JSON.parse(readFileSync(USERS_FILE, "utf8"));
}

export async function signedInClient(
  which: "main" | "isolation",
): Promise<{ client: SupabaseClient; userId: string; user: DisposableUser }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY missing — check .env.local loader in playwright.config.ts");
  }
  const user = loadUsers()[which];
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error || !data.user) throw new Error(`sign-in failed for ${which}: ${error?.message}`);
  return { client, userId: data.user.id, user };
}
