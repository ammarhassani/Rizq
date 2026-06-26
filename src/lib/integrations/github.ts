/**
 * Project Workspace (spec 004) — Phase 5 GitHub OAuth helper (server-only).
 * Read-only scope (`read:user`) per the security review. Activates only when
 * GITHUB_CLIENT_ID/SECRET are set; otherwise the UI shows "not configured".
 */

const AUTHORIZE = "https://github.com/login/oauth/authorize";
const TOKEN = "https://github.com/login/oauth/access_token";
const USER = "https://api.github.com/user";

export const GITHUB_SCOPE = "read:user"; // read-only; never write/admin

export function isGithubConfigured(): boolean {
  return !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

export function githubRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${base}/api/integrations/github/callback`;
}

export function githubAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID ?? "",
    redirect_uri: githubRedirectUri(),
    scope: GITHUB_SCOPE,
    state,
    allow_signup: "false",
  });
  return `${AUTHORIZE}?${params.toString()}`;
}

export async function exchangeGithubCode(
  code: string
): Promise<{ access_token: string; scope: string } | null> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: githubRedirectUri(),
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; scope?: string; error?: string };
  if (!data.access_token) return null;
  return { access_token: data.access_token, scope: data.scope ?? GITHUB_SCOPE };
}

export async function fetchGithubLogin(accessToken: string): Promise<string | null> {
  const res = await fetch(USER, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { login?: string };
  return data.login ?? null;
}
