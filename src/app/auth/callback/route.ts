import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles Supabase Auth callbacks for:
 *   - OAuth providers (Google, Apple, LinkedIn)
 *   - Email confirmation (post-signup verification link)
 *   - Password recovery (link from forgot-password email)
 *
 * The PKCE flow ships a `code` param that we exchange for a session.
 * On success we redirect to `next` (defaults to /ar). On any failure
 * (including unexpected throws) we redirect to /login with an error
 * marker the page can read — never a 500 page.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    // Post-auth users land in the app. An explicit `next`/returnTo (e.g. a
    // deep link the user was sent to login from) is still honored.
    const next = url.searchParams.get("next") ?? "/ar/dashboard";
    const errorParam = url.searchParams.get("error");

    const locale = next.startsWith("/en") ? "en" : "ar";
    const fallback = new URL(`/${locale}/login?error=callback`, url.origin);

    // Surface explicit provider errors (e.g. user cancelled OAuth)
    if (errorParam) {
      console.error("[auth-callback] provider error", { errorParam });
      return NextResponse.redirect(fallback);
    }

    if (!code) {
      return NextResponse.redirect(fallback);
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // Don't log the full error — it may contain email or other PII.
      console.error("[auth-callback] exchange failed", { code: error.code });
      return NextResponse.redirect(fallback);
    }

    return NextResponse.redirect(new URL(next, url.origin));
  } catch (err) {
    // Defense in depth: even if URL parsing or createClient throws, send
    // the user somewhere they can recover from instead of a 500.
    console.error("[auth-callback] uncaught", {
      type: err instanceof Error ? err.name : typeof err,
    });
    const origin = (() => {
      try {
        return new URL(request.url).origin;
      } catch {
        return "";
      }
    })();
    return NextResponse.redirect(`${origin}/ar/login?error=callback`);
  }
}
