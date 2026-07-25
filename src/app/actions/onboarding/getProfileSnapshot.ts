"use server";

/**
 * Re-reads the caller's own profile snapshot.
 *
 * The wizard holds the snapshot it was server-rendered with and only patches the
 * completeness percentage as steps save. That is fine while you're editing a step
 * (each step owns its own inputs), but the review step summarises fields it never
 * owned — so for a brand-new signup it read an empty snapshot and reported every
 * section "incomplete" next to a 100% bar. Re-reading before the summary keeps the
 * two halves of that screen telling the same story.
 */

import { createClient } from "@/lib/supabase/server";
import { loadProfileSnapshot } from "@/lib/profile/snapshot";
import type { ProfileSnapshot } from "@/components/onboarding/types";

export async function getProfileSnapshot(): Promise<ProfileSnapshot | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { snapshot } = await loadProfileSnapshot(supabase, user.id);
  return snapshot;
}
