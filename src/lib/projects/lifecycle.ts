/**
 * Project Lifecycle Wizard (spec 003) — pure stage resolver.
 *
 * Derives the engagement's lifecycle stage from real data — never a stored step
 * counter — so progress can't drift (FR-006, SC-004). Stages: ① proposal,
 * ② project, ③ invoice. Pure + deterministic + total (never throws).
 */

export type LifecycleStageKey = "proposal" | "project" | "invoice";
export type LifecycleStageState = "done" | "current" | "next" | "skipped";
export type LifecycleNextAction =
  | "finalize_proposal"
  | "set_up_project"
  | "create_invoice"
  | "send_invoice"
  | "mark_paid"
  | null;

export type LifecycleInput = {
  /** The origin proposal (or the draft anchor before a project exists). */
  proposal?: { status: string } | null;
  /** Whether a project row exists for this engagement. */
  hasProject: boolean;
  /** Whether that project has an origin proposal (false ⇒ billed directly). */
  projectHasOriginProposal: boolean;
  /** The 1:1 money child, if created. */
  gig?: { amount_sar: number; status: string } | null;
  /** Invoices billed against the project. */
  invoices: { status: string }[];
};

export type Lifecycle = {
  stages: { key: LifecycleStageKey; state: LifecycleStageState }[];
  currentStageKey: LifecycleStageKey | null;
  complete: boolean;
  nextAction: LifecycleNextAction;
};

const FINALIZED = ["final", "sent", "viewed", "accepted"];
const INVOICE_SENT = ["sent", "viewed", "paid"];

export function resolveLifecycle(input: LifecycleInput): Lifecycle {
  const invoices = Array.isArray(input.invoices) ? input.invoices : [];

  // ── Stage ① proposal ──────────────────────────────────────────────────────
  const proposalSkipped = input.hasProject && !input.projectHasOriginProposal;
  const proposalFinalized = !!input.proposal && FINALIZED.includes(input.proposal.status);
  // Once a project exists with an origin, ① is done even if the proposal was
  // later declined/expired (the project outlives the quote).
  const proposalDone = !proposalSkipped && (input.hasProject || proposalFinalized);

  // ── Stage ② project ───────────────────────────────────────────────────────
  const projectDone = input.hasProject && !!input.gig;

  // ── Stage ③ invoice ───────────────────────────────────────────────────────
  const paid = invoices.some((i) => i.status === "paid");
  const hasInvoice = invoices.length > 0;
  const invoiceDone = paid;

  // Resolved (done|skipped) vs pending, in order.
  const resolved: Record<LifecycleStageKey, "done" | "skipped" | "pending"> = {
    proposal: proposalSkipped ? "skipped" : proposalDone ? "done" : "pending",
    project: projectDone ? "done" : "pending",
    invoice: invoiceDone ? "done" : "pending",
  };

  const order: LifecycleStageKey[] = ["proposal", "project", "invoice"];
  const currentStageKey = order.find((k) => resolved[k] === "pending") ?? null;
  const complete = currentStageKey === null;

  const stages = order.map((key) => {
    const r = resolved[key];
    const state: LifecycleStageState =
      r === "done" ? "done" : r === "skipped" ? "skipped" : key === currentStageKey ? "current" : "next";
    return { key, state };
  });

  let nextAction: LifecycleNextAction = null;
  if (currentStageKey === "proposal") {
    nextAction = "finalize_proposal";
  } else if (currentStageKey === "project") {
    nextAction = "set_up_project";
  } else if (currentStageKey === "invoice") {
    if (!hasInvoice) nextAction = "create_invoice";
    else if (invoices.some((i) => INVOICE_SENT.includes(i.status))) nextAction = "mark_paid";
    else nextAction = "send_invoice";
  }

  return { stages, currentStageKey, complete, nextAction };
}
