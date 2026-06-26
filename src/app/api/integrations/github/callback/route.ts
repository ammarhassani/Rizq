/**
 * GitHub OAuth callback — Project Workspace (spec 004) Phase 5.
 * Server-only: verifies the CSRF state cookie, exchanges the code for a token,
 * encrypts it (envelope), and stores it via the SECURITY DEFINER RPC. The token
 * never reaches the browser. Redirects back to the app with a status flag.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { exchangeGithubCode, fetchGithubLogin, GITHUB_SCOPE, isGithubConfigured } from "@/lib/integrations/github";
import { encryptToken, isTokenCryptoConfigured } from "@/lib/integrations/tokenCrypto";

export async function GET(req: NextRequest) {
  const store = await cookies();
  const locale = store.get("NEXT_LOCALE")?.value === "ar" ? "ar" : "en";

  // Prefer returning to where the user started (project Integrations tab);
  // fall back to the dashboard. Relative-path only (set server-side).
  const ret = store.get("gh_oauth_return")?.value ?? null;
  const back = (status: string): string => {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    if (ret && ret.startsWith("/") && !ret.startsWith("//")) {
      const sep = ret.includes("?") ? "&" : "?";
      return `${base}${ret}${sep}integration=${status}`;
    }
    return `${base}/${locale}/dashboard?integration=${status}`;
  };

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = store.get("gh_oauth_state")?.value ?? null;

  // CSRF: state must match the cookie we set.
  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(back("error"));
  }
  store.delete("gh_oauth_state");
  store.delete("gh_oauth_return");

  if (!isGithubConfigured() || !isTokenCryptoConfigured()) {
    return NextResponse.redirect(back("not_configured"));
  }

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return NextResponse.redirect(back("error"));

  const exchanged = await exchangeGithubCode(code);
  if (!exchanged) return NextResponse.redirect(back("error"));

  const login = await fetchGithubLogin(exchanged.access_token);

  try {
    const { error } = await supabase.rpc("upsert_provider_connection", {
      p_provider: "github",
      p_scope: exchanged.scope ?? GITHUB_SCOPE,
      p_external_login: login,
      p_expires_at: null,
      p_access_token_enc: encryptToken(exchanged.access_token),
      p_refresh_token_enc: null,
    });
    if (error) {
      console.error("[github callback] upsert failed", error.message);
      return NextResponse.redirect(back("error"));
    }
  } catch (err) {
    console.error("[github callback] store failed", err);
    return NextResponse.redirect(back("error"));
  }

  return NextResponse.redirect(back("connected"));
}
