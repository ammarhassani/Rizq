-- ─────────────────────────────────────────────────────────────────────────
-- Phase 1.2 / 1.7 — Collector registry, ingestion observability, ingest RPC.
-- Writes to benchmark_records stay admin-only; collectors call run_ingestion
-- (SECURITY DEFINER, is_admin gated) which logs an ingestion_runs row and
-- inserts the normalized batch. Keeps the app free of a service-role key.
-- ─────────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.ingestion_status as enum ('running', 'completed', 'failed');
exception when duplicate_object then null; end $$;

-- Legacy `source` is superseded by `provenance`. Collector inserts set it to a
-- placeholder; mark it deprecated so future readers trust provenance instead.
comment on column public.benchmark_records.source is
  'DEPRECATED legacy origin label. Use provenance. Collector inserts set this to founder_added as a placeholder.';

create table if not exists public.collector_registry (
  id                 text primary key,
  name               text not null,
  provenance         public.benchmark_provenance not null,
  default_confidence numeric(3, 2) not null check (default_confidence >= 0 and default_confidence <= 1),
  enabled            boolean not null default true,
  schedule           text,
  config_json        jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

create table if not exists public.ingestion_runs (
  id            uuid primary key default gen_random_uuid(),
  collector_id  text not null references public.collector_registry(id),
  source_desc   text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  rows_in       int,
  rows_kept     int,
  rows_rejected int not null default 0,
  status        public.ingestion_status not null default 'running',
  error         text,
  error_stack   text,
  created_at    timestamptz not null default now()
);

create index if not exists ingestion_runs_collector_idx
  on public.ingestion_runs (collector_id, started_at desc);

-- RLS: registry + runs are admin-read, system-write (spec §V.3).
alter table public.collector_registry enable row level security;
alter table public.ingestion_runs enable row level security;
revoke all on public.collector_registry from anon, authenticated;
revoke all on public.ingestion_runs from anon, authenticated;
grant select on public.collector_registry to authenticated;
grant select on public.ingestion_runs to authenticated;

drop policy if exists collector_registry_admin_read on public.collector_registry;
create policy collector_registry_admin_read on public.collector_registry
  for select to authenticated using (public.is_admin());

drop policy if exists ingestion_runs_admin_read on public.ingestion_runs;
create policy ingestion_runs_admin_read on public.ingestion_runs
  for select to authenticated using (public.is_admin());

-- Seed the four (+seed) collectors (spec §M4.1).
insert into public.collector_registry (id, name, provenance, default_confidence, enabled, schedule, config_json) values
  ('founder_seed_v1',  'Founder editorial seed',             'founder',       0.30, true,  null, '{}'::jsonb),
  ('published_ref_v1', 'Curated published references',        'published_ref', 0.60, true,  null, '{"sources": []}'::jsonb),
  ('open_data_etimad', 'Saudi Open Data (Etimad)',            'ingested',      0.40, false, null, '{"endpoint": "https://open.data.gov.sa"}'::jsonb),
  ('reasoned_v1',      'DeepSeek reasoned constrained prior',  'reasoned',     0.20, true,  null, '{"model": "deepseek-chat"}'::jsonb),
  ('submitted',        'Crowd submissions (verified)',         'submitted',    0.50, true,  null, '{}'::jsonb)
on conflict (id) do nothing;

-- Admin-only ingest RPC: logs a run + bulk-inserts normalized rows.
-- p_rows: jsonb array of { specialty_id, city_id, experience_tier_id,
--   project_size?, price_sar, provenance, confidence, source_ref, captured_at, notes? }.
create or replace function public.run_ingestion(
  p_collector_id text,
  p_source_desc  text,
  p_rows         jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run_id uuid;
  v_kept   int := 0;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.collector_registry where id = p_collector_id) then
    raise exception 'unknown collector %', p_collector_id using errcode = '22023';
  end if;

  insert into public.ingestion_runs (collector_id, source_desc, rows_in, status)
  values (p_collector_id, p_source_desc, jsonb_array_length(coalesce(p_rows, '[]'::jsonb)), 'running')
  returning id into v_run_id;

  insert into public.benchmark_records (
    specialty_id, city_id, experience_tier_id, project_size,
    price_sar, source, provenance, confidence, captured_at,
    source_ref, collector_id, verified, verified_at, notes, active
  )
  select
    (r ->> 'specialty_id')::uuid,
    (r ->> 'city_id')::uuid,
    (r ->> 'experience_tier_id')::uuid,
    nullif(r ->> 'project_size', '')::public.project_size,
    (r ->> 'price_sar')::numeric,
    'founder_added'::public.benchmark_source,  -- legacy column; provenance is authoritative
    (r ->> 'provenance')::public.benchmark_provenance,
    (r ->> 'confidence')::numeric,
    coalesce((r ->> 'captured_at')::timestamptz, now()),
    r ->> 'source_ref',
    p_collector_id,
    true, now(),
    r ->> 'notes',
    true
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) as r
  where (r ->> 'price_sar')::numeric > 0;

  get diagnostics v_kept = row_count;

  update public.ingestion_runs
    set status = 'completed', finished_at = now(), rows_kept = v_kept
    where id = v_run_id;

  return v_run_id;
exception when others then
  update public.ingestion_runs
    set status = 'failed', finished_at = now(), error = sqlerrm
    where id = v_run_id;
  raise;
end;
$$;

-- Lock execution to signed-in users only (body further restricts to admins).
-- Supabase default privileges auto-grant EXECUTE to anon on new public
-- functions, so revoke it explicitly for defense-in-depth.
revoke all on function public.run_ingestion(text, text, jsonb) from public;
revoke execute on function public.run_ingestion(text, text, jsonb) from anon;
grant execute on function public.run_ingestion(text, text, jsonb) to authenticated;
