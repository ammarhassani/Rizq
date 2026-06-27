import { describe, it, expect } from "vitest";
import { parseOrigin, serializeOrigin, withOrigin, resolveBack } from "./origin";

const UUID = "74d9e1ff-d58e-4e0c-9a7e-3e6679c1b1d0";

describe("parseOrigin", () => {
  it("parses a valid project origin", () => {
    expect(parseOrigin({ from: `project:${UUID}` })).toEqual({ type: "project", id: UUID });
  });
  it("takes the first value when from is an array", () => {
    expect(parseOrigin({ from: [`project:${UUID}`, "project:other"] })).toEqual({ type: "project", id: UUID });
  });
  it("returns null on missing / empty", () => {
    expect(parseOrigin(undefined)).toBeNull();
    expect(parseOrigin(null)).toBeNull();
    expect(parseOrigin({})).toBeNull();
    expect(parseOrigin({ from: "" })).toBeNull();
  });
  it("returns null on unknown type", () => {
    expect(parseOrigin({ from: `client:${UUID}` })).toBeNull();
  });
  it("returns null on malformed / non-uuid id", () => {
    expect(parseOrigin({ from: "project" })).toBeNull();
    expect(parseOrigin({ from: "project:not-a-uuid" })).toBeNull();
    expect(parseOrigin({ from: "project:123" })).toBeNull();
  });
});

describe("serializeOrigin / withOrigin", () => {
  const origin = { type: "project", id: UUID } as const;
  it("serializes", () => {
    expect(serializeOrigin(origin)).toBe(`project:${UUID}`);
  });
  it("appends from + guided with the right separator", () => {
    expect(withOrigin("/invoices/1", origin, true)).toBe(`/invoices/1?from=project%3A${UUID}&guided=1`);
    expect(withOrigin("/invoices/1?tab=x", origin)).toBe(`/invoices/1?tab=x&from=project%3A${UUID}`);
  });
  it("is a no-op with no origin and no guided", () => {
    expect(withOrigin("/invoices/1")).toBe("/invoices/1");
  });
  it("guided alone appends guided", () => {
    expect(withOrigin("/x", null, true)).toBe("/x?guided=1");
  });
});

describe("resolveBack", () => {
  const base = { fallbackHref: "/invoices", fallbackLabel: "Invoices", projectLabel: "Project" };
  it("returns the project pane when origin is a project", () => {
    expect(resolveBack({ type: "project", id: UUID }, base)).toEqual({
      href: `/projects/${UUID}`,
      label: "Project",
    });
  });
  it("preserves tab + guided on the project href", () => {
    expect(resolveBack({ type: "project", id: UUID }, { ...base, tab: "files", guided: true })).toEqual({
      href: `/projects/${UUID}?tab=files&guided=1`,
      label: "Project",
    });
  });
  it("falls back to the default list when no origin", () => {
    expect(resolveBack(null, base)).toEqual({ href: "/invoices", label: "Invoices" });
  });
});
