-- Feature 007 — Multi-Currency Pricing + FX Conversion (ADDITIVE)
-- SAR stays the engine/benchmark/HADAF base. These columns let a freelancer
-- price/invoice in another currency; conversion happens at the app boundary
-- using cited rates. SAR is the default everywhere → SAR-only path unchanged.
--
-- NOTE: authored under feature 007 but NOT YET APPLIED (DB unreachable at author
-- time). Apply when the connection is restored.

-- 1. Freelancer's pricing/display currency
alter table public.users
  add column if not exists rate_currency text not null default 'SAR';

-- 2. Per-invoice currency + the FX basis captured at creation (null when SAR)
alter table public.invoices
  add column if not exists currency text not null default 'SAR',
  add column if not exists fx_rate_to_sar numeric,
  add column if not exists fx_as_of date,
  add column if not exists fx_source text;

-- 3. Daily FX cache — reproducible + citable conversions for floating currencies.
--    USD/AED use the fixed SAMA peg chain in code and are not stored here.
create table if not exists public.fx_rates (
  id uuid primary key default gen_random_uuid(),
  quote text not null,            -- e.g. 'EUR', 'GBP'
  sar_per_unit numeric not null,  -- SAR per 1 unit of `quote`
  as_of date not null,
  source text not null,           -- feed name
  created_at timestamptz not null default now(),
  unique (quote, as_of)
);

alter table public.fx_rates enable row level security;

-- FX rates are public, non-sensitive reference data: any authenticated user may
-- read them and seed today's cache from their session (no service-role key here).
drop policy if exists "fx_rates_select" on public.fx_rates;
create policy "fx_rates_select" on public.fx_rates
  for select to authenticated using (true);

drop policy if exists "fx_rates_insert" on public.fx_rates;
create policy "fx_rates_insert" on public.fx_rates
  for insert to authenticated with check (true);
