"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { extractScope, aggregateConfidence } from "@/lib/ai/scope";
import { resolvePrice } from "@/lib/pricing/resolve";
import {
  computeProposalPrice,
} from "@/lib/pricing/proposalPricing";
import { buildArtifactData } from "@/lib/proposals/artifact";
import { selectFollowUps, type FollowUpTemplate } from "@/lib/proposals/followUp";
import { loadRefContext } from "@/lib/proposals/refContext";
import { loadUserBrandDefaults, loadTestimonials } from "@/lib/proposals/brand";
import type { PricingJson } from "@/lib/proposals/templateHelpers";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const InputSchema = z.object({
  brief_text: z.string().min(10),
  client_name: z.string().optional(),
  client_id: z.string().uuid().optional(),
  // Resolved in the BACKGROUND when omitted: city from the client (then the
  // freelancer's own city), experience tier from the freelancer's profile.
  // Kept optional so an explicit override still works.
  city_slug: z.string().min(1).max(64).optional(),
  experience_tier_slug: z.string().min(1).max(64).optional(),
  template_id: z.string().uuid().optional(),
  // Optional, secondary input (keeps "≤3 inputs to first value"). Threaded into
  // scope_json.extras.project_goals so the Phase D prose pass can ground the
  // cover letter / understanding in the client's stated goals.
  project_goals: z.string().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// Return type (discriminated union)
// ---------------------------------------------------------------------------

export type GenerateProposalResult =
  | {
      ok: true;
      proposal_id: string;
      follow_ups: FollowUpTemplate[];
      price: { min: number; anchor: number; max: number };
      confidence: number;
      artifact_json: import("@/lib/proposals/artifact").ArtifactData;
    }
  | {
      ok: false;
      code:
        | "unauthorized"
        | "invalid"
        | "extraction_failed"
        | "insufficient_data"
        | "quota_exhausted"
        | "error";
    };

// ---------------------------------------------------------------------------
// project_size derivation from scope (spec M1.7 note)
// ---------------------------------------------------------------------------

type ProjectSize = "small" | "medium" | "large" | "enterprise";

function deriveProjectSize(
  deliverableCount: number | null,
  complexitySignals: string[]
): ProjectSize | undefined {
  // Use complexity_signals length as proxy when count is unavailable.
  const complexity = complexitySignals.length;

  if (deliverableCount !== null) {
    if (deliverableCount <= 2 && complexity <= 2) return "small";
    if (deliverableCount <= 5 && complexity <= 4) return "medium";
    if (deliverableCount <= 15) return "large";
    return "enterprise";
  }

  // Fallback: complexity signal count heuristic
  if (complexity <= 1) return "small";
  if (complexity <= 3) return "medium";
  if (complexity <= 6) return "large";
  if (complexity > 6) return "enterprise";
  return undefined;
}

// ---------------------------------------------------------------------------
// Brief language detection (ar / en / mixed → locale for citation)
// ---------------------------------------------------------------------------

function detectBriefLanguage(text: string): "ar" | "en" | "mixed" {
  const arabicChars = (text.match(/[؀-ۿ]/g) ?? []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) ?? []).length;
  if (arabicChars === 0 && latinChars === 0) return "ar";
  if (arabicChars === 0) return "en";
  if (latinChars === 0) return "ar";
  const ratio = arabicChars / (arabicChars + latinChars);
  if (ratio > 0.7) return "ar";
  if (ratio < 0.3) return "en";
  return "mixed";
}

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function generateProposal(
  rawInput: unknown
): Promise<GenerateProposalResult> {
  // 1. Validate input
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const input = parsed.data;

  const supabase = await createClient();

  // 2. Auth guard
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // 2b. Resolve client_id → client_name when client_id is provided (M2→M1 wiring)
  let resolvedClientId: string | null = input.client_id ?? null;
  let resolvedClientName: string | null = input.client_name ?? null;
  let resolvedClientCity: string | null = null;

  if (input.client_id) {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("id, name, city")
      .eq("id", input.client_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (clientRow) {
      resolvedClientId = clientRow.id as string;
      resolvedClientName = clientRow.name as string;
      resolvedClientCity = (clientRow.city as string | null) ?? null;
    } else {
      // client_id supplied but not owned by user — ignore silently, fall back to free-text
      resolvedClientId = null;
    }
  }

  // Background pricing inputs (the generate form no longer asks for these):
  // the freelancer's saved city + experience tier (from onboarding / settings).
  const { data: ownerProfile } = await supabase
    .from("users")
    .select("city, experience_tier_id")
    .eq("id", userId)
    .maybeSingle();
  const ownerCity = (ownerProfile?.city as string | null) ?? null;
  const ownerTierId = (ownerProfile?.experience_tier_id as string | null) ?? null;

  // 2d. Load template defaults when template_id is provided
  let templateDefaults: PricingJson | null = null;
  if (input.template_id) {
    const { data: tplRow } = await supabase
      .from("proposal_templates")
      .select("pricing_json")
      .eq("id", input.template_id)
      .eq("user_id", userId)
      .single();
    if (tplRow?.pricing_json) {
      templateDefaults = tplRow.pricing_json as PricingJson;
    }
  }

  // 3. Load ref context + build ctx lines for scope extraction
  const refCtx = await loadRefContext();
  if (!refCtx) {
    console.error("[generateProposal] ref data unavailable");
    return { ok: false, code: "error" };
  }

  // 4. Extract scope via AI
  const extraction = await extractScope(input.brief_text, refCtx.ctx);
  if (!extraction) {
    // UI shows manual fallback form
    return { ok: false, code: "extraction_failed" };
  }
  const { scope, model, promptHash, confidence, raw } = extraction;

  // 4b. Thread optional project_goals into scope.extras (read later by the Phase
  // D prose route from scope_json.extras.project_goals). Trim + drop if blank.
  const trimmedGoals = input.project_goals?.trim();
  if (trimmedGoals) {
    scope.extras = { ...(scope.extras ?? {}), project_goals: trimmedGoals };
  }

  // 5. Resolve specialty (from scope) + city + experience tier.
  //    City and tier are resolved in the BACKGROUND so the freelancer never
  //    re-picks them: city = client's city → freelancer's city → first active;
  //    tier = freelancer's profile tier → "mid" → first. An explicit slug wins.
  const specialtySlug = scope.specialty;
  const specialtyId = refCtx.specialtyIdBySlug.get(specialtySlug);
  if (!specialtyId) {
    // Specialty extracted by AI but not in our active list
    return { ok: false, code: "invalid" };
  }

  const matchCitySlug = (text: string | null): string | null => {
    if (!text) return null;
    const m = refCtx.cities.find(
      (c) => c.slug === text || c.name_ar === text || c.name_en === text
    );
    return m?.slug ?? null;
  };
  const citySlug =
    (input.city_slug && refCtx.cityIdBySlug.has(input.city_slug) ? input.city_slug : null) ??
    matchCitySlug(resolvedClientCity) ??
    matchCitySlug(ownerCity) ??
    refCtx.cities[0]?.slug ??
    "";

  const tierFromProfile = ownerTierId
    ? refCtx.tiers.find((tr) => tr.id === ownerTierId)?.slug ?? null
    : null;
  const tierSlug =
    (input.experience_tier_slug && refCtx.tierIdBySlug.has(input.experience_tier_slug)
      ? input.experience_tier_slug
      : null) ??
    tierFromProfile ??
    (refCtx.tierIdBySlug.has("mid") ? "mid" : null) ??
    refCtx.tiers[0]?.slug ??
    "";

  const cityId = refCtx.cityIdBySlug.get(citySlug);
  const tierId = refCtx.tierIdBySlug.get(tierSlug);
  if (!cityId || !tierId) {
    return { ok: false, code: "error" };
  }

  // 6. Resolve market price band
  const projectSize = deriveProjectSize(
    scope.deliverable_count,
    scope.complexity_signals
  );
  const resolveResult = await resolvePrice({
    specialty_slug: specialtySlug,
    city_slug: citySlug,
    experience_tier_slug: tierSlug,
    project_size: projectSize ?? null,
  });

  if (resolveResult.status !== "ok") {
    return { ok: false, code: "insufficient_data" };
  }

  // 7. Fetch past proposal anchors for personal weight
  const { data: pastRows } = await supabase
    .from("proposals")
    .select("price_anchor")
    .eq("user_id", userId)
    .in("status", ["final", "sent", "viewed", "accepted"]);

  const pastAnchors = (pastRows ?? []).map((r) =>
    Number(r.price_anchor)
  );

  // 8. Compute proposal price (market band + modifiers + personal history)
  const proposalPrice = computeProposalPrice(
    { min: resolveResult.min, anchor: resolveResult.anchor, max: resolveResult.max },
    {
      urgency: scope.urgency,
      client_type: scope.client_type,
      ip_transfer: scope.ip_transfer,
    },
    pastAnchors
  );

  // 9. Pick provenance citation by language
  const briefLang = detectBriefLanguage(input.brief_text);
  const provenanceCitation =
    briefLang === "en"
      ? resolveResult.provenance_citation_en
      : resolveResult.provenance_citation_ar;

  // 10. Load user brand defaults (M8 columns) for artifact personalisation.
  const brand = await loadUserBrandDefaults(
    supabase,
    userId,
    userResult.user.email ?? null
  );

  // Load active testimonials once; reused across both buildArtifactData calls.
  const testimonials = await loadTestimonials(supabase, userId);

  const freelancerName = brand.freelancerName;

  // 11. Build artifact (apply template defaults when present; user defaults as fallback)
  const resolvedRevisions =
    templateDefaults?.revisions ?? scope.revisions ?? brand.defaultRevisions;
  // Precedence: template > user-default > 50
  const resolvedDepositPct =
    templateDefaults?.deposit_pct ?? brand.defaultDepositPct ?? 50;
  // Precedence: template > scope-derived > user default > 'full_transfer'
  const scopeDerivedIpTerms: "full_transfer" | "license" | "per_project" | null =
    scope.ip_transfer === "full_transfer"
      ? "full_transfer"
      : scope.ip_transfer === "license"
        ? "license"
        : null;
  const resolvedIpTerms: "full_transfer" | "license" | "per_project" =
    templateDefaults?.ip_terms ??
    scopeDerivedIpTerms ??
    brand.defaultIpTerms ??
    "full_transfer";

  // Shared artifact input — everything except the proposalId (which is only
  // known after insert). Phase A: prose is null (renderer supplies templated
  // defaults), proseAiGenerated is false. Profile/about fields come from brand.
  const artifactBase = {
    locale: (briefLang === "en" ? "en" : "ar") as "ar" | "en",
    freelancerName,
    brandNameAr: brand.brandNameAr,
    taglineAr: brand.taglineAr,
    logoUrl: brand.logoUrl,
    brandColors: brand.brandColors,
    contact: brand.contact,
    clientName: resolvedClientName,
    projectTitle: null,
    issueDate: new Date().toISOString(),
    deliverables: scope.deliverables,
    projectDescriptionAr: null,
    revisions: resolvedRevisions,
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
    depositPct: resolvedDepositPct,
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
  } as const;

  const artifactData = buildArtifactData({
    ...artifactBase,
    proposalId: "pending", // placeholder; will update after insert
  });

  // 12. Insert proposal — catch errcode 53400 for quota
  const { data: insertData, error: insertError } = await supabase
    .from("proposals")
    .insert({
      user_id: userId,
      brief_text: input.brief_text,
      brief_language: briefLang,
      scope_json: scope,
      extraction_model: model,
      extraction_prompt_hash: promptHash,
      extraction_confidence: confidence,
      extraction_raw_response: raw as Record<string, unknown>,
      specialty_id: specialtyId,
      city_id: cityId,
      experience_tier_id: tierId,
      price_min: proposalPrice.min,
      price_anchor: proposalPrice.anchor,
      price_max: proposalPrice.max,
      sample_size: resolveResult.sample_size,
      dominant_provenance: resolveResult.dominant_provenance,
      provenance_citation: provenanceCitation,
      urgency_modifier: proposalPrice.modifiers.urgency,
      client_type_modifier: proposalPrice.modifiers.client_type,
      complexity_modifier: proposalPrice.modifiers.complexity,
      ip_modifier: proposalPrice.modifiers.ip,
      personal_weight: proposalPrice.personal_weight,
      artifact_json: artifactData,
      client_name: resolvedClientName,
      client_id: resolvedClientId,
      template_id: input.template_id ?? null,
      status: "draft",
      version: 1,
    })
    .select("id")
    .single();

  if (insertError || !insertData) {
    if (insertError?.code === "53400") {
      return { ok: false, code: "quota_exhausted" };
    }
    console.error("[generateProposal] insert failed", {
      code: insertError?.code,
      message: insertError?.message,
    });
    return { ok: false, code: "error" };
  }

  const proposalId = insertData.id as string;

  // Update artifact_json with the real proposal ID (keep brand fields consistent)
  const artifactWithId = buildArtifactData({
    ...artifactBase,
    proposalId,
  });

  await supabase
    .from("proposals")
    .update({ artifact_json: artifactWithId, updated_at: new Date().toISOString() })
    .eq("id", proposalId);

  // 12b. Increment template usage_count (non-blocking; best-effort)
  if (input.template_id) {
    const { data: tplForCount } = await supabase
      .from("proposal_templates")
      .select("usage_count")
      .eq("id", input.template_id)
      .eq("user_id", userId)
      .single();
    if (tplForCount) {
      await supabase
        .from("proposal_templates")
        .update({ usage_count: (tplForCount.usage_count as number) + 1 })
        .eq("id", input.template_id);
    }
  }

  // 13. Load enabled follow-up question templates
  const { data: templateRows } = await supabase
    .from("follow_up_question_templates")
    .select("*")
    .eq("enabled", true)
    .order("priority");

  const templates = (templateRows ?? []) as FollowUpTemplate[];
  const followUps = selectFollowUps(scope.field_confidence, templates);

  // 14. Return success
  return {
    ok: true,
    proposal_id: proposalId,
    follow_ups: followUps,
    price: {
      min: proposalPrice.min,
      anchor: proposalPrice.anchor,
      max: proposalPrice.max,
    },
    confidence: aggregateConfidence(scope.field_confidence),
    artifact_json: artifactWithId,
  };
}
