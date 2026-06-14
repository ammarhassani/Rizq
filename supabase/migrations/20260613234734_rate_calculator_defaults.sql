-- ─────────────────────────────────────────────────────────────────────────
-- Phase 6.3 — Rate Calculator (M10): per-user calculator preferences. The
-- calculation itself is a pure function over M4 market data + these inputs.
-- Owner-only.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.rate_calculator_defaults (
  user_id uuid primary key references public.users(id) on delete cascade,
  monthly_target_sar numeric,
  working_days_per_month int not null default 22,
  hours_per_day int not null default 6,          -- billable hours/day
  projects_per_month_target int,
  specialty_id uuid references public.specialties(id),
  city_id uuid references public.cities(id),
  experience_tier_id uuid references public.experience_tiers(id),
  updated_at timestamptz not null default now()
);
alter table public.rate_calculator_defaults enable row level security;
revoke all on public.rate_calculator_defaults from anon, authenticated;
grant select, insert, update on public.rate_calculator_defaults to authenticated;
drop policy if exists rate_calculator_defaults_owner on public.rate_calculator_defaults;
create policy rate_calculator_defaults_owner on public.rate_calculator_defaults for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
