"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const InputSchema = z.object({
  preferred_language: z.enum(["ar", "en"]),
  city: z.string().trim().max(80).optional().nullable(),
  // specialty is captured in user_metadata for now; cities/specialties tables
  // arrive in Sprint 3.
  specialty: z.string().trim().max(120).optional().nullable(),
});

export type OnboardingResult =
  | { ok: true }
  | { ok: false; code: "invalid" | "no_session" | "error" };

export async function saveOnboarding(
  input: unknown
): Promise<OnboardingResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "no_session" };

  const { error } = await supabase
    .from("users")
    .update({
      preferred_language: parsed.data.preferred_language,
      city: parsed.data.city || null,
      last_active: new Date().toISOString(),
    })
    .eq("id", userData.user.id);

  if (error) {
    console.error("[onboarding] update failed", error);
    return { ok: false, code: "error" };
  }

  // Stash specialty in auth metadata until the specialties table lands.
  if (parsed.data.specialty) {
    await supabase.auth.updateUser({
      data: { specialty: parsed.data.specialty },
    });
  }

  return { ok: true };
}

export async function skipOnboarding(locale: "ar" | "en") {
  // No-op DB write — just bounce to dashboard. Touch last_active.
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    await supabase
      .from("users")
      .update({ last_active: new Date().toISOString() })
      .eq("id", userData.user.id);
  }
  redirect(`/${locale}/dashboard`);
}
