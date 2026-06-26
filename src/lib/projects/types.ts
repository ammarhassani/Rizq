/**
 * Project hub (spec 002) — shared enums/constants mirroring the DB enums.
 * Kept as plain TS unions because the codebase uses untyped Supabase queries.
 */

export const PROJECT_STATUSES = [
  "active",
  "on_hold",
  "completed",
  "archived",
  "cancelled",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_PROPOSAL_ROLES = ["origin", "change_order", "sub_scope"] as const;
export type ProjectProposalRole = (typeof PROJECT_PROPOSAL_ROLES)[number];

export const PROJECT_INTEGRATION_PROVIDERS = [
  "figma",
  "github",
  "behance",
  "adobe",
  "drive",
  "other",
] as const;
export type ProjectIntegrationProvider = (typeof PROJECT_INTEGRATION_PROVIDERS)[number];

export const PROJECT_INTEGRATION_STATUSES = ["linked", "disconnected", "error"] as const;
export type ProjectIntegrationStatus = (typeof PROJECT_INTEGRATION_STATUSES)[number];

// ── Project Workspace (spec 004) ──
export const PROJECT_DOC_KINDS_T = ["input", "deliverable"] as const;
export type ProjectDocKind = (typeof PROJECT_DOC_KINDS_T)[number];

export const DELIVERABLE_STATES = ["draft", "ready", "sent"] as const;
export type DeliverableState = (typeof DELIVERABLE_STATES)[number];

export const TASK_STATUSES = ["todo", "doing", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** gig_status values that exist today (source for the backfill mapping). */
export type GigStatus =
  | "pending"
  | "deposit_paid"
  | "in_progress"
  | "delivered"
  | "paid"
  | "overdue"
  | "cancelled";
