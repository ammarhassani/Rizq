"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit, maybeSweep } from "@/lib/rateLimit";

// Keep the schema strict: trim + lowercase email; locale must be ar|en
const InputSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(320)
    .email(),
  language_preference: z.enum(["ar", "en"]),
  source: z.string().max(64).optional().nullable(),
});

export type WaitlistActionResult =
  | { ok: true }
  | { ok: false; code: "invalid" | "rate_limited" | "duplicate" | "error" };

const RATE_LIMIT_MAX = 5; // submissions
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // per 5 minutes per IP

async function getClientIp(): Promise<string> {
  const h = await headers();
  // Vercel / common proxies
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function joinWaitlist(
  input: unknown
): Promise<WaitlistActionResult> {
  maybeSweep();

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const ip = await getClientIp();
  const rl = await checkRateLimit(
    `waitlist:${ip}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS
  );
  if (!rl.allowed) return { ok: false, code: "rate_limited" };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("waitlist")
    .insert({
      email: parsed.data.email,
      language_preference: parsed.data.language_preference,
      source: parsed.data.source ?? null,
    });

  if (error) {
    // 23505 = unique_violation (Postgres). Surface as a friendly duplicate.
    if (error.code === "23505") return { ok: false, code: "duplicate" };
    console.error("[waitlist] insert failed", { code: error.code });
    return { ok: false, code: "error" };
  }

  return { ok: true };
}
