import { describe, it, expect } from "vitest";
import {
  selectFollowUps,
  applyAnswers,
  type FollowUpTemplate,
} from "./followUp";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tpl(
  overrides: Partial<FollowUpTemplate> & Pick<FollowUpTemplate, "id" | "field_name" | "priority">
): FollowUpTemplate {
  return {
    min_confidence: 0.8,
    question_ar: "سؤال",
    question_en: "Question",
    options_json: null,
    allow_skip: true,
    enabled: true,
    ...overrides,
  };
}

const T1 = tpl({ id: "t1", field_name: "urgency", priority: 1 });
const T2 = tpl({ id: "t2", field_name: "client_type", priority: 2 });
const T3 = tpl({ id: "t3", field_name: "ip_transfer", priority: 3 });
const T4 = tpl({ id: "t4", field_name: "scope_detail", priority: 4 });
const T5 = tpl({ id: "t5", field_name: "revision_rounds", priority: 5 });

describe("selectFollowUps", () => {
  it("returns at most max (default 3) when more templates qualify", () => {
    // All 5 fields have confidence 0 (not in map) → all qualify; cap = 3
    const result = selectFollowUps({}, [T1, T2, T3, T4, T5]);
    expect(result).toHaveLength(3);
  });

  it("respects an explicit max", () => {
    const result = selectFollowUps({}, [T1, T2, T3, T4, T5], 2);
    expect(result).toHaveLength(2);
  });

  it("returns [] when max is 0", () => {
    expect(selectFollowUps({}, [T1, T2], 0)).toHaveLength(0);
  });

  it("orders results by priority ascending", () => {
    // Shuffle input to confirm ordering is by priority, not insertion order
    const result = selectFollowUps({}, [T5, T3, T1, T4, T2]);
    const priorities = result.map((t) => t.priority);
    expect(priorities).toEqual([1, 2, 3]);
  });

  it("excludes fields whose confidence >= min_confidence", () => {
    const confidence: Record<string, number> = {
      urgency: 0.8, // equals min_confidence → should be EXCLUDED
      client_type: 0.9, // above → EXCLUDED
      ip_transfer: 0.0, // below → INCLUDED
    };
    const result = selectFollowUps(confidence, [T1, T2, T3]);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("t3");
  });

  it("includes a field absent from the map (treated as 0 confidence)", () => {
    // Only T1's field 'urgency' is absent → treated as 0 < 0.8 → included
    const result = selectFollowUps({ client_type: 1.0 }, [T1, T2]);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("t1");
  });

  it("excludes templates with enabled: false", () => {
    const disabled = tpl({ id: "td", field_name: "urgency", priority: 1, enabled: false });
    const result = selectFollowUps({}, [disabled, T2, T3]);
    expect(result.map((t) => t.id)).not.toContain("td");
  });

  it("returns [] when every field is already confident", () => {
    const confidence: Record<string, number> = {
      urgency: 1.0,
      client_type: 1.0,
      ip_transfer: 1.0,
    };
    expect(selectFollowUps(confidence, [T1, T2, T3])).toHaveLength(0);
  });

  it("returns [] when template list is empty", () => {
    expect(selectFollowUps({}, [])).toHaveLength(0);
  });

  it("handles a custom min_confidence threshold per template", () => {
    const strict = tpl({ id: "ts", field_name: "urgency", priority: 1, min_confidence: 0.5 });
    // confidence 0.6 >= 0.5 → excluded
    expect(selectFollowUps({ urgency: 0.6 }, [strict])).toHaveLength(0);
    // confidence 0.4 < 0.5 → included
    expect(selectFollowUps({ urgency: 0.4 }, [strict])).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------

describe("applyAnswers", () => {
  it("sets answered fields on the returned object", () => {
    const scope = {
      specialty: "design",
      urgency: null as string | null,
      field_confidence: { specialty: 0.9, urgency: 0.1 },
    };
    const result = applyAnswers(scope, { urgency: "rush_under_1_week" });
    expect(result.urgency).toBe("rush_under_1_week");
  });

  it("bumps the answered field's confidence to 1.0", () => {
    const scope = {
      specialty: "design",
      field_confidence: { specialty: 0.9, urgency: 0.1 },
    };
    const result = applyAnswers(scope, { urgency: "standard_1_4_weeks" });
    expect(result.field_confidence.urgency).toBe(1.0);
  });

  it("leaves other fields and their confidence untouched", () => {
    const scope = {
      specialty: "design",
      field_confidence: { specialty: 0.9, urgency: 0.1 },
    };
    const result = applyAnswers(scope, { urgency: "long_term" });
    expect(result.specialty).toBe("design");
    expect(result.field_confidence.specialty).toBe(0.9);
  });

  it("does not mutate the input scope", () => {
    const scope = {
      field_confidence: { urgency: 0.0 },
      urgency: null as string | null,
    };
    const original = JSON.stringify(scope);
    applyAnswers(scope, { urgency: "rush_under_1_week" });
    expect(JSON.stringify(scope)).toBe(original);
  });

  it("can apply multiple answers in one call", () => {
    const scope = {
      urgency: null as string | null,
      client_type: null as string | null,
      field_confidence: { urgency: 0.0, client_type: 0.0 },
    };
    const result = applyAnswers(scope, {
      urgency: "standard_1_4_weeks",
      client_type: "corporate",
    });
    expect(result.urgency).toBe("standard_1_4_weeks");
    expect(result.client_type).toBe("corporate");
    expect(result.field_confidence.urgency).toBe(1.0);
    expect(result.field_confidence.client_type).toBe(1.0);
  });

  it("adds a new confidence entry for a field not previously in field_confidence", () => {
    const scope = {
      field_confidence: {} as Record<string, number>,
    };
    const result = applyAnswers(scope, { new_field: "value" });
    expect(result.field_confidence.new_field).toBe(1.0);
  });
});
