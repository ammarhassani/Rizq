export type Role = "free" | "pro" | "admin";

/**
 * Effective Pro status — the single source of truth for tier gating.
 *
 * A `pro` grant is active ONLY while `pro_until` is in the future; once it
 * passes (or was never set) the user is back on the free tier. Admins are
 * always Pro (their access is role-based, `pro_until` is irrelevant).
 *
 * `pro_until <= now` (including exactly now) counts as expired — see feature
 * 010 spec edge case. Every tier gate (quota, upgrade, per-feature AI locks)
 * routes through here so an expired grant lapses everywhere at once, instead
 * of each caller re-deriving `role === 'pro'` and never checking expiry.
 *
 * ponytail: this uses the app-server clock while the DB quota trigger uses
 * `now()`, so within a few ms of the expiry instant the two can disagree for a
 * single request. Accepted by design — the DB trigger is authoritative for what
 * actually gets written; this check is the advisory/display layer. Aligning them
 * would mean a round-trip per gate to buy a sub-second edge nobody can observe.
 */
export function isProActive(
  role: Role,
  proUntil: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (role === "admin") return true;
  if (role !== "pro") return false;
  if (!proUntil) return false;
  return new Date(proUntil).getTime() > now.getTime();
}
