import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles Supabase Auth callbacks for:
 *   - OAuth providers (Google, Apple, LinkedIn)
 *   - Email confirmation (post-signup verification link)
 *   - Password recovery (link from forgot-password email)
 *
 * The PKCE flow ships a `code` param that we exchange for a session.
 * On success we redirect to `next` (defaults to /ar). On failure we drop
 * to /login with an error marker the page can read.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/ar";
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Surface explicit provider errors (e.g. user cancelled OAuth) to the user
  if (errorParam) {
    console.error("[auth-callback] provider error", { errorParam, errorDescription });
    const locale = next.startsWith("/en") ? "en" : "ar";
    return NextResponse.redirect(new URL(`/${locale}/login?error=callback`, url.origin));
  }

  if (!code) {
    const locale = next.startsWith("/en") ? "en" : "ar";
    return NextResponse.redirect(new URL(`/${locale}/login?error=callback`, url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth-callback] exchange failed", error);
    const locale = next.startsWith("/en") ? "en" : "ar";
    return NextResponse.redirect(new URL(`/${locale}/login?error=callback`, url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
