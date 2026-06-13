"use server";

/**
 * AI actions for the Client Book — spec M2.6-A/B/C/D.
 * Owner-gated (RLS + explicit user_id check).
 * Pro-gated: insights + persona require Pro role. Follow-up is free.
 * Rule-based priority refresh is free for all.
 */

import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateClientInsights } from "@/lib/ai/clientInsights";
import { draftFollowup } from "@/lib/ai/clientFollowup";
import { generatePersona, canGeneratePersona } from "@/lib/ai/clientPersona";
import {
  scoreFollowUpPriority,
  defaultNextAction,
  type PriorityInput,
} from "@/lib/clients/priority";

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Fetch user + role. Returns null if not authenticated. */
async function getAuthContext() {
  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  return {
    supabase,
    user: userData.user,
    role: (profile?.role ?? "free") as "free" | "pro" | "admin",
  };
}

function isPro(role: "free" | "pro" | "admin"): boolean {
  return role === "pro" || role === "admin";
}

// ─── Return types ─────────────────────────────────────────────────────────────

export type AiInsightResult =
  | { ok: true; insight: string }
  | { ok: false; code: "unauthorized" | "upgrade" | "not_found" | "ai_error" | "error" };

export type AiFollowupResult =
  | { ok: true; draft: string }
  | { ok: false; code: "unauthorized" | "not_found" | "ai_error" | "error" };

export type AiPersonaResult =
  | { ok: true; persona: string }
  | { ok: false; code: "unauthorized" | "upgrade" | "not_found" | "insufficient_gigs" | "ai_error" | "error" };

export type PriorityRefreshResult =
  | { ok: true; priority: "low" | "medium" | "high"; suggestion: string }
  | { ok: false; code: "unauthorized" | "not_found" | "error" };

// ─── Input schemas ────────────────────────────────────────────────────────────

const ClientIdSchema = z.object({ client_id: z.string().uuid() });

// ─── generateClientInsightsAction ─────────────────────────────────────────────

/**
 * Generates AI insights for a client and stores them in clients.ai_notes.
 * Pro-gated.
 */
export async function generateClientInsightsAction(
  input: unknown
): Promise<AiInsightResult> {
  const parsed = ClientIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "error" };
  const { client_id } = parsed.data;

  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, code: "unauthorized" };
  if (!isPro(ctx.role)) return { ok: false, code: "upgrade" };

  const { supabase, user } = ctx;

  // Load client (owner-gated via user_id)
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("id, name, client_type, industry, tags, avg_payment_days")
    .eq("id", client_id)
    .eq("user_id", user.id)
    .single();

  if (clientErr || !client) return { ok: false, code: "not_found" };

  // Load recent gigs
  const { data: gigs } = await supabase
    .from("gigs")
    .select("title, amount_sar, status, delivery_date")
    .eq("client_id", client_id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Load proposals
  const { data: proposals } = await supabase
    .from("proposals")
    .select("client_name, price_anchor, status, created_at")
    .eq("client_id", client_id)
    .order("created_at", { ascending: false })
    .limit(5);

  const insightCtx = {
    name: client.name,
    client_type: client.client_type as string | null,
    industry: client.industry as string | null,
    tags: (client.tags as string[]) ?? [],
    gigs: (gigs ?? []).map((g) => ({
      title: g.title,
      amount_sar: g.amount_sar,
      status: g.status,
      date: g.delivery_date ?? null,
    })),
    proposals: (proposals ?? []).map((p) => ({
      title: p.client_name ?? null,
      amount_sar: p.price_anchor ?? null,
      status: p.status,
      date: p.created_at ?? null,
    })),
    avgPaymentDays: client.avg_payment_days as number | null,
  };

  const result = await generateClientInsights(insightCtx);
  if (!result) return { ok: false, code: "ai_error" };

  // Store Arabic insight in ai_notes
  const { error: updateErr } = await supabase
    .from("clients")
    .update({ ai_notes: result.ar, updated_at: new Date().toISOString() })
    .eq("id", client_id)
    .eq("user_id", user.id);

  if (updateErr) return { ok: false, code: "error" };

  revalidatePath(`/[locale]/clients/${client_id}`, "page");
  return { ok: true, insight: result.ar };
}

// ─── draftFollowupAction ──────────────────────────────────────────────────────

/**
 * Drafts a WhatsApp follow-up message for a client.
 * Free (available to all authenticated users).
 * Does NOT auto-send; freelancer copies the text.
 */
export async function draftFollowupAction(
  input: unknown
): Promise<AiFollowupResult> {
  const parsed = ClientIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "error" };
  const { client_id } = parsed.data;

  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, code: "unauthorized" };
  const { supabase, user } = ctx;

  // Load client
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("id, name, company, last_contacted_at, phone_whatsapp")
    .eq("id", client_id)
    .eq("user_id", user.id)
    .single();

  if (clientErr || !client) return { ok: false, code: "not_found" };

  // Calculate days since contact
  let daysSinceContact: number | null = null;
  if (client.last_contacted_at) {
    const lastContact = new Date(client.last_contacted_at as string);
    const now = new Date();
    daysSinceContact = Math.floor(
      (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  // Load the most recent gig
  const { data: lastGigRows } = await supabase
    .from("gigs")
    .select("title, delivery_date")
    .eq("client_id", client_id)
    .order("created_at", { ascending: false })
    .limit(1);

  const lastGig = lastGigRows?.[0] ?? null;

  // Fetch preferred_tone from users (M8 column — exists as of migration 20260613230814).
  // Validate against the union; default to "balanced" if absent or invalid.
  const VALID_TONES = new Set<string>(["formal", "balanced", "friendly"]);
  const { data: toneRow } = await supabase
    .from("users")
    .select("preferred_tone")
    .eq("id", user.id)
    .single();
  const rawTone = toneRow?.preferred_tone as string | null | undefined;
  const tone: "formal" | "balanced" | "friendly" =
    rawTone && VALID_TONES.has(rawTone)
      ? (rawTone as "formal" | "balanced" | "friendly")
      : "balanced";

  const followupCtx = {
    name: client.name as string,
    company: client.company as string | null,
    lastGigDescription: lastGig?.title ?? null,
    lastGigDate: lastGig?.delivery_date ?? null,
    daysSinceContact,
    tone,
  };

  const draft = await draftFollowup(followupCtx);
  if (!draft) return { ok: false, code: "ai_error" };

  return { ok: true, draft };
}

// ─── generatePersonaAction ────────────────────────────────────────────────────

/**
 * Generates an Arabic client persona and stores it in clients.client_persona.
 * Pro-gated. Requires total_gigs >= 3.
 */
export async function generatePersonaAction(
  input: unknown
): Promise<AiPersonaResult> {
  const parsed = ClientIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "error" };
  const { client_id } = parsed.data;

  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, code: "unauthorized" };
  if (!isPro(ctx.role)) return { ok: false, code: "upgrade" };

  const { supabase, user } = ctx;

  // Load client
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select(
      "id, name, client_type, industry, tags, avg_payment_days, total_value_sar, total_gigs"
    )
    .eq("id", client_id)
    .eq("user_id", user.id)
    .single();

  if (clientErr || !client) return { ok: false, code: "not_found" };

  const gigCount = (client.total_gigs as number) ?? 0;
  if (!canGeneratePersona(gigCount)) {
    return { ok: false, code: "insufficient_gigs" };
  }

  // Load gigs
  const { data: gigs } = await supabase
    .from("gigs")
    .select("title, amount_sar, status")
    .eq("client_id", client_id)
    .order("created_at", { ascending: false })
    .limit(10);

  const personaCtx = {
    name: client.name as string,
    client_type: client.client_type as string | null,
    industry: client.industry as string | null,
    tags: (client.tags as string[]) ?? [],
    avgPaymentDays: client.avg_payment_days as number | null,
    totalValueSar: (client.total_value_sar as number) ?? 0,
    gigCount,
    gigs: (gigs ?? []).map((g) => ({
      title: g.title,
      amount_sar: g.amount_sar,
      status: g.status,
    })),
  };

  const persona = await generatePersona(personaCtx);
  if (!persona) return { ok: false, code: "ai_error" };

  // Store persona
  const { error: updateErr } = await supabase
    .from("clients")
    .update({ client_persona: persona, updated_at: new Date().toISOString() })
    .eq("id", client_id)
    .eq("user_id", user.id);

  if (updateErr) return { ok: false, code: "error" };

  revalidatePath(`/[locale]/clients/${client_id}`, "page");
  return { ok: true, persona };
}

// ─── refreshFollowUpPriorityAction ────────────────────────────────────────────

/**
 * Computes rule-based follow-up priority from client data and stores the result.
 * Free for all authenticated users (no AI call).
 */
export async function refreshFollowUpPriorityAction(
  input: unknown
): Promise<PriorityRefreshResult> {
  const parsed = ClientIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "error" };
  const { client_id } = parsed.data;

  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, code: "unauthorized" };
  const { supabase, user } = ctx;

  // Load client
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("id, last_contacted_at, total_value_sar, avg_payment_days")
    .eq("id", client_id)
    .eq("user_id", user.id)
    .single();

  if (clientErr || !client) return { ok: false, code: "not_found" };

  // Compute daysSinceContact
  let daysSinceContact: number | null = null;
  if (client.last_contacted_at) {
    const lastContact = new Date(client.last_contacted_at as string);
    const now = new Date();
    daysSinceContact = Math.floor(
      (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  // Check for active proposals (sent or viewed, awaiting response)
  const { data: activeProposals } = await supabase
    .from("proposals")
    .select("id")
    .eq("client_id", client_id)
    .in("status", ["sent", "viewed"])
    .limit(1);

  const hasActiveProposal = (activeProposals?.length ?? 0) > 0;

  const priorityInput: PriorityInput = {
    daysSinceContact,
    totalValueSar: (client.total_value_sar as number) ?? 0,
    avgPaymentDays: client.avg_payment_days as number | null,
    hasActiveProposal,
  };

  const priority = scoreFollowUpPriority(priorityInput);
  // Use Arabic as primary locale for stored suggestion
  const suggestion = defaultNextAction(priority, daysSinceContact, "ar");

  // Store
  const { error: updateErr } = await supabase
    .from("clients")
    .update({
      follow_up_priority: priority,
      next_action_suggestion: suggestion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", client_id)
    .eq("user_id", user.id);

  if (updateErr) return { ok: false, code: "error" };

  revalidatePath(`/[locale]/clients/${client_id}`, "page");
  return { ok: true, priority, suggestion };
}
