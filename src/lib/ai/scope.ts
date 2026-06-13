import { generateObject } from "ai";
import { z } from "zod";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";
import { promptHash } from "@/lib/ai/promptHash";

export const SPECIALTY_SLUGS = [
  "graphic-design",
  "logo-design",
  "ui-ux-design",
  "web-dev",
  "mobile-dev",
  "content-writing",
  "translation",
  "digital-marketing",
  "video-editing",
  "photography",
  "voice-over",
  "data-entry",
] as const;

/** Build the scope schema; specialty constrained to the given slugs. */
export function buildScopeSchema(slugs: readonly string[]) {
  return z.object({
    specialty: z.enum(slugs as [string, ...string[]]),
    deliverables: z.array(z.string()).min(1),
    deliverable_count: z.number().int().positive().nullable(),
    revisions: z.number().int().min(0).max(20).nullable(),
    urgency: z
      .enum(["rush_under_1_week", "standard_1_4_weeks", "long_term"])
      .nullable(),
    complexity_signals: z.array(z.string()),
    client_type: z
      .enum(["individual", "smb", "corporate", "government", "agency"])
      .nullable(),
    geography_target: z.enum(["ksa_local", "gcc", "international"]).nullable(),
    language_preference: z.enum(["ar", "en", "both"]).nullable(),
    budget_mentioned: z.number().positive().nullable(),
    ip_transfer: z.enum(["full_transfer", "license", "unclear"]).nullable(),
    // Zod v4: two-arg signature z.record(keySchema, valueSchema)
    field_confidence: z.record(z.string(), z.number().min(0).max(1)),
    extras: z.record(z.string(), z.unknown()).optional(),
  });
}

export const ScopeSchema = buildScopeSchema(SPECIALTY_SLUGS);
export type Scope = z.infer<typeof ScopeSchema>;

/** Mean of the per-field confidence map; 0 when empty. */
export function aggregateConfidence(
  fieldConfidence: Record<string, number>
): number {
  const vals = Object.values(fieldConfidence).filter((n) => Number.isFinite(n));
  if (vals.length === 0) return 0;
  return vals.reduce((s, n) => s + n, 0) / vals.length;
}

export type ScopeCtx = {
  specialtyLines: string; // e.g. "graphic-design (تصميم جرافيك), logo-design (تصميم شعار), ..."
  cityLines: string; // "الرياض, جدة, ..."
  tierLines: string; // "مبتدئ (0-1y), ..."
};

// Founder: review/refine these few-shot examples — extraction quality is sensitive to them.
// Five realistic WhatsApp-style Saudi client briefs (mix Arabic + some English, casual dialect).
const FEW_SHOTS = `
=== Example 1: Logo Design ===
Brief:
"السلام عليكم، ابي شعار لشركتي الجديدة اسمها "نخبة للاستشارات". الشركة في الرياض وتعمل في مجال HR وتطوير المواهب. ابي الشعار يكون احترافي وعصري، ألوان محايدة. تسليم خلال اسبوع. بدي ملفات AI و PNG و PDF وبدي تحويل كامل للملكية. الميزانية 1500 ريال."

Expected JSON:
{
  "specialty": "logo-design",
  "deliverables": ["شعار أساسي", "ملفات AI", "ملفات PNG", "ملفات PDF"],
  "deliverable_count": 4,
  "revisions": null,
  "urgency": "rush_under_1_week",
  "complexity_signals": ["هوية بصرية احترافية", "شركة استشارات HR", "ألوان محايدة"],
  "client_type": "smb",
  "geography_target": "ksa_local",
  "language_preference": "ar",
  "budget_mentioned": 1500,
  "ip_transfer": "full_transfer",
  "field_confidence": {
    "specialty": 0.97,
    "deliverables": 0.92,
    "deliverable_count": 0.9,
    "urgency": 0.95,
    "client_type": 0.75,
    "geography_target": 0.9,
    "language_preference": 0.88,
    "budget_mentioned": 0.99,
    "ip_transfer": 0.97
  }
}

=== Example 2: Social-Media Design Package ===
Brief:
"هلا، ابي تصاميم سوشال ميديا لمطعمنا في جدة. ابي 30 بوست للشهر — انستقرام وسناب. كل بوست يكون موحد مع برانداتنا (ألوان وفونت موجودة). مو محتاج كتابة محتوى بس التصميم بس. ابي تسليم كل اسبوع 8 بوستات. الميزانية مفتوحة بس ما تغالي."

Expected JSON:
{
  "specialty": "graphic-design",
  "deliverables": ["تصاميم انستقرام", "تصاميم سناب شات", "30 بوست شهري"],
  "deliverable_count": 30,
  "revisions": null,
  "urgency": "standard_1_4_weeks",
  "complexity_signals": ["تسليم أسبوعي دوري", "التزام بهوية بصرية موجودة", "30 قطعة شهرياً"],
  "client_type": "smb",
  "geography_target": "ksa_local",
  "language_preference": "ar",
  "budget_mentioned": null,
  "ip_transfer": null,
  "field_confidence": {
    "specialty": 0.93,
    "deliverables": 0.9,
    "deliverable_count": 0.95,
    "urgency": 0.8,
    "client_type": 0.78,
    "geography_target": 0.88,
    "language_preference": 0.85,
    "budget_mentioned": 0
  }
}

=== Example 3: Small Website Build ===
Brief:
"وين حالك، محتاج موقع بسيط لعيادتي الطب النفسي. 5 صفحات: الرئيسية، عن الدكتور، الخدمات، المدونة، اتصل بنا. لازم يكون responsive ويدعم العربي والانجليزي. ما عندي دومين بعد. الوقت ما يزيد على شهر. الميزانية 4000-6000 ريال."

Expected JSON:
{
  "specialty": "web-dev",
  "deliverables": ["موقع 5 صفحات", "صفحة رئيسية", "صفحة عن الدكتور", "صفحة الخدمات", "مدونة", "صفحة اتصل بنا"],
  "deliverable_count": 5,
  "revisions": null,
  "urgency": "standard_1_4_weeks",
  "complexity_signals": ["دعم ثنائي اللغة", "responsive design", "بدون دومين", "عيادة طبية"],
  "client_type": "individual",
  "geography_target": "ksa_local",
  "language_preference": "both",
  "budget_mentioned": 5000,
  "ip_transfer": null,
  "field_confidence": {
    "specialty": 0.96,
    "deliverables": 0.88,
    "deliverable_count": 0.9,
    "urgency": 0.85,
    "complexity_signals": 0.9,
    "client_type": 0.7,
    "geography_target": 0.85,
    "language_preference": 0.97,
    "budget_mentioned": 0.85
  }
}

=== Example 4: Arabic Content Writing ===
Brief:
"السلام، اتواصل معاكم من شركة Ajyal Trading. نبي كاتب محتوى يكتب لنا 8 مقالات SEO بالعربي لموقعنا. الموضوعات تجارة الجملة والتوريد. كل مقال حوالي 1000-1500 كلمة. نبي التسليم خلال 3 أسابيع. السعر يكون منافس."

Expected JSON:
{
  "specialty": "content-writing",
  "deliverables": ["8 مقالات SEO بالعربي", "مقالات تجارة الجملة والتوريد"],
  "deliverable_count": 8,
  "revisions": null,
  "urgency": "standard_1_4_weeks",
  "complexity_signals": ["SEO محسّن", "1000-1500 كلمة للمقال", "مجال تجاري متخصص"],
  "client_type": "smb",
  "geography_target": "ksa_local",
  "language_preference": "ar",
  "budget_mentioned": null,
  "ip_transfer": null,
  "field_confidence": {
    "specialty": 0.96,
    "deliverables": 0.92,
    "deliverable_count": 0.98,
    "urgency": 0.82,
    "complexity_signals": 0.88,
    "client_type": 0.75,
    "geography_target": 0.8,
    "language_preference": 0.97
  }
}

=== Example 5: Video Editing ===
Brief:
"كيف الحال، عندنا إعلان فيديو مدته 60 ثانية للحفل السنوي لشركتنا. المواد الخام جاهزة (3 ساعات تصوير). ابي motion graphics بسيطة وsubtitles بالعربي والانجليزي ومؤثرات صوتية. الاستلام بكره او بعد بكره. الشركة في الدمام."

Expected JSON:
{
  "specialty": "video-editing",
  "deliverables": ["فيديو 60 ثانية", "motion graphics", "subtitles عربي وإنجليزي", "مؤثرات صوتية"],
  "deliverable_count": 1,
  "revisions": null,
  "urgency": "rush_under_1_week",
  "complexity_signals": ["3 ساعات مواد خام", "motion graphics", "subtitles ثنائي اللغة", "حفل مؤسسي"],
  "client_type": "corporate",
  "geography_target": "ksa_local",
  "language_preference": "both",
  "budget_mentioned": null,
  "ip_transfer": null,
  "field_confidence": {
    "specialty": 0.95,
    "deliverables": 0.9,
    "deliverable_count": 0.85,
    "urgency": 0.92,
    "complexity_signals": 0.88,
    "client_type": 0.78,
    "geography_target": 0.87,
    "language_preference": 0.93
  }
}
`;

export function buildScopePrompt(briefText: string, ctx: ScopeCtx): string {
  return `You extract a structured pricing scope from a Saudi freelancer's client brief (Arabic, English, or mixed).
Valid specialties: ${ctx.specialtyLines}
Cities: ${ctx.cityLines}
Experience tiers: ${ctx.tierLines}

Rules:
- Choose the single best-fit specialty slug from the list.
- Fill every field you can infer; use null when the brief doesn't say.
- field_confidence: 0..1 per field you populated (how sure you are).
- complexity_signals: short phrases from the brief that affect effort/price.
- Never invent a budget; budget_mentioned only if the client states one.

${FEW_SHOTS}

Now extract the scope for this brief:
"""${briefText}"""`;
}

/** Returns the extracted scope + provenance, or null on failure (caller degrades to a manual form). */
export async function extractScope(
  briefText: string,
  ctx: ScopeCtx
): Promise<{
  scope: Scope;
  model: string;
  promptHash: string;
  confidence: number;
  raw: unknown;
} | null> {
  const prompt = buildScopePrompt(briefText, ctx);
  const hash = promptHash(prompt);
  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: ScopeSchema,
      prompt,
    });
    const scope = result.object;
    return {
      scope,
      model: REASONING_MODEL,
      promptHash: hash,
      confidence: aggregateConfidence(scope.field_confidence),
      raw: result.object,
    };
  } catch (err) {
    console.error("[extractScope] failed", err);
    return null;
  }
}
