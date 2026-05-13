"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const InputSchema = z.object({
  specialty_slug: z.string().min(1).max(64),
  city_slug: z.string().min(1).max(64),
  experience_tier_slug: z.string().min(1).max(64),
  project_type: z.string().trim().max(120).optional().nullable(),
  project_size: z
    .enum(["small", "medium", "large", "enterprise"])
    .optional()
    .nullable(),
  price_sar: z.number().min(1).max(1_000_000),
  project_duration_days: z.number().int().min(0).max(3650).optional().nullable(),
  client_type: z
    .enum(["individual", "smb", "corporate", "government", "other"])
    .optional()
    .nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  proof_url: z.string().trim().max(500).optional().nullable(),
});

export type SubmitResult =
  | { ok: true; submission_id: string }
  | {
      ok: false;
      code:
        | "invalid"
        | "login_required"
        | "rate_limited"
        | "error";
    };

/**
 * Records a user-submitted pricing data point. Routes through the
 * submit_pricing security-definer RPC which enforces auth and the
 * 5-per-day rate limit.
 */
export async function submitPricing(input: unknown): Promise<SubmitResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "login_required" };

  // Resolve slugs → IDs (cheap, ref tables are small)
  const [specRes, cityRes, tierRes] = await Promise.all([
    supabase
      .from("specialties")
      .select("id")
      .eq("slug", parsed.data.specialty_slug)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("cities")
      .select("id")
      .eq("slug", parsed.data.city_slug)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("experience_tiers")
      .select("id")
      .eq("slug", parsed.data.experience_tier_slug)
      .maybeSingle(),
  ]);

  if (!specRes.data || !cityRes.data || !tierRes.data) {
    return { ok: false, code: "invalid" };
  }

  const { data: newId, error } = await supabase.rpc("submit_pricing", {
    p_specialty_id: specRes.data.id,
    p_city_id: cityRes.data.id,
    p_experience_tier_id: tierRes.data.id,
    p_project_type: parsed.data.project_type ?? null,
    p_project_size: parsed.data.project_size ?? null,
    p_price_sar: parsed.data.price_sar,
    p_project_duration_days: parsed.data.project_duration_days ?? null,
    p_client_type: parsed.data.client_type ?? null,
    p_notes: parsed.data.notes ?? null,
    p_proof_url: parsed.data.proof_url ?? null,
  });

  if (error) {
    if (error.code === "54000") return { ok: false, code: "rate_limited" };
    if (error.code === "28000") return { ok: false, code: "login_required" };
    console.error("[submit_pricing] error", {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return { ok: false, code: "error" };
  }

  if (!newId) return { ok: false, code: "error" };
  return { ok: true, submission_id: newId as string };
}
