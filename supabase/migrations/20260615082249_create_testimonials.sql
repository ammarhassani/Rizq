-- Reusable client testimonials for the proposal "About you" section.
-- Owner-scoped (RLS). Embedded into proposals.artifact_json.about at generation,
-- so the public share surface needs no policy change.
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  client_name text,
  client_title text,
  quote_ar text,
  quote_en text,
  rating int check (rating between 1 and 5),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_testimonials_user on public.testimonials(user_id, sort_order, created_at);
alter table public.testimonials enable row level security;
revoke all on public.testimonials from anon, authenticated;
grant select, insert, update, delete on public.testimonials to authenticated;
drop policy if exists testimonials_owner on public.testimonials;
create policy testimonials_owner on public.testimonials for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
