"use server";

/**
 * Project Workspace (spec 004) — GitHub usage (read-only).
 * Lists the connected user's PUBLIC repos via the stored token (decrypted
 * server-side). Read-only/public only — honors the read:user scope + the
 * security review. The token never leaves the server.
 */

import { createClient } from "@/lib/supabase/server";
import { decryptToken, isTokenCryptoConfigured } from "@/lib/integrations/tokenCrypto";

export type GithubRepo = {
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stars: number;
  updated_at: string | null;
};

export type ListGithubReposResult =
  | { ok: true; login: string | null; repos: GithubRepo[] }
  | { ok: false; code: "unauthorized" | "not_connected" | "error" };

export async function listGithubRepos(): Promise<ListGithubReposResult> {
  if (!isTokenCryptoConfigured()) return { ok: false, code: "error" };

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };

  // Find the user's active GitHub connection (account-level).
  const { data: conns } = await supabase.rpc("list_provider_connections");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gh = ((conns as any[]) ?? []).find((c) => c.provider === "github" && c.status === "active");
  if (!gh) return { ok: false, code: "not_connected" };

  const { data: secret } = await supabase.rpc("get_provider_connection_secret", { p_connection_id: gh.id });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enc = (secret as any[])?.[0]?.access_token_enc as string | undefined;
  if (!enc) return { ok: false, code: "not_connected" };

  let token: string;
  try {
    token = decryptToken(enc);
  } catch {
    return { ok: false, code: "error" };
  }

  const login = (gh.external_login as string | null) ?? null;
  // Public endpoint — read-only, no repo scope needed (honors read:user).
  const url = login
    ? `https://api.github.com/users/${encodeURIComponent(login)}/repos?per_page=50&sort=updated&type=owner`
    : `https://api.github.com/user/repos?per_page=50&sort=updated&visibility=public`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return { ok: false, code: "error" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json()) as any[];
  const repos: GithubRepo[] = (Array.isArray(data) ? data : []).map((r) => ({
    full_name: r.full_name,
    html_url: r.html_url,
    description: r.description ?? null,
    language: r.language ?? null,
    stars: r.stargazers_count ?? 0,
    updated_at: r.updated_at ?? null,
  }));

  return { ok: true, login, repos };
}
