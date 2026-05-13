"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { calculateBenchmark, type CalculateResult } from "@/lib/pricing/calculate";
import { getQuotaState } from "@/lib/pricing/quota";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, maybeSweep } from "@/lib/rateLimit";

const InputSchema = z.object({
  specialty_slug: z.string().min(1).max(64),
  city_slug: z.string().min(1).max(64),
  experience_tier_slug: z.string().min(1).max(64),
  project_size: z
    .enum(["small", "medium", "large", "enterprise"])
    .optional()
    .nullable(),
});

export type ToolActionResult =
  | {
      ok: true;
      // The query row id (used for /r/[id] sharing)
      query_id: string;
      // null when result is insufficient_data
      result:
        | (Extract<CalculateResult, { status: "ok" }> & { id: string })
        | Extract<CalculateResult, { status: "insufficient_data" }>;
      quota: {
        mode: "anon" | "free" | "pro" | "admin";
        remaining: number | "unlimited";
      };
    }
  | {
      ok: false;
      code: "invalid" | "quota_exhausted" | "rate_limited" | "error";
      cta?: "signup" | "upgrade";
    };

async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  return xff ? xff.split(",")[0]!.trim() : h.get("x-real-ip") ?? "unknown";
}

export async function calculate(input: unknown): Promise<ToolActionResult> {
  maybeSweep();

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  // Rate-limit independent of quota — protects against scripted abuse on the
  // 1-free-anon-query path even before quota counts kick in.
  const ip = await getClientIp();
  const rl = checkRateLimit(`tool:${ip}`, 20, 60 * 1000);
  if (!rl.allowed) return { ok: false, code: "rate_limited" };

  // Quota gate
  const quota = await getQuotaState();
  if (!quota.ok) {
    return { ok: false, code: "quota_exhausted", cta: quota.cta };
  }

  // Calculate
  const result = await calculateBenchmark(parsed.data);

  if (result.status === "invalid_input") {
    return { ok: false, code: "invalid" };
  }

  // Log the query via security-definer RPC. The function reads auth.uid()
  // server-side, so we don't have to trust (or fight) the caller-supplied
  // user_id. Anon callers must supply a session_id.
  const supabase = await createClient();
  const { data: insertedId, error: insertError } = await supabase.rpc(
    "log_query",
    {
      p_specialty_id: result.ids.specialty_id,
      p_city_id: result.ids.city_id,
      p_experience_tier_id: result.ids.experience_tier_id,
      p_session_id: quota.session_id,
      p_project_size: parsed.data.project_size ?? null,
      p_result_min: result.status === "ok" ? result.min : null,
      p_result_median: result.status === "ok" ? result.median : null,
      p_result_max: result.status === "ok" ? result.max : null,
      p_result_sample_size:
        result.status === "ok" ? result.sample_size : result.sample_size,
      p_result_fallback_used:
        result.status === "ok" ? result.fallback_used : false,
    }
  );

  if (insertError || !insertedId) {
    console.error("[tool/calculate] log_query rpc failed", {
      message: insertError?.message,
      details: insertError?.details,
      hint: insertError?.hint,
      code: insertError?.code,
    });
    return { ok: false, code: "error" };
  }
  const inserted = { id: insertedId as string };

  // For free users, refresh the dashboard so the counter reflects the new query
  if (quota.mode === "free") revalidatePath(`/[locale]/dashboard`, "page");

  // Recompute remaining after this insert
  const remaining =
    quota.remaining === "unlimited"
      ? ("unlimited" as const)
      : Math.max(0, quota.remaining - 1);

  if (result.status === "ok") {
    return {
      ok: true,
      query_id: inserted.id,
      result: { ...result, id: inserted.id },
      quota: { mode: quota.mode, remaining },
    };
  }

  return {
    ok: true,
    query_id: inserted.id,
    result,
    quota: { mode: quota.mode, remaining },
  };
}

const ToggleShareSchema = z.object({
  query_id: z.string().uuid(),
  share: z.boolean(),
});

export async function toggleShare(input: unknown): Promise<{ ok: boolean }> {
  const parsed = ToggleShareSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("queries")
    .update({ public_share: parsed.data.share })
    .eq("id", parsed.data.query_id);

  return { ok: !error };
}
