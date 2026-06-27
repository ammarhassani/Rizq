/**
 * Anchor-proposal ordering (feature 005, US4).
 *
 * The Project Start chooser's "use an existing proposal" picker lists the user's
 * UNANCHORED proposals, most-likely-to-become-a-project first: accepted › sent ›
 * viewed › draft › other, then most recent. Pure + tested (the orderable rule).
 */

const STATUS_PRIORITY: Record<string, number> = {
  accepted: 0,
  sent: 1,
  viewed: 2,
  draft: 3,
};

export function anchorStatusRank(status: string): number {
  return STATUS_PRIORITY[status] ?? 4;
}

export function sortAnchorProposals<T extends { status: string; createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ra = anchorStatusRank(a.status);
    const rb = anchorStatusRank(b.status);
    if (ra !== rb) return ra - rb;
    // Same status priority → most recent first.
    return b.createdAt.localeCompare(a.createdAt);
  });
}
