import { describe, it, expect } from "vitest";
import { deriveProjectTitle } from "./title";

describe("deriveProjectTitle", () => {
  it("uses the first deliverable when present", () => {
    expect(deriveProjectTitle({ deliverables: ["Logo design", "Brand guide"] }, "Graphic Design")).toBe(
      "Logo design"
    );
  });

  it("trims the first deliverable", () => {
    expect(deriveProjectTitle({ deliverables: ["  Website  "] }, null)).toBe("Website");
  });

  it("falls back to specialty name when no deliverables", () => {
    expect(deriveProjectTitle({ deliverables: [] }, "تصميم جرافيك")).toBe("تصميم جرافيك");
    expect(deriveProjectTitle(null, "Marketing")).toBe("Marketing");
  });

  it("falls back to the Arabic default when nothing is available", () => {
    expect(deriveProjectTitle(null, null)).toBe("مشروع");
    expect(deriveProjectTitle({ deliverables: [123] }, "")).toBe("مشروع");
  });

  it("ignores non-string first deliverables", () => {
    expect(deriveProjectTitle({ deliverables: [{ x: 1 }] }, "Design")).toBe("Design");
  });

  it("clamps to 255 characters", () => {
    const long = "a".repeat(300);
    expect(deriveProjectTitle({ deliverables: [long] }, null).length).toBe(255);
  });
});

describe("deriveProjectTitle — proposal title wins", () => {
  it("uses the proposal's own title over the first deliverable", () => {
    expect(
      deriveProjectTitle(
        { deliverables: ["إعادة تصميم 18 شاشة"] },
        "تصميم واجهات",
        "إعادة تصميم تطبيق نون للتقنية"
      )
    ).toBe("إعادة تصميم تطبيق نون للتقنية");
  });
  it("falls back to the first deliverable when there is no proposal title", () => {
    expect(deriveProjectTitle({ deliverables: ["شعار"] }, "تصميم شعار", null)).toBe("شعار");
    expect(deriveProjectTitle({ deliverables: ["شعار"] }, "تصميم شعار", "   ")).toBe("شعار");
  });
});
