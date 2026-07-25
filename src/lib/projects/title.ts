/**
 * Project hub (spec 002) — derive a project title from its origin proposal.
 *
 * Mirrors the title rule already used by createGigFromProposal so a project and
 * its money child share the same name: first deliverable › specialty name › fallback.
 * Pure + unit-tested.
 */

export type ScopeJsonLike = {
  deliverables?: unknown;
  specialty?: string;
} | null;

const FALLBACK_TITLE = "مشروع"; // "project" (Arabic primary)

export function deriveProjectTitle(
  scopeJson: ScopeJsonLike,
  specialtyName: string | null | undefined,
  /**
   * The proposal's own title (artifact_json.title). It wins: it's what the
   * freelancer named the job and what the client already read on the proposal, so
   * the project and its invoice line carry the same name. Falling straight to the
   * first deliverable produced projects called "Redesign 18 screens" for a proposal
   * titled "Noon Tech app redesign" — and that name then shipped on the invoice.
   */
  proposalTitle?: string | null
): string {
  const deliverables = scopeJson?.deliverables;
  const firstDeliverable =
    Array.isArray(deliverables) && deliverables.length > 0 && typeof deliverables[0] === "string"
      ? (deliverables[0] as string).trim()
      : null;

  const title =
    (proposalTitle ?? "").trim() ||
    firstDeliverable ||
    (specialtyName ?? "").trim() ||
    FALLBACK_TITLE;
  return title.slice(0, 255);
}
