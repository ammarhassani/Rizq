-- ─────────────────────────────────────────────────────────────────────────
-- A fee preset is now either a fixed SAR amount OR a percentage of the items
-- subtotal (the line-items total, before VAT and before other fees).
--
-- fee_type discriminates the two kinds. `percentage` holds the rate for
-- percentage fees; `amount_sar` stays the flat value for fixed fees (and is 0
-- for percentage presets). On an invoice, a percentage fee is resolved to a
-- concrete amount against the items subtotal at creation time and stored in the
-- invoices.fees jsonb as amount_sar, so the existing recompute trigger
-- (private.invoice_compute_before, which sums amount_sar) needs no change.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.fee_presets
  add column if not exists fee_type text not null default 'fixed'
    check (fee_type in ('fixed','percentage')),
  add column if not exists percentage numeric
    check (percentage is null or (percentage >= 0 and percentage <= 100));
