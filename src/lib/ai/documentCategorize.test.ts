import { describe, it, expect } from "vitest";
import { buildCategorizePrompt } from "./documentCategorize";

describe("buildCategorizePrompt", () => {
  it("includes filename and MIME type", () => {
    const prompt = buildCategorizePrompt({
      filename: "contract_2026.pdf",
      file_type: "application/pdf",
    });
    expect(prompt).toContain("contract_2026.pdf");
    expect(prompt).toContain("application/pdf");
  });

  it("includes optional title and description when provided", () => {
    const prompt = buildCategorizePrompt({
      filename: "doc.pdf",
      file_type: "application/pdf",
      title: "عقد خدمات",
      description: "عقد تطوير موقع",
    });
    expect(prompt).toContain("عقد خدمات");
    expect(prompt).toContain("عقد تطوير موقع");
  });

  it("does not include title/description lines when absent", () => {
    const prompt = buildCategorizePrompt({
      filename: "file.png",
      file_type: "image/png",
    });
    expect(prompt).not.toContain("Title:");
    expect(prompt).not.toContain("Description:");
  });

  it("lists all 7 category IDs", () => {
    const prompt = buildCategorizePrompt({ filename: "x.pdf", file_type: "application/pdf" });
    for (const id of ["freelance_doc", "commercial_reg", "tax_cert", "contract", "portfolio", "nda", "other"]) {
      expect(prompt).toContain(id);
    }
  });
});
