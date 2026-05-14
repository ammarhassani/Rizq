"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OAuthProvider = "google" | "apple" | "linkedin_oidc";

export type OAuthResult =
  | { ok: true; url: string }
  | { ok: false; code: "provider_not_configured" | "error" };

/**
 * Initiates an OAuth flow with the given provider. Returns a redirect URL
 * the client navigates to. If the provider isn't enabled in Supabase Auth,
 * we surface that as a user-friendly error instead of throwing.
 */
export async function startOAuth(
  provider: OAuthProvider,
  locale: "ar" | "en" = "ar"
): Promise<OAuthResult> {
  const supabase = await createClient();
  const h = await headers();
  const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      // Always route through /dashboard. The dashboard checks
      // users.onboarded_at and forwards to /onboarding only for new users.
      redirectTo: `${origin}/auth/callback?next=/${locale}/dashboard`,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("provider is not enabled") || msg.includes("unsupported provider")) {
      return { ok: false, code: "provider_not_configured" };
    }
    console.error("[oauth] error", error);
    return { ok: false, code: "error" };
  }

  if (!data?.url) return { ok: false, code: "error" };
  return { ok: true, url: data.url };
}

/**
 * Server-action variant that redirects directly. Useful for form-action="..."
 * patterns where the client doesn't need the URL.
 */
export async function startOAuthAndRedirect(
  provider: OAuthProvider,
  locale: "ar" | "en" = "ar"
) {
  const result = await startOAuth(provider, locale);
  if (result.ok) redirect(result.url);
  return result;
}
