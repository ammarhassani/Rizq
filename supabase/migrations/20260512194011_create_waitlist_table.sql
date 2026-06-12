-- Waitlist table for pre-launch email signups.
-- Server-only access via service_role. RLS enabled with no policies so anon/authenticated cannot read or write.

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  language_preference text not null default 'ar' check (language_preference in ('ar','en')),
  source text,
  created_at timestamptz not null default now()
);

-- Case-insensitive email uniqueness without requiring citext extension
create unique index waitlist_email_unique on public.waitlist (lower(email));
create index waitlist_created_at_idx on public.waitlist (created_at desc);

-- Defense in depth: lock the table down at both the RLS and grants level.
-- Service role bypasses RLS and is the only path the server action uses.
alter table public.waitlist enable row level security;
revoke all on table public.waitlist from anon, authenticated;

comment on table public.waitlist is 'Pre-launch email waitlist. Insert-only from server actions using service_role. RLS locked.';
comment on column public.waitlist.language_preference is 'UI locale at signup time (ar | en).';
comment on column public.waitlist.source is 'Marketing attribution slug (e.g. linkedin, twitter, direct).';
