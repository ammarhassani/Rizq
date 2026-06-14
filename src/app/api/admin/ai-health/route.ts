/**
 * GET /api/admin/ai-health — admin-only DeepSeek diagnostic.
 *
 * Runs the real generateObject path against DeepSeek and reports exactly why it
 * succeeds or fails in THIS runtime (key presence + whitespace, latency, status
 * code, error body). No secret values are returned — only the key's length and
 * 3-char prefix. Use it in production to tell a 401 (bad/whitespace key) apart
 * from a timeout (region/latency) or a network block.
 */
import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

  const t0 = Date.now();
  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: z.object({ ok: z.boolean(), note: z.string() }),
      prompt: 'Reply with this exact JSON: {"ok": true, "note": "pong"}',
      abortSignal: AbortSignal.timeout(25_000),
    });
    return NextResponse.json({ ok: true, key, ms: Date.now() - t0, object: result.object });
  } catch (err: unknown) {
    const e = err as {
      name?: string;
      message?: string;
      statusCode?: number;
      responseBody?: unknown;
      cause?: { message?: string; statusCode?: number };
    };
    return NextResponse.json(
      {
        ok: false,
        key,
        ms: Date.now() - t0,
        error: {
          name: e?.name ?? null,
          message: e?.message ?? null,
          statusCode: e?.statusCode ?? e?.cause?.statusCode ?? null,
          body: String(e?.responseBody ?? e?.cause?.message ?? "").slice(0, 600),
        },
      },
      { status: 200 }
    );
  }
}
