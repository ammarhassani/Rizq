import { describe, it, expect } from "vitest";
import { buildProposalDocxBuffer } from "./docx";
import { buildArtifactData, type ArtifactInput } from "./artifact";

function baseInput(overrides?: Partial<ArtifactInput>): ArtifactInput {
  return {
    locale: "ar",
    proposalId: "prop_abc123",
    freelancerName: "محمد العمري",
    brandNameAr: "استوديو العمري",
    taglineAr: null,
    logoUrl: null,
    brandColors: null,
    contact: { email: "m@example.com", phone: null, whatsapp: "+966501234567" },
    clientName: "شركة الأفق",
    projectTitle: "تصميم هوية بصرية",
    issueDate: "2026-06-15T00:00:00.000Z",
    deliverables: ["تصميم الهوية البصرية", "ملفات قابلة للتعديل"],
    projectDescriptionAr: "تصميم هوية بصرية متكاملة",
    revisions: 3,
    coverLetterBody: null,
    understandingBody: null,
    approachPhases: null,
    assumptions: null,
    exclusions: null,
    deliverableDescriptions: null,
    proseAiGenerated: false,
    priceMin: 3000,
    priceAnchor: 4500,
    priceMax: 6000,
    provenanceCitation: "تقدير رِزق بناءً على 22 سجلاً (مرجع منشور) حتى عام 2026.",
    included: null,
    depositPct: 50,
    ipTerms: "full_transfer",
    startDate: "2026-07-01",
    statedDuration: null,
    deliveryDate: "2026-08-15",
    validityDays: 30,
    bioAr: null,
    bioEn: null,
    yearsExperience: null,
    totalProjectsCompleted: null,
    notableClients: null,
    portfolioSamples: null,
    testimonials: null,
    ...overrides,
  };
}

/** A .docx is a ZIP (OOXML) — verify the magic bytes "PK". */
function isDocxZip(buf: Buffer): boolean {
  return buf.length > 1000 && buf[0] === 0x50 && buf[1] === 0x4b;
}

describe("buildProposalDocxBuffer", () => {
  it("produces a valid .docx (zip) for the templated-default Arabic proposal", async () => {
    const data = buildArtifactData(baseInput());
    const buf = await buildProposalDocxBuffer(data, "ar");
    expect(isDocxZip(buf)).toBe(true);
  });

  it("produces a valid .docx for English", async () => {
    const data = buildArtifactData(baseInput({ locale: "en" }));
    const buf = await buildProposalDocxBuffer(data, "en");
    expect(isDocxZip(buf)).toBe(true);
  });

  it("handles a fully-populated AI proposal (prose, portfolio, testimonials)", async () => {
    const data = buildArtifactData(
      baseInput({
        proseAiGenerated: true,
        coverLetterBody: "نص خطاب تقديمي مكتوب بالذكاء الاصطناعي.",
        understandingBody: "فهم تفصيلي للمتطلبات.",
        approachPhases: [
          { title: "الاستكشاف", body: "مراجعة المتطلبات." },
          { title: "التنفيذ", body: "إنجاز العمل." },
        ],
        deliverableDescriptions: ["شعار + دليل استخدام", "ملفات المصدر"],
        assumptions: ["تعاون العميل في الوقت المناسب."],
        exclusions: ["تكاليف الطباعة."],
        included: ["شعار", "دليل الهوية"],
        bioAr: "مصمم هوية بصرية بخبرة عشر سنوات.",
        yearsExperience: 10,
        totalProjectsCompleted: 120,
        notableClients: ["عميل أ", "عميل ب"],
        portfolioSamples: [
          { title: "مشروع 1", url: "https://example.com", description: "هوية مطعم" },
        ],
        testimonials: [
          { clientName: "أحمد", clientTitle: "مدير", quoteAr: "عمل رائع.", quoteEn: "Great work.", rating: 5 },
        ],
      })
    );
    const buf = await buildProposalDocxBuffer(data, "ar");
    expect(isDocxZip(buf)).toBe(true);
  });

  it("does not throw on an empty sections array", async () => {
    const buf = await buildProposalDocxBuffer({ sections: [] }, "en");
    expect(isDocxZip(buf)).toBe(true);
  });
});
