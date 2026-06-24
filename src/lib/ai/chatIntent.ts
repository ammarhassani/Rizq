import "server-only";

/**
 * Chat intent router (feature 001 / US4). Maps a freelancer's free-text revision
 * message to: which AI-editable prose section(s) to edit, a distilled instruction,
 * an optional scope change (add/remove a deliverable — which the caller surfaces
 * for confirmation, never auto-applies), and a short bilingual acknowledgement.
 *
 * The schema enumerates ONLY the five editable prose sections, so the router can
 * never target price/timeline/milestones/terms (honesty architecture).
 */

import { generateObject } from "ai";
import { z } from "zod";
import { deepseek, REASONING_MODEL } from "./client";

const EDITABLE = [
  "cover_letter",
  "understanding",
  "approach",
  "scope_of_work",
  "assumptions",
] as const;

export const ChatIntentSchema = z.object({
  target_section_ids: z.array(z.enum(EDITABLE)).max(5),
  instruction: z.string().max(800),
  scope_change: z
    .object({
      kind: z.enum(["add", "remove"]),
      deliverable_ar: z.string().min(1).max(160),
      deliverable_en: z.string().min(1).max(160),
    })
    .nullable(),
  reply_ar: z.string().min(1).max(500),
  reply_en: z.string().min(1).max(500),
});

export type ChatIntent = z.infer<typeof ChatIntentSchema>;

function buildIntentPrompt(
  message: string,
  ctx: { deliverables: string[]; briefSnippet: string },
): string {
  const deliverables =
    ctx.deliverables.length > 0
      ? ctx.deliverables.map((d, i) => `${i + 1}. ${d}`).join("\n")
      : "(none listed)";

  return `A Saudi freelancer is editing a client proposal and sent you a revision message.
Decide which proposal section(s) it affects and how, then reply briefly.

The ONLY sections you may edit (narrative prose):
- cover_letter: the opening letter framing the value offered.
- understanding: restates the client's needs so they feel heard.
- approach: the phased plan / methodology.
- scope_of_work: descriptions of the deliverables.
- assumptions: project assumptions and exclusions.

You may NOT edit price, timeline, milestones, or legal/terms — never target them.

Current deliverables:
${deliverables}

Brief excerpt (context):
"""${ctx.briefSnippet}"""

The freelancer's message:
"""${message}"""

Return:
- target_section_ids: the section(s) to update (only from the list above). Empty if the message is just a question or implies no prose change.
- instruction: a concise directive describing the change to apply to those sections (in the proposal's language).
- scope_change: if the message implies ADDING or REMOVING a deliverable / unit of work (e.g. "also make it a mobile app", "add a control panel"), set kind + the deliverable name in Arabic and English. Otherwise null. (Adding work changes the price, so the freelancer will confirm it separately — do not assume a price.)
- reply_ar / reply_en: one short, warm sentence acknowledging what you changed or asking for clarification.

Never invent numbers, prices, or dates.`;
}

export async function routeChatIntent(
  message: string,
  ctx: { deliverables: string[]; briefSnippet: string },
): Promise<ChatIntent | null> {
  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: ChatIntentSchema,
      prompt: buildIntentPrompt(message, ctx),
      abortSignal: AbortSignal.timeout(20_000),
    });
    return result.object;
  } catch (err) {
    console.error("[routeChatIntent] failed", err);
    return null;
  }
}
