import {
  saveOnboardingStep,
  type SaveOnboardingStepResult,
} from "@/app/actions/onboarding/saveOnboardingStep";
import { attempt } from "@/lib/actions/attempt";

/**
 * `saveOnboardingStep`, minus the way a dead request takes the page with it.
 *
 * Every step calls the same action and every step ends the same way: `if (result.ok) … else
 * setError(errorSave)`. What none of them survived was the request never coming back — an
 * aborted POST rejects inside `startTransition`, and React sends that to the nearest error
 * boundary rather than to the form. Driven with the action POST aborted, a step threw the
 * whole page to "حدث خطأ غير متوقع" and the half-filled form was gone.
 *
 * That matters more here than anywhere else in the app: somebody who loses an onboarding step
 * has not reached the product yet, so there is nothing to come back to.
 *
 * Returning `{ ok: false, code: "error" }` routes a dead request into the failure branch each
 * step already has, so the message is inline and the form keeps what was typed. `error` rather
 * than a new code deliberately: re-saving a step upserts the same profile fields, so a retry
 * here is safe — unlike the money forms, which say "unconfirmed" and ask the freelancer to
 * check before retrying (see lib/actions/attempt).
 */
export async function saveOnboardingStepSafely(
  stepKey: string,
  data: unknown,
): Promise<SaveOnboardingStepResult> {
  const result = await attempt(() => saveOnboardingStep(stepKey, data));
  return result ?? { ok: false, code: "error" };
}
