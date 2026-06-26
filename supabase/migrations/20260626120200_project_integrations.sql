-- ─────────────────────────────────────────────────────────────────────────
-- Feature 002 (Project hub) — Stage 2, migration 3 of 3.
-- Pluggable `project_integrations` registry keyed by project_id, mirroring the
-- collector_registry "row + config_json" extensibility pattern. New providers
-- are added by extending the enum (+ config keys) without core schema churn.
-- NO credentials/secrets column — OAuth is deferred to a future, separate
-- connection table. ADDITIVE + idempotent.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.project_integrations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  project_id    uuid not null references public.projects(id) on delete cascade,
  provider      public.project_integration_provider not null,
  external_url  text not null,
  display_label text not null,
  status        public.project_integration_status not null default 'linked',
  config        jsonb not null default '{}'::jsonb,   -- provider-specific; keeps core stable
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (project_id, provider, external_url)
);
create index if not exists idx_project_integrations_project on public.project_integrations(project_id);

-- ── RLS (owner-only) ──
alter table public.project_integrations enable row level security;
revoke all on public.project_integrations from anon, authenticated;
grant select, insert, update, delete on public.project_integrations to authenticated;
drop policy if exists project_integrations_owner on public.project_integrations;
create policy project_integrations_owner on public.project_integrations for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── updated_at maintenance ──
create or replace function private.project_integration_touch_before() returns trigger
  language plpgsql security definer set search_path='' as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists project_integrations_touch_before on public.project_integrations;
create trigger project_integrations_touch_before before update on public.project_integrations
  for each row execute function private.project_integration_touch_before();
