/**
 * Where onboarding picks back up.
 *
 * `users.onboarding_step` stores the step that was last SAVED. Resuming *on* it put the
 * freelancer back on the screen they had just completed, so the flow looked stuck. The
 * column keeps its meaning; the wizard resolves the next unfinished step from it.
 *
 * PURE. Both values are 1-based like the stored column; the return is a 0-based index.
 */
export function resumeStepIndex(lastSavedStep: number | null | undefined, totalSteps: number): number {
  if (totalSteps <= 0) return 0;

  const saved = Number.isFinite(lastSavedStep) ? Number(lastSavedStep) : 0;
  // saved = 0 → nothing done yet → the first step. saved = n → the one after it.
  const next = saved > 0 ? saved : 0;

  // Clamped at both ends: never before the start, never past the review step.
  return Math.max(0, Math.min(next, totalSteps - 1));
}
