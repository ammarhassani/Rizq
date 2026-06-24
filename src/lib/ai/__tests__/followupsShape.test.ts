import { describe, it, expect } from "vitest";
import { toFollowUpTemplates, type GeneratedQuestion } from "../followupsShape";

const q = (field_name: string, options?: GeneratedQuestion["options"]): GeneratedQuestion => ({
  field_name,
  question_ar: `سؤال ${field_name}`,
  question_en: `question ${field_name}`,
  options,
});

describe("toFollowUpTemplates (US3 question shaping)", () => {
  it("clamps to at most 3 questions", () => {
    const out = toFollowUpTemplates([q("a"), q("b"), q("c"), q("d"), q("e")]);
    expect(out).toHaveLength(3);
    expect(out.map((t) => t.field_name)).toEqual(["a", "b", "c"]);
  });

  it("maps options to options_json, and null when open-ended", () => {
    const out = toFollowUpTemplates([
      q("urgency", [{ value: "rush", label_ar: "عاجل", label_en: "Rush" }]),
      q("extra_context"),
    ]);
    expect(out[0].options_json).toEqual([{ value: "rush", label_ar: "عاجل", label_en: "Rush" }]);
    expect(out[1].options_json).toBeNull();
  });

  it("produces skippable, enabled templates with ascending priority", () => {
    const out = toFollowUpTemplates([q("a"), q("b")]);
    expect(out.every((t) => t.allow_skip && t.enabled)).toBe(true);
    expect(out.map((t) => t.priority)).toEqual([1, 2]);
  });

  it("returns an empty list for no questions", () => {
    expect(toFollowUpTemplates([])).toEqual([]);
  });
});
