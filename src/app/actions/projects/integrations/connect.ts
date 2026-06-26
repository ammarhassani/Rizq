"use server";

/**
 * Project Workspace (spec 004) — Phase 5 connection actions.
 * start (returns the GitHub authorize URL + sets a CSRF state cookie),
 * list (non-secret), revoke. Tokens are written by the callback route, never
 * here. All DB access is via the SECURITY DEFINER RPCs (no client table grant).
 */

import { z } from "zod";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isGithubConfigured, githubAuthorizeUrl } from "@/lib/integrations/github";

export type StartConnectionResult =
  | { ok: true; url: string }
  | { ok: false; code: "unauthorized" | "not_configured" | "unsupported" };

export async function startProviderConnection(rawInput: unknown): Promise<StartConnectionResult> {
  const parsed = z.object({ provider: z.string() }).safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "unsupported" };
  if (parsed.data.provider !== "github") return { ok: false, code: "unsupported" };
  if (!isGithubConfigured()) return { ok: false, code: "not_configured" };

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };

  const state = crypto.randomUUID();
  const store = await cookies();
  store.set("gh_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return { ok: true, url: githubAuthorizeUrl(state) };
}

export type ProviderConnectionRow = {
  id: string;
  provider: string;
  status: string;
  external_login: string | null;
};

export async function listProviderConnections(): Promise<ProviderConnectionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_provider_connections");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) ?? []).map((r) => ({
    id: r.id,
    provider: r.provider,
    status: r.status,
    external_login: r.external_login ?? null,
  }));
}

export async function revokeProviderConnection(rawInput: unknown): Promise<{ ok: boolean }> {
  const parsed = z.object({ connection_id: z.string().uuid() }).safeParse(rawInput);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false };

  await supabase.rpc("revoke_provider_connection", { p_connection_id: parsed.data.connection_id });
  revalidatePath("/[locale]/projects/[id]", "page");
  return { ok: true };
}
