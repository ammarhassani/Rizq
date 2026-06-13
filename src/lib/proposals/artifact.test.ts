import { describe, it, expect } from "vitest";
import {
  buildArtifactData,
  ARTIFACT_SECTIONS,
  RIZQ_DEFAULTS,
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
    deliverables: ["تصميم الهوية البصرية", "ملفات قابلة للتعديل"],
    projectDescriptionAr: "تصميم هوية بصرية متكاملة",
    revisions: 3,
    priceMin: 3000,
    priceAnchor: 4500,
    priceMax: 6000,
    provenanceCitation: "تقدير رِزق بناءً على 22 سجلاً (مرجع منشور) حتى عام 2026.",
    depositPct: 50,
    ipTerms: "full_transfer",
    startDate: "2026-07-01",
    deliveryDate: "2026-08-15",
    validityDays: 30,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// ARTIFACT_SECTIONS registry
// ---------------------------------------------------------------------------

describe("ARTIFACT_SECTIONS registry", () => {
  it("contains exactly 9 entries", () => {
    expect(ARTIFACT_SECTIONS).toHaveLength(9);
  });

  it("has unique, sequential orders 1..9", () => {
    const orders = ARTIFACT_SECTIONS.map((s) => s.order).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("flags scope_of_work as editable and aiEditable", () => {
    const s = ARTIFACT_SECTIONS.find((s) => s.id === "scope_of_work")!;
    expect(s.editable).toBe(true);
    expect(s.aiEditable).toBe(true);
  });

  it("flags ip_terms as editable but NOT aiEditable", () => {
    const s = ARTIFACT_SECTIONS.find((s) => s.id === "ip_terms")!;
    expect(s.editable).toBe(true);
    expect(s.aiEditable).toBe(false);
  });

  it("flags verification as NOT editable and NOT aiEditable", () => {
    const s = ARTIFACT_SECTIONS.find((s) => s.id === "verification")!;
    expect(s.editable).toBe(false);
    expect(s.aiEditable).toBe(false);
  });

  it("flags terms_footer as NOT editable and NOT aiEditable", () => {
    const s = ARTIFACT_SECTIONS.find((s) => s.id === "terms_footer")!;
    expect(s.editable).toBe(false);
    expect(s.aiEditable).toBe(false);
  });

  it("flags milestones as editable and aiEditable", () => {
    const s = ARTIFACT_SECTIONS.find((s) => s.id === "milestones")!;
    expect(s.editable).toBe(true);
    expect(s.aiEditable).toBe(true);
  });

  it("flags pricing as editable but NOT aiEditable", () => {
    const s = ARTIFACT_SECTIONS.find((s) => s.id === "pricing")!;
    expect(s.editable).toBe(true);
    expect(s.aiEditable).toBe(false);
  });

  it("flags branding as editable but NOT aiEditable", () => {
    const s = ARTIFACT_SECTIONS.find((s) => s.id === "branding")!;
    expect(s.editable).toBe(true);
    expect(s.aiEditable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildArtifactData — structural guarantees
// ---------------------------------------------------------------------------

describe("buildArtifactData", () => {
  it("returns exactly 9 sections", () => {
    const { sections } = buildArtifactData(baseInput());
    expect(sections).toHaveLength(9);
  });

  it("sections are sorted ascending by order (1..9)", () => {
    const { sections } = buildArtifactData(baseInput());
    const orders = sections.map((s) => s.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("each section carries correct editable/aiEditable flags from registry", () => {
    const { sections } = buildArtifactData(baseInput());

    const byId = Object.fromEntries(sections.map((s) => [s.id, s]));

    expect(byId["scope_of_work"]!.aiEditable).toBe(true);
    expect(byId["scope_of_work"]!.editable).toBe(true);
    expect(byId["ip_terms"]!.aiEditable).toBe(false);
    expect(byId["ip_terms"]!.editable).toBe(true);
    expect(byId["verification"]!.editable).toBe(false);
    expect(byId["verification"]!.aiEditable).toBe(false);
    expect(byId["terms_footer"]!.editable).toBe(false);
    expect(byId["pricing"]!.editable).toBe(true);
    expect(byId["pricing"]!.aiEditable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// branding section — fallback logic
// ---------------------------------------------------------------------------

describe("branding section", () => {
  it("falls back to freelancerName when brandNameAr is null", () => {
    const { sections } = buildArtifactData(baseInput({ brandNameAr: null }));
    const branding = sections.find((s) => s.id === "branding")!;
    expect(branding.content["brandName"]).toBe("محمد العمري");
  });

  it("uses brandNameAr when provided", () => {
    const { sections } = buildArtifactData(baseInput({ brandNameAr: "استوديو العمري" }));
    const branding = sections.find((s) => s.id === "branding")!;
    expect(branding.content["brandName"]).toBe("استوديو العمري");
  });

  it("falls back to RIZQ_DEFAULTS.taglineAr when taglineAr is null", () => {
    const { sections } = buildArtifactData(baseInput({ taglineAr: null }));
    const branding = sections.find((s) => s.id === "branding")!;
    expect(branding.content["tagline"]).toBe(RIZQ_DEFAULTS.taglineAr);
  });

  it("uses taglineAr when provided", () => {
    const custom = "بناء المستقبل اليوم";
    const { sections } = buildArtifactData(baseInput({ taglineAr: custom }));
    const branding = sections.find((s) => s.id === "branding")!;
    expect(branding.content["tagline"]).toBe(custom);
  });

  it("falls back to RIZQ_DEFAULTS.colors when brandColors is null", () => {
    const { sections } = buildArtifactData(baseInput({ brandColors: null }));
    const branding = sections.find((s) => s.id === "branding")!;
    expect(branding.content["colors"]).toEqual(RIZQ_DEFAULTS.colors);
  });

  it("uses provided brandColors when not null", () => {
    const colors = { primary: "#000000", secondary: "#FFFFFF" };
    const { sections } = buildArtifactData(baseInput({ brandColors: colors }));
    const branding = sections.find((s) => s.id === "branding")!;
    expect(branding.content["colors"]).toEqual(colors);
  });

  it("includes contact and logoUrl in branding content", () => {
    const { sections } = buildArtifactData(
      baseInput({ logoUrl: "https://cdn.example.com/logo.png" })
    );
    const branding = sections.find((s) => s.id === "branding")!;
    expect(branding.content["logoUrl"]).toBe("https://cdn.example.com/logo.png");
    expect(branding.content["contact"]).toEqual({
      email: "m@example.com",
      phone: null,
      whatsapp: "+966501234567",
    });
  });
});

// ---------------------------------------------------------------------------
// pricing section — honesty architecture (spec §II.2)
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
});

// ---------------------------------------------------------------------------
// milestones section
// ---------------------------------------------------------------------------

describe("milestones section", () => {
  it("sum of milestone percentages equals 100", () => {
    const { sections } = buildArtifactData(baseInput({ depositPct: 50 }));
    const milestones = sections.find((s) => s.id === "milestones")!;
    const list = milestones.content["milestones"] as Array<{ pct: number }>;
    const total = list.reduce((sum, m) => sum + m.pct, 0);
    expect(total).toBe(100);
  });

  it("first milestone is the deposit", () => {
    const { sections } = buildArtifactData(baseInput({ depositPct: 40 }));
    const milestones = sections.find((s) => s.id === "milestones")!;
    const list = milestones.content["milestones"] as Array<{ pct: number; trigger: string }>;
    expect(list[0]!.trigger).toBe("deposit");
    expect(list[0]!.pct).toBe(40);
  });

  it("second milestone is delivery with the remainder", () => {
    const { sections } = buildArtifactData(baseInput({ depositPct: 30 }));
    const milestones = sections.find((s) => s.id === "milestones")!;
    const list = milestones.content["milestones"] as Array<{ pct: number; trigger: string }>;
    expect(list[1]!.trigger).toBe("delivery");
    expect(list[1]!.pct).toBe(70);
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
// Remaining sections — smoke checks
// ---------------------------------------------------------------------------

describe("client_ref section", () => {
  it("carries clientName (may be null)", () => {
    const { sections } = buildArtifactData(baseInput({ clientName: null }));
    const s = sections.find((s) => s.id === "client_ref")!;
    expect(s.content["clientName"]).toBeNull();
  });

  it("carries provided clientName", () => {
    const { sections } = buildArtifactData(baseInput({ clientName: "Acme Corp" }));
    const s = sections.find((s) => s.id === "client_ref")!;
    expect(s.content["clientName"]).toBe("Acme Corp");
  });
});

describe("scope_of_work section", () => {
  it("carries deliverables, description, revisions", () => {
    const { sections } = buildArtifactData(baseInput());
    const s = sections.find((s) => s.id === "scope_of_work")!;
    expect(s.content["deliverables"]).toEqual(["تصميم الهوية البصرية", "ملفات قابلة للتعديل"]);
    expect(s.content["description"]).toBe("تصميم هوية بصرية متكاملة");
    expect(s.content["revisions"]).toBe(3);
  });
});

describe("timeline section", () => {
  it("carries startDate, deliveryDate, revisions", () => {
    const { sections } = buildArtifactData(baseInput());
    const s = sections.find((s) => s.id === "timeline")!;
    expect(s.content["startDate"]).toBe("2026-07-01");
    expect(s.content["deliveryDate"]).toBe("2026-08-15");
    expect(s.content["revisions"]).toBe(3);
  });
});

describe("ip_terms section", () => {
  it("carries the ipTerms value", () => {
    const { sections } = buildArtifactData(baseInput({ ipTerms: "license" }));
    const s = sections.find((s) => s.id === "ip_terms")!;
    expect(s.content["terms"]).toBe("license");
  });
});

describe("verification section", () => {
  it("carries proposalId, a label, and a methodologyHref", () => {
    const { sections } = buildArtifactData(baseInput({ proposalId: "prop_xyz" }));
    const s = sections.find((s) => s.id === "verification")!;
    expect(s.content["proposalId"]).toBe("prop_xyz");
    expect(typeof s.content["label"]).toBe("string");
    expect((s.content["label"] as string).length).toBeGreaterThan(0);
    expect(s.content["methodologyHref"]).toBe("/methodology");
  });
});

describe("terms_footer section", () => {
  it("carries jurisdiction KSA and validityDays", () => {
    const { sections } = buildArtifactData(baseInput({ validityDays: 14 }));
    const s = sections.find((s) => s.id === "terms_footer")!;
    expect(s.content["jurisdiction"]).toBe("KSA");
    expect(s.content["validityDays"]).toBe(14);
  });
});
