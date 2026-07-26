/**
 * Invoice artifact data assembly — Phase-4 task 4.2.
 *
 * PURE module: no React, no Supabase, no side-effects. All inputs come in via
 * InvoiceArtifactInput; outputs are plain serialisable objects. Tests live in
 * artifact.test.ts and run with Vitest.
 *
 * Mirrors src/lib/proposals/artifact.ts exactly in style: ordered section
 * registry, per-section content builders, and a dispatcher map.
 */

import type { InvoiceLineItem, InvoiceFee } from "./items";

// ---------------------------------------------------------------------------
// Section registry
// ---------------------------------------------------------------------------

export type InvoiceArtifactSectionId =
  | "branding"
  | "invoice_meta"
  | "bill_to"
  | "line_items"
  | "totals"
  | "payment"
  | "footer";

export type InvoiceArtifactSectionMeta = {
  id: InvoiceArtifactSectionId;
  order: number;
};

/**
 * Ordered 7-section registry for invoice artifacts (spec P4.2).
 *
 * Sections (in order):
 *  1. branding      — freelancer identity + brand defaults
 *  2. invoice_meta  — invoice number, status, dates
 *  3. bill_to       — client details
 *  4. line_items    — deliverables + per-line pricing
 *  5. totals        — subtotal / VAT / grand total
 *  6. payment       — method, details, due date
 *  7. footer        — watermark (free tier), jurisdiction, methodology link
 */
export const INVOICE_ARTIFACT_SECTIONS: InvoiceArtifactSectionMeta[] = [
  { id: "branding",     order: 1 },
  { id: "invoice_meta", order: 2 },
  { id: "bill_to",      order: 3 },
  { id: "line_items",   order: 4 },
  { id: "totals",       order: 5 },
  { id: "payment",      order: 6 },
  { id: "footer",       order: 7 },
];

// ---------------------------------------------------------------------------
// Rizq invoice defaults (same brand constants as proposals/artifact.ts)
// ---------------------------------------------------------------------------

/**
 * Brand fallbacks. Deliberately colours only: Rizq's own tagline is not the freelancer's,
 * and a document handed to a client may not present it as theirs. An absent tagline renders
 * as absent (contracts/client-facing-artifact.md).
 */
export const RIZQ_INVOICE_DEFAULTS = {
  colors: { primary: "#1A5F3F", secondary: "#C8A951" },
} as const;

// ---------------------------------------------------------------------------
// Input / output types
// ---------------------------------------------------------------------------

/**
 * Flat inputs assembled by the caller from the invoice row + freelancer profile.
 * Mirror ArtifactInput from proposals/artifact.ts in shape and style.
 */
export type InvoiceArtifactInput = {
  locale: "ar" | "en";
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  /** ISO date string (created_at). Null when not yet persisted (optimistic). */
  issueDate: string | null;
  dueDate: string | null;

  // branding — M8 brand fields may be null → fall back to Rizq defaults
  freelancerName: string;
  brandNameAr: string | null;
  taglineAr: string | null;
  logoUrl: string | null;
  brandColors: { primary: string; secondary: string } | null;
  contact: { email: string | null; phone: string | null; whatsapp: string | null };

  // client — may be null (unlinked invoice)
  clientName: string | null;
  clientCompany: string | null;

  // line items
  items: InvoiceLineItem[];
  /** Categorized fixed fees added onto the invoice (part of the taxable supply). */
  fees: InvoiceFee[];
  /** Overall project description (optional narrative above the line items). */
  description: string | null;

  // totals (pre-computed by the caller — mirrors DB trigger output)
  subtotalSar: number;
  vatPct: number;
  vatSar: number;
  totalSar: number;
  /**
   * The freelancer's VAT registration number. Required on the document whenever a VAT line
   * is present — a tax invoice without it is invalid. Null when the invoice carries no VAT.
   */
  vatNumber: string | null;

  // payment
  paymentMethod: string;
  paymentDetails: string | null;

  // tier
  /** True when the freelancer is on the free tier — renders watermark in footer. */
  isFreeTier: boolean;
};

export type InvoiceArtifactSection = InvoiceArtifactSectionMeta & {
  /** Section-specific structured content (locale-resolved strings + data). */
  content: Record<string, unknown>;
};

export type InvoiceArtifactData = { sections: InvoiceArtifactSection[] };

// ---------------------------------------------------------------------------
// Section content builders (one per registry entry)
// ---------------------------------------------------------------------------

function buildBranding(input: InvoiceArtifactInput): Record<string, unknown> {
  return {
    freelancerName: input.freelancerName,
    brandName: input.brandNameAr ?? input.freelancerName,
    tagline: input.taglineAr,
    logoUrl: input.logoUrl,
    colors: input.brandColors ?? RIZQ_INVOICE_DEFAULTS.colors,
    contact: input.contact,
  };
}

function buildInvoiceMeta(input: InvoiceArtifactInput): Record<string, unknown> {
  return {
    invoiceNumber: input.invoiceNumber,
    status: input.status,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
  };
}

function buildBillTo(input: InvoiceArtifactInput): Record<string, unknown> {
  // clientName/clientCompany may be null — the UI shows generic labels when null.
  return {
    clientName: input.clientName,
    clientCompany: input.clientCompany,
  };
}

function buildLineItems(input: InvoiceArtifactInput): Record<string, unknown> {
  return {
    items: input.items,
    description: input.description,
  };
}

function buildTotals(input: InvoiceArtifactInput): Record<string, unknown> {
  // النتائج المالية — الأرقام بدون تنسيق (التنسيق يتم في React بالأرقام الجدولية)
  const feesSar = input.fees.reduce(
    (sum, f) => sum + (Number.isFinite(f.amount_sar) ? f.amount_sar : 0),
    0
  );
  return {
    subtotal_sar: input.subtotalSar,
    fees: input.fees,
    fees_sar: Math.round(feesSar * 100) / 100,
    vat_pct: input.vatPct,
    vat_sar: input.vatSar,
    total_sar: input.totalSar,
    // Printed beside the VAT line. Carried only when there is a VAT line to justify it.
    vat_number: input.vatPct > 0 ? input.vatNumber : null,
  };
}

function buildPayment(input: InvoiceArtifactInput): Record<string, unknown> {
  return {
    paymentMethod: input.paymentMethod,
    paymentDetails: input.paymentDetails,
    dueDate: input.dueDate,
  };
}

function buildFooter(input: InvoiceArtifactInput): Record<string, unknown> {
  return {
    /**
     * True when the freelancer is on the free tier. The UI renders a
     * "Created with Rizq Free / صُنع بـ رِزق المجاني" watermark when true.
     */
    watermark: input.isFreeTier,
    /** نطاق القانون المطبّق على الفاتورة */
    jurisdiction: "KSA",
    methodologyHref: "/methodology",
    invoiceId: input.invoiceId,
  };
}

// ---------------------------------------------------------------------------
// Dispatcher map
// ---------------------------------------------------------------------------

const INVOICE_CONTENT_BUILDERS: Record<
  InvoiceArtifactSectionId,
  (input: InvoiceArtifactInput) => Record<string, unknown>
> = {
  branding:     buildBranding,
  invoice_meta: buildInvoiceMeta,
  bill_to:      buildBillTo,
  line_items:   buildLineItems,
  totals:       buildTotals,
  payment:      buildPayment,
  footer:       buildFooter,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Assemble the ordered 7-section invoice artifact data.
 *
 * Pure. Branding falls back to Rizq defaults when brand fields are null.
 * Money stays as numbers — formatting (tabular numerals, SAR symbol) happens
 * in the React layer. Sections are returned sorted by `order`.
 */
export function buildInvoiceArtifact(
  input: InvoiceArtifactInput
): InvoiceArtifactData {
  const sections: InvoiceArtifactSection[] = INVOICE_ARTIFACT_SECTIONS.map(
    (meta) => ({
      ...meta,
      content: INVOICE_CONTENT_BUILDERS[meta.id](input),
    })
  );

  // Sort by order (registry is already ordered, but sort is an explicit guarantee).
  sections.sort((a, b) => a.order - b.order);

  return { sections };
}
