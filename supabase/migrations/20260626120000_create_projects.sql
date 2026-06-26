-- ─────────────────────────────────────────────────────────────────────────
-- Feature 002 (Project hub) — Stage 2, migration 1 of 3.
-- Introduce `projects` as the umbrella parent. ADDITIVE ONLY: this migration
-- creates the table + enums + RLS + indexes and touches no existing table.
-- Money stays on `gigs` (migration 2 links them); the money engine (triggers,
-- income views, quota, invoice paid-loop) is intentionally NOT modified.
-- ─────────────────────────────────────────────────────────────────────────

-- ── enums (guarded) ──
do $$ begin create type public.project_status as enum
  ('active','on_hold','completed','archived','cancelled'); exception when duplicate_object then null; end $$;

do $$ begin create type public.project_proposal_role as enum
  ('origin','change_order','sub_scope'); exception when duplicate_object then null; end $$;

do $$ begin create type public.project_integration_provider as enum
  ('figma','github','behance','adobe','drive','other'); exception when duplicate_object then null; end $$;

do $$ begin create type public.project_integration_status as enum
  ('linked','disconnected','error'); exception when duplicate_object then null; end $$;

-- ── projects ──
create table if not exists public.projects (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  client_id          uuid references public.clients(id) on delete set null,
  origin_proposal_id uuid references public.proposals(id) on delete set null,
  title              text not null,
  status             public.project_status not null default 'active',
  is_active          boolean not null default true,   -- soft-archive flag (mirrors clients.is_active)
  archived_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_projects_user on public.projects(user_id, is_active, created_at desc);
create index if not exists idx_projects_client on public.projects(client_id);
create index if not exists idx_projects_origin_proposal on public.projects(origin_proposal_id) where origin_proposal_id is not null;

-- ── RLS (owner-only) ──
alter table public.projects enable row level security;
revoke all on public.projects from anon, authenticated;
grant select, insert, update, delete on public.projects to authenticated;
drop policy if exists projects_owner on public.projects;
create policy projects_owner on public.projects for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── updated_at maintenance BEFORE write (mirrors the existing *_compute_before style) ──
create or replace function private.project_touch_before() returns trigger
  language plpgsql security definer set search_path='' as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists projects_touch_before on public.projects;
create trigger projects_touch_before before update on public.projects
  for each row execute function private.project_touch_before();
