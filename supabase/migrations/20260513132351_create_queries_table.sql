-- ─────────────────────────────────────────────────────────────────────────
-- queries — log every benchmark calculation. Used for:
--   1. Quota enforcement (count this month for free users)
--   2. Dashboard "last 10 queries" feature
--   3. /r/[id] public shareable result page (when public_share=true)
--   4. Future analytics (which specialties get most lookups)
-- ─────────────────────────────────────────────────────────────────────────

create table public.queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,                                  -- anon cookie ID
  specialty_id uuid not null references public.specialties(id),
  city_id uuid not null references public.cities(id),
  experience_tier_id uuid not null references public.experience_tiers(id),
  project_size public.project_size,
  filters_json jsonb default '{}'::jsonb,
  result_min numeric(10, 2),
  result_median numeric(10, 2),
  result_max numeric(10, 2),
  result_sample_size int,
  result_fallback_used boolean not null default false,
  public_share boolean not null default false,
  created_at timestamptz not null default now(),

  -- Either user_id or session_id must be set (anon flow uses session_id)
  constraint queries_actor_present check (
    user_id is not null or session_id is not null
  )
);

-- Indexes
create index queries_user_created_idx on public.queries (user_id, created_at desc)
  where user_id is not null;
create index queries_session_created_idx on public.queries (session_id, created_at desc)
  where session_id is not null;
create index queries_created_idx on public.queries (created_at desc);
create index queries_public_share_idx on public.queries (id)
  where public_share = true;

-- ── RLS ──
alter table public.queries enable row level security;
revoke all on public.queries from anon, authenticated;

-- SELECT: own queries OR publicly shared queries
grant select on public.queries to anon, authenticated;

create policy queries_select_own on public.queries
  for select to authenticated
  using (auth.uid() = user_id);

create policy queries_select_public_share on public.queries
  for select to anon, authenticated
  using (public_share = true);

-- INSERT: anyone can insert with their own user_id, or anonymously with
-- only session_id. Service-role (server actions) is the practical writer.
grant insert on public.queries to anon, authenticated;

create policy queries_insert on public.queries
  for insert to anon, authenticated
  with check (
    -- authed users insert their own user_id
    (auth.uid() is not null and user_id = auth.uid() and session_id is null)
    or
    -- anon users insert with only session_id
    (auth.uid() is null and user_id is null and session_id is not null)
  );

-- UPDATE: own queries only, and only the public_share field can flip
grant update (public_share) on public.queries to authenticated;

create policy queries_update_share on public.queries
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.queries is
  'Tool query log. Powers quota, history, and /r/[id] public sharing.';
comment on column public.queries.public_share is
  'When true, anyone can SELECT this row via the /r/[id] page.';
