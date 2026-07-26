/**
 * Proposal status → user-facing label, in both locales.
 *
 * Lives outside the widget so the mapping is unit-testable without rendering
 * React: an English user must never see the raw DB enum (`sent`, `viewed`, …),
 * and a brand-new enum value must degrade to a humanized word, not leak.
 */

/** Every status the DB enum can hold today (proposals.status). */
export const PROPOSAL_STATUSES = [
  "draft",
  "final",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

const statusLabelsAr: Record<string, string> = {
  draft: "مسودة",
  final: "معتمد",
  sent: "مُرسَل",
  viewed: "مُطَّلَع عليه",
  accepted: "مقبول",
  declined: "مرفوض",
  expired: "منتهٍ",
};

// English labels — mirror statusLabelsAr so English users never see the raw DB enum.
const statusLabelsEn: Record<string, string> = {
  draft: "Draft",
  final: "Final",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
};

/** Fallback for an unknown/new enum: humanize, never leak the raw value. */
const humanizeStatus = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function proposalStatusLabel(status: string, locale: "ar" | "en"): string {
  const labels = locale === "ar" ? statusLabelsAr : statusLabelsEn;
  return labels[status] ?? humanizeStatus(status);
}

// Reuse the theme-aware, contrast-paired status pills from globals.css
// (12% accent fill + full-accent text) — never hardcode bg-*-100 + a
// theme-aware text var, which goes light-on-light in dark theme.
const statusColors: Record<string, string> = {
  draft: "status-neutral",
  final: "status-info",
  sent: "status-pending",
  viewed: "status-info",
  accepted: "status-positive",
  declined: "status-overdue",
  expired: "status-neutral",
};

export function proposalStatusClass(status: string): string {
  return statusColors[status] ?? "status-neutral";
}
