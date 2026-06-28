"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Schema = z.enum(["ar", "en"]);

/**
 * Persist the freelancer's preferred language (onboarding Welcome step).
 * Owner-scoped; the URL locale drives the live UI, this keeps the profile
 * column in sync for emails/server defaults. Best-effort.
 */
export async function setPreferredLanguage(locale: unknown): Promise<{ ok: boolean }> {
  const parsed = Schema.safeParse(locale);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("users")
    .update({ preferred_language: parsed.data })
    .eq("id", user.id);

  return { ok: !error };
}
