import { describe, it, expect } from "vitest";
import {
  buildInvoiceArtifact,
  INVOICE_ARTIFACT_SECTIONS,
  RIZQ_INVOICE_DEFAULTS,
  type InvoiceArtifactInput,
} from "./artifact";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseInput(overrides?: Partial<InvoiceArtifactInput>): InvoiceArtifactInput {
  return {
    locale: "ar",
    invoiceId: "inv_abc123",
    invoiceNumber: "INV-2026-0001",
    status: "draft",
    issueDate: "2026-06-14",
    dueDate: "2026-07-14",
    freelancerName: "محمد العمري",
    brandNameAr: null,
    taglineAr: null,
    logoUrl: null,
    brandColors: null,
    contact: { email: "m@example.com", phone: null, whatsapp: "+966501234567" },
    clientName: "شركة الأفق",
    clientCompany: "Ufuq Ltd.",
    items: [
      { description: "تصميم شعار", quantity: 1, unit_price_sar: 2000, total_sar: 2000 },
      { description: "بطاقة أعمال", quantity: 2, unit_price_sar: 500,  total_sar: 1000 },
    ],
    fees: [],
    description: "تصميم هوية بصرية كاملة",
    subtotalSar: 3000,
    vatPct: 15,
    vatSar: 450,
    totalSar: 3450,
    vatNumber: "310000000000003",
    paymentMethod: "bank_transfer",
    paymentDetails: "IBAN: SA00 0000 0000 0000 0000 0000",
    isFreeTier: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// INVOICE_ARTIFACT_SECTIONS registry
// ---------------------------------------------------------------------------

describe("INVOICE_ARTIFACT_SECTIONS registry", () => {
  it("contains exactly 7 entries", () => {
    expect(INVOICE_ARTIFACT_SECTIONS).toHaveLength(7);
  });

  it("has unique, sequential orders 1..7", () => {
    const orders = INVOICE_ARTIFACT_SECTIONS.map((s) => s.order).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("branding is order 1", () => {
    const s = INVOICE_ARTIFACT_SECTIONS.find((s) => s.id === "branding")!;
    expect(s.order).toBe(1);
  });

  it("footer is order 7", () => {
    const s = INVOICE_ARTIFACT_SECTIONS.find((s) => s.id === "footer")!;
    expect(s.order).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// buildInvoiceArtifact — structural guarantees
// ---------------------------------------------------------------------------

describe("buildInvoiceArtifact", () => {
  it("returns exactly 7 sections", () => {
    const { sections } = buildInvoiceArtifact(baseInput());
    expect(sections).toHaveLength(7);
  });

  it("sections are sorted ascending by order (1..7)", () => {
    const { sections } = buildInvoiceArtifact(baseInput());
    const orders = sections.map((s) => s.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("section ids match the expected sequence", () => {
    const { sections } = buildInvoiceArtifact(baseInput());
    expect(sections.map((s) => s.id)).toEqual([
      "branding",
      "invoice_meta",
      "bill_to",
      "line_items",
      "totals",
      "payment",
      "footer",
    ]);
  });
});

// ---------------------------------------------------------------------------
// branding section — fallback logic
// ---------------------------------------------------------------------------

describe("branding section", () => {
  it("falls back to freelancerName when brandNameAr is null", () => {
    const { sections } = buildInvoiceArtifact(baseInput({ brandNameAr: null }));
    const s = sections.find((s) => s.id === "branding")!;
    expect(s.content["brandName"]).toBe("محمد العمري");
  });

  it("uses brandNameAr when provided", () => {
    const { sections } = buildInvoiceArtifact(baseInput({ brandNameAr: "استوديو العمري" }));
    const s = sections.find((s) => s.id === "branding")!;
    expect(s.content["brandName"]).toBe("استوديو العمري");
  });

  it("renders no tagline when the freelancer never wrote one", () => {
    // Rizq's own marketing tagline is not the freelancer's; a client document may not
    // present it as theirs. An absent value renders as absent.
    const { sections } = buildInvoiceArtifact(baseInput({ taglineAr: null }));
    const s = sections.find((s) => s.id === "branding")!;
    expect(s.content["tagline"]).toBeNull();
    expect(JSON.stringify(s.content)).not.toContain("اقبض رزقك");
  });

  it("uses taglineAr when provided", () => {
    const custom = "بناء المستقبل اليوم";
    const { sections } = buildInvoiceArtifact(baseInput({ taglineAr: custom }));
    const s = sections.find((s) => s.id === "branding")!;
    expect(s.content["tagline"]).toBe(custom);
  });

  it("falls back to RIZQ_INVOICE_DEFAULTS.colors when brandColors is null", () => {
    const { sections } = buildInvoiceArtifact(baseInput({ brandColors: null }));
    const s = sections.find((s) => s.id === "branding")!;
    expect(s.content["colors"]).toEqual(RIZQ_INVOICE_DEFAULTS.colors);
  });

  it("uses provided brandColors when not null", () => {
    const colors = { primary: "#000000", secondary: "#FFFFFF" };
    const { sections } = buildInvoiceArtifact(baseInput({ brandColors: colors }));
    const s = sections.find((s) => s.id === "branding")!;
    expect(s.content["colors"]).toEqual(colors);
  });

  it("includes freelancerName, contact, and logoUrl in branding content", () => {
    const { sections } = buildInvoiceArtifact(
      baseInput({ logoUrl: "https://cdn.example.com/logo.png" })
    );
    const s = sections.find((s) => s.id === "branding")!;
    expect(s.content["freelancerName"]).toBe("محمد العمري");
    expect(s.content["logoUrl"]).toBe("https://cdn.example.com/logo.png");
    expect(s.content["contact"]).toEqual({
      email: "m@example.com",
      phone: null,
      whatsapp: "+966501234567",
    });
  });
});

// ---------------------------------------------------------------------------
// footer section — watermark
// ---------------------------------------------------------------------------

describe("footer section — watermark", () => {
  it("watermark is true when isFreeTier is true", () => {
    const { sections } = buildInvoiceArtifact(baseInput({ isFreeTier: true }));
    const s = sections.find((s) => s.id === "footer")!;
    expect(s.content["watermark"]).toBe(true);
  });

  it("watermark is false when isFreeTier is false (pro/admin)", () => {
    const { sections } = buildInvoiceArtifact(baseInput({ isFreeTier: false }));
    const s = sections.find((s) => s.id === "footer")!;
    expect(s.content["watermark"]).toBe(false);
  });

  it("footer carries jurisdiction KSA", () => {
    const { sections } = buildInvoiceArtifact(baseInput());
    const s = sections.find((s) => s.id === "footer")!;
    expect(s.content["jurisdiction"]).toBe("KSA");
  });

  it("footer carries methodologyHref", () => {
    const { sections } = buildInvoiceArtifact(baseInput());
    const s = sections.find((s) => s.id === "footer")!;
    expect(s.content["methodologyHref"]).toBe("/methodology");
  });

  it("footer carries invoiceId", () => {
    const { sections } = buildInvoiceArtifact(baseInput({ invoiceId: "inv_xyz" }));
    const s = sections.find((s) => s.id === "footer")!;
    expect(s.content["invoiceId"]).toBe("inv_xyz");
  });
});

// ---------------------------------------------------------------------------
// totals section
// ---------------------------------------------------------------------------

describe("totals section — VAT registration number", () => {
  it("carries the VAT registration number when the invoice has a VAT line", () => {
    // A tax invoice without the seller's registration number is invalid.
    const { sections } = buildInvoiceArtifact(
      baseInput({ vatPct: 15, vatSar: 450, vatNumber: "310000000000003" })
    );
    const s = sections.find((s) => s.id === "totals")!;
    expect(s.content["vat_number"]).toBe("310000000000003");
    expect(JSON.stringify(s.content)).toContain("310000000000003");
  });

  it("carries no VAT number when the invoice has no VAT line", () => {
    const { sections } = buildInvoiceArtifact(
      baseInput({ vatPct: 0, vatSar: 0, vatNumber: "310000000000003" })
    );
    const s = sections.find((s) => s.id === "totals")!;
    expect(s.content["vat_number"]).toBeNull();
  });

  it("keeps a null VAT number null even with a VAT line (nothing invented)", () => {
    const { sections } = buildInvoiceArtifact(
      baseInput({ vatPct: 15, vatSar: 450, vatNumber: null })
    );
    const s = sections.find((s) => s.id === "totals")!;
    expect(s.content["vat_number"]).toBeNull();
  });
});

describe("totals section", () => {
  it("carries the passed subtotal, vat_pct, vat_sar, total_sar", () => {
    const { sections } = buildInvoiceArtifact(
      baseInput({ subtotalSar: 3000, vatPct: 15, vatSar: 450, totalSar: 3450 })
    );
    const s = sections.find((s) => s.id === "totals")!;
    expect(s.content["subtotal_sar"]).toBe(3000);
    expect(s.content["vat_pct"]).toBe(15);
    expect(s.content["vat_sar"]).toBe(450);
    expect(s.content["total_sar"]).toBe(3450);
  });

  it("carries 0% VAT correctly", () => {
    const { sections } = buildInvoiceArtifact(
      baseInput({ subtotalSar: 500, vatPct: 0, vatSar: 0, totalSar: 500 })
    );
    const s = sections.find((s) => s.id === "totals")!;
    expect(s.content["vat_pct"]).toBe(0);
    expect(s.content["vat_sar"]).toBe(0);
    expect(s.content["total_sar"]).toBe(500);
  });

  it("surfaces fees + their subtotal in the totals content", () => {
    const { sections } = buildInvoiceArtifact(
      baseInput({
        fees: [
          { name: "رسوم استعجال", category: null, amount_sar: 200 },
          { name: "توصيل", category: "لوجستيات", amount_sar: 50 },
        ],
      })
    );
    const s = sections.find((s) => s.id === "totals")!;
    expect(s.content["fees_sar"]).toBe(250);
    expect(Array.isArray(s.content["fees"])).toBe(true);
    expect((s.content["fees"] as unknown[]).length).toBe(2);
  });

  it("empty fees → fees_sar 0 and an empty array", () => {
    const { sections } = buildInvoiceArtifact(baseInput());
    const s = sections.find((s) => s.id === "totals")!;
    expect(s.content["fees_sar"]).toBe(0);
    expect(s.content["fees"]).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// bill_to section
// ---------------------------------------------------------------------------

describe("bill_to section", () => {
  it("carries clientName (may be null — preserved as null)", () => {
    const { sections } = buildInvoiceArtifact(baseInput({ clientName: null }));
    const s = sections.find((s) => s.id === "bill_to")!;
    expect(s.content["clientName"]).toBeNull();
  });

  it("carries provided clientName", () => {
    const { sections } = buildInvoiceArtifact(baseInput({ clientName: "أحمد خالد" }));
    const s = sections.find((s) => s.id === "bill_to")!;
    expect(s.content["clientName"]).toBe("أحمد خالد");
  });

  it("carries clientCompany when provided", () => {
    const { sections } = buildInvoiceArtifact(baseInput({ clientCompany: "Ufuq Ltd." }));
    const s = sections.find((s) => s.id === "bill_to")!;
    expect(s.content["clientCompany"]).toBe("Ufuq Ltd.");
  });

  it("carries null clientCompany", () => {
    const { sections } = buildInvoiceArtifact(baseInput({ clientCompany: null }));
    const s = sections.find((s) => s.id === "bill_to")!;
    expect(s.content["clientCompany"]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// invoice_meta section
// ---------------------------------------------------------------------------

describe("invoice_meta section", () => {
  it("carries invoiceNumber, status, issueDate, dueDate", () => {
    const { sections } = buildInvoiceArtifact(baseInput());
    const s = sections.find((s) => s.id === "invoice_meta")!;
    expect(s.content["invoiceNumber"]).toBe("INV-2026-0001");
    expect(s.content["status"]).toBe("draft");
    expect(s.content["issueDate"]).toBe("2026-06-14");
    expect(s.content["dueDate"]).toBe("2026-07-14");
  });

  it("carries null issueDate when not yet persisted", () => {
    const { sections } = buildInvoiceArtifact(baseInput({ issueDate: null }));
    const s = sections.find((s) => s.id === "invoice_meta")!;
    expect(s.content["issueDate"]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// line_items section
// ---------------------------------------------------------------------------

describe("line_items section", () => {
  it("carries items array and description", () => {
    const { sections } = buildInvoiceArtifact(baseInput());
    const s = sections.find((s) => s.id === "line_items")!;
    const items = s.content["items"] as Array<{ description: string }>;
    expect(items).toHaveLength(2);
    expect(items[0]!.description).toBe("تصميم شعار");
    expect(s.content["description"]).toBe("تصميم هوية بصرية كاملة");
  });

  it("carries null description when not provided", () => {
    const { sections } = buildInvoiceArtifact(baseInput({ description: null }));
    const s = sections.find((s) => s.id === "line_items")!;
    expect(s.content["description"]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// payment section
// ---------------------------------------------------------------------------

describe("payment section", () => {
  it("carries paymentMethod, paymentDetails, dueDate", () => {
    const { sections } = buildInvoiceArtifact(baseInput());
    const s = sections.find((s) => s.id === "payment")!;
    expect(s.content["paymentMethod"]).toBe("bank_transfer");
    expect(s.content["paymentDetails"]).toBe("IBAN: SA00 0000 0000 0000 0000 0000");
    expect(s.content["dueDate"]).toBe("2026-07-14");
  });

  it("carries null paymentDetails", () => {
    const { sections } = buildInvoiceArtifact(baseInput({ paymentDetails: null }));
    const s = sections.find((s) => s.id === "payment")!;
    expect(s.content["paymentDetails"]).toBeNull();
  });
});
