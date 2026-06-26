import { describe, it, expect } from "vitest";
import { isValidDocKind, docKindPatch } from "./docKind";

describe("isValidDocKind", () => {
  it("accepts input and deliverable", () => {
    expect(isValidDocKind("input")).toBe(true);
    expect(isValidDocKind("deliverable")).toBe(true);
  });
  it("rejects anything else", () => {
    expect(isValidDocKind("other")).toBe(false);
    expect(isValidDocKind("")).toBe(false);
  });
});

describe("docKindPatch", () => {
  it("sets the kind and always clears handover_state", () => {
    expect(docKindPatch("input")).toEqual({ project_doc_kind: "input", handover_state: null });
    expect(docKindPatch("deliverable")).toEqual({ project_doc_kind: "deliverable", handover_state: null });
  });
});
