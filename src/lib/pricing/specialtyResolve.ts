/**
 * Specialty resolution (feature 006) — the disambiguation killer.
 *
 * The freelancer's profile is the prior. The brief/AI only overrides when it
 * clearly points at another discipline the freelancer actually offers:
 *   - no profile specialty        → trust the AI extraction (today's fallback)
 *   - AI's specialty ∈ the freelancer's listed disciplines → trust the AI
 *     (multi-discipline freelancer; the brief picked one of their services)
 *   - otherwise                   → use the profile's PRIMARY specialty
 *     (anchor to who they are; ignore an off-discipline guess)
 * Pure + total.
 */

export function resolveSpecialty(input: {
  primarySlug: string | null | undefined;
  listedSlugs?: string[] | null;
  aiSlug: string;
}): string {
  const primary = input.primarySlug?.trim() || null;
  if (!primary) return input.aiSlug; // no profile → AI fallback (unchanged behavior)

  const listed = new Set((input.listedSlugs ?? []).map((s) => s.trim()).filter(Boolean));
  listed.add(primary); // primary is always one of their disciplines

  if (input.aiSlug && listed.has(input.aiSlug)) return input.aiSlug; // multi-discipline match
  return primary; // off-discipline guess → anchor to the freelancer's primary
}
