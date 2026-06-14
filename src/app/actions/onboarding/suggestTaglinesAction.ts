"use server";

/**
 * P5.10 — suggestTaglinesAction: server action to generate AI tagline suggestions.
 * Fetches the user's current profile to build context, then calls suggestTaglines.
 * Returns null on any error (not authenticated, AI failure, etc.).
 */

import { createClient } from "@/lib/supabase/server";
import { suggestTaglines } from "@/lib/ai/taglineSuggestion";
import type { TaglineSuggestions } from "@/lib/ai/taglineSuggestion";

export async function suggestTaglinesAction(): Promise<TaglineSuggestions | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("specialties, primary_specialty_id, bio_ar, primary_goal, city")
    .eq("id", userData.user.id)
    .maybeSingle();

  // Best-effort specialty label from the specialties array (first entry)
  const specialty =
    (profile?.specialties as string[] | null)?.[0] ?? null;

  const ctx = {
    specialty,
    bio_ar: (profile?.bio_ar as string | null) ?? null,
    primary_goal: (profile?.primary_goal as string | null) ?? null,
    city: (profile?.city as string | null) ?? null,
  };

  return suggestTaglines(ctx);
}
