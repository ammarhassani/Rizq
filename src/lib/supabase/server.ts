import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client. Uses the publishable (anon) key.
 * For the waitlist insert flow, RLS grants the anon role INSERT on
 * `public.waitlist` (specific columns only). No SELECT/UPDATE/DELETE.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookies) {
          for (const { name, value, options } of cookies) {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // setAll called from a Server Component — cookies cannot be set here;
              // ignore. Middleware refreshes the session.
            }
          }
        },
      },
    }
  );
}
