-- ─────────────────────────────────────────────────────────────────────────
-- Feature 002 (Project hub) — Stage 2, migration 2 of 3.
-- ADDITIVE links + idempotent backfill. Adds nullable project_id FKs to gigs,
-- invoices, proposals, client_timeline (+ proposals.proposal_role), creates one
-- project per existing gig (1:1, stable via projects.seed_gig_id), and backfills
-- the links. Existing columns (gigs.proposal_id/invoice_id, invoices.gig_id) are
-- RETAINED — nothing is dropped. Re-runnable: every step guards on `is null`.
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1. additive FK columns ──
alter table public.gigs            add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.invoices        add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.proposals       add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.proposals       add column if not exists proposal_role public.project_proposal_role not null default 'origin';
alter table public.client_timeline add column if not exists project_id uuid references public.projects(id) on delete set null;

create index if not exists idx_gigs_project           on public.gigs(project_id);
create index if not exists idx_invoices_project_id    on public.invoices(project_id) where project_id is not null;
create index if not exists idx_proposals_project      on public.proposals(project_id) where project_id is not null;
create index if not exists idx_client_timeline_project on public.client_timeline(project_id) where project_id is not null;

-- ── 2. stable per-gig surrogate so backfill is exactly 1:1 and idempotent ──
alter table public.projects add column if not exists seed_gig_id uuid;
create unique index if not exists uq_projects_seed_gig on public.projects(seed_gig_id) where seed_gig_id is not null;
comment on column public.projects.seed_gig_id is
  'Backfill audit/idempotency key: the gig this project was created from (feature 002). Null for projects created after the reframe.';

-- ── 3. one project per existing gig (idempotent via NOT EXISTS on seed_gig_id) ──
insert into public.projects (user_id, client_id, origin_proposal_id, title, status, created_at, updated_at, seed_gig_id)
select g.user_id, g.client_id, g.proposal_id, g.title,
       case g.status
         when 'paid' then 'completed'::public.project_status
         when 'cancelled' then 'cancelled'::public.project_status
         else 'active'::public.project_status
       end,
       g.created_at, now(), g.id
from public.gigs g
where g.project_id is null
  and not exists (select 1 from public.projects p where p.seed_gig_id = g.id);

-- ── 4. link each gig to its project via the surrogate ──
update public.gigs g
   set project_id = p.id
from public.projects p
where p.seed_gig_id = g.id
  and g.project_id is null;

-- ── 5. invoices.project_id from invoices.gig_id (gig_id retained) ──
update public.invoices i
   set project_id = g.project_id
from public.gigs g
where i.gig_id = g.id
  and i.project_id is null
  and g.project_id is not null;

-- ── 6. proposals: mark origin + link the project that this proposal spawned ──
update public.proposals pr
   set project_id = g.project_id, proposal_role = 'origin'
from public.gigs g
where g.proposal_id = pr.id
  and pr.project_id is null
  and g.project_id is not null;

-- ── 7. client_timeline.project_id best-effort from event_data gig_id ──
update public.client_timeline ct
   set project_id = g.project_id
from public.gigs g
where ct.project_id is null
  and g.project_id is not null
  and ct.event_data ? 'gig_id'
  and (ct.event_data->>'gig_id') ~ '^[0-9a-f-]{36}$'
  and (ct.event_data->>'gig_id')::uuid = g.id;
