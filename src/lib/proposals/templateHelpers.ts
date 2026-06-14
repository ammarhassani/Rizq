/**
 * Pure helpers for proposal template derivation.
 * No Supabase, no React, no side-effects.
 */

export type PricingJson = {
  deposit_pct: number;
  revisions: number | null;
  ip_terms: "full_transfer" | "license" | "per_project";
  tone_preference: "formal" | "balanced" | "friendly" | "persuasive";
};

type ProposalLike = {
  scope_json: Record<string, unknown>;
  tone_preference?: string | null;
};

/**
 * Derive the pricing_json stored on a proposal_templates row from a proposal.
 *
 * - deposit_pct: always 50 (Rizq default; no per-proposal value to derive)
 * - revisions: from scope_json.revisions (number) or null
 * - ip_terms: mapped from scope_json.ip_transfer; unclear/null → full_transfer
 * - tone_preference: from proposal.tone_preference; unknown → balanced
 */
export function derivePricingJson(proposal: ProposalLike): PricingJson {
  const scope = proposal.scope_json;

  const revisions =
    typeof scope["revisions"] === "number" ? scope["revisions"] : null;

  const rawIp = scope["ip_transfer"];
  let ip_terms: PricingJson["ip_terms"] = "full_transfer";
  if (rawIp === "license") ip_terms = "license";
  else if (rawIp === "per_project") ip_terms = "per_project";
  // "unclear", null, or anything else → full_transfer

  const rawTone = proposal.tone_preference;
  let tone_preference: PricingJson["tone_preference"] = "balanced";
  if (
    rawTone === "formal" ||
    rawTone === "friendly" ||
    rawTone === "persuasive"
  ) {
    tone_preference = rawTone;
  }

  return { deposit_pct: 50, revisions, ip_terms, tone_preference };
}
