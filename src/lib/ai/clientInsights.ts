/**
 * Client Insights AI module — spec M2.6-A.
 * Generates 2–3 pattern insights per client from anonymized context.
 * Server-only (imports generateObject from ai SDK).
 */
import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";

export type ClientInsightsCtx = {
  name: string;
  client_type: string | null;
  industry: string | null;
  tags: string[];
  gigs: Array<{ title: string; amount_sar: number; status: string; date: string | null }>;
  proposals: Array<{ title: string | null; amount_sar: number | null; status: string; date: string | null }>;
  avgPaymentDays: number | null;
};

const InsightsSchema = z.object({
  insights_ar: z.array(z.string()).min(1).max(3),
  insights_en: z.array(z.string()).min(1).max(3),
});

/**
 * Generates 2–3 bilingual insights about a client from anonymized context.
 * Returns `{ ar, en }` with "تحليل رِزق —" / "Rizq Insight —" prefix, or null on failure.
 */
export async function generateClientInsights(
  ctx: ClientInsightsCtx
): Promise<{ ar: string; en: string } | null> {
  const prompt = buildInsightsPrompt(ctx);
  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: InsightsSchema,
      prompt,
      abortSignal: AbortSignal.timeout(10_000),
    });
    const { insights_ar, insights_en } = result.object;
    return {
      ar: `تحليل رِزق — ${insights_ar.join(" | ")}`,
      en: `Rizq Insight — ${insights_en.join(" | ")}`,
    };
  } catch (err) {
    console.error("[generateClientInsights] failed", err);
    return null;
  }
}

function buildInsightsPrompt(ctx: ClientInsightsCtx): string {
  const gigsSummary = ctx.gigs.length
    ? ctx.gigs
        .slice(0, 10)
        .map((g) => `- ${g.title}: ${g.amount_sar} SAR (${g.status})${g.date ? ` on ${g.date}` : ""}`)
        .join("\n")
    : "No gigs recorded.";

  const proposalsSummary = ctx.proposals.length
    ? ctx.proposals
        .slice(0, 5)
        .map((p) => `- ${p.title ?? "Proposal"}: ${p.amount_sar ?? "?"} SAR (${p.status})${p.date ? ` on ${p.date}` : ""}`)
        .join("\n")
    : "No proposals recorded.";

  return `You analyze a Saudi freelancer's client data and generate 2–3 concise, factual insights in both Arabic and English.

CLIENT CONTEXT (anonymized):
- Type: ${ctx.client_type ?? "unknown"}
- Industry: ${ctx.industry ?? "unknown"}
- Tags: ${ctx.tags.join(", ") || "none"}
- Avg payment days: ${ctx.avgPaymentDays != null ? `${ctx.avgPaymentDays} days` : "unknown"}

GIGS:
${gigsSummary}

PROPOSALS:
${proposalsSummary}

RULES:
- Highlight actual patterns (e.g. payment speed, project type trends, proposal acceptance rate).
- Flag risks (e.g. slow payment, declined proposals) or opportunities (e.g. repeat business pattern).
- NEVER fabricate data not shown above. If data is sparse, say so honestly.
- Keep each insight to 1–2 sentences. Saudi-polite tone.
- insights_ar: 2–3 insights in Arabic.
- insights_en: 2–3 insights in English (matching content).`;
}
