import { describe, it, expect } from "vitest";
import {
  ProseSchema,
  buildProsePrompt,
  mergeProseIntoArtifact,
  pickProseField,
  type ProseDraft,
  type ProsePromptArgs,
} from "./proseDraft";
import { buildArtifactData, type ArtifactData } from "@/lib/proposals/artifact";
import type { Scope } from "@/lib/ai/scope";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const scope: Scope = {
  specialty: "logo-design",
  deliverables: ["شعار أساسي", "ملفات المصدر"],
  deliverable_count: 2,
  revisions: 2,
  urgency: "rush_under_1_week",
  complexity_signals: ["هوية بصرية احترافية"],
  client_type: "smb",
  geography_target: "ksa_local",
  language_preference: "ar",
  budget_mentioned: null,
  ip_transfer: "full_transfer",
  field_confidence: { specialty: 0.97, deliverables: 0.9 },
};

const promptArgs: ProsePromptArgs = {
  scope,
  brief: "ابي شعار لشركتي الجديدة، احترافي وعصري، تسليم خلال اسبوع",
  goals: "إطلاق هوية بصرية تعكس الاحترافية",
  profile: {
    freelancerName: "عمار",
    bio: "مصمم هوية بصرية بخبرة في السوق السعودي",
    yearsExperience: 5,
    specialty: "logo-design",
  },
  price: { min: 1000, anchor: 1500, max: 2000 },
  deliverables: ["شعار أساسي", "ملفات المصدر"],
  locale: "ar",
};

/** Build a fresh, realistic artifact with templated defaults (prose all null). */
function freshArtifact(): ArtifactData {
  return buildArtifactData({
    locale: "ar",
    proposalId: "test-id",
    freelancerName: "عمار",
    brandNameAr: null,
    taglineAr: null,
    logoUrl: null,
    brandColors: null,
    contact: { email: null, phone: null, whatsapp: null },
    clientName: "نخبة للاستشارات",
    projectTitle: null,
    issueDate: "2026-06-15T00:00:00.000Z",
    deliverables: ["شعار أساسي", "ملفات المصدر"],
    projectDescriptionAr: null,
    revisions: 2,
    coverLetterBody: null,
    understandingBody: null,
    approachPhases: null,
    assumptions: null,
    exclusions: null,
    deliverableDescriptions: null,
    proseAiGenerated: false,
    priceMin: 1000,
    priceAnchor: 1500,
    priceMax: 2000,
    provenanceCitation: "بناءً على 12 عرضًا في الرياض",
    included: null,
    depositPct: 50,
    ipTerms: "full_transfer",
    startDate: null,
    deliveryDate: null,
    validityDays: 30,
    bioAr: null,
    bioEn: null,
    yearsExperience: 5,
    totalProjectsCompleted: null,
    notableClients: null,
    portfolioSamples: null,
    testimonials: null,
  });
}

function sectionById(a: ArtifactData, id: string) {
  return a.sections.find((s) => s.id === id);
}

// ---------------------------------------------------------------------------
// ProseSchema
// ---------------------------------------------------------------------------

describe("ProseSchema", () => {
  const valid = {
    coverLetter: "نشكركم على الفرصة.",
    understanding: "فهمنا أنكم تحتاجون هوية بصرية.",
    approach: [
      { title: "الاستكشاف", body: "مراجعة المتطلبات." },
      { title: "التنفيذ", body: "إنجاز التصميم." },
    ],
    deliverableDescriptions: ["شعار متجه قابل للتوسيع", "ملفات AI و PDF"],
    assumptions: ["تقديم الملاحظات في الوقت المناسب", "توفير المحتوى"],
    exclusions: ["تكاليف الأطراف الثالثة"],
  };

  it("parses a valid prose object", () => {
    const r = ProseSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it("rejects fewer than 2 approach phases", () => {
    const r = ProseSchema.safeParse({
      ...valid,
      approach: [{ title: "x", body: "y" }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects more than 5 approach phases", () => {
    const r = ProseSchema.safeParse({
      ...valid,
      approach: Array(6).fill({ title: "x", body: "y" }),
    });
    expect(r.success).toBe(false);
  });

  it("rejects fewer than 2 assumptions and empty exclusions", () => {
    expect(ProseSchema.safeParse({ ...valid, assumptions: ["one"] }).success).toBe(false);
    expect(ProseSchema.safeParse({ ...valid, exclusions: [] }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildProsePrompt — directives + honesty
// ---------------------------------------------------------------------------

describe("buildProsePrompt", () => {
  const prompt = buildProsePrompt(promptArgs);

  it("includes each deliverable, numbered in order", () => {
    expect(prompt).toContain("1. شعار أساسي");
    expect(prompt).toContain("2. ملفات المصدر");
  });

  it("instructs one description per deliverable in the SAME ORDER", () => {
    expect(prompt).toMatch(/SAME ORDER/i);
    expect(prompt).toContain("deliverableDescriptions");
  });

  it("includes the client's stated goals", () => {
    expect(prompt).toContain("إطلاق هوية بصرية تعكس الاحترافية");
  });

  it("restates that it must reflect the client's stated needs (understanding)", () => {
    expect(prompt).toMatch(/RESTATE the client's stated needs/i);
  });

  it("embeds the brief verbatim", () => {
    expect(prompt).toContain(promptArgs.brief);
  });

  it("forbids fabricating numbers, prices, dates, names, credentials, outcomes", () => {
    expect(prompt).toMatch(/[Nn]ever invent numbers, prices, dates, client names, credentials, or outcomes/);
    // Arabic no-fabrication phrasing also present.
    expect(prompt).toContain("لا تخترع");
  });

  it("forbids the em dash explicitly (both languages)", () => {
    expect(prompt).toContain("Never use the em dash");
    expect(prompt).toContain("لا تستخدم الشرطة الطويلة");
  });

  it("instructs to refer to value, not a price figure", () => {
    expect(prompt).toMatch(/refer to the value|never state or guess a figure/i);
  });

  it("writes in Arabic for an Arabic brief and English for an English brief", () => {
    expect(prompt).toContain("WRITE EVERYTHING IN Arabic");
    const en = buildProsePrompt({ ...promptArgs, locale: "en" });
    expect(en).toContain("WRITE EVERYTHING IN English");
  });

  it("handles null goals without throwing and notes not to invent specifics", () => {
    const p = buildProsePrompt({ ...promptArgs, goals: null });
    expect(p).toMatch(/did not state explicit goals/i);
  });

  it("handles an empty deliverables list", () => {
    const p = buildProsePrompt({ ...promptArgs, deliverables: [] });
    expect(p).toMatch(/none provided/i);
  });
});

// ---------------------------------------------------------------------------
// mergeProseIntoArtifact — partial / tolerant / immutable
// ---------------------------------------------------------------------------

describe("mergeProseIntoArtifact", () => {
  it("fills only the streamed field and flags ai_generated on it alone", () => {
    const base = freshArtifact();
    const merged = mergeProseIntoArtifact(base, { coverLetter: "نص مولّد" });

    const cl = sectionById(merged, "cover_letter")!;
    expect(cl.content.body).toBe("نص مولّد");
    expect(cl.content.ai_generated).toBe(true);

    // Untouched prose sections keep null body / false flag (templated default).
    const understanding = sectionById(merged, "understanding")!;
    expect(understanding.content.body).toBeNull();
    expect(understanding.content.ai_generated).toBe(false);

    const approach = sectionById(merged, "approach")!;
    expect(approach.content.phases).toBeNull();
    expect(approach.content.ai_generated).toBe(false);
  });

  it("fills the full object across all prose sections", () => {
    const base = freshArtifact();
    const merged = mergeProseIntoArtifact(base, {
      coverLetter: "خطاب",
      understanding: "فهم",
      approach: [
        { title: "أ", body: "ب" },
        { title: "ج", body: "د" },
      ],
      deliverableDescriptions: ["وصف 1", "وصف 2"],
      assumptions: ["افتراض 1", "افتراض 2"],
      exclusions: ["استثناء 1"],
    });

    expect(sectionById(merged, "cover_letter")!.content.ai_generated).toBe(true);
    expect(sectionById(merged, "understanding")!.content.ai_generated).toBe(true);
    expect(sectionById(merged, "approach")!.content.ai_generated).toBe(true);
    expect(sectionById(merged, "scope_of_work")!.content.ai_generated).toBe(true);
    expect(sectionById(merged, "assumptions")!.content.ai_generated).toBe(true);

    expect(sectionById(merged, "approach")!.content.phases).toHaveLength(2);
    expect(sectionById(merged, "scope_of_work")!.content.deliverable_descriptions).toEqual([
      "وصف 1",
      "وصف 2",
    ]);
    expect(sectionById(merged, "assumptions")!.content.assumptions).toEqual([
      "افتراض 1",
      "افتراض 2",
    ]);
    expect(sectionById(merged, "assumptions")!.content.exclusions).toEqual(["استثناء 1"]);
  });

  it("flags the assumptions section when ONLY exclusions arrive", () => {
    const base = freshArtifact();
    const merged = mergeProseIntoArtifact(base, { exclusions: ["استثناء"] });
    const a = sectionById(merged, "assumptions")!;
    expect(a.content.exclusions).toEqual(["استثناء"]);
    expect(a.content.assumptions).toBeNull(); // templated default preserved
    expect(a.content.ai_generated).toBe(true);
  });

  it("ignores empty strings and empty/whitespace arrays (keeps defaults)", () => {
    const base = freshArtifact();
    const merged = mergeProseIntoArtifact(base, {
      coverLetter: "   ",
      understanding: "",
      deliverableDescriptions: ["", "  "],
      assumptions: [],
      exclusions: [],
      approach: [],
    });

    expect(sectionById(merged, "cover_letter")!.content.ai_generated).toBe(false);
    expect(sectionById(merged, "understanding")!.content.ai_generated).toBe(false);
    expect(sectionById(merged, "scope_of_work")!.content.ai_generated).toBe(false);
    expect(sectionById(merged, "assumptions")!.content.ai_generated).toBe(false);
    expect(sectionById(merged, "approach")!.content.ai_generated).toBe(false);
  });

  it("keeps partial phases that have title OR body during streaming", () => {
    const base = freshArtifact();
    const merged = mergeProseIntoArtifact(base, {
      approach: [
        { title: "عنوان", body: "" }, // body still streaming
        { title: "", body: "" }, // wholly empty → dropped
      ],
    });
    const phases = sectionById(merged, "approach")!.content.phases as unknown[];
    expect(phases).toHaveLength(1);
    expect((phases[0] as { title: string }).title).toBe("عنوان");
    expect(sectionById(merged, "approach")!.content.ai_generated).toBe(true);
  });

  it("handles null / undefined prose without flagging anything", () => {
    const base = freshArtifact();
    for (const p of [null, undefined]) {
      const merged = mergeProseIntoArtifact(base, p);
      expect(sectionById(merged, "cover_letter")!.content.ai_generated).toBe(false);
      expect(sectionById(merged, "approach")!.content.phases).toBeNull();
      // Same section count, untouched.
      expect(merged.sections).toHaveLength(base.sections.length);
    }
  });

  it("never mutates the input artifact or its content objects", () => {
    const base = freshArtifact();
    const snapshot = JSON.stringify(base);
    const baseCoverContentRef = sectionById(base, "cover_letter")!.content;

    mergeProseIntoArtifact(base, {
      coverLetter: "نص",
      approach: [
        { title: "أ", body: "ب" },
        { title: "ج", body: "د" },
      ],
      assumptions: ["x", "y"],
      exclusions: ["z"],
    });

    // Deep value unchanged, and the original content object reference is intact.
    expect(JSON.stringify(base)).toBe(snapshot);
    expect(sectionById(base, "cover_letter")!.content).toBe(baseCoverContentRef);
    expect(sectionById(base, "cover_letter")!.content.body).toBeNull();
  });

  it("returns a new object graph (different section references)", () => {
    const base = freshArtifact();
    const merged = mergeProseIntoArtifact(base, { coverLetter: "x" });
    expect(merged).not.toBe(base);
    expect(merged.sections).not.toBe(base.sections);
    expect(sectionById(merged, "cover_letter")).not.toBe(sectionById(base, "cover_letter"));
  });

  it("strips em/en dashes from all merged prose (founder peeve)", () => {
    const merged = mergeProseIntoArtifact(freshArtifact(), {
      coverLetter: "Thank you — we are glad",
      understanding: "نعمل على هذا — بدقة",
      approach: [{ title: "Phase — one", body: "do it – well" }],
      deliverableDescriptions: ["a logo — clean"],
      assumptions: ["timely feedback — please"],
      exclusions: ["hosting – excluded"],
    });
    // Scope the assertion to the prose sections the merge touches.
    const proseIds = ["cover_letter", "understanding", "approach", "scope_of_work", "assumptions"];
    const proseText = JSON.stringify(
      merged.sections.filter((s) => proseIds.includes(s.id)).map((s) => s.content)
    );
    expect(proseText).not.toMatch(/[—–]/);
    // Latin comma for English, Arabic comma for Arabic.
    expect(sectionById(merged, "cover_letter")!.content.body).toBe("Thank you, we are glad");
    expect(sectionById(merged, "understanding")!.content.body).toBe("نعمل على هذا، بدقة");
    // Range hyphens are preserved.
    const merged2 = mergeProseIntoArtifact(freshArtifact(), { coverLetter: "1000-1500 SAR" });
    expect(sectionById(merged2, "cover_letter")!.content.body).toBe("1000-1500 SAR");
  });
});

// ---------------------------------------------------------------------------
// pickProseField — selective single-section regen mapping (Phase E)
// ---------------------------------------------------------------------------

describe("pickProseField", () => {
  const full: ProseDraft = {
    coverLetter: "خطاب",
    understanding: "فهم",
    approach: [
      { title: "أ", body: "ب" },
      { title: "ج", body: "د" },
    ],
    deliverableDescriptions: ["وصف 1", "وصف 2"],
    assumptions: ["افتراض 1", "افتراض 2"],
    exclusions: ["استثناء 1"],
  };

  it("cover_letter → only { coverLetter }", () => {
    expect(pickProseField(full, "cover_letter")).toEqual({ coverLetter: "خطاب" });
  });

  it("understanding → only { understanding }", () => {
    expect(pickProseField(full, "understanding")).toEqual({ understanding: "فهم" });
  });

  it("approach → only { approach }", () => {
    const picked = pickProseField(full, "approach");
    expect(Object.keys(picked)).toEqual(["approach"]);
    expect(picked.approach).toHaveLength(2);
  });

  it("scope_of_work → only { deliverableDescriptions } (NOT the deliverables list)", () => {
    expect(pickProseField(full, "scope_of_work")).toEqual({
      deliverableDescriptions: ["وصف 1", "وصف 2"],
    });
  });

  it("assumptions → BOTH { assumptions, exclusions }", () => {
    const picked = pickProseField(full, "assumptions");
    expect(Object.keys(picked).sort()).toEqual(["assumptions", "exclusions"]);
    expect(picked.assumptions).toEqual(["افتراض 1", "افتراض 2"]);
    expect(picked.exclusions).toEqual(["استثناء 1"]);
  });

  it("unknown / non-prose section id → {}", () => {
    expect(pickProseField(full, "pricing")).toEqual({});
    expect(pickProseField(full, "cover")).toEqual({});
    expect(pickProseField(full, "does_not_exist")).toEqual({});
  });

  it("omits keys absent from a partial prose object", () => {
    // assumptions present but exclusions missing → only assumptions is picked.
    const partial: Partial<ProseDraft> = { assumptions: ["only this"] };
    expect(pickProseField(partial, "assumptions")).toEqual({ assumptions: ["only this"] });
  });
});

// ---------------------------------------------------------------------------
// Selective regen flow: pickProseField + mergeProseIntoArtifact updates ONE
// section and leaves a previously hand-edited section untouched (Phase E core).
// ---------------------------------------------------------------------------

describe("selective regen via pickProseField + mergeProseIntoArtifact", () => {
  const full: ProseDraft = {
    coverLetter: "خطاب جديد من النموذج",
    understanding: "فهم جديد من النموذج",
    approach: [
      { title: "مرحلة جديدة 1", body: "وصف 1" },
      { title: "مرحلة جديدة 2", body: "وصف 2" },
    ],
    deliverableDescriptions: ["وصف جديد"],
    assumptions: ["افتراض جديد", "آخر"],
    exclusions: ["استثناء جديد"],
  };

  it("regenerating approach updates ONLY approach, not a user-edited cover_letter", () => {
    // 1) Start fresh, then simulate the user hand-editing the cover letter.
    const base = freshArtifact();
    const userEdited: ArtifactData = {
      sections: base.sections.map((s) =>
        s.id === "cover_letter"
          ? { ...s, content: { ...s.content, body: "نص كتبه المستخدم بنفسه", ai_generated: false } }
          : s
      ),
    };

    // 2) Regenerate ONLY approach: narrow the model output, then merge.
    const picked = pickProseField(full, "approach");
    const merged = mergeProseIntoArtifact(userEdited, picked);

    // approach updated + flagged AI-generated.
    const approach = sectionById(merged, "approach")!;
    expect(approach.content.phases).toHaveLength(2);
    expect((approach.content.phases as { title: string }[])[0].title).toBe("مرحلة جديدة 1");
    expect(approach.content.ai_generated).toBe(true);

    // cover_letter UNTOUCHED: user's text + ai_generated:false survive intact.
    const cl = sectionById(merged, "cover_letter")!;
    expect(cl.content.body).toBe("نص كتبه المستخدم بنفسه");
    expect(cl.content.ai_generated).toBe(false);

    // understanding likewise untouched (still templated default → null body).
    expect(sectionById(merged, "understanding")!.content.body).toBeNull();
  });
});
