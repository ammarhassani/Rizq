"use server";

import { z } from "zod";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, refundRateLimit, maybeSweep } from "@/lib/rateLimit";

const InputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(8).max(72),
  name: z.string().trim().max(120).optional().nullable(),
  language_preference: z.enum(["ar", "en"]),
});

export type SignupResult =
  | { ok: true; needsVerification: boolean }
  | { ok: false; code: "invalid" | "invalid_email" | "email_taken" | "weak_password" | "rate_limited" | "error" };

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
  const rlKey = `signup:${ip}`;
  const rl = await checkRateLimit(rlKey, 5, 5 * 60 * 1000);
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
      await refundRateLimit(rlKey); // benign — created nothing, don't count it
      return { ok: false, code: "email_taken" };
    }
    if (msg.includes("weak") || msg.includes("password should")) {
      await refundRateLimit(rlKey);
      return { ok: false, code: "weak_password" };
    }
    if (msg.includes("rate limit") || msg.includes("too many")) {
      return { ok: false, code: "rate_limited" };
    }
    // GoTrue rejects addresses it can't deliver to (e.g. @test.com / @example.com).
    // Surface it on the email field instead of a generic "something went wrong".
    if (error.code === "email_address_invalid" || (msg.includes("invalid") && msg.includes("email"))) {
      await refundRateLimit(rlKey); // typo'd / undeliverable email isn't abuse
      return { ok: false, code: "invalid_email" };
    }
    console.error("[signup] error", { code: error.code });
    return { ok: false, code: "error" };
  }

  // Clear the anonymous session cookie — once the user has an account,
  // the lifetime anon quota is meaningless and the cookie just clutters.
  try {
    const store = await cookies();
    if (store.get("rizq_anon_session")) {
      store.delete("rizq_anon_session");
    }
  } catch {
    /* server-component read-only path; ignored */
  }

  // Supabase returns user with no session when email confirmation is required.
  const needsVerification = !data.session;
  return { ok: true, needsVerification };
}
