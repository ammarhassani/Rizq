-- ─────────────────────────────────────────────────────────────────────────
-- UX audit fix (Finding #2): every gig must belong to a Project. Feature 002
-- backfilled all gigs that existed then, but gigs logged via /income/new since
-- (createGig) had no project_id → orphans invisible in /projects. This backfills
-- a project for any remaining project-less gig. Additive + idempotent.
-- (createGig now creates the parent project up-front, so this is a one-time sweep.)
-- ─────────────────────────────────────────────────────────────────────────

alter table public.projects add column if not exists seed_gig_id uuid;
create unique index if not exists uq_projects_seed_gig on public.projects(seed_gig_id) where seed_gig_id is not null;

insert into public.projects (user_id, client_id, origin_proposal_id, title, status, created_at, updated_at, seed_gig_id)
select g.user_id, g.client_id, g.proposal_id, g.title,
       case g.status when 'paid' then 'completed'::public.project_status
            when 'cancelled' then 'cancelled'::public.project_status
            else 'active'::public.project_status end,
       g.created_at, now(), g.id
from public.gigs g
where g.project_id is null
  and not exists (select 1 from public.projects p where p.seed_gig_id = g.id);

update public.gigs g
   set project_id = p.id
from public.projects p
where p.seed_gig_id = g.id and g.project_id is null;

-- Link origin proposal for backfilled projects whose gig came from a proposal.
update public.proposals pr
   set project_id = g.project_id, proposal_role = 'origin'
from public.gigs g
where g.proposal_id = pr.id and pr.project_id is null and g.project_id is not null;
