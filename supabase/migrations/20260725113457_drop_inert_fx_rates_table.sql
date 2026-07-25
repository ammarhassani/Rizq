-- Feature 007 (multi-currency) was reverted: Rizq is Saudi/SAR-only. The fx_rates
-- table has been inert since, but it kept a permissive INSERT policy
-- (WITH CHECK (true)) that let any authenticated user write arbitrary FX rows —
-- flagged by the security audit as the last standing RLS residual. Nothing reads
-- it (0 rows, no code references), so drop the table and the policy with it.
--
-- The additive columns from the same feature (users.rate_currency,
-- invoices.currency + fx_*) are left in place: they are inert but carry no policy
-- risk, and dropping columns is irreversible. Verified 0 non-SAR values in both.
drop table if exists public.fx_rates cascade;
