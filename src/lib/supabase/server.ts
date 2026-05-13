import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use in Server Components, Server Actions, and Route
 * Handlers. Reads + writes cookies via next/headers.
 *
 * Auth session refresh lives in proxy.ts (middleware) — Server Components
 * cannot mutate cookies, so writes here are silently swallowed when called
 * from a Server Component context.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component context — cookies are read-only here.
            // Session refresh happens in middleware (proxy.ts) instead.
          }
        },
      },
    }
  );
}

/**
 * @deprecated Use {@link createClient} instead. Kept for Sprint 1 callers.
 */
export const getSupabaseServerClient = createClient;
