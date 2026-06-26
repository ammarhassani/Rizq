-- ─────────────────────────────────────────────────────────────────────────
-- Feature 004 (Project Workspace) — Tasks & milestones facet.
-- New owner-scoped tables for a project's work breakdown. Money-free this
-- release (a milestone can later carry its own amount/gig link without
-- restructuring — NOT added now). Additive + idempotent.
-- ─────────────────────────────────────────────────────────────────────────

do $$ begin create type public.task_status as enum ('todo','doing','done');
exception when duplicate_object then null; end $$;

-- ── project_milestones ──
create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  target_date date,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_project_milestones_project on public.project_milestones(project_id, sort_order);

-- ── project_tasks ──
create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  milestone_id uuid references public.project_milestones(id) on delete set null,
  title text not null,
  status public.task_status not null default 'todo',
  due_date date,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_project_tasks_project on public.project_tasks(project_id, sort_order);
create index if not exists idx_project_tasks_milestone on public.project_tasks(milestone_id) where milestone_id is not null;

-- ── RLS (owner-only) ──
alter table public.project_milestones enable row level security;
revoke all on public.project_milestones from anon, authenticated;
grant select, insert, update, delete on public.project_milestones to authenticated;
drop policy if exists project_milestones_owner on public.project_milestones;
create policy project_milestones_owner on public.project_milestones for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.project_tasks enable row level security;
revoke all on public.project_tasks from anon, authenticated;
grant select, insert, update, delete on public.project_tasks to authenticated;
drop policy if exists project_tasks_owner on public.project_tasks;
create policy project_tasks_owner on public.project_tasks for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── updated_at touch ──
create or replace function private.project_task_touch_before() returns trigger
  language plpgsql security definer set search_path='' as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists project_tasks_touch_before on public.project_tasks;
create trigger project_tasks_touch_before before update on public.project_tasks
  for each row execute function private.project_task_touch_before();
drop trigger if exists project_milestones_touch_before on public.project_milestones;
create trigger project_milestones_touch_before before update on public.project_milestones
  for each row execute function private.project_task_touch_before();
