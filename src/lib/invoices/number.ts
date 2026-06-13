/**
 * Invoice number formatting — Phase-4 task 4.2.
 *
 * PURE module: display-only helper.  The DB trigger
 * (private.invoice_assign_number in 20260613212550_create_invoices.sql) is the
 * authoritative source of truth for invoice numbers — this function mirrors its
 * format for optimistic / preview display only and MUST NOT be used to persist
 * or deduplicate invoice numbers.
 *
 * DB trigger format (lpad to 4):
 *   'INV-' || to_char(now() AT TIME ZONE 'Asia/Riyadh', 'YYYY') || '-' || lpad(seq::text, 4, '0')
 *
 * This function mirrors that exactly.  If sequence exceeds 4 digits the number
 * is NOT truncated — the DB stores the full number as-is.
 */

/**
 * Format an invoice number for display/preview.
 *
 * @param year      - 4-digit calendar year (e.g. 2026)
 * @param sequence  - 1-based sequence number for the user in that year
 * @returns  e.g. "INV-2026-0001", "INV-2026-0042", "INV-2026-12345"
 *
 * NOTE: The DB is the source of truth.  This is for optimistic/preview UI only.
 */
export function formatInvoiceNumber(year: number, sequence: number): string {
  // ضبط رقم التسلسل بأربعة أرقام على الأقل (يطابق lpad في قاعدة البيانات)
  const seq4 = String(sequence).padStart(4, "0");
  return `INV-${year}-${seq4}`;
}
