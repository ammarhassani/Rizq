"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ShareChannel = "link" | "whatsapp" | "email" | "pdf_download";

// ---------------------------------------------------------------------------
// setProposalShare
// ---------------------------------------------------------------------------

const SetShareSchema = z.object({
  proposal_id: z.string().uuid(),
  share: z.boolean(),
});

type SetShareResult =
  | { ok: true; token?: string }
  | { ok: false; code: "unauthorized" | "not_found" | "error" };

/**
 * Owner-gated toggle for public_share on a proposal.
 *
 * - On enable: generates a url-safe share_token if absent, sets public_share = true,
 *   and bumps status from 'final' → 'sent' (never downgrades from sent/archived).
 * - On disable: sets public_share = false (token is preserved for re-enable).
 * - Returns { ok, token? } — token is returned when share is being enabled.
 */
export async function setProposalShare(
  rawInput: unknown
): Promise<SetShareResult> {
  const parsed = SetShareSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "error" };
  const { proposal_id, share } = parsed.data;

  const supabase = await createClient();

  // Auth check — must be the owner (RLS will also enforce this on the UPDATE).
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };

  // Load the existing proposal to check share_token + status + client linkage.
  const { data: proposal, error: fetchErr } = await supabase
    .from("proposals")
    .select("id, share_token, status, public_share, client_id, price_anchor, artifact_json")
    .eq("id", proposal_id)
    .single();

  if (fetchErr || !proposal) return { ok: false, code: "not_found" };

  let token = (proposal.share_token as string | null) ?? undefined;

  const update: Record<string, unknown> = {
    public_share: share,
    updated_at: new Date().toISOString(),
  };

  if (share) {
    // Generate a new token if absent.
    if (!token) {
      // 18 bytes → 24 url-safe base64 characters, no padding.
      const bytes = new Uint8Array(18);
      crypto.getRandomValues(bytes);
      token = btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
      update["share_token"] = token;
    }

    // Bump status: final → sent, but don't touch sent/archived/draft.
    const currentStatus = proposal.status as string | null;
    if (currentStatus === "final") {
      update["status"] = "sent";
    }
  }

  const { error: updateErr } = await supabase
    .from("proposals")
    .update(update)
    .eq("id", proposal_id);

  if (updateErr) {
    console.error("[setProposalShare] update failed", updateErr);
    return { ok: false, code: "error" };
  }

  // M1→M2: When sharing is enabled, insert 'proposal_sent' timeline event
  // and bump last_contacted_at (best-effort — don't fail if this errors)
  const userId = userResult.user.id;
  const clientId = proposal.client_id as string | null;
  if (share && clientId) {
    const artifactJson = proposal.artifact_json as Record<string, unknown> | null;
    const proposalTitle =
      (artifactJson?.title as string | null) ??
      (artifactJson?.clientName as string | null) ??
      proposal_id;

    try {
      await supabase.from("client_timeline").insert({
        client_id: clientId,
        user_id: userId,
        event_type: "proposal_sent",
        event_data: {
          proposal_id,
          title: proposalTitle,
          price_anchor: proposal.price_anchor ?? null,
        },
      });

      // Bump last_contacted_at
      await supabase
        .from("clients")
        .update({
          last_contacted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId)
        .eq("user_id", userId);
    } catch (err) {
      console.warn("[setProposalShare] client_timeline insert failed", err);
    }
  }

  return share ? { ok: true, token } : { ok: true };
}

// ---------------------------------------------------------------------------
// logProposalView  (best-effort, anon-callable)
// ---------------------------------------------------------------------------

/**
 * Calls the anon-accessible RPC log_proposal_view.
 * Best-effort — errors are silently swallowed.
 * Used by LogProposalView client component on share page mount.
 */
export async function logProposalView(token: string): Promise<void> {
  if (!token) return;

  try {
    const supabase = await createClient();
    const h = await headers();
    const ua = h.get("user-agent") ?? null;

    await supabase.rpc("log_proposal_view", {
      p_token: token,
      p_channel: "link" satisfies ShareChannel,
      p_agent: ua,
    });
  } catch {
    /* best-effort */
  }
}

// ---------------------------------------------------------------------------
// logShareChannel  (best-effort, anon-callable)
// ---------------------------------------------------------------------------

const LogChannelSchema = z.object({
  token: z.string().min(1),
  channel: z.enum(["whatsapp", "pdf_download"]),
});

/**
 * Log when a viewer uses the WhatsApp share or PDF download button.
 * Best-effort — errors are silently swallowed.
 */
export async function logShareChannel(rawInput: unknown): Promise<void> {
  const parsed = LogChannelSchema.safeParse(rawInput);
  if (!parsed.success) return;
  const { token, channel } = parsed.data;

  try {
    const supabase = await createClient();
    const h = await headers();
    const ua = h.get("user-agent") ?? null;

    await supabase.rpc("log_proposal_view", {
      p_token: token,
      p_channel: channel satisfies ShareChannel,
      p_agent: ua,
    });
  } catch {
    /* best-effort */
  }
}

// ---------------------------------------------------------------------------
// buildWhatsappShareText helper
// ---------------------------------------------------------------------------

/**
 * One-line bilingual summary for WhatsApp sharing.
 * e.g. "عرض تقديمي من رِزق | Rizq proposal — https://rizq.sa/ar/p/abc123"
 */
export async function buildWhatsappShareText(
  token: string,
  locale: "ar" | "en",
  origin: string
): Promise<string> {
  const url = `${origin}/${locale}/p/${token}`;
  if (locale === "ar") {
    return `عرض تقديمي احترافي من رِزق — سعّر بثقة.\n${url}`;
  }
  return `A professional proposal from Rizq — Price with confidence.\n${url}`;
}
