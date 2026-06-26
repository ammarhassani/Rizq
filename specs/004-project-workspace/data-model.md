# Phase 1 Data Model: Project Workspace

Conventions: guarded enums, `if not exists`, owner-scoped RLS (`auth.uid() = user_id`), additive only, never drop.

## Phase 1 — Files (additive on `documents`)

```sql
do $$ begin create type public.project_doc_kind as enum ('input','deliverable'); exception when duplicate_object then null; end $$;
do $$ begin create type public.deliverable_state as enum ('draft','ready','sent'); exception when duplicate_object then null; end $$;

alter table public.documents add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.documents add column if not exists project_doc_kind public.project_doc_kind;     -- null = not a project doc
alter table public.documents add column if not exists handover_state public.deliverable_state;        -- only for kind='deliverable'
create index if not exists idx_documents_project on public.documents(project_id) where project_id is not null and deleted_at is null;
```

- Reuses existing `documents` RLS, quota (free 10/pro 50), soft-delete, storage. Non-project docs: both new columns null → unchanged behavior (FR-005).
- `handover_state` defaults null; set when the deliverable enters the handover flow.

## Phase 2 — Deliverables (additive on `project_integrations`)

```sql
alter table public.project_integrations add column if not exists handover_state public.deliverable_state;
```

- **Deliverables view** (read, `security_invoker`): union of
  - `documents` where `project_id = :p and project_doc_kind='deliverable' and deleted_at is null`, and
  - `project_integrations` where `project_id = :p`,
  each projected to `{ source: 'file'|'link', id, label, handover_state, ref }`.
- No new store; removing the file/link removes the deliverable (FR-009).

## Phase 3 — Tasks & milestones (new tables)

```sql
do $$ begin create type public.task_status as enum ('todo','doing','done'); exception when duplicate_object then null; end $$;

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  target_date date,
  sort_order int not null default 0,
  -- money-ready (deferred): amount columns/gig link added in a later release; not used now
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
create index if not exists idx_project_milestones_project on public.project_milestones(project_id, sort_order);
```

- Both tables: owner-scoped RLS (`for all ... using (auth.uid()=user_id) with check (...)`), `updated_at` touch trigger. Included in PDPL export + delete cascade. **No money columns this release** (FR-012).

## Phase 4 — Provider connections (GATED; security-reviewed first)

```sql
do $$ begin create type public.provider_connection_status as enum ('active','expired','revoked'); exception when duplicate_object then null; end $$;

create table if not exists public.provider_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider public.project_integration_provider not null,   -- github first
  status public.provider_connection_status not null default 'active',
  -- secrets: stored ENCRYPTED; never selected by client
  access_token_enc bytea,
  refresh_token_enc bytea,
  scope text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_integrations add column if not exists connection_id uuid references public.provider_connections(id) on delete set null;

-- RLS: DELIBERATELY no client access. Server-only via SECURITY DEFINER / service role.
alter table public.provider_connections enable row level security;
revoke all on public.provider_connections from anon, authenticated;   -- NO grant — not even owner SELECT
```

- **The exception to the owner-select norm**: the client can never read this table; it is touched only by server functions. Verified via `get_advisors` (expect no authenticated grant).
- **Excluded from `exportMyDataAction`** (FR-015/SC-006/SC-007). Purged on account delete via `on delete cascade`.
- Tokens encrypted at rest (mechanism decided in the gated phase: pgcrypto/Vault or app-layer envelope encryption).

## Cross-cutting

- **PDPL export** adds: project association already on documents (just widen the select); new sections for `project_tasks` + `project_milestones`. **Never** `provider_connections`.
- **Account delete**: all new tables cascade from `users`.
- **No money-engine/view/quota change.**

## Entity relationships (after all phases)

```
projects 1─∞ documents (project_id; kind input|deliverable; handover_state on deliverables)
projects 1─∞ project_integrations (handover_state; connection_id → provider_connections)
projects 1─∞ project_tasks (∞→1 project_milestones, optional)
projects 1─∞ project_milestones
users    1─∞ provider_connections  (server-only; never client-readable / exported)
Deliverables = view(documents[deliverable] ∪ project_integrations) per project
```
