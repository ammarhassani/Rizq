import { generateObject } from "ai";
import { z } from "zod";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";
import { promptHash } from "@/lib/ai/promptHash";
import type { BenchmarkRow } from "./types";

const PriorSchema = z.object({
  min: z.number().positive(),
  median: z.number().positive(),
  max: z.number().positive(),
  reasoning_ar: z.string(),
});

export type AnchorRow = {
  tier_slug: string;
  city_slug: string;
  price_sar: number;
  provenance: string;
};

export type ReasonedCell = {
  specialty_id: string;
  city_id: string;
  experience_tier_id: string;
  specialty_name_ar: string;
  city_name_ar: string;
  region: string;
  tier_name_ar: string;
  years_min: number;
  years_max: number | null;
  anchors: AnchorRow[];
};

/**
 * Collector 3 — DeepSeek reasoned constrained prior (spec §M4.7-A).
 * Boxed by anchor rows; never free-hand. provenance='reasoned', confidence
 * forced to 0.2 by design (an estimate, not data). Labeled with model + hash.
 * Returns null on failure or an out-of-order range (caller filters nulls).
 */
export async function generateReasonedRow(
  cell: ReasonedCell
): Promise<BenchmarkRow | null> {
  const anchorTable = cell.anchors
    .map(
      (a) =>
        `- ${a.tier_slug} / ${a.city_slug}: ${a.price_sar} SAR (${a.provenance})`
    )
    .join("\n");

  const prompt = `You are estimating freelance pricing in Saudi Arabia. Given:
- Specialty: ${cell.specialty_name_ar}
- City: ${cell.city_name_ar} (region: ${cell.region})
- Experience tier: ${cell.tier_name_ar} (${cell.years_min}-${cell.years_max ?? "+"} years)

Known anchor points (published/founder references for this specialty):
${anchorTable || "(none — interpolate conservatively within plausible Saudi ranges)"}

Estimate a price range (min, median, max) in SAR. Rules:
- Interpolate between known anchors. Never extrapolate beyond the anchor range.
- Account for city cost-of-living (Riyadh > Jeddah > Dammam > other cities).
- Account for experience-tier scaling.
- Be conservative: wider range when uncertain.
- confidence is 0.2 by design — this is an estimate, not data.`;

  const hash = promptHash(prompt);

  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: PriorSchema,
      prompt,
    });
    const object = result.object;
    if (!(object.min <= object.median && object.median <= object.max)) return null;
    return {
      specialty_id: cell.specialty_id,
      city_id: cell.city_id,
      experience_tier_id: cell.experience_tier_id,
      project_size: null,
      price_sar: object.median,
      provenance: "reasoned",
      confidence: 0.2,
      source_ref: `${REASONING_MODEL}#${hash}`,
      captured_at: new Date().toISOString(),
      notes: object.reasoning_ar.slice(0, 500),
    };
  } catch (err) {
    console.error("[generateReasonedRow] failed for cell", cell.specialty_id, err);
    return null;
  }
}
