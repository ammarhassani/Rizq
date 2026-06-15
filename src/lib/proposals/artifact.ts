/**
 * Proposal artifact data assembly.
 *
 * PURE module: no React, no Supabase, no side-effects. All inputs come in via
 * ArtifactInput; outputs are plain serialisable objects. Tests live in
 * artifact.test.ts and run with Vitest.
 *
 * Phase A rebuild (proposal-Studio): the artifact is now a formal multi-section
 * BUSINESS DOCUMENT (cover, cover letter, understanding, approach, scope,
 * assumptions, timeline, pricing, milestones, about, terms, next steps,
 * verification) rather than the old thin 9-section pricing card.
 *
 * Honesty architecture: prose sections (cover_letter / understanding / approach
 * / scope_of_work / assumptions) carry an `ai_generated` flag. In Phase A no AI
 * runs, so prose bodies are null and the RENDERER supplies clean templated
 * defaults; `ai_generated` is therefore false. A later phase streams real prose
 * in and flips `proseAiGenerated` to true, which drives the "review before
 * sending" honesty badge.
 *
 * Builders here are locale-NEUTRAL and data-only. All localisation (and the
 * templated default prose) lives in the renderer (ProposalArtifact.tsx).
 */

// ---------------------------------------------------------------------------
// Section registry
// ---------------------------------------------------------------------------

/**
 * Union of every section id the renderer may encounter.
 *
 * Includes BOTH the new document sections AND the legacy ids so that
 * artifact_json stored by older proposals still type-checks when rendered
 * (the renderer keeps the legacy renderers for backward-compatibility).
 */
export type ArtifactSectionId =
  // --- new document model ---
  | "cover"
  | "cover_letter"
  | "understanding"
  | "approach"
  | "scope_of_work"
  | "assumptions"
  | "timeline"
  | "pricing"
  | "milestones"
  | "about"
  | "terms"
  | "next_steps"
  | "verification"
  // --- legacy (kept for backward-compat with stored artifacts) ---
  | "branding"
  | "client_ref"
  | "ip_terms"
  | "terms_footer";

export type ArtifactSectionMeta = {
  id: ArtifactSectionId;
  order: number;
  editable: boolean;
  /**
   * aiEditable sections may be rewritten by the AI prose/tone pass, but
   * numbers/names/dates are always preserved even within those sections.
   * Pricing, terms, machine-stamped (verification) and structured sections
   * (cover, timeline, milestones, about, next_steps) are never AI-rewritten.
   */
  aiEditable: boolean;
};

/**
 * Ordered 13-section registry that NEW proposals use.
 *
 * Notes:
 *  - prose sections (cover_letter, understanding, approach, scope_of_work,
 *    assumptions) are aiEditable — a later phase fills them with streamed prose.
 *  - pricing.editable = true but the UI only allows editing the anchor value;
 *    min/max are display-only.
 *  - terms.aiEditable = false: legal/financial text — AI must never rewrite it.
 *  - verification is machine-stamped — never editable.
 */
export const ARTIFACT_SECTIONS: ArtifactSectionMeta[] = [
  { id: "cover",         order: 1,  editable: true,  aiEditable: false },
  { id: "cover_letter",  order: 2,  editable: true,  aiEditable: true  },
  { id: "understanding", order: 3,  editable: true,  aiEditable: true  },
  { id: "approach",      order: 4,  editable: true,  aiEditable: true  },
  { id: "scope_of_work", order: 5,  editable: true,  aiEditable: true  },
  { id: "assumptions",   order: 6,  editable: true,  aiEditable: true  },
  { id: "timeline",      order: 7,  editable: true,  aiEditable: false },
  { id: "pricing",       order: 8,  editable: true,  aiEditable: false },
  { id: "milestones",    order: 9,  editable: true,  aiEditable: false },
  { id: "about",         order: 10, editable: true,  aiEditable: false },
  { id: "terms",         order: 11, editable: true,  aiEditable: false },
  { id: "next_steps",    order: 12, editable: true,  aiEditable: false },
  { id: "verification",  order: 13, editable: false, aiEditable: false },
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

/** A single approach phase (locale-neutral; renderer localises titles only when absent). */
export type ApproachPhase = { title: string; body: string };

/** A portfolio sample, mirrored from the user profile jsonb. */
export type PortfolioSample = {
  title: string;
  url: string | null;
  description: string | null;
};

/** A client testimonial (Phase C populates this; null/empty in Phase A). */
export type Testimonial = {
  clientName: string | null;
  clientTitle: string | null;
  quoteAr: string | null;
  quoteEn: string | null;
  rating: number | null;
};

/** Flat inputs assembled by the caller from the proposal row + profile. */
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
  // document meta
  /** Short project/proposal title; caller may pass null (renderer shows generic). */
  projectTitle: string | null;
  /** Issue date (ISO); caller passes today's date or null. */
  issueDate: string | null;
  // scope
  deliverables: string[];
  projectDescriptionAr: string | null;
  revisions: number | null;
  // prose (Phase A: all null — renderer supplies templated defaults)
  coverLetterBody: string | null;
  understandingBody: string | null;
  approachPhases: ApproachPhase[] | null;
  assumptions: string[] | null;
  exclusions: string[] | null;
  /** Parallel to `deliverables` — optional one-line descriptions. */
  deliverableDescriptions: string[] | null;
  /**
   * True once the AI prose pass has filled prose bodies. Drives the honesty
   * badge in the renderer. False in Phase A.
   */
  proseAiGenerated: boolean;
  // pricing
  priceMin: number;
  priceAnchor: number;
  priceMax: number;
  /** Pre-resolved bilingual citation string (honesty architecture). */
  provenanceCitation: string;
  /** What the price includes; null → renderer derives from deliverables. */
  included: string[] | null;
  // terms (from defaults — M8 not built yet; caller passes Rizq/sane defaults)
  depositPct: number;           // e.g. 50
  ipTerms: "full_transfer" | "license" | "per_project";
  startDate: string | null;
  deliveryDate: string | null;
  validityDays: number;         // e.g. 30
  // profile / about (from extended loadUserBrandDefaults)
  bioAr: string | null;
  bioEn: string | null;
  yearsExperience: number | null;
  totalProjectsCompleted: number | null;
  notableClients: string[] | null;
  portfolioSamples: PortfolioSample[] | null;
  testimonials: Testimonial[] | null;
};

export type ArtifactSection = ArtifactSectionMeta & {
  /** Section-specific structured content (locale-resolved strings + data). */
  content: Record<string, unknown>;
};

export type ArtifactData = { sections: ArtifactSection[] };

// ---------------------------------------------------------------------------
// Section content builders (data-only, locale-neutral)
// ---------------------------------------------------------------------------

// --- new document model ---

function buildCover(input: ArtifactInput): Record<string, unknown> {
  return {
    projectTitle: input.projectTitle,
    clientName: input.clientName,
    issueDate: input.issueDate,
    validityDays: input.validityDays,
    brandName: input.brandNameAr ?? input.freelancerName,
    logoUrl: input.logoUrl,
    colors: input.brandColors ?? RIZQ_DEFAULTS.colors,
    tagline: input.taglineAr ?? RIZQ_DEFAULTS.taglineAr,
    contact: input.contact,
  };
}

function buildCoverLetter(input: ArtifactInput): Record<string, unknown> {
  return {
    body: input.coverLetterBody,
    ai_generated: input.proseAiGenerated && input.coverLetterBody != null,
  };
}

function buildUnderstanding(input: ArtifactInput): Record<string, unknown> {
  return {
    body: input.understandingBody,
    ai_generated: input.proseAiGenerated && input.understandingBody != null,
  };
}

function buildApproach(input: ArtifactInput): Record<string, unknown> {
  return {
    phases: input.approachPhases,
    ai_generated: input.proseAiGenerated && input.approachPhases != null,
  };
}

function buildScopeOfWork(input: ArtifactInput): Record<string, unknown> {
  return {
    deliverables: input.deliverables,
    deliverable_descriptions: input.deliverableDescriptions,
    description: input.projectDescriptionAr,
    revisions: input.revisions,
    ai_generated:
      input.proseAiGenerated && input.deliverableDescriptions != null,
  };
}

function buildAssumptions(input: ArtifactInput): Record<string, unknown> {
  return {
    assumptions: input.assumptions,
    exclusions: input.exclusions,
    ai_generated:
      input.proseAiGenerated &&
      (input.assumptions != null || input.exclusions != null),
  };
}

function buildTimeline(input: ArtifactInput): Record<string, unknown> {
  return {
    startDate: input.startDate,
    deliveryDate: input.deliveryDate,
    revisions: input.revisions,
  };
}

function buildPricing(input: ArtifactInput): Record<string, unknown> {
  // citation is REQUIRED and must be non-empty (honesty architecture).
  // The caller is responsible for passing a populated provenanceCitation.
  return {
    min: input.priceMin,
    anchor: input.priceAnchor,
    max: input.priceMax,
    citation: input.provenanceCitation,
    included: input.included,
    depositPct: input.depositPct,
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

function buildAbout(input: ArtifactInput): Record<string, unknown> {
  return {
    bioAr: input.bioAr,
    bioEn: input.bioEn,
    yearsExperience: input.yearsExperience,
    totalProjectsCompleted: input.totalProjectsCompleted,
    notableClients: input.notableClients ?? [],
    portfolioSamples: input.portfolioSamples ?? [],
    testimonials: input.testimonials ?? [],
  };
}

function buildTerms(input: ArtifactInput): Record<string, unknown> {
  // Renderer expands these into full bilingual clauses (payment, revisions,
  // IP, confidentiality, validity, cancellation).
  return {
    ipTerms: input.ipTerms,
    depositPct: input.depositPct,
    revisions: input.revisions,
    validityDays: input.validityDays,
  };
}

function buildNextSteps(input: ArtifactInput): Record<string, unknown> {
  return {
    contact: input.contact,
    validityDays: input.validityDays,
    freelancerName: input.freelancerName,
  };
}

function buildVerification(input: ArtifactInput): Record<string, unknown> {
  return {
    proposalId: input.proposalId,
    label: "Generated by Rizq — Saudi Freelancer OS",
    methodologyHref: "/methodology",
  };
}

// --- legacy builders (NOT in the new registry; kept so CONTENT_BUILDERS stays
// total over the union and any stray reference still resolves) ---

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
  return { clientName: input.clientName };
}

function buildIpTerms(input: ArtifactInput): Record<string, unknown> {
  return { terms: input.ipTerms };
}

function buildTermsFooter(input: ArtifactInput): Record<string, unknown> {
  return {
    jurisdiction: "KSA",
    validityDays: input.validityDays,
  };
}

// ---------------------------------------------------------------------------
// Dispatcher map — MUST be total over ArtifactSectionId
// ---------------------------------------------------------------------------

const CONTENT_BUILDERS: Record<
  ArtifactSectionId,
  (input: ArtifactInput) => Record<string, unknown>
> = {
  // new document model
  cover:         buildCover,
  cover_letter:  buildCoverLetter,
  understanding: buildUnderstanding,
  approach:      buildApproach,
  scope_of_work: buildScopeOfWork,
  assumptions:   buildAssumptions,
  timeline:      buildTimeline,
  pricing:       buildPricing,
  milestones:    buildMilestones,
  about:         buildAbout,
  terms:         buildTerms,
  next_steps:    buildNextSteps,
  verification:  buildVerification,
  // legacy
  branding:      buildBranding,
  client_ref:    buildClientRef,
  ip_terms:      buildIpTerms,
  terms_footer:  buildTermsFooter,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Assemble the ordered document artifact data.
 *
 * Pure. Branding/cover falls back to Rizq defaults when brand fields are null.
 * The pricing section ALWAYS carries the provenance citation (honesty
 * architecture). Prose bodies default to null (NEVER fabricated here — the
 * renderer supplies safe templated defaults). Sections are returned sorted by
 * `order`.
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
