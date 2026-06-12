-- Sprint 5: user-submitted pricing data + admin review queue.
-- Per architecture.md §3.1 (pricing_submissions) + §4.5 + §4.8.

-- ─────────────────────────────────────────────────────────────────────────
-- Submission status enum
-- ─────────────────────────────────────────────────────────────────────────
do $$ begin
  create type public.submission_status as enum (
    'pending', 'approved', 'rejected', 'needs_info'
  );
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- public.pricing_submissions
-- ─────────────────────────────────────────────────────────────────────────
create table public.pricing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  specialty_id uuid not null references public.specialties(id),
  city_id uuid not null references public.cities(id),
  experience_tier_id uuid not null references public.experience_tiers(id),
  project_type text,
  project_size public.project_size,
  price_sar numeric(10, 2) not null check (price_sar >= 0 and price_sar <= 1000000),
  project_duration_days int check (project_duration_days is null or project_duration_days >= 0),
  client_type public.client_type,
  notes text check (notes is null or length(notes) <= 2000),
  proof_url text,
  status public.submission_status not null default 'pending',
  moderator_notes text check (moderator_notes is null or length(moderator_notes) <= 2000),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create index pricing_submissions_status_submitted_idx
  on public.pricing_submissions (status, submitted_at desc);
create index pricing_submissions_user_idx
  on public.pricing_submissions (user_id, submitted_at desc);

comment on table public.pricing_submissions is
  'User-contributed pricing data, pending founder review. Approved rows are mirrored into benchmark_records by the on_submission_approve trigger.';

-- ─────────────────────────────────────────────────────────────────────────
-- is_admin() helper — used by RLS policies. STABLE so postgres can cache
-- the result within a transaction.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
end $$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────
alter table public.pricing_submissions enable row level security;
revoke all on public.pricing_submissions from anon, authenticated;
grant select on public.pricing_submissions to authenticated;
grant insert on public.pricing_submissions to authenticated;
-- Admins can update review-relevant fields only
grant update (status, moderator_notes, reviewed_at, reviewed_by)
  on public.pricing_submissions to authenticated;

create policy submissions_select_own on public.pricing_submissions
  for select to authenticated
  using (auth.uid() = user_id);

create policy submissions_select_admin on public.pricing_submissions
  for select to authenticated
  using (public.is_admin());

-- Insert: own user_id, must be the authed user
create policy submissions_insert_own on public.pricing_submissions
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Update: admins only (column grant already restricts which columns)
create policy submissions_update_admin on public.pricing_submissions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- Trigger: on approve, mirror to benchmark_records + credit +2 bonus quota
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.on_submission_approve()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.status = 'approved'
      and (old.status is null or old.status <> 'approved')) then

    insert into public.benchmark_records (
      specialty_id, city_id, experience_tier_id,
      project_type, project_size, price_sar,
      project_duration_days, client_type,
      source, source_user_id, notes,
      verified, verified_at, verified_by, recorded_at
    ) values (
      new.specialty_id, new.city_id, new.experience_tier_id,
      new.project_type, new.project_size, new.price_sar,
      new.project_duration_days, new.client_type,
      'user_submitted'::public.benchmark_source,
      new.user_id, new.notes,
      true, now(), new.reviewed_by, new.submitted_at
    );

    update public.users
    set bonus_quota = bonus_quota + 2
    where id = new.user_id;
  end if;

  return new;
end $$;

drop trigger if exists pricing_submissions_on_approve on public.pricing_submissions;
create trigger pricing_submissions_on_approve
  after update on public.pricing_submissions
  for each row
  execute function private.on_submission_approve();

comment on function private.on_submission_approve() is
  'Mirrors approved submissions into benchmark_records and credits +2 bonus_quota to the contributor.';

-- ─────────────────────────────────────────────────────────────────────────
-- RPC: submit_pricing — security-definer insert path. Same pattern as
-- log_query() — caller cannot impersonate other users.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.submit_pricing(
  p_specialty_id       uuid,
  p_city_id            uuid,
  p_experience_tier_id uuid,
  p_project_type       text,
  p_project_size       public.project_size,
  p_price_sar          numeric,
  p_project_duration_days int,
  p_client_type        public.client_type,
  p_notes              text,
  p_proof_url          text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_today_count int;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  -- Rate-limit: 5 submissions per UTC day per user
  select count(*) into v_today_count
  from public.pricing_submissions
  where user_id = v_uid
    and submitted_at >= date_trunc('day', now() at time zone 'Asia/Riyadh');

  if v_today_count >= 5 then
    raise exception 'submission limit (5/day) reached' using errcode = '54000';
  end if;

  insert into public.pricing_submissions (
    user_id, specialty_id, city_id, experience_tier_id,
    project_type, project_size, price_sar,
    project_duration_days, client_type, notes, proof_url
  ) values (
    v_uid, p_specialty_id, p_city_id, p_experience_tier_id,
    nullif(trim(p_project_type), ''), p_project_size, p_price_sar,
    p_project_duration_days, p_client_type,
    nullif(trim(p_notes), ''), nullif(trim(p_proof_url), '')
  )
  returning id into v_id;

  return v_id;
end $$;

revoke all on function public.submit_pricing(uuid, uuid, uuid, text, public.project_size, numeric, int, public.client_type, text, text) from public;
grant execute on function public.submit_pricing(uuid, uuid, uuid, text, public.project_size, numeric, int, public.client_type, text, text) to authenticated;
