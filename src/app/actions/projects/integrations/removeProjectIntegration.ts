"use server";

/**
 * removeProjectIntegration — Feature 002 (Project hub), task T018.
 * Owner-scoped delete of a project integration. Idempotent.
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const InputSchema = z.object({ integration_id: z.string().uuid() });

export type RemoveProjectIntegrationResult =
  | { ok: true }
  | { ok: false; code: "unauthorized" | "invalid" | "error" };

export async function removeProjectIntegration(
  rawInput: unknown
): Promise<RemoveProjectIntegrationResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createClient();

  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  const { error } = await supabase
    .from("project_integrations")
    .delete()
    .eq("id", parsed.data.integration_id)
    .eq("user_id", userId);

  if (error) {
    console.error("[removeProjectIntegration] delete failed", { code: error.code, message: error.message });
    return { ok: false, code: "error" };
  }

  revalidatePath("/[locale]/projects/[id]", "page");
  return { ok: true };
}
