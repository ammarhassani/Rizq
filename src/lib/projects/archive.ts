/**
 * Project hub (spec 002) — delete-vs-soft-archive eligibility (FR-017).
 *
 * Constitution VI ("never drop data") + PDPL history integrity: a project that
 * carries money (a linked gig/money record) or any invoices MUST be soft-archived
 * (kept, marked inactive) rather than hard-deleted, so historical income totals
 * and invoices survive. Only an empty shell (no money record, no invoices) may be
 * removed outright. Pure + unit-tested.
 */

export type ArchiveDecisionInput = {
  /** Whether the project has a linked money/gig record. */
  hasMoneyRecord: boolean;
  /** Count of invoices billed against the project. */
  invoiceCount: number;
};

/** Returns true when the project must be soft-archived (preserve data). */
export function shouldSoftArchive(input: ArchiveDecisionInput): boolean {
  return input.hasMoneyRecord || input.invoiceCount > 0;
}

export type ArchiveMode = "archived" | "deleted";

export function resolveArchiveMode(input: ArchiveDecisionInput): ArchiveMode {
  return shouldSoftArchive(input) ? "archived" : "deleted";
}
