/**
 * Proposal prose-draft contract (Phase D — streaming AI prose pass).
 *
 * This module is deliberately CLIENT-SAFE: it imports neither `server-only`
 * nor the DeepSeek client. The schema + prompt builder + merge function are all
 * pure and importable from the client `ProposalFlow` (which uses `useObject`
 * with `ProseSchema` and merges the streamed partial into the artifact live).
 * The DeepSeek `streamObject` call lives in the route handler, NOT here.
 *
 * Honesty architecture (mirrors businessInsights / summarizeChange):
 *  - The model writes NARRATIVE prose only. It must never invent numbers,
 *    prices, dates, client names, credentials, or outcomes — the price is
 *    computed by extractScope + pricing and lives in the pricing section.
 *  - The model must never use the em dash (—); a comma or new sentence instead.
 *  - Streamed prose flips the per-section `ai_generated` flag to true, which
 *    drives the renderer's "AI-drafted, review before sending" badge.
 *
 * Streaming is incremental: `mergeProseIntoArtifact` is tolerant of PARTIAL or
 * undefined fields and only fills (and flags) a section once its field arrives
 * non-empty — so templated defaults stay until each piece streams in.
 */

import { z } from "zod";
import type { Scope } from "@/lib/ai/scope";
import type { ArtifactData, ArtifactSection } from "@/lib/proposals/artifact";

// ---------------------------------------------------------------------------
// Schema (bounded)
// ---------------------------------------------------------------------------

/**
 * The streamed prose object. Bounded so a runaway model can't produce a wall
 * of phases/assumptions. `deliverableDescriptions` is parallel to the provided
 * deliverables list (same order); the renderer pairs index-for-index.
 */
export const ProseSchema = z.object({
  coverLetter: z.string(),
  understanding: z.string(),
  approach: z
    .array(z.object({ title: z.string(), body: z.string() }))
    .min(2)
    .max(5),
  deliverableDescriptions: z.array(z.string()),
  assumptions: z.array(z.string()).min(2).max(6),
  exclusions: z.array(z.string()).min(1).max(6),
});

export type ProseDraft = z.infer<typeof ProseSchema>;

/**
 * The streaming shape produced by `useObject` (AI SDK's DeepPartial): every
 * field, array, and array element may be undefined mid-stream. The merge below
 * is fully defensive (each value flows through an unknown-accepting validator),
 * so this widened type is accepted at the call site without any unsafe casts.
 * A plain `Partial<ProseDraft>` (e.g. from tests) also satisfies it.
 */
export type DeepPartialProse = {
  coverLetter?: string;
  understanding?: string;
  approach?: Array<{ title?: string; body?: string } | undefined>;
  deliverableDescriptions?: Array<string | undefined>;
  assumptions?: Array<string | undefined>;
  exclusions?: Array<string | undefined>;
};

/** Field names the route may narrow to via `?section=` (Phase E single-section regen). */
export type ProseField = keyof ProseDraft;

export const PROSE_FIELDS: readonly ProseField[] = [
  "coverLetter",
  "understanding",
  "approach",
  "deliverableDescriptions",
  "assumptions",
  "exclusions",
] as const;

// ---------------------------------------------------------------------------
// Section ↔ prose-field mapping (PURE — unit-tested) — Phase E selective regen
// ---------------------------------------------------------------------------

/**
 * The editable PROSE section ids that map onto prose fields. (cover/timeline/
 * pricing/etc. are never AI-rewritten, so they are not in this map.)
 */
export type EditableProseSectionId =
  | "cover_letter"
  | "understanding"
  | "approach"
  | "scope_of_work"
  | "assumptions";

/**
 * Which prose field(s) a section owns. `scope_of_work` only owns the
 * deliverable descriptions (the deliverables list itself is edited via the
 * structured EditProposalForm, never the AI prose pass). `assumptions` owns
 * BOTH assumptions and exclusions because they share one artifact section.
 */
const SECTION_PROSE_FIELDS: Record<EditableProseSectionId, readonly ProseField[]> = {
  cover_letter: ["coverLetter"],
  understanding: ["understanding"],
  approach: ["approach"],
  scope_of_work: ["deliverableDescriptions"],
  assumptions: ["assumptions", "exclusions"],
};

/**
 * Pick ONLY the prose key(s) that belong to a given artifact section, dropping
 * everything else. This is the chokepoint that makes single-section regen safe:
 * feeding `pickProseField(fullProse, "approach")` into `mergeProseIntoArtifact`
 * updates ONLY the approach section and can never clobber another section's
 * (possibly hand-edited) content.
 *
 * Unknown / non-prose section ids return {} (a no-op for the merge).
 */
export function pickProseField(
  prose: ProseDraft | Partial<ProseDraft>,
  sectionId: string
): Partial<ProseDraft> {
  const fields = SECTION_PROSE_FIELDS[sectionId as EditableProseSectionId];
  if (!fields) return {};
  const out: Partial<ProseDraft> = {};
  for (const f of fields) {
    if (prose[f] !== undefined) {
      // Index-narrowing across a union of value types: assign field-by-field.
      // Each field's value is structurally compatible with Partial<ProseDraft>.
      (out as Record<ProseField, unknown>)[f] = prose[f];
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Prompt builder (PURE — unit-tested)
// ---------------------------------------------------------------------------

export type ProseProfile = {
  freelancerName: string;
  bio: string | null;
  yearsExperience: number | null;
  specialty?: string | null;
};

export type ProsePromptArgs = {
  scope: Scope;
  brief: string;
  goals: string | null;
  profile: ProseProfile;
  price: { min: number; anchor: number; max: number };
  deliverables: string[];
  locale: "ar" | "en";
};

/**
 * Build the prose-draft prompt. Pure + side-effect free so the unit test can
 * assert on its content without invoking the model.
 *
 * The prompt is bilingual-aware: it instructs the model to WRITE in the brief's
 * own language (Arabic-first), and the hard rules are stated in BOTH Arabic and
 * English so DeepSeek honours them regardless of which language it writes in.
 */
export function buildProsePrompt(args: ProsePromptArgs): string {
  const { scope, brief, goals, profile, deliverables, locale } = args;

  const langWord = locale === "ar" ? "Arabic" : "English";

  // Number the deliverables so the model returns descriptions in the SAME order.
  const deliverablesBlock =
    deliverables.length > 0
      ? deliverables.map((d, i) => `${i + 1}. ${d}`).join("\n")
      : "(none provided — return an empty deliverableDescriptions array)";

  const goalsBlock =
    goals && goals.trim().length > 0
      ? goals.trim()
      : "(client did not state explicit goals — infer the implicit need from the brief, do not invent specifics)";

  const profileBlock = [
    `Name: ${profile.freelancerName}`,
    profile.specialty ? `Specialty: ${profile.specialty}` : null,
    profile.yearsExperience != null
      ? `Years of experience: ${profile.yearsExperience}`
      : null,
    profile.bio && profile.bio.trim().length > 0
      ? `Bio (use only what is stated, never embellish): ${profile.bio.trim()}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `You draft the NARRATIVE prose for a formal, warm Saudi business proposal. A freelancer will review and edit every word before sending, so these are first-draft starting points, not final copy.

WRITE EVERYTHING IN ${langWord} (the brief's language). Tone: professional, warm, respectful Saudi business register. Plain, confident, never salesy or boastful.

The client's brief (the source of truth — restate, never contradict it):
"""${brief}"""

The client's stated project goals:
"""${goalsBlock}"""

The freelancer (write in their voice, first person plural "نحن"/"we" is fine):
${profileBlock}

The agreed deliverables (write ONE short description per item, IN THIS EXACT ORDER, returned in deliverableDescriptions[]):
${deliverablesBlock}

Structured scope already extracted (context only — do not restate raw fields):
${JSON.stringify(
    {
      specialty: scope.specialty,
      urgency: scope.urgency,
      client_type: scope.client_type,
      revisions: scope.revisions,
      complexity_signals: scope.complexity_signals,
    },
    null,
    2
  )}

Produce these sections:
- coverLetter: 2 to 4 sentences. Thank the client for the opportunity and frame the value you bring. Do NOT mention a price figure.
- understanding: 2 to 4 sentences that RESTATE the client's stated needs in your own words, so they feel heard. Reflect only what the brief says.
- approach: 2 to 5 phases, each with a short title and a 1 to 2 sentence body, describing how the work will be delivered.
- deliverableDescriptions: exactly one short description for EACH deliverable above, in the SAME ORDER.
- assumptions: 2 to 6 standard project assumptions (e.g. timely client feedback, content provided by client).
- exclusions: 1 to 6 standard exclusions (e.g. third-party licences, ongoing maintenance after delivery).

القواعد الصارمة (HARD RULES — follow exactly, in any language):
- لا تخترع أي رقم أو سعر أو تاريخ أو اسم عميل أو شهادة أو نتيجة غير موجودة في النص أعلاه. Never invent numbers, prices, dates, client names, credentials, or outcomes that are not in the inputs above.
- السعر يُحسب في مكان آخر؛ تحدّث عن القيمة لا عن رقم معيّن. The price is computed elsewhere — refer to the value you provide, never state or guess a figure.
- لا تستخدم الشرطة الطويلة (—) أبدًا؛ استخدم فاصلة أو جملة جديدة. Never use the em dash (—); use a comma or a new sentence instead.
- لا تقدّم وعودًا قانونية أو مالية. Make no legal or financial promises.
- اكتب نصًا قابلًا للتحرير من قبل المستقل. These are editable drafts for the freelancer, keep them concise.`;
}

// ---------------------------------------------------------------------------
// Prompt-args assembly from a proposal row (shared by the streaming draft route
// AND the Phase E single-section regen action, so both build an IDENTICAL prompt)
// ---------------------------------------------------------------------------

/**
 * The minimal brand/profile bag the prompt needs. Structurally satisfied by
 * `UserBrandDefaults` from `@/lib/proposals/brand` without importing it here
 * (this module stays client-safe + dependency-light).
 */
export type ProsePromptBrand = {
  freelancerName: string;
  bioAr: string | null;
  bioEn: string | null;
  yearsExperience: number | null;
};

/** Raw proposal fields the prompt assembly reads (subset of the proposals row). */
export type ProsePromptProposal = {
  scope: Scope;
  briefText: string | null;
  briefLanguage: string | null;
  priceMin: number;
  priceAnchor: number;
  priceMax: number;
};

/**
 * Assemble `ProsePromptArgs` from a proposal row + brand defaults, applying the
 * same conventions as the streaming draft route: locale from brief_language,
 * goals from `scope.extras.project_goals`, deliverables filtered to strings,
 * and the locale-appropriate bio. PURE.
 */
export function proposalProsePromptArgs(
  proposal: ProsePromptProposal,
  brand: ProsePromptBrand
): ProsePromptArgs {
  const { scope } = proposal;
  const locale: "ar" | "en" = proposal.briefLanguage === "en" ? "en" : "ar";

  const extras = (scope.extras ?? {}) as Record<string, unknown>;
  const goals =
    typeof extras["project_goals"] === "string"
      ? (extras["project_goals"] as string)
      : null;

  const deliverables = Array.isArray(scope.deliverables)
    ? scope.deliverables.filter((d): d is string => typeof d === "string")
    : [];

  return {
    scope,
    brief: proposal.briefText ?? "",
    goals,
    profile: {
      freelancerName: brand.freelancerName,
      bio: locale === "en" ? brand.bioEn ?? brand.bioAr : brand.bioAr ?? brand.bioEn,
      yearsExperience: brand.yearsExperience,
      specialty: scope.specialty ?? null,
    },
    price: {
      min: Number(proposal.priceMin),
      anchor: Number(proposal.priceAnchor),
      max: Number(proposal.priceMax),
    },
    deliverables,
    locale,
  };
}

// ---------------------------------------------------------------------------
// Merge (PURE — unit-tested) — tolerant of partial/undefined streamed objects
// ---------------------------------------------------------------------------

/**
 * Strip em/en dashes (a model tic the founder dislikes) from prose, replacing
 * with a comma. Arabic comma when the text contains Arabic, else Latin. Regular
 * hyphens in ranges like "1000-1500" are left alone. Belt-and-suspenders to the
 * prompt rule, applied at the single merge chokepoint so no dash ever renders.
 */
export function stripDashes(s: string): string {
  const sep = /[؀-ۿ]/.test(s) ? "، " : ", ";
  return s.replace(/\s*[—–]\s*/g, sep).replace(/\s{2,}/g, " ").trim();
}

/** A non-empty trimmed string (dash-sanitized), else null. */
function nonEmptyString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? stripDashes(v) : null;
}

/** Filtered list of valid {title, body} phases (both non-empty), else null when none. */
function validPhases(
  v: unknown
): { title: string; body: string }[] | null {
  if (!Array.isArray(v)) return null;
  const phases = v
    .filter(
      (p): p is Record<string, unknown> => typeof p === "object" && p !== null
    )
    .map((p) => ({
      title: typeof p["title"] === "string" ? stripDashes(p["title"]) : "",
      body: typeof p["body"] === "string" ? stripDashes(p["body"]) : "",
    }))
    // While streaming, a phase may arrive with a title but no body yet (or vice
    // versa). Keep any phase that has SOME content so it reveals progressively.
    .filter((p) => p.title.trim().length > 0 || p.body.trim().length > 0);
  return phases.length > 0 ? phases : null;
}

/**
 * Coerce a streamed array-of-strings to a clean string[]. During streaming the
 * array (and its trailing element) can be partial, so we keep entries as-is but
 * map non-strings to "". Returns null when the field is absent/not-an-array, or
 * when every entry is empty (nothing to show yet).
 */
function stringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const arr = v.map((s) => (typeof s === "string" ? stripDashes(s) : ""));
  return arr.some((s) => s.trim().length > 0) ? arr : null;
}

/**
 * Merge a (possibly partial) streamed prose object into an existing artifact.
 *
 * PURE: returns a NEW ArtifactData and never mutates the input (sections and
 * their content objects are shallow-cloned before edits).
 *
 * For each prose field, the matching section's content is updated and its
 * `ai_generated` flag set to true ONLY when that field is present + non-empty.
 * Absent/empty fields leave the section untouched, so the renderer keeps its
 * templated default until the field streams in.
 */
export function mergeProseIntoArtifact(
  artifact: ArtifactData,
  prose: DeepPartialProse | null | undefined
): ArtifactData {
  // No prose yet → return a structural clone (never mutate input, never flag).
  if (!prose || typeof prose !== "object") {
    return { sections: artifact.sections.map((s) => ({ ...s })) };
  }

  const coverLetter = nonEmptyString(prose.coverLetter);
  const understanding = nonEmptyString(prose.understanding);
  const approach = validPhases(prose.approach);
  const deliverableDescriptions = stringArray(prose.deliverableDescriptions);
  const assumptions = stringArray(prose.assumptions);
  const exclusions = stringArray(prose.exclusions);

  const sections: ArtifactSection[] = artifact.sections.map((section) => {
    // Always shallow-clone so the input object graph is never mutated.
    const next: ArtifactSection = {
      ...section,
      content: { ...section.content },
    };

    switch (section.id) {
      case "cover_letter": {
        if (coverLetter != null) {
          next.content.body = coverLetter;
          next.content.ai_generated = true;
        }
        return next;
      }
      case "understanding": {
        if (understanding != null) {
          next.content.body = understanding;
          next.content.ai_generated = true;
        }
        return next;
      }
      case "approach": {
        if (approach != null) {
          next.content.phases = approach;
          next.content.ai_generated = true;
        }
        return next;
      }
      case "scope_of_work": {
        if (deliverableDescriptions != null) {
          next.content.deliverable_descriptions = deliverableDescriptions;
          next.content.ai_generated = true;
        }
        return next;
      }
      case "assumptions": {
        // assumptions and exclusions share one section; flag if EITHER arrives.
        if (assumptions != null) next.content.assumptions = assumptions;
        if (exclusions != null) next.content.exclusions = exclusions;
        if (assumptions != null || exclusions != null) {
          next.content.ai_generated = true;
        }
        return next;
      }
      default:
        return next;
    }
  });

  return { sections };
}
