-- ─────────────────────────────────────────────────────────────────────────
-- benchmark_records — the dataset that powers the pricing tool
-- Per architecture.md §3.1
-- ─────────────────────────────────────────────────────────────────────────

create table public.benchmark_records (
  id uuid primary key default gen_random_uuid(),
  specialty_id uuid not null references public.specialties(id),
  city_id uuid not null references public.cities(id),
  experience_tier_id uuid not null references public.experience_tiers(id),
  project_type text,                              -- free-text label
  project_size public.project_size,               -- optional categorical
  price_sar numeric(10, 2) not null check (price_sar >= 0),
  project_duration_days int,
  client_type public.client_type,
  source public.benchmark_source not null,
  source_url text,
  source_user_id uuid references auth.users(id) on delete set null,
  verified boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  notes text,
  recorded_at timestamptz not null default now(),  -- when the price was charged
  created_at timestamptz not null default now(),
  flagged_as_outlier boolean not null default false,
  active boolean not null default true
);

-- Indexes from architecture.md
create index benchmark_lookup_idx on public.benchmark_records
  (specialty_id, city_id, experience_tier_id, active, verified);
create index benchmark_recorded_at_idx on public.benchmark_records (recorded_at desc);
create index benchmark_active_verified_idx on public.benchmark_records (active, verified)
  where flagged_as_outlier = false;

alter table public.benchmark_records enable row level security;
revoke all on public.benchmark_records from anon, authenticated;
grant select on public.benchmark_records to anon, authenticated;

-- Public read of verified, active, non-outlier rows only
create policy benchmark_public_read on public.benchmark_records
  for select to anon, authenticated
  using (active = true and verified = true and flagged_as_outlier = false);

comment on table public.benchmark_records is
  'Pricing dataset. Sprint 3 seed is founder-curated (source=founder_added) and marked verified=true with a synthetic recorded_at. Replace with real data as collected.';
