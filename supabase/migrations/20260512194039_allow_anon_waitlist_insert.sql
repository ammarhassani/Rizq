-- Allow anon (and authenticated) role to INSERT specific columns only.
-- App-level zod + rate limiting still enforce shape; this is defense in depth.

grant insert (email, language_preference, source) on table public.waitlist to anon;
grant insert (email, language_preference, source) on table public.waitlist to authenticated;

create policy "waitlist_anon_insert"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (
    email is not null
    and length(email) >= 3
    and length(email) <= 320
    and language_preference in ('ar', 'en')
  );

comment on policy "waitlist_anon_insert" on public.waitlist is
  'Allows inserts from server actions using the anon key. SELECT/UPDATE/DELETE remain locked.';
