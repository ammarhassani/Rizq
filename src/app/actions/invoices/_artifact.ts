/**
 * Shared invoice artifact assembler — Phase-4 task P4.3.
 *
 * NOT "use server" — plain async util imported by the invoice actions.
 * Loads user profile + optional client from Supabase, then constructs the
 * InvoiceArtifactInput required by buildInvoiceArtifact (pure lib fn).
 *
 * Call this after every insert/update that changes invoice content or status
 * so artifact_json stays in sync across create/update/status transitions.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildInvoiceArtifact } from "@/lib/invoices/artifact";
import type { InvoiceArtifactData, InvoiceArtifactInput } from "@/lib/invoices/artifact";
import type { InvoiceLineItem } from "@/lib/invoices/items";

// ---------------------------------------------------------------------------
// Narrow invoice row shape (only the columns we actually SELECT in actions).
// Kept minimal — never select columns that don't exist in the migration.
// ---------------------------------------------------------------------------

export type InvoiceRowForArtifact = {
  id: string;
  invoice_number: string;
  status: string;
  description: string | null;
  items: unknown;              // jsonb — cast below
  subtotal_sar: number;
  vat_pct: number;
  vat_sar: number;
  total_sar: number;
  payment_method: string;
  payment_details: string | null;
  due_date: string | null;
  created_at: string;
  client_id: string | null;
};

// ---------------------------------------------------------------------------
// Public helper
// ---------------------------------------------------------------------------

/**
 * Assemble InvoiceArtifactInput from a persisted invoice row.
 *
 * Side-effects: two (or three) Supabase SELECT queries.
 *   1. users.name, email, role  (for freelancer identity + free-tier flag)
 *   2. clients.name, name_en, company  (only when invoice.client_id is set)
 *
 * Brand fields (logo, custom colours, tagline) pass null — M8 is not built;
 * the artifact lib falls back to Rizq defaults automatically.
 *
 * locale defaults to "ar".
 */
export async function buildInvoiceArtifactInputFromRow({
  supabase,
  userId,
  invoice,
  locale = "ar",
}: {
  supabase: SupabaseClient;
  userId: string;
  invoice: InvoiceRowForArtifact;
  locale?: "ar" | "en";
}): Promise<InvoiceArtifactInput> {
  // 1. Load user profile (name + email for freelancer identity; role for tier gate)
  const { data: userProfile } = await supabase
    .from("users")
    .select("name, email, role")
    .eq("id", userId)
    .single();

  const freelancerName =
    (userProfile?.name as string | null) ??
    (userProfile?.email as string | null) ??
    "مستقل / Freelancer";

  const contactEmail = (userProfile?.email as string | null) ?? null;
  const role = (userProfile?.role as string | null) ?? "free";
  const isFreeTier = role !== "pro" && role !== "admin";

  // 2. Optionally load client name/company
  let clientName: string | null = null;
  let clientCompany: string | null = null;

  if (invoice.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("name, name_en, company")
      .eq("id", invoice.client_id)
      .eq("user_id", userId)
      .single();

    if (client) {
      // Prefer Arabic name; fall back to English name
      clientName =
        (client.name as string | null) ??
        (client.name_en as string | null) ??
        null;
      clientCompany = (client.company as string | null) ?? null;
    }
  }

  // 3. Resolve line items: use invoice.items if non-empty; else synthesise one line
  const subtotal = Number(invoice.subtotal_sar) || 0;
  const rawItems = invoice.items;

  let items: InvoiceLineItem[];
  if (Array.isArray(rawItems) && rawItems.length > 0) {
    items = (rawItems as InvoiceLineItem[]).map((it) => ({
      description: String(it.description ?? "خدمة"),
      quantity: Number(it.quantity) || 1,
      unit_price_sar: Number(it.unit_price_sar) || 0,
      total_sar: Number(it.total_sar) || 0,
    }));
  } else {
    // Synthesise a single-line item from description / subtotal
    const desc = invoice.description ?? "خدمة";
    items = [
      {
        description: desc,
        quantity: 1,
        unit_price_sar: subtotal,
        total_sar: subtotal,
      },
    ];
  }

  const vatPct = Number(invoice.vat_pct) || 0;
  const vatSar = Number(invoice.vat_sar) || 0;
  const totalSar = Number(invoice.total_sar) || 0;

  return {
    locale,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    status: invoice.status,
    issueDate: invoice.created_at,
    dueDate: invoice.due_date ?? null,

    // M8 brand fields — not built yet; pass null → lib uses Rizq defaults
    freelancerName,
    brandNameAr: null,
    taglineAr: null,
    logoUrl: null,
    brandColors: null,
    contact: { email: contactEmail, phone: null, whatsapp: null },

    clientName,
    clientCompany,

    items,
    description: invoice.description ?? null,

    subtotalSar: subtotal,
    vatPct,
    vatSar,
    totalSar,

    paymentMethod: invoice.payment_method,
    paymentDetails: invoice.payment_details ?? null,

    isFreeTier,
  };
}

/**
 * Convenience wrapper: build the artifact and return the JSON blob ready for
 * storage. Returns null if artifact assembly throws (caller stores null
 * gracefully rather than failing the whole operation).
 */
export async function assembleArtifactJson(opts: {
  supabase: SupabaseClient;
  userId: string;
  invoice: InvoiceRowForArtifact;
  locale?: "ar" | "en";
}): Promise<InvoiceArtifactData | null> {
  try {
    const input = await buildInvoiceArtifactInputFromRow(opts);
    return buildInvoiceArtifact(input);
  } catch (err) {
    console.warn("[assembleArtifactJson] artifact build failed", err);
    return null;
  }
}
