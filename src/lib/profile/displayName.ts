/**
 * Human-facing display name for a freelancer who hasn't set one yet.
 *
 * The old fallback was `email.split("@")[0]`, which greeted people with things
 * like "أهلًا، azahrani337+rizqe2e-1784681842677-582326" — the plus-tag and all —
 * on a screen they might be sharing. Strip the tag, cap the length, and never let
 * a raw address stand in for a name.
 */
export function displayNameFromEmail(email: string | null | undefined): string | null {
  const local = email?.split("@")[0]?.split("+")[0]?.trim();
  if (!local) return null;
  return local.length > 24 ? `${local.slice(0, 24)}…` : local;
}

/** Profile name, else a cleaned-up email handle, else null. */
export function resolveDisplayName(
  fullName: string | null | undefined,
  legacyName: string | null | undefined,
  email: string | null | undefined
): string | null {
  return (
    (fullName?.trim() || null) ??
    (legacyName?.trim() || null) ??
    displayNameFromEmail(email)
  );
}
