/**
 * GET /api/admin/ai-health — admin-only DeepSeek diagnostic.
 *
 * Runs the real generateObject path against DeepSeek and reports exactly why it
 * succeeds or fails in THIS runtime. Two probes:
 *  - simple: a tiny call (like the dashboard insights call).
 *  - scope:  the heavy Studio call (large few-shot prompt + complex schema) —
 *            this is what proposal generation actually runs.
 * No secret values are returned — only the key's length and 3-char prefix. Use
 * it in production to tell a 401 (bad/whitespace key) apart from a timeout
 * (region/latency), a schema/validation failure, or a network block.
 */
import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";
import { ScopeSchema, buildScopePrompt, SPECIALTY_SLUGS } from "@/lib/ai/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ProbeError = { name: string | null; message: string | null; statusCode: number | null; body: string };
type ProbeResult =
  | { ok: true; ms: number; sample: unknown }
  | { ok: false; ms: number; error: ProbeError };

function describeError(err: unknown): ProbeError {
  const e = err as {
    name?: string;
    message?: string;
    statusCode?: number;
    responseBody?: unknown;
    cause?: { message?: string; statusCode?: number };
  };
  return {
    name: e?.name ?? null,
    message: e?.message ?? null,
    statusCode: e?.statusCode ?? e?.cause?.statusCode ?? null,
    body: String(e?.responseBody ?? e?.cause?.message ?? "").slice(0, 600),
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const raw = process.env.DEEPSEEK_API_KEY ?? "";
  const trimmed = raw.trim();
  const key = {
    present: trimmed.length > 0,
    rawLen: raw.length,
    trimmedLen: trimmed.length,
    hadSurroundingWhitespace: raw.length !== trimmed.length,
    prefix: trimmed.slice(0, 3), // e.g. "sk-" — not secret
    model: REASONING_MODEL,
    vercelRegion: process.env.VERCEL_REGION ?? null,
  };

  if (!key.present) {
    return NextResponse.json(
      { ok: false, key, error: "DEEPSEEK_API_KEY is empty in this runtime" },
      { status: 200 }
    );
  }

  // Probe 1 — simple call (mirrors dashboard insights).
  let simple: ProbeResult;
  {
    const t0 = Date.now();
    try {
      const r = await generateObject({
        model: deepseek(REASONING_MODEL),
        schema: z.object({ ok: z.boolean(), note: z.string() }),
        prompt: 'Reply with this exact JSON: {"ok": true, "note": "pong"}',
        abortSignal: AbortSignal.timeout(25_000),
      });
      simple = { ok: true, ms: Date.now() - t0, sample: r.object };
    } catch (err) {
      simple = { ok: false, ms: Date.now() - t0, error: describeError(err) };
    }
  }

  // Probe 2 — Studio scope extraction (the heavy call that powers proposals).
  let scope: ProbeResult;
  {
    const ctx = {
      specialtyLines: SPECIALTY_SLUGS.join(", "),
      cityLines: "الرياض, جدة, الدمام",
      tierLines: "مبتدئ (0-1y), متوسط (2-4y), خبير (5y+)",
    };
    const prompt = buildScopePrompt(
      "ابي شعار لشركتي الجديدة في الرياض، احترافي وعصري، تسليم خلال اسبوع، الميزانية 1500 ريال",
      ctx
    );
    const t0 = Date.now();
    try {
      const r = await generateObject({
        model: deepseek(REASONING_MODEL),
        schema: ScopeSchema,
        prompt,
        abortSignal: AbortSignal.timeout(30_000),
      });
      scope = { ok: true, ms: Date.now() - t0, sample: { specialty: r.object.specialty, deliverables: r.object.deliverables.length } };
    } catch (err) {
      scope = { ok: false, ms: Date.now() - t0, error: describeError(err) };
    }
  }

  return NextResponse.json({ ok: simple.ok && scope.ok, key, simple, scope });
}
