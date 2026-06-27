"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resolvePrice } from "@/lib/pricing/resolve";
import { computeProposalPrice } from "@/lib/pricing/proposalPricing";
import {
  buildArtifactData,
  type ArtifactInput,
} from "@/lib/proposals/artifact";
import { applyAnswers, normalizeAnswers } from "@/lib/proposals/followUp";
import { loadRefContext } from "@/lib/proposals/refContext";
import { loadUserBrandDefaults, loadTestimonials } from "@/lib/proposals/brand";
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

  // Merge answers into scope — coerce AI string answers onto the typed scope
  // schema first (e.g. "3 rounds" → revisions: 3) so they actually apply.
  const oldScope = proposal["scope_json"] as Scope;
  const updatedScope = applyAnswers(oldScope, normalizeAnswers(answers));

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
      deliverable_count: updatedScope.deliverable_count,
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

  // Load user brand defaults (M8 columns) for artifact personalisation.
  const brand = await loadUserBrandDefaults(
    supabase,
    userId,
    userResult.user.email ?? null
  );
  const testimonials = await loadTestimonials(supabase, userId);

  // IP terms: scope-derived → user default → 'full_transfer'
  const scopeDerivedIpTerms: "full_transfer" | "license" | "per_project" | null =
    updatedScope.ip_transfer === "full_transfer"
      ? "full_transfer"
      : updatedScope.ip_transfer === "license"
        ? "license"
        : null;
  const resolvedIpTerms: "full_transfer" | "license" | "per_project" =
    scopeDerivedIpTerms ?? brand.defaultIpTerms ?? "full_transfer";

  // Preserve the original issue date if the stored artifact carried one; else now.
  const oldArtifact = proposal["artifact_json"] as
    | { sections?: Array<{ id?: string; content?: Record<string, unknown> }> }
    | null;
  const oldCover = oldArtifact?.sections?.find((s) => s?.id === "cover");
  const existingIssueDate =
    typeof oldCover?.content?.["issueDate"] === "string"
      ? (oldCover.content["issueDate"] as string)
      : null;
  // Preserve the AI-drafted / user-edited project title across rebuilds.
  const existingProjectTitle =
    typeof oldCover?.content?.["projectTitle"] === "string"
      ? (oldCover.content["projectTitle"] as string)
      : null;

  const artifactInput: ArtifactInput = {
    locale: briefLang,
    proposalId: proposal_id,
    freelancerName: brand.freelancerName,
    brandNameAr: brand.brandNameAr,
    taglineAr: brand.taglineAr,
    logoUrl: brand.logoUrl,
    brandColors: brand.brandColors,
    contact: brand.contact,
    clientName: (proposal.client_name as string | null) ?? null,
    projectTitle: existingProjectTitle,
    issueDate: existingIssueDate ?? new Date().toISOString(),
    deliverables: updatedScope.deliverables,
    projectDescriptionAr: null,
    revisions: updatedScope.revisions ?? brand.defaultRevisions,
    coverLetterBody: null,
    understandingBody: null,
    approachPhases: null,
    assumptions: null,
    exclusions: null,
    deliverableDescriptions: null,
    proseAiGenerated: false,
    priceMin: proposalPrice.min,
    priceAnchor: proposalPrice.anchor,
    priceMax: proposalPrice.max,
    provenanceCitation,
    included: null,
    depositPct: brand.defaultDepositPct ?? 50,
    ipTerms: resolvedIpTerms,
    startDate: null,
    deliveryDate: null,
    validityDays: 30,
    bioAr: brand.bioAr,
    bioEn: brand.bioEn,
    yearsExperience: brand.yearsExperience,
    totalProjectsCompleted: brand.totalProjectsCompleted,
    notableClients: brand.notableClients,
    portfolioSamples: brand.portfolioSamples,
    testimonials,
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
