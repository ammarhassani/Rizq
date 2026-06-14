"use server";

/**
 * P5.10 — completeOnboarding: marks the deep onboarding flow as done.
 * Sets onboarding_completed=true, onboarding_completed_at=now(),
 * and also sets legacy onboarded_at=now() if null — so existing redirect
 * logic (middleware + onboarding page guard) keeps working for new users.
 * Existing legacy users already have onboarded_at set; this is a no-op for them.
 */

import { createClient } from "@/lib/supabase/server";

export type CompleteOnboardingResult =
  | { ok: true }
  | { ok: false; code: "no_session" | "error" };

export async function completeOnboarding(): Promise<CompleteOnboardingResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "no_session" };

  const uid = userData.user.id;
  const nowIso = new Date().toISOString();

  // Fetch current onboarded_at to avoid overwriting an existing timestamp
  const { data: row } = await supabase
    .from("users")
    .select("onboarded_at")
    .eq("id", uid)
    .maybeSingle();

  const { error } = await supabase
    .from("users")
    .update({
      onboarding_completed: true,
      onboarding_completed_at: nowIso,
      // Set legacy onboarded_at only if not already set (legacy users must not be overwritten)
      ...(row?.onboarded_at == null ? { onboarded_at: nowIso } : {}),
      last_active: nowIso,
    })
    .eq("id", uid);

  if (error) {
    console.error("[completeOnboarding] update failed", error.code);
    return { ok: false, code: "error" };
  }

  return { ok: true };
}
