import { describe, it, expect } from "vitest";
import { ScopeSchema, aggregateConfidence } from "./scope";

// ---------------------------------------------------------------------------
// ScopeSchema — parse / reject
// ---------------------------------------------------------------------------

describe("ScopeSchema", () => {
  const validScope = {
    specialty: "logo-design",
    deliverables: ["شعار أساسي", "نسخة بيضاء وسوداء"],
    deliverable_count: 2,
    revisions: 2,
    urgency: null,
    complexity_signals: ["هوية بصرية كاملة", "ملفات source مطلوبة"],
    client_type: "corporate",
    geography_target: null,
    language_preference: null,
    budget_mentioned: null,
    ip_transfer: null,
    field_confidence: {
      specialty: 0.95,
      deliverables: 0.9,
      revisions: 0.85,
      client_type: 0.7,
    },
  };

  it("parses a valid scope object", () => {
    const result = ScopeSchema.safeParse(validScope);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.specialty).toBe("logo-design");
      expect(result.data.deliverables).toHaveLength(2);
      expect(result.data.revisions).toBe(2);
      expect(result.data.client_type).toBe("corporate");
    }
  });

  it("rejects an object with empty deliverables (min 1)", () => {
    const bad = { ...validScope, deliverables: [] };
    const result = ScopeSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid specialty slug", () => {
    const bad = { ...validScope, specialty: "quantum-computing" };
    const result = ScopeSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("accepts all 12 known specialty slugs", () => {
    const slugs = [
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
    for (const slug of slugs) {
      const result = ScopeSchema.safeParse({ ...validScope, specialty: slug });
      expect(result.success, `slug "${slug}" should be valid`).toBe(true);
    }
  });

  it("accepts null for all nullable fields", () => {
    const allNulls = {
      ...validScope,
      deliverable_count: null,
      revisions: null,
      urgency: null,
      client_type: null,
      geography_target: null,
      language_preference: null,
      budget_mentioned: null,
      ip_transfer: null,
    };
    expect(ScopeSchema.safeParse(allNulls).success).toBe(true);
  });

  it("accepts an extras field with arbitrary shape", () => {
    const withExtras = {
      ...validScope,
      extras: { platform: "instagram", size: "1080x1080" },
    };
    expect(ScopeSchema.safeParse(withExtras).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// aggregateConfidence
// ---------------------------------------------------------------------------

describe("aggregateConfidence", () => {
  it("returns the mean of provided values", () => {
    expect(aggregateConfidence({ a: 0.8, b: 0.6 })).toBeCloseTo(0.7, 10);
  });

  it("returns 0 for an empty map", () => {
    expect(aggregateConfidence({})).toBe(0);
  });

  it("handles a single value", () => {
    expect(aggregateConfidence({ x: 0.42 })).toBeCloseTo(0.42, 10);
  });

  it("ignores non-finite values (NaN / Infinity)", () => {
    expect(aggregateConfidence({ a: 0.5, b: NaN, c: Infinity })).toBeCloseTo(
      0.5,
      10
    );
  });
});
