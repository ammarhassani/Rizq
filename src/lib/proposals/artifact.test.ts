import { describe, it, expect } from "vitest";
import {
  buildArtifactData,
  ARTIFACT_SECTIONS,
  RIZQ_DEFAULTS,
  artifactTitle,
  forClientAudience,
  ownName,
  type ArtifactData,
  type ArtifactInput,
} from "./artifact";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseInput(overrides?: Partial<ArtifactInput>): ArtifactInput {
  return {
    locale: "ar",
    proposalId: "prop_abc123",
    freelancerName: "محمد العمري",
    brandNameAr: null,
    taglineAr: null,
    logoUrl: null,
    brandColors: null,
    contact: { email: "m@example.com", phone: null, whatsapp: "+966501234567" },
    clientName: "شركة الأفق",
    projectTitle: null,
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

// ---------------------------------------------------------------------------
// ARTIFACT_SECTIONS registry (new 13-section document model)
// ---------------------------------------------------------------------------

describe("ARTIFACT_SECTIONS registry", () => {
  it("contains exactly 13 entries", () => {
    expect(ARTIFACT_SECTIONS).toHaveLength(13);
  });

  it("has unique, sequential orders 1..13", () => {
    const orders = ARTIFACT_SECTIONS.map((s) => s.order).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it("cover is order 1 and verification is order 13", () => {
    const byOrder = [...ARTIFACT_SECTIONS].sort((a, b) => a.order - b.order);
    expect(byOrder[0]!.id).toBe("cover");
    expect(byOrder[byOrder.length - 1]!.id).toBe("verification");
  });

  it("flags prose sections as editable AND aiEditable", () => {
    for (const id of [
      "cover_letter",
      "understanding",
      "approach",
      "scope_of_work",
      "assumptions",
    ] as const) {
      const s = ARTIFACT_SECTIONS.find((x) => x.id === id)!;
      expect(s.editable, id).toBe(true);
      expect(s.aiEditable, id).toBe(true);
    }
  });

  it("flags structured sections as editable but NOT aiEditable", () => {
    for (const id of [
      "cover",
      "timeline",
      "milestones",
      "about",
      "next_steps",
      "pricing",
      "terms",
    ] as const) {
      const s = ARTIFACT_SECTIONS.find((x) => x.id === id)!;
      expect(s.editable, id).toBe(true);
      expect(s.aiEditable, id).toBe(false);
    }
  });

  it("flags verification as NOT editable and NOT aiEditable", () => {
    const s = ARTIFACT_SECTIONS.find((s) => s.id === "verification")!;
    expect(s.editable).toBe(false);
    expect(s.aiEditable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildArtifactData — structural guarantees
// ---------------------------------------------------------------------------

describe("buildArtifactData", () => {
  it("returns exactly 13 sections", () => {
    const { sections } = buildArtifactData(baseInput());
    expect(sections).toHaveLength(13);
  });

  it("sections are sorted ascending by order (1..13)", () => {
    const { sections } = buildArtifactData(baseInput());
    const orders = sections.map((s) => s.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it("each section carries correct editable/aiEditable flags from registry", () => {
    const { sections } = buildArtifactData(baseInput());
    const byId = Object.fromEntries(sections.map((s) => [s.id, s]));

    expect(byId["cover_letter"]!.aiEditable).toBe(true);
    expect(byId["scope_of_work"]!.aiEditable).toBe(true);
    expect(byId["pricing"]!.editable).toBe(true);
    expect(byId["pricing"]!.aiEditable).toBe(false);
    expect(byId["terms"]!.aiEditable).toBe(false);
    expect(byId["verification"]!.editable).toBe(false);
    expect(byId["verification"]!.aiEditable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// cover section — brand fallback + document meta
// ---------------------------------------------------------------------------

describe("cover section", () => {
  it("falls back to freelancerName when brandNameAr is null", () => {
    const { sections } = buildArtifactData(baseInput({ brandNameAr: null }));
    const cover = sections.find((s) => s.id === "cover")!;
    expect(cover.content["brandName"]).toBe("محمد العمري");
  });

  it("uses brandNameAr when provided", () => {
    const { sections } = buildArtifactData(baseInput({ brandNameAr: "استوديو العمري" }));
    const cover = sections.find((s) => s.id === "cover")!;
    expect(cover.content["brandName"]).toBe("استوديو العمري");
  });

  it("falls back to RIZQ_DEFAULTS.colors when brandColors is null", () => {
    const { sections } = buildArtifactData(baseInput({ brandColors: null }));
    const cover = sections.find((s) => s.id === "cover")!;
    expect(cover.content["colors"]).toEqual(RIZQ_DEFAULTS.colors);
  });

  it("carries client name, issue date, validity, and contact", () => {
    const { sections } = buildArtifactData(baseInput());
    const cover = sections.find((s) => s.id === "cover")!;
    expect(cover.content["clientName"]).toBe("شركة الأفق");
    expect(cover.content["issueDate"]).toBe("2026-06-15T00:00:00.000Z");
    expect(cover.content["validityDays"]).toBe(30);
    expect(cover.content["contact"]).toEqual({
      email: "m@example.com",
      phone: null,
      whatsapp: "+966501234567",
    });
  });

  it("carries projectTitle (may be null)", () => {
    const { sections } = buildArtifactData(baseInput({ projectTitle: null }));
    const cover = sections.find((s) => s.id === "cover")!;
    expect(cover.content["projectTitle"]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// prose sections — null bodies + honesty flag (Phase A: never fabricated)
// ---------------------------------------------------------------------------

describe("prose sections (cover_letter / understanding / approach)", () => {
  it("default body/phases to null with ai_generated:false when no prose passed", () => {
    const { sections } = buildArtifactData(baseInput());

    const coverLetter = sections.find((s) => s.id === "cover_letter")!;
    expect(coverLetter.content["body"]).toBeNull();
    expect(coverLetter.content["ai_generated"]).toBe(false);

    const understanding = sections.find((s) => s.id === "understanding")!;
    expect(understanding.content["body"]).toBeNull();
    expect(understanding.content["ai_generated"]).toBe(false);

    const approach = sections.find((s) => s.id === "approach")!;
    expect(approach.content["phases"]).toBeNull();
    expect(approach.content["ai_generated"]).toBe(false);
  });

  it("ai_generated stays false when prose present but proseAiGenerated is false", () => {
    const { sections } = buildArtifactData(
      baseInput({
        coverLetterBody: "نص مكتوب يدويًا",
        understandingBody: "فهم مكتوب يدويًا",
        proseAiGenerated: false,
      })
    );
    expect(sections.find((s) => s.id === "cover_letter")!.content["ai_generated"]).toBe(false);
    expect(sections.find((s) => s.id === "understanding")!.content["ai_generated"]).toBe(false);
  });

  it("ai_generated is true only when prose present AND proseAiGenerated is true", () => {
    const { sections } = buildArtifactData(
      baseInput({
        coverLetterBody: "نص من الذكاء الاصطناعي",
        understandingBody: "فهم من الذكاء الاصطناعي",
        approachPhases: [{ title: "اكتشاف", body: "..." }],
        proseAiGenerated: true,
      })
    );
    const coverLetter = sections.find((s) => s.id === "cover_letter")!;
    expect(coverLetter.content["body"]).toBe("نص من الذكاء الاصطناعي");
    expect(coverLetter.content["ai_generated"]).toBe(true);

    const approach = sections.find((s) => s.id === "approach")!;
    expect(approach.content["ai_generated"]).toBe(true);
  });

  it("ai_generated stays false when proseAiGenerated true but a given body is null", () => {
    const { sections } = buildArtifactData(
      baseInput({ coverLetterBody: null, proseAiGenerated: true })
    );
    expect(sections.find((s) => s.id === "cover_letter")!.content["ai_generated"]).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// assumptions section — null defaults + honesty flag
// ---------------------------------------------------------------------------

describe("assumptions section", () => {
  it("defaults assumptions/exclusions to null with ai_generated:false", () => {
    const { sections } = buildArtifactData(baseInput());
    const s = sections.find((s) => s.id === "assumptions")!;
    expect(s.content["assumptions"]).toBeNull();
    expect(s.content["exclusions"]).toBeNull();
    expect(s.content["ai_generated"]).toBe(false);
  });

  it("ai_generated true when assumptions present AND proseAiGenerated true", () => {
    const { sections } = buildArtifactData(
      baseInput({ assumptions: ["ملاحظات في الوقت المناسب"], proseAiGenerated: true })
    );
    const s = sections.find((s) => s.id === "assumptions")!;
    expect(s.content["assumptions"]).toEqual(["ملاحظات في الوقت المناسب"]);
    expect(s.content["ai_generated"]).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// scope_of_work section — deliverable descriptions + honesty flag
// ---------------------------------------------------------------------------

describe("scope_of_work section", () => {
  it("carries deliverables, description, revisions; descriptions null + ai_generated false by default", () => {
    const { sections } = buildArtifactData(baseInput());
    const s = sections.find((s) => s.id === "scope_of_work")!;
    expect(s.content["deliverables"]).toEqual([
      "تصميم الهوية البصرية",
      "ملفات قابلة للتعديل",
    ]);
    expect(s.content["description"]).toBe("تصميم هوية بصرية متكاملة");
    expect(s.content["revisions"]).toBe(3);
    expect(s.content["deliverable_descriptions"]).toBeNull();
    expect(s.content["ai_generated"]).toBe(false);
  });

  it("carries deliverable_descriptions when provided", () => {
    const { sections } = buildArtifactData(
      baseInput({
        deliverableDescriptions: ["شعار وألوان وخطوط", "ملفات المصدر"],
        proseAiGenerated: true,
      })
    );
    const s = sections.find((s) => s.id === "scope_of_work")!;
    expect(s.content["deliverable_descriptions"]).toEqual([
      "شعار وألوان وخطوط",
      "ملفات المصدر",
    ]);
    expect(s.content["ai_generated"]).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// pricing section — honesty architecture (citation) + extras
// ---------------------------------------------------------------------------

describe("pricing section", () => {
  it("carries min, anchor, max", () => {
    const { sections } = buildArtifactData(baseInput());
    const pricing = sections.find((s) => s.id === "pricing")!;
    expect(pricing.content["min"]).toBe(3000);
    expect(pricing.content["anchor"]).toBe(4500);
    expect(pricing.content["max"]).toBe(6000);
  });

  it("always carries a non-empty citation (honesty architecture)", () => {
    const { sections } = buildArtifactData(baseInput());
    const pricing = sections.find((s) => s.id === "pricing")!;
    const citation = pricing.content["citation"];
    expect(typeof citation).toBe("string");
    expect((citation as string).length).toBeGreaterThan(0);
  });

  it("citation matches the provenanceCitation input verbatim", () => {
    const { sections } = buildArtifactData(baseInput());
    const pricing = sections.find((s) => s.id === "pricing")!;
    expect(pricing.content["citation"]).toBe(
      "تقدير رِزق بناءً على 22 سجلاً (مرجع منشور) حتى عام 2026."
    );
  });

  it("carries included (null by default) and depositPct", () => {
    const { sections } = buildArtifactData(baseInput());
    const pricing = sections.find((s) => s.id === "pricing")!;
    expect(pricing.content["included"]).toBeNull();
    expect(pricing.content["depositPct"]).toBe(50);
  });

  it("carries included when provided", () => {
    const { sections } = buildArtifactData(
      baseInput({ included: ["تصميم", "ملفات"] })
    );
    const pricing = sections.find((s) => s.id === "pricing")!;
    expect(pricing.content["included"]).toEqual(["تصميم", "ملفات"]);
  });
});

// ---------------------------------------------------------------------------
// milestones section (unchanged behaviour)
// ---------------------------------------------------------------------------

describe("milestones section", () => {
  it("sum of milestone percentages equals 100", () => {
    const { sections } = buildArtifactData(baseInput({ depositPct: 50 }));
    const milestones = sections.find((s) => s.id === "milestones")!;
    const list = milestones.content["milestones"] as Array<{ pct: number }>;
    const total = list.reduce((sum, m) => sum + m.pct, 0);
    expect(total).toBe(100);
  });

  it("first milestone is the deposit, second is delivery with the remainder", () => {
    const { sections } = buildArtifactData(baseInput({ depositPct: 40 }));
    const milestones = sections.find((s) => s.id === "milestones")!;
    const list = milestones.content["milestones"] as Array<{ pct: number; trigger: string }>;
    expect(list[0]!.trigger).toBe("deposit");
    expect(list[0]!.pct).toBe(40);
    expect(list[1]!.trigger).toBe("delivery");
    expect(list[1]!.pct).toBe(60);
  });

  it("handles depositPct of 100 (full upfront)", () => {
    const { sections } = buildArtifactData(baseInput({ depositPct: 100 }));
    const milestones = sections.find((s) => s.id === "milestones")!;
    const list = milestones.content["milestones"] as Array<{ pct: number }>;
    const total = list.reduce((sum, m) => sum + m.pct, 0);
    expect(total).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// timeline section
// ---------------------------------------------------------------------------

describe("timeline section", () => {
  it("carries startDate, deliveryDate, revisions", () => {
    const { sections } = buildArtifactData(baseInput());
    const s = sections.find((s) => s.id === "timeline")!;
    expect(s.content["startDate"]).toBe("2026-07-01");
    expect(s.content["deliveryDate"]).toBe("2026-08-15");
    expect(s.content["revisions"]).toBe(3);
  });

  it("carries a duration the client stated, verbatim", () => {
    const { sections } = buildArtifactData(
      baseInput({ statedDuration: "المدة المطلوبة ٣ أشهر" })
    );
    const s = sections.find((s) => s.id === "timeline")!;
    expect(s.content["statedDuration"]).toBe("المدة المطلوبة ٣ أشهر");
  });

  it("keeps the duration null when the brief stated none — nothing is invented", () => {
    const { sections } = buildArtifactData(baseInput({ statedDuration: null }));
    const s = sections.find((s) => s.id === "timeline")!;
    expect(s.content["statedDuration"]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// cover_letter section — addresses the named client (US7 / FR-018)
// ---------------------------------------------------------------------------

describe("cover_letter section", () => {
  it("carries the client name so the letter greets them by name", () => {
    // The renderer reads content.clientName; without it the letter opened with the
    // generic "عميل محترم" on a proposal whose own header named the client.
    const { sections } = buildArtifactData(baseInput({ clientName: "شركة الأفق" }));
    const s = sections.find((s) => s.id === "cover_letter")!;
    expect(s.content["clientName"]).toBe("شركة الأفق");
  });

  it("leaves the name null for a genuinely unnamed client (renderer falls back)", () => {
    const { sections } = buildArtifactData(baseInput({ clientName: null }));
    const s = sections.find((s) => s.id === "cover_letter")!;
    expect(s.content["clientName"]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// about section — profile pass-through
// ---------------------------------------------------------------------------

describe("about section", () => {
  it("defaults arrays to [] and scalars to null when no profile data", () => {
    const { sections } = buildArtifactData(baseInput());
    const about = sections.find((s) => s.id === "about")!;
    expect(about.content["bioAr"]).toBeNull();
    expect(about.content["bioEn"]).toBeNull();
    expect(about.content["yearsExperience"]).toBeNull();
    expect(about.content["totalProjectsCompleted"]).toBeNull();
    expect(about.content["notableClients"]).toEqual([]);
    expect(about.content["portfolioSamples"]).toEqual([]);
    expect(about.content["testimonials"]).toEqual([]);
  });

  it("passes through provided profile data", () => {
    const portfolio = [{ title: "مشروع", url: "https://x.test", description: "وصف" }];
    const { sections } = buildArtifactData(
      baseInput({
        bioAr: "مصمم هوية بصرية",
        bioEn: "Brand designer",
        yearsExperience: 7,
        totalProjectsCompleted: 42,
        notableClients: ["أرامكو", "stc"],
        portfolioSamples: portfolio,
      })
    );
    const about = sections.find((s) => s.id === "about")!;
    expect(about.content["bioAr"]).toBe("مصمم هوية بصرية");
    expect(about.content["bioEn"]).toBe("Brand designer");
    expect(about.content["yearsExperience"]).toBe(7);
    expect(about.content["totalProjectsCompleted"]).toBe(42);
    expect(about.content["notableClients"]).toEqual(["أرامكو", "stc"]);
    expect(about.content["portfolioSamples"]).toEqual(portfolio);
  });
});

// ---------------------------------------------------------------------------
// terms section — carries inputs the renderer expands to clauses
// ---------------------------------------------------------------------------

describe("terms section", () => {
  it("carries ipTerms, depositPct, revisions, validityDays", () => {
    const { sections } = buildArtifactData(
      baseInput({ ipTerms: "license", depositPct: 30, revisions: 2, validityDays: 14 })
    );
    const s = sections.find((s) => s.id === "terms")!;
    expect(s.content["ipTerms"]).toBe("license");
    expect(s.content["depositPct"]).toBe(30);
    expect(s.content["revisions"]).toBe(2);
    expect(s.content["validityDays"]).toBe(14);
  });
});

// ---------------------------------------------------------------------------
// next_steps section
// ---------------------------------------------------------------------------

describe("next_steps section", () => {
  it("carries contact, validityDays, freelancerName", () => {
    const { sections } = buildArtifactData(baseInput());
    const s = sections.find((s) => s.id === "next_steps")!;
    expect(s.content["validityDays"]).toBe(30);
    expect(s.content["freelancerName"]).toBe("محمد العمري");
    expect(s.content["contact"]).toEqual({
      email: "m@example.com",
      phone: null,
      whatsapp: "+966501234567",
    });
  });
});

// ---------------------------------------------------------------------------
// verification section (unchanged)
// ---------------------------------------------------------------------------

describe("verification section", () => {
  it("carries a human reference, a label, and a methodologyHref", () => {
    const { sections } = buildArtifactData(baseInput({ proposalId: "prop_xyz" }));
    const s = sections.find((s) => s.id === "verification")!;
    // The client sees a short reference, never the raw 36-char UUID.
    expect(s.content["proposalId"]).toBe("RZQ-PROP_XYZ");
    expect(typeof s.content["label"]).toBe("string");
    expect((s.content["label"] as string).length).toBeGreaterThan(0);
    expect(s.content["methodologyHref"]).toBe("/methodology");
  });

  it("shortens a real uuid to a quotable reference", () => {
    const { sections } = buildArtifactData(
      baseInput({ proposalId: "089a3af8-72a6-47d5-9bcb-ceba02ccdbb9" })
    );
    const s = sections.find((s) => s.id === "verification")!;
    expect(s.content["proposalId"]).toBe("RZQ-089A3AF8");
  });
});

describe("artifactTitle", () => {
  it("reads the cover section's projectTitle, not a top-level key", () => {
    const data = buildArtifactData(baseInput({ projectTitle: "تصميم وتطوير موقع مؤسسة الواحة" }));
    expect(artifactTitle(data)).toBe("تصميم وتطوير موقع مؤسسة الواحة");
  });
  it("returns null for junk, an empty title, or a missing cover", () => {
    expect(artifactTitle(null)).toBeNull();
    expect(artifactTitle({})).toBeNull();
    expect(artifactTitle({ sections: [] })).toBeNull();
    expect(artifactTitle({ sections: [{ id: "cover", content: { projectTitle: "  " } }] })).toBeNull();
  });
});

describe("ownName — a sign-in address is not a name", () => {
  it("rejects an address, however it was routed into the name", () => {
    expect(ownName("azahrani337+rizqdrive-1785141690978-225228@gmail.com")).toBeNull();
    expect(ownName("someone@example.co.uk")).toBeNull();
    expect(ownName("  login@example.com  ")).toBeNull();
  });

  it("keeps a real name, Arabic or Latin", () => {
    expect(ownName("محمد العمري")).toBe("محمد العمري");
    expect(ownName("Studio Noor")).toBe("Studio Noor");
    expect(ownName("  زهراني  ")).toBe("زهراني");
  });

  it("treats absent and blank as absent", () => {
    expect(ownName(null)).toBeNull();
    expect(ownName(undefined)).toBeNull();
    expect(ownName("   ")).toBeNull();
  });
});

describe("forClientAudience — a stored artifact naming the freelancer by their login", () => {
  /** A legacy branding section as it sits in artifact_json, built before ownName existed. */
  const storedBranding = (content: Record<string, unknown>): ArtifactData => ({
    sections: [
      { id: "branding", order: 0, editable: true, aiEditable: false, content },
    ],
  });

  it("drops the address from the branding block instead of printing it", () => {
    const branding = forClientAudience(
      storedBranding({
        name: "azahrani337+rizqdrive-1785141690978-225228@gmail.com",
        brandName: "azahrani337+rizqdrive-1785141690978-225228@gmail.com",
      }),
    ).sections[0]!.content;
    expect(branding["name"]).toBeNull();
    expect(branding["brandName"]).toBeNull();
  });

  it("leaves a real brand name alone", () => {
    const stored = storedBranding({ brandName: "زهراني" });
    expect(forClientAudience(stored).sections[0]!.content["brandName"]).toBe("زهراني");
  });
});

describe("forClientAudience — what a client may see", () => {
  const clientCopy = () => forClientAudience(buildArtifactData(baseInput()));
  const section = (id: string) =>
    clientCopy().sections.find((s) => s.id === id)!;

  it("keeps the quoted price and its provenance citation", () => {
    const pricing = section("pricing");
    expect(pricing.content["anchor"]).toBe(
      buildArtifactData(baseInput()).sections.find((s) => s.id === "pricing")!.content["anchor"]
    );
    expect(typeof pricing.content["citation"]).toBe("string");
    expect(String(pricing.content["citation"]).length).toBeGreaterThan(0);
  });

  it("withholds the price band minimum and maximum", () => {
    const owner = buildArtifactData(baseInput()).sections.find((s) => s.id === "pricing")!;
    expect(owner.content["min"]).toBeGreaterThan(0);
    expect(owner.content["max"]).toBeGreaterThan(0);

    const pricing = section("pricing");
    expect(pricing.content["min"]).toBeUndefined();
    expect(pricing.content["max"]).toBeUndefined();
  });

  it("withholds the pricing methodology link from both pricing and verification", () => {
    expect(section("pricing").content["methodologyHref"]).toBeUndefined();
    expect(section("verification").content["methodologyHref"]).toBeUndefined();
  });

  it("keeps the proposal reference the client quotes back", () => {
    expect(String(section("verification").content["proposalId"])).toMatch(/^RZQ-/);
  });

  it("withholds a field added to a redacted section until it is allow-listed", () => {
    // Allow-list, not deny-list: a new pricing field defaults to withheld.
    const data = buildArtifactData(baseInput());
    const pricing = data.sections.find((s) => s.id === "pricing")!;
    pricing.content["sample_size"] = 5;
    pricing.content["someFutureInternalField"] = "secret";

    const stripped = forClientAudience(data).sections.find((s) => s.id === "pricing")!;
    expect(stripped.content["sample_size"]).toBeUndefined();
    expect(stripped.content["someFutureInternalField"]).toBeUndefined();
  });

  it("withholds a contact email on an artifact built before the login-email fix", () => {
    // Legacy artifact: has a contact email but no marker saying it was deliberate.
    const legacy = buildArtifactData(baseInput());
    const cover = legacy.sections.find((s) => s.id === "cover")!;
    delete cover.content["contactEmailIsPublic"];

    const stripped = forClientAudience(legacy).sections.find((s) => s.id === "cover")!;
    expect((stripped.content["contact"] as { email: string | null }).email).toBeNull();
  });

  it("keeps a contact email the freelancer deliberately set", () => {
    const cover = section("cover");
    expect((cover.content["contact"] as { email: string | null }).email).toBe("m@example.com");
  });

  it("leaves the owner's copy untouched", () => {
    const data = buildArtifactData(baseInput());
    forClientAudience(data);
    const pricing = data.sections.find((s) => s.id === "pricing")!;
    expect(pricing.content["min"]).toBeGreaterThan(0);
    expect(pricing.content["methodologyHref"]).toBe("/methodology");
  });

  it("clears ai_generated so the client copy carries no review-before-sending badge", () => {
    const data = buildArtifactData(
      baseInput({ proseAiGenerated: true, coverLetterBody: "نص مولّد", understandingBody: "نص مولّد" })
    );
    const before = data.sections.filter((s) => s.content["ai_generated"] === true);
    expect(before.length).toBeGreaterThan(0);
    const stripped = forClientAudience(data);
    expect(stripped.sections.some((s) => s.content["ai_generated"] === true)).toBe(false);
    // Content itself is untouched, and the original is not mutated.
    expect(data.sections.some((s) => s.content["ai_generated"] === true)).toBe(true);
    expect(stripped.sections.length).toBe(data.sections.length);
  });
});
