-- Feature 007 (multi-currency) was reverted on 2026-07-01: Rizq is Saudi/SAR-only.
-- The fx_rates table went in 20260725113457; these four columns are the last of it.
--
-- Verified before dropping (2026-07-27, against the production project):
--   users.rate_currency  <> 'SAR'                      → 0 rows (of 49)
--   invoices.currency    <> 'SAR'                      → 0 rows (of 11)
--   invoices.fx_rate_to_sar / fx_source / fx_as_of     → 0 non-null
--   references anywhere in src/ or e2e/                → none
--
-- Every value is either the 'SAR' default or NULL, so nothing a user entered is
-- lost. This is irreversible: a future multi-currency feature re-adds the columns
-- from its own migration rather than expecting these to be waiting.

alter table public.users   drop column if exists rate_currency;
alter table public.invoices drop column if exists currency;
alter table public.invoices drop column if exists fx_rate_to_sar;
alter table public.invoices drop column if exists fx_source;
alter table public.invoices drop column if exists fx_as_of;
