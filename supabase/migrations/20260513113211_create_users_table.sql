-- Sprint 2: User profile table that extends auth.users 1:1.
-- Per docs/architecture.md §3.1.

-- ─────────────────────────────────────────────────────────────────────────
-- Private schema for security-definer helpers (kept off PostgREST).
-- ─────────────────────────────────────────────────────────────────────────
create schema if not exists private;
revoke all on schema private from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────
do $$ begin
  create type public.user_role as enum ('free', 'pro', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.app_language as enum ('ar', 'en');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- public.users — profile rows mirroring auth.users
-- ─────────────────────────────────────────────────────────────────────────
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  preferred_language public.app_language not null default 'ar',
  city text,
  role public.user_role not null default 'free',
  pro_until timestamptz,
  query_count_this_month int not null default 0,
  bonus_quota int not null default 0,
  referred_by uuid references public.users(id) on delete set null,
  last_active timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index users_email_unique on public.users (lower(email));
create index users_role_pro_until_idx on public.users (role, pro_until);

comment on table public.users is
  'Profile table 1:1 with auth.users. Populated by private.handle_new_user trigger.';
comment on column public.users.role is 'Authorization role; updates restricted to admin/service-role.';
comment on column public.users.query_count_this_month is 'Resets at calendar month boundary in Sprint 3.';

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────
alter table public.users enable row level security;

-- Lock down direct grants. RLS still enforces row scoping on top of these.
revoke all on public.users from anon, authenticated;
grant select, update on public.users to authenticated;

-- SELECT: users can read only their own row
create policy users_select_own on public.users
  for select
  to authenticated
  using (auth.uid() = id);

-- UPDATE: users can update only profile-shaped fields on their own row.
-- (role / pro_until / quota are intentionally not updateable from the client;
-- column-level grants are limited below.)
create policy users_update_own on public.users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Tighten column-level UPDATE grants so clients can't escalate role/quota
-- even with a permissive policy. Service-role bypasses RLS and grants.
revoke update on public.users from authenticated;
grant update (name, preferred_language, city, last_active)
  on public.users to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Trigger: auto-create profile row when auth.users gets a new entry
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta_lang public.app_language;
  meta_name text;
begin
  -- Pull optional profile signals supplied via supabase.auth.signUp options.data
  begin
    meta_lang := coalesce(
      (new.raw_user_meta_data ->> 'preferred_language')::public.app_language,
      'ar'::public.app_language
    );
  exception when others then
    meta_lang := 'ar'::public.app_language;
  end;
  meta_name := nullif(new.raw_user_meta_data ->> 'name', '');

  insert into public.users (id, email, name, preferred_language)
  values (new.id, new.email, meta_name, meta_lang)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_user();
