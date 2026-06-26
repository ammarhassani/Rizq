# Phase 1 Data Model: Project as the umbrella hub

Conventions follow the repo's existing migrations: guarded enum creation (`do $$ … exception when duplicate_object`), `create table if not exists`, `security_invoker` views, owner-scoped RLS (`auth.uid() = user_id`), `private.*` SECURITY DEFINER trigger functions with `set search_path=''`, idempotent backfills.

## New enums

```sql
-- project lifecycle (superset-compatible with gig_status for mapping)
create type public.project_status as enum
  ('active','on_hold','completed','archived','cancelled');

-- a proposal's relationship to a project
create type public.project_proposal_role as enum
  ('origin','change_order','sub_scope');

-- pluggable integration providers (extend by adding values; config lives in jsonb)
create type public.project_integration_provider as enum
  ('figma','github','behance','adobe','drive','other');

create type public.project_integration_status as enum
  ('linked','disconnected','error');
```

## Table: `projects` (NEW — the umbrella)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid NOT NULL | → `users(id)` on delete cascade (RLS owner) |
| `client_id` | uuid NULL | → `clients(id)` on delete set null |
| `origin_proposal_id` | uuid NULL | → `proposals(id)` on delete set null — the one canonical origin |
| `title` | text NOT NULL | from gig title on backfill |
| `status` | `project_status` NOT NULL default `'active'` | mapped from gig status on backfill |
| `is_active` | boolean NOT NULL default true | soft-archive flag (mirrors `clients.is_active`) |
| `archived_at` | timestamptz NULL | set when soft-archived |
| `created_at` | timestamptz NOT NULL default now() | **preserved from gig** on backfill |
| `updated_at` | timestamptz NOT NULL default now() | |

Indexes: `(user_id, is_active, created_at desc)`, `(client_id)`, `(origin_proposal_id) where origin_proposal_id is not null`.

Status mapping (gig → project) on backfill:
`pending|deposit_paid|in_progress|delivered` → `active`; `paid` → `completed`; `overdue` → `active`; `cancelled` → `cancelled`.

## Additive columns on existing tables (Migration 2)

```sql
alter table public.gigs            add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.invoices        add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.proposals       add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.proposals       add column if not exists proposal_role public.project_proposal_role not null default 'origin';
alter table public.client_timeline add column if not exists project_id uuid references public.projects(id) on delete set null;
```

- `gigs.project_id` → `on delete cascade`: a project's money child dies with the project **only on a true hard-delete** (which is allowed only when there are no invoices and the gig is the empty money shell). With money present we soft-archive (never reach cascade). This keeps the invariant: you cannot orphan money.
- `invoices.project_id` → `on delete set null`: invoices outlive a project hard-delete (defensive; in practice invoices block hard-delete → soft-archive).
- **`gigs.proposal_id`, `gigs.invoice_id`, `invoices.gig_id` are retained unchanged** (no drop) — additive only.

Indexes: `idx_gigs_project on gigs(project_id)`, `idx_invoices_project_id on invoices(project_id) where project_id is not null`, `idx_proposals_project on proposals(project_id) where project_id is not null`, `idx_client_timeline_project on client_timeline(project_id) where project_id is not null`.

## Backfill (Migration 2, idempotent)

```sql
-- 1. one project per existing gig (re-runnable via NOT EXISTS guard)
insert into public.projects (id, user_id, client_id, origin_proposal_id, title, status, created_at, updated_at)
select gen_random_uuid(), g.user_id, g.client_id, g.proposal_id, g.title,
       case g.status
         when 'paid' then 'completed'::public.project_status
         when 'cancelled' then 'cancelled'::public.project_status
         else 'active'::public.project_status end,
       g.created_at, now()
from public.gigs g
where g.project_id is null;

-- 2. link each gig to its freshly-created project (match on the unique origin gig)
--    (use a deterministic mapping table/CTE keyed by gig identity; see tasks for exact SQL)
update public.gigs g set project_id = p.id
from public.projects p
where g.project_id is null
  and p.user_id = g.user_id
  and coalesce(p.origin_proposal_id::text,'∅') = coalesce(g.proposal_id::text,'∅')
  and p.title = g.title and p.created_at = g.created_at;  -- refined in tasks to guarantee 1:1

-- 3. invoices.project_id from invoices.gig_id
update public.invoices i set project_id = g.project_id
from public.gigs g where i.gig_id = g.id and i.project_id is null;

-- 4. proposals: mark origin + link project for proposals that spawned a gig
update public.proposals pr set project_id = g.project_id, proposal_role = 'origin'
from public.gigs g where g.proposal_id = pr.id and pr.project_id is null;

-- 5. client_timeline.project_id best-effort from event_data gig_id
update public.client_timeline ct set project_id = g.project_id
from public.gigs g
where ct.project_id is null
  and (ct.event_data->>'gig_id')::uuid = g.id;
```

> **Backfill 1:1 guarantee** — step 2's match keys are illustrative. The task SQL will use a stable per-gig surrogate (e.g. create projects with a temporary `seed_gig_id` column, link on it, then drop the temp column) so each gig maps to exactly one project even when title+date collide. Documented as a task acceptance check (SC-001).

## Table: `project_integrations` (NEW — pluggable registry)

```sql
create table if not exists public.project_integrations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  project_id    uuid not null references public.projects(id) on delete cascade,
  provider      public.project_integration_provider not null,
  external_url  text not null,
  display_label text not null,
  status        public.project_integration_status not null default 'linked',
  config        jsonb not null default '{}'::jsonb,    -- provider-specific, keeps core stable
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (project_id, provider, external_url)
);
create index if not exists idx_project_integrations_project on public.project_integrations(project_id);
```

**No credentials/secrets column** — OAuth tokens are out of scope; a future `provider_connections` table (keyed by user, encrypted) will hold them and be referenced by a nullable `connection_id` added later.

## RLS (owner-scoped — every new table)

```sql
-- projects
alter table public.projects enable row level security;
revoke all on public.projects from anon, authenticated;
grant select, insert, update, delete on public.projects to authenticated;
create policy projects_owner on public.projects for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- project_integrations
alter table public.project_integrations enable row level security;
revoke all on public.project_integrations from anon, authenticated;
grant select, insert, update, delete on public.project_integrations to authenticated;
create policy project_integrations_owner on public.project_integrations for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

`updated_at` maintained by a small `before update` trigger mirroring existing `*_compute_before` style (or set explicitly in the action). New FK columns inherit their parent tables' existing RLS — no policy changes needed on `gigs`/`invoices`/`proposals`/`client_timeline`.

## What is intentionally NOT changed

- No change to `gigs` money columns, `gig_compute_before`, `gig_rollup_client`, `enforce_gig_quota`.
- No change to `monthly_income`, `income_rolling_avg`, `income_projections`, `client_gig_summary`.
- No change to `markInvoiceStatus` paid-loop (still keyed on `gig_id`).
- No drop of `gigs.proposal_id`, `gigs.invoice_id`, `invoices.gig_id`.

## Entity relationship (after migration)

```
users 1─∞ projects
projects 1─∞ gigs            (gigs.project_id; 1:1 today, 1:∞ capable)   [money child]
projects 0..1 ── proposals   (projects.origin_proposal_id)              [canonical origin]
projects 1─∞ proposals       (proposals.project_id + proposal_role)     [origin/change_order/sub_scope]
projects 1─∞ invoices        (invoices.project_id; gig_id retained)
projects 1─∞ project_integrations
projects 1─∞ client_timeline (optional project_id)
Income Ledger = unchanged views over gigs
```
