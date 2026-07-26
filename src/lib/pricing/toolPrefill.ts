/**
 * What the pricing tool opens with.
 *
 * The freelancer already told us their specialty, city and experience at onboarding. Making
 * them pick all three again to see their own market rate is asking for data we hold.
 *
 * Precedence: an explicit URL parameter (a "run again" link) beats the profile, and both are
 * validated against the known option list so nothing arbitrary reaches the resolver. Every
 * field stays editable — this seeds the form, it does not decide for anyone.
 *
 * PURE.
 */
export function resolvePrefill(
  urlValue: string | null | undefined,
  profileValue: string | null | undefined,
  validSlugs: ReadonlySet<string>,
): string {
  if (urlValue && validSlugs.has(urlValue)) return urlValue;
  if (profileValue && validSlugs.has(profileValue)) return profileValue;
  return "";
}
