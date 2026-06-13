"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resolvePrice } from "@/lib/pricing/resolve";
import { computeProposalPrice } from "@/lib/pricing/proposalPricing";
import {
  buildArtifactData,
  type ArtifactInput,
} from "@/lib/proposals/artifact";
import { applyAnswers } from "@/lib/proposals/followUp";
import { loadRefContext } from "@/lib/proposals/refContext";
import type { Scope } from "@/lib/ai/scope";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const InputSchema = z.object({
  proposal_id: z.string().uuid(),
  answers: z.record(z.string(), z.unknown()),
});

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type AnswerFollowUpsResult =
  | {
      ok: true;
      price: { min: number; anchor: number; max: number };
      artifact_json: import("@/lib/proposals/artifact").ArtifactData;
    }
  | {
      ok: false;
      code:
        | "unauthorized"
        | "invalid"
        | "not_found"
        | "insufficient_data"
        | "error";
    };

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function answerFollowUps(
  rawInput: unknown
): Promise<AnswerFollowUpsResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { proposal_id, answers } = parsed.data;

  const supabase = await createClient();

  // Auth guard
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Load the proposal (RLS enforces ownership)
  const { data: rawProposal, error: fetchErr } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", proposal_id)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !rawProposal) return { ok: false, code: "not_found" };
  const proposal = rawProposal as Record<string, unknown>;

  // Merge answers into scope
  const oldScope = proposal["scope_json"] as Scope;
  const updatedScope = applyAnswers(oldScope, answers);

  // Re-resolve the market band using the stored IDs (look up slugs via ref ctx)
  const refCtx = await loadRefContext();
  if (!refCtx) {
    console.error("[answerFollowUps] ref data unavailable");
    return { ok: false, code: "error" };
  }

  // Reverse-lookup: id → slug
  const specialtySlug =
    refCtx.specialties.find((s) => s.id === proposal.specialty_id)?.slug ?? "";
  const citySlug =
    refCtx.cities.find((c) => c.id === proposal.city_id)?.slug ?? "";
  const tierSlug =
    refCtx.tiers.find((t) => t.id === proposal.experience_tier_id)?.slug ?? "";

  if (!specialtySlug || !citySlug || !tierSlug) {
    console.error("[answerFollowUps] slug reverse-lookup failed", {
      specialty_id: proposal.specialty_id,
      city_id: proposal.city_id,
      experience_tier_id: proposal.experience_tier_id,
    });
    return { ok: false, code: "error" };
  }

  const resolveResult = await resolvePrice({
    specialty_slug: specialtySlug,
    city_slug: citySlug,
    experience_tier_slug: tierSlug,
  });

  if (resolveResult.status !== "ok") {
    return { ok: false, code: "insufficient_data" };
  }

  // Fetch past anchors (for personal weight)
  const { data: pastRows } = await supabase
    .from("proposals")
    .select("price_anchor")
    .eq("user_id", userId)
    .neq("id", proposal_id)
    .in("status", ["final", "sent", "viewed", "accepted"]);

  const pastAnchors = (pastRows ?? []).map((r) => Number(r.price_anchor));

  // Recompute proposal price with updated modifiers
  const proposalPrice = computeProposalPrice(
    {
      min: resolveResult.min,
      anchor: resolveResult.anchor,
      max: resolveResult.max,
    },
    {
      urgency: updatedScope.urgency,
      client_type: updatedScope.client_type,
      ip_transfer: updatedScope.ip_transfer,
    },
    pastAnchors
  );

  // Rebuild artifact with updated data
  const briefLang =
    (proposal.brief_language as string) === "en" ? "en" : ("ar" as const);
  const provenanceCitation =
    briefLang === "en"
      ? resolveResult.provenance_citation_en
      : resolveResult.provenance_citation_ar;

  // Load user profile for artifact branding
  const { data: userProfile } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", userId)
    .single();

  const freelancerName =
    (userProfile?.name as string | null) ??
    userResult.user.email ??
    "مستقل / Freelancer";
  const contactEmail =
    (userProfile?.email as string | null) ?? userResult.user.email ?? null;

  const artifactInput: ArtifactInput = {
    locale: briefLang,
    proposalId: proposal_id,
    freelancerName,
    brandNameAr: null,
    taglineAr: null,
    logoUrl: null,
    brandColors: null,
    contact: { email: contactEmail, phone: null, whatsapp: null },
    clientName: (proposal.client_name as string | null) ?? null,
    deliverables: updatedScope.deliverables,
    projectDescriptionAr: null,
    revisions: updatedScope.revisions,
    priceMin: proposalPrice.min,
    priceAnchor: proposalPrice.anchor,
    priceMax: proposalPrice.max,
    provenanceCitation,
    depositPct: 50,
    ipTerms:
      updatedScope.ip_transfer === "full_transfer"
        ? "full_transfer"
        : updatedScope.ip_transfer === "license"
          ? "license"
          : "full_transfer",
    startDate: null,
    deliveryDate: null,
    validityDays: 30,
  };
  const artifactData = buildArtifactData(artifactInput);

  // Persist updated scope, prices, modifiers, and artifact
  const { error: updateErr } = await supabase
    .from("proposals")
    .update({
      scope_json: updatedScope,
      price_min: proposalPrice.min,
      price_anchor: proposalPrice.anchor,
      price_max: proposalPrice.max,
      urgency_modifier: proposalPrice.modifiers.urgency,
      client_type_modifier: proposalPrice.modifiers.client_type,
      complexity_modifier: proposalPrice.modifiers.complexity,
      ip_modifier: proposalPrice.modifiers.ip,
      personal_weight: proposalPrice.personal_weight,
      artifact_json: artifactData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposal_id)
    .eq("user_id", userId);

  if (updateErr) {
    console.error("[answerFollowUps] update failed", {
      code: updateErr.code,
      message: updateErr.message,
    });
    return { ok: false, code: "error" };
  }

  return {
    ok: true,
    price: {
      min: proposalPrice.min,
      anchor: proposalPrice.anchor,
      max: proposalPrice.max,
    },
    artifact_json: artifactData,
  };
}
