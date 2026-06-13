-- ─────────────────────────────────────────────────────────────────────────
-- Phase 3.1 — Client Book (M2) + Income Ledger (M3) schema.
-- Owner-scoped RLS; gig→client rollup trigger; free-tier quotas; income views
-- with security_invoker so they enforce the querying user's RLS (no cross-user
-- leak — views otherwise run as owner/postgres and bypass RLS).
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pg_trgm;

do $$ begin create type public.client_source as enum ('referral','platform','social_media','direct','other'); exception when duplicate_object then null; end $$;
do $$ begin create type public.follow_up_priority as enum ('low','medium','high'); exception when duplicate_object then null; end $$;
do $$ begin create type public.client_timeline_event as enum
  ('proposal_sent','proposal_viewed','proposal_accepted','proposal_declined','gig_created','gig_completed','invoice_sent','invoice_paid','note_added','contacted','rating_changed','tag_added','tag_removed');
exception when duplicate_object then null; end $$;
do $$ begin create type public.gig_status as enum ('pending','deposit_paid','in_progress','delivered','paid','overdue','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_method as enum ('bank_transfer','stc_pay','cash','other'); exception when duplicate_object then null; end $$;

-- ── clients ──
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  name_en text,
  company text,
  title text,
  email text,
  phone text,
  phone_whatsapp text,
  city text,
  linkedin_url text,
  client_type public.client_type not null default 'individual',
  industry text,
  industry_ar text,
  source public.client_source not null default 'direct',
  source_detail text,
  tags text[] not null default '{}',
  notes text,
  ai_notes text,
  rating int check (rating >= 1 and rating <= 5),
  first_contacted_at timestamptz,
  last_contacted_at timestamptz,
  total_gigs int not null default 0,
  total_value_sar numeric not null default 0,
  avg_payment_days numeric,
  client_persona text,
  follow_up_priority public.follow_up_priority not null default 'medium',
  next_action_suggestion text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_clients_user on public.clients(user_id, is_active, last_contacted_at desc nulls last);
create index if not exists idx_clients_name_trgm on public.clients using gin (name gin_trgm_ops);
create index if not exists idx_clients_tags on public.clients using gin (tags);
create index if not exists idx_clients_user_name on public.clients(user_id, name);
create index if not exists idx_clients_follow_up on public.clients(user_id, follow_up_priority, last_contacted_at);

-- ── client_timeline ──
create table if not exists public.client_timeline (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  event_type public.client_timeline_event not null,
  event_data jsonb,
  ai_summary text,
  created_at timestamptz not null default now()
);
create index if not exists idx_client_timeline_client on public.client_timeline(client_id, created_at desc);

-- ── gigs ──
create table if not exists public.gigs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  proposal_id uuid references public.proposals(id) on delete set null,
  invoice_id uuid,                          -- no FK yet (invoices arrive in Phase 4)
  title text not null,
  category text,
  category_auto text,
  description text,
  amount_sar numeric not null check (amount_sar > 0),
  deposit_pct int not null default 50,
  deposit_sar numeric,
  remaining_sar numeric,
  start_date date,
  delivery_date date,
  completed_date date,
  status public.gig_status not null default 'pending',
  deposit_paid_at timestamptz,
  final_paid_at timestamptz,
  payment_method public.payment_method not null default 'bank_transfer',
  payment_notes text,
  ai_anomaly_flag boolean not null default false,
  ai_anomaly_reason text,
  ai_category_confidence numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_gigs_user_status on public.gigs(user_id, status);
create index if not exists idx_gigs_user_date on public.gigs(user_id, delivery_date desc);
create index if not exists idx_gigs_client on public.gigs(client_id);
create index if not exists idx_gigs_proposal on public.gigs(proposal_id) where proposal_id is not null;
create index if not exists idx_gigs_user_amount on public.gigs(user_id, amount_sar);

-- ── income_projections (cached AI forecast) ──
create table if not exists public.income_projections (
  user_id uuid primary key references public.users(id) on delete cascade,
  current_month_projection numeric,
  next_month_projection numeric,
  confidence_low numeric,
  confidence_high numeric,
  projection_basis jsonb,
  generated_at timestamptz not null default now(),
  valid_until timestamptz
);

-- ── proposals.client_id FK (was nullable/no-FK in P2; all null now → safe) ──
do $$ begin
  alter table public.proposals
    add constraint proposals_client_id_fkey
    foreign key (client_id) references public.clients(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ── RLS (owner-only) ──
alter table public.clients enable row level security;
revoke all on public.clients from anon, authenticated;
grant select, insert, update, delete on public.clients to authenticated;
drop policy if exists clients_owner on public.clients;
create policy clients_owner on public.clients for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

alter table public.client_timeline enable row level security;
revoke all on public.client_timeline from anon, authenticated;
grant select, insert on public.client_timeline to authenticated;
drop policy if exists client_timeline_owner_read on public.client_timeline;
create policy client_timeline_owner_read on public.client_timeline for select to authenticated using (auth.uid()=user_id);
drop policy if exists client_timeline_owner_insert on public.client_timeline;
create policy client_timeline_owner_insert on public.client_timeline for insert to authenticated with check (auth.uid()=user_id);

alter table public.gigs enable row level security;
revoke all on public.gigs from anon, authenticated;
grant select, insert, update, delete on public.gigs to authenticated;
drop policy if exists gigs_owner on public.gigs;
create policy gigs_owner on public.gigs for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

alter table public.income_projections enable row level security;
revoke all on public.income_projections from anon, authenticated;
grant select, insert, update on public.income_projections to authenticated;
drop policy if exists income_projections_owner on public.income_projections;
create policy income_projections_owner on public.income_projections for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- ── gig compute (deposit/remaining) BEFORE write ──
create or replace function private.gig_compute_before() returns trigger language plpgsql security definer set search_path='' as $$
begin
  new.deposit_sar := round(new.amount_sar * coalesce(new.deposit_pct,50) / 100.0, 2);
  new.remaining_sar := new.amount_sar - new.deposit_sar;
  return new;
end $$;
drop trigger if exists gigs_compute_before on public.gigs;
create trigger gigs_compute_before before insert or update on public.gigs for each row execute function private.gig_compute_before();

-- ── gig → client rollup AFTER write (insert/update/delete + reassignment) ──
create or replace function private.gig_rollup_client() returns trigger language plpgsql security definer set search_path='' as $$
declare v_ids uuid[]; v_id uuid;
begin
  v_ids := array_remove(array[
    (case when tg_op <> 'INSERT' then old.client_id end),
    (case when tg_op <> 'DELETE' then new.client_id end)
  ], null);
  foreach v_id in array v_ids loop
    update public.clients c set
      total_gigs = (select count(*) from public.gigs g where g.client_id = v_id),
      total_value_sar = (select coalesce(sum(g.amount_sar),0) from public.gigs g where g.client_id = v_id and g.status = 'paid'),
      avg_payment_days = (select avg(extract(day from (g.final_paid_at - g.delivery_date))) from public.gigs g where g.client_id = v_id and g.status='paid' and g.final_paid_at is not null and g.delivery_date is not null),
      updated_at = now()
    where c.id = v_id;
  end loop;
  return coalesce(new, old);
end $$;
drop trigger if exists gigs_rollup_after on public.gigs;
create trigger gigs_rollup_after after insert or update or delete on public.gigs for each row execute function private.gig_rollup_client();

-- ── free-tier quotas (10 clients total; 20 gigs / Riyadh-month) ──
create or replace function private.enforce_client_quota() returns trigger language plpgsql security definer set search_path='' as $$
declare v_role public.user_role; v_used int;
begin
  select role into v_role from public.users where id = new.user_id;
  if v_role is null or v_role in ('pro','admin') then return new; end if;
  select count(*) into v_used from public.clients where user_id = new.user_id;
  if v_used >= 10 then raise exception 'free client quota exhausted' using errcode='53400'; end if;
  return new;
end $$;
drop trigger if exists enforce_client_quota_before on public.clients;
create trigger enforce_client_quota_before before insert on public.clients for each row execute function private.enforce_client_quota();

create or replace function private.enforce_gig_quota() returns trigger language plpgsql security definer set search_path='' as $$
declare v_role public.user_role; v_used int; v_month_start timestamptz;
begin
  select role into v_role from public.users where id = new.user_id;
  if v_role is null or v_role in ('pro','admin') then return new; end if;
  v_month_start := date_trunc('month', now() at time zone 'Asia/Riyadh');
  select count(*) into v_used from public.gigs where user_id = new.user_id and created_at >= v_month_start;
  if v_used >= 20 then raise exception 'free gig quota exhausted' using errcode='53400'; end if;
  return new;
end $$;
drop trigger if exists enforce_gig_quota_before on public.gigs;
create trigger enforce_gig_quota_before before insert on public.gigs for each row execute function private.enforce_gig_quota();

-- ── views (security_invoker → enforce the querying user's RLS) ──
create or replace view public.client_gig_summary with (security_invoker = true) as
select c.id as client_id, c.user_id,
  count(g.id) as gig_count,
  sum(g.amount_sar) filter (where g.status='paid') as total_paid_sar,
  sum(g.amount_sar) filter (where g.status in ('pending','deposit_paid','in_progress','delivered')) as total_pending_sar,
  max(g.delivery_date) as last_gig_date,
  min(g.delivery_date) as first_gig_date,
  avg(extract(day from (g.final_paid_at - g.delivery_date))) filter (where g.status='paid' and g.final_paid_at is not null) as avg_payment_days
from public.clients c left join public.gigs g on g.client_id = c.id
group by c.id, c.user_id;

create or replace view public.monthly_income with (security_invoker = true) as
select user_id, date_trunc('month', delivery_date) as month,
  count(*) as gig_count,
  sum(amount_sar) as total_sar,
  sum(amount_sar) filter (where status='paid') as paid_sar,
  sum(amount_sar) filter (where status in ('pending','deposit_paid','in_progress','delivered')) as pending_sar,
  sum(amount_sar) filter (where status='overdue') as overdue_sar,
  count(*) filter (where status='paid') as paid_count,
  count(*) filter (where status in ('pending','deposit_paid','in_progress','delivered')) as pending_count
from public.gigs where delivery_date is not null group by user_id, month;

create or replace view public.income_rolling_avg with (security_invoker = true) as
select user_id, month,
  avg(total_sar) over (partition by user_id order by month rows between 5 preceding and current row) as rolling_6m_avg,
  avg(total_sar) over (partition by user_id order by month rows between 2 preceding and current row) as rolling_3m_avg
from public.monthly_income;

revoke all on public.client_gig_summary, public.monthly_income, public.income_rolling_avg from anon, authenticated;
grant select on public.client_gig_summary, public.monthly_income, public.income_rolling_avg to authenticated;
