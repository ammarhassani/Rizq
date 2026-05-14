"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, maybeSweep } from "@/lib/rateLimit";

const InputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(8).max(72),
  name: z.string().trim().max(120).optional().nullable(),
  language_preference: z.enum(["ar", "en"]),
});

export type SignupResult =
  | { ok: true; needsVerification: boolean }
  | { ok: false; code: "invalid" | "email_taken" | "weak_password" | "rate_limited" | "error" };

async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  return xff ? xff.split(",")[0]!.trim() : h.get("x-real-ip") ?? "unknown";
}

export async function signUp(input: unknown): Promise<SignupResult> {
  maybeSweep();

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const ip = await getClientIp();
  const rl = checkRateLimit(`signup:${ip}`, 5, 5 * 60 * 1000);
  if (!rl.allowed) return { ok: false, code: "rate_limited" };

  const supabase = await createClient();
  const h = await headers();
  const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Route through /dashboard; it forwards new users to /onboarding via
      // the users.onboarded_at gate so returning users skip the screen.
      emailRedirectTo: `${origin}/auth/callback?next=/${parsed.data.language_preference}/dashboard`,
      data: {
        name: parsed.data.name ?? null,
        preferred_language: parsed.data.language_preference,
      },
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already registered") || msg.includes("already been registered")) {
      return { ok: false, code: "email_taken" };
    }
    if (msg.includes("weak") || msg.includes("password should")) {
      return { ok: false, code: "weak_password" };
    }
    if (msg.includes("rate limit") || msg.includes("too many")) {
      return { ok: false, code: "rate_limited" };
    }
    console.error("[signup] error", error);
    return { ok: false, code: "error" };
  }

  // Supabase returns user with no session when email confirmation is required.
  const needsVerification = !data.session;
  return { ok: true, needsVerification };
}
