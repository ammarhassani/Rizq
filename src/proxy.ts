import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

const PROTECTED_PATTERN = /^\/(?:ar|en)\/dashboard(?:\/|$)/;
const ONBOARDING_PATTERN = /^\/(?:ar|en)\/onboarding(?:\/|$)/;
const AUTH_PAGES_PATTERN = /^\/(?:ar|en)\/(?:login|signup|forgot-password|reset-password|verify-email)(?:\/|$)/;

export default async function proxy(request: NextRequest) {
  // 1. Let next-intl decide locale routing first. It may return a redirect
  //    (e.g. / -> /ar) or a passthrough rewrite.
  const response = intlMiddleware(request);

  // 2. Refresh the Supabase session on top, propagating set-cookie headers
  //    onto whatever response intl produced.
  const user = await updateSession(request, response);

  const pathname = request.nextUrl.pathname;
  const locale: "ar" | "en" = pathname.startsWith("/en") ? "en" : "ar";

  // 3. Gate the dashboard tree behind an authenticated session.
  if (PROTECTED_PATTERN.test(pathname) || ONBOARDING_PATTERN.test(pathname)) {
    if (!user) {
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("returnTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Don't let signed-in users sit on /login or /signup. Bounce them home.
  if (AUTH_PAGES_PATTERN.test(pathname) && user) {
    // Exception: reset-password is reachable while signed-in via email link
    if (!/^\/(?:ar|en)\/reset-password/.test(pathname)) {
      const dashboardUrl = new URL(`/${locale}/dashboard`, request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return response;
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|auth|.*\\..*).*)",
};
