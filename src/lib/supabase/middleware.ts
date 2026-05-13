import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

/**
 * Refreshes the Supabase auth session and propagates cookie updates to the
 * outgoing response. Returns the current user (or null) so callers can do
 * protected-route gating in middleware.
 *
 * Must be called from proxy.ts on every request that may carry a session
 * cookie. Per the Supabase docs: getUser() (not getSession()) revalidates
 * the JWT against the auth server, which is required for security.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse
) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
