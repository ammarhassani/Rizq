"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { artifactTitle } from "@/lib/proposals/artifact";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const InputSchema = z.object({
  proposal_id: z.string().uuid(),
  // Optional parent project (feature 002). When present, the gig becomes the
  // money child of that project. Omitted by the legacy direct-create path.
  project_id: z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type CreateGigFromProposalResult =
  | { ok: true; gig_id: string }
  | {
      ok: false;
      code: "unauthorized" | "invalid" | "not_found" | "quota_exhausted" | "error";
    };

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

/**
 * One-tap "Create gig from proposal" — Phase-3 task 3.10 (M1→M3).
 *
 * Loads the owner's proposal, creates a gig pre-filled from proposal data:
 *   - title: the proposal title, else first deliverable, else specialty name, else "مشروع"
 *   - amount_sar: price_anchor
 *   - client_id: proposal.client_id (if present)
 *   - proposal_id: the proposal
 *   - category: specialty slug
 *   - status: 'pending'
 *   - delivery_date: null
 *
 * If client_id is present, inserts a client_timeline 'gig_created' event.
 * Reuses the gig-quota path (errcode 53400 → quota_exhausted).
 */
export async function createGigFromProposal(
  rawInput: unknown
): Promise<CreateGigFromProposalResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { proposal_id, project_id } = parsed.data;

  const supabase = await createClient();

  // Auth guard
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Load the proposal (owner-scoped via RLS + explicit eq)
  const { data: proposal, error: fetchErr } = await supabase
    .from("proposals")
    .select(
      "id, price_anchor, client_id, scope_json, artifact_json, specialty_id, specialties(slug, name_ar)"
    )
    .eq("id", proposal_id)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !proposal) return { ok: false, code: "not_found" };

  // Derive gig title: proposal title > first deliverable > specialty name > fallback
  const scopeJson = proposal.scope_json as {
    deliverables?: string[];
    specialty?: string;
  } | null;

  const firstDeliverable =
    Array.isArray(scopeJson?.deliverables) && (scopeJson?.deliverables?.length ?? 0) > 0
      ? scopeJson!.deliverables[0]
      : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const specialtyRaw = proposal.specialties as any;
  const specialtyName =
    specialtyRaw?.name_ar ?? specialtyRaw?.name_en ?? null;
  const specialtySlug =
    specialtyRaw?.slug ?? scopeJson?.specialty ?? null;

  // The proposal's own title wins, so the money row, its project and the invoice
  // line all carry the same name the client saw on the proposal. Falling straight
  // to the first deliverable produced ledger rows called "Home page".
  const title: string =
    artifactTitle(proposal.artifact_json) ?? firstDeliverable ?? specialtyName ?? "مشروع";

  const priceAnchor = Number(proposal.price_anchor);
  const clientId = (proposal.client_id as string | null) ?? null;

  // Insert gig — catch errcode 53400 for quota
  const { data: gigData, error: insertErr } = await supabase
    .from("gigs")
    .insert({
      user_id: userId,
      title: title.slice(0, 255),
      amount_sar: priceAnchor > 0 ? priceAnchor : 1,
      client_id: clientId,
      proposal_id: proposal_id,
      category: specialtySlug ?? null,
      status: "pending",
      delivery_date: null,
      payment_method: "bank_transfer",
      ...(project_id ? { project_id } : {}),
    })
    .select("id")
    .single();

  if (insertErr || !gigData) {
    if (insertErr?.code === "53400") {
      return { ok: false, code: "quota_exhausted" };
    }
    console.error("[createGigFromProposal] insert failed", {
      code: insertErr?.code,
      message: insertErr?.message,
    });
    return { ok: false, code: "error" };
  }

  const gigId = gigData.id as string;

  // If client_id present: insert client_timeline 'gig_created' (best-effort)
  if (clientId) {
    try {
      await supabase.from("client_timeline").insert({
        client_id: clientId,
        user_id: userId,
        event_type: "gig_created",
        event_data: {
          gig_id: gigId,
          title,
          amount_sar: priceAnchor,
          proposal_id,
        },
      });
    } catch (err) {
      console.warn("[createGigFromProposal] client_timeline insert failed", err);
    }
  }

  revalidatePath("/[locale]/income", "page");

  return { ok: true, gig_id: gigId };
}
