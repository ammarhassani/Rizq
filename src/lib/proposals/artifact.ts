/**
 * Proposal artifact data assembly — Phase-2 task 2.5.
 *
 * PURE module: no React, no Supabase, no side-effects. All inputs come in via
 * ArtifactInput; outputs are plain serialisable objects. Tests live in
 * artifact.test.ts and run with Vitest.
 */

// ---------------------------------------------------------------------------
// Section registry
// ---------------------------------------------------------------------------

export type ArtifactSectionId =
  | "branding"
  | "client_ref"
  | "scope_of_work"
  | "pricing"
  | "milestones"
  | "timeline"
  | "ip_terms"
  | "verification"
  | "terms_footer";

export type ArtifactSectionMeta = {
  id: ArtifactSectionId;
  order: number;
  editable: boolean;
  /** Tone-adjustment may rewrite aiEditable sections, but numbers/names/dates
   * are always preserved even within those sections. Legal text (ip_terms) and
   * machine-stamped sections (verification, terms_footer) are never AI-touched.
   */
  aiEditable: boolean;
};

/**
 * Ordered 9-section registry (spec M1.5).
 *
 * Notes:
 *  - pricing.editable = true but the UI will only allow editing the anchor
 *    value; min/max are display-only (read-only in the editor).
 *  - ip_terms.aiEditable = false: legal text — AI must never rewrite it.
 */
export const ARTIFACT_SECTIONS: ArtifactSectionMeta[] = [
  { id: "branding",      order: 1, editable: true,  aiEditable: false },
  { id: "client_ref",    order: 2, editable: true,  aiEditable: false },
  { id: "scope_of_work", order: 3, editable: true,  aiEditable: true  },
  { id: "pricing",       order: 4, editable: true,  aiEditable: false },
  { id: "milestones",    order: 5, editable: true,  aiEditable: true  },
  { id: "timeline",      order: 6, editable: true,  aiEditable: true  },
  { id: "ip_terms",      order: 7, editable: true,  aiEditable: false },
  { id: "verification",  order: 8, editable: false, aiEditable: false },
  { id: "terms_footer",  order: 9, editable: false, aiEditable: false },
];

// ---------------------------------------------------------------------------
// Rizq brand defaults (used when M8 brand fields are null)
// ---------------------------------------------------------------------------

export const RIZQ_DEFAULTS = {
  taglineAr: "سعّر بثقة. اقبض رزقك.",
  colors: { primary: "#1A5F3F", secondary: "#C8A951" },
} as const;

// ---------------------------------------------------------------------------
// Input / output types
// ---------------------------------------------------------------------------

/** Flat inputs assembled by the caller (P2.9) from the proposal row + profile. */
export type ArtifactInput = {
  locale: "ar" | "en";
  proposalId: string;
  // branding — M8 brand fields may be null → fall back to Rizq defaults
  freelancerName: string;
  brandNameAr: string | null;
  taglineAr: string | null;
  logoUrl: string | null;
  brandColors: { primary: string; secondary: string } | null;
  contact: { email: string | null; phone: string | null; whatsapp: string | null };
  // client
  clientName: string | null;
  // scope
  deliverables: string[];
  projectDescriptionAr: string | null;
  revisions: number | null;
  // pricing
  priceMin: number;
  priceAnchor: number;
  priceMax: number;
  /** Pre-resolved bilingual citation string (spec §II.2 honesty architecture). */
  provenanceCitation: string;
  // terms (from defaults — M8 not built yet; caller passes Rizq/sane defaults)
  depositPct: number;           // e.g. 50
  ipTerms: "full_transfer" | "license" | "per_project";
  startDate: string | null;
  deliveryDate: string | null;
  validityDays: number;         // e.g. 30
};

export type ArtifactSection = ArtifactSectionMeta & {
  /** Section-specific structured content (locale-resolved strings + data). */
  content: Record<string, unknown>;
};

export type ArtifactData = { sections: ArtifactSection[] };

// ---------------------------------------------------------------------------
// Section content builders (one per registry entry)
// ---------------------------------------------------------------------------

function buildBranding(input: ArtifactInput): Record<string, unknown> {
  return {
    name: input.freelancerName,
    brandName: input.brandNameAr ?? input.freelancerName,
    tagline: input.taglineAr ?? RIZQ_DEFAULTS.taglineAr,
    logoUrl: input.logoUrl,
    colors: input.brandColors ?? RIZQ_DEFAULTS.colors,
    contact: input.contact,
  };
}

function buildClientRef(input: ArtifactInput): Record<string, unknown> {
  // clientName may be null — the UI will show a generic label when null.
  return { clientName: input.clientName };
}

function buildScopeOfWork(input: ArtifactInput): Record<string, unknown> {
  return {
    deliverables: input.deliverables,
    description: input.projectDescriptionAr,
    revisions: input.revisions,
  };
}

function buildPricing(input: ArtifactInput): Record<string, unknown> {
  // citation is REQUIRED and must be non-empty (spec §II.2 honesty architecture).
  // The caller is responsible for passing a populated provenanceCitation.
  return {
    min: input.priceMin,
    anchor: input.priceAnchor,
    max: input.priceMax,
    citation: input.provenanceCitation,
  };
}

function buildMilestones(input: ArtifactInput): Record<string, unknown> {
  const deposit = input.depositPct;
  const remainder = 100 - deposit;
  return {
    milestones: [
      { pct: deposit,   trigger: "deposit"  },
      { pct: remainder, trigger: "delivery" },
    ],
  };
}

function buildTimeline(input: ArtifactInput): Record<string, unknown> {
  return {
    startDate: input.startDate,
    deliveryDate: input.deliveryDate,
    revisions: input.revisions,
  };
}

function buildIpTerms(input: ArtifactInput): Record<string, unknown> {
  // AI must never rewrite this section (aiEditable: false in registry).
  return { terms: input.ipTerms };
}

function buildVerification(input: ArtifactInput): Record<string, unknown> {
  return {
    proposalId: input.proposalId,
    label: "Generated by Rizq — Saudi Freelancer OS",
    methodologyHref: "/methodology",
  };
}

function buildTermsFooter(input: ArtifactInput): Record<string, unknown> {
  return {
    jurisdiction: "KSA",
    validityDays: input.validityDays,
  };
}

// ---------------------------------------------------------------------------
// Dispatcher map
// ---------------------------------------------------------------------------

const CONTENT_BUILDERS: Record<
  ArtifactSectionId,
  (input: ArtifactInput) => Record<string, unknown>
> = {
  branding:      buildBranding,
  client_ref:    buildClientRef,
  scope_of_work: buildScopeOfWork,
  pricing:       buildPricing,
  milestones:    buildMilestones,
  timeline:      buildTimeline,
  ip_terms:      buildIpTerms,
  verification:  buildVerification,
  terms_footer:  buildTermsFooter,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Assemble the ordered 9-section artifact data.
 *
 * Pure. Branding falls back to Rizq defaults when brand fields are null.
 * The pricing section ALWAYS carries the provenance citation (honesty
 * architecture — spec §II.2). Sections are returned sorted by `order`.
 */
export function buildArtifactData(input: ArtifactInput): ArtifactData {
  const sections: ArtifactSection[] = ARTIFACT_SECTIONS.map((meta) => ({
    ...meta,
    content: CONTENT_BUILDERS[meta.id](input),
  }));

  // Sort by order (registry is already ordered, but sort is an explicit guarantee).
  sections.sort((a, b) => a.order - b.order);

  return { sections };
}
