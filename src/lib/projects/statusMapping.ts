/**
 * Project hub (spec 002) — gig_status → project_status mapping.
 *
 * The backfill and createProjectFromProposal both derive a project's lifecycle
 * status from its money child's gig status. Pure + unit-tested (Constitution IV).
 *
 *   paid       → completed   (money fully collected)
 *   cancelled  → cancelled
 *   everything else (pending | deposit_paid | in_progress | delivered | overdue)
 *              → active      (work is live/ongoing)
 */

import type { GigStatus, ProjectStatus } from "./types";

export function gigStatusToProjectStatus(status: GigStatus | string | null | undefined): ProjectStatus {
  switch (status) {
    case "paid":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return "active";
  }
}
