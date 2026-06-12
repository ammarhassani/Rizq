-- Track when a user finishes (or skips) the onboarding screen.
-- Previously, every OAuth sign-in routed users back to /onboarding,
-- since the callback hardcodes next=/onboarding without knowing if they
-- already completed it. With this column, the dashboard gates the
-- onboarding redirect: if onboarded_at IS NULL, send to onboarding;
-- otherwise serve the dashboard.

alter table public.users
  add column if not exists onboarded_at timestamptz;

-- Backfill existing users — they've already been through the flow
-- (or skipped it) in previous sessions. Treat them as onboarded so we
-- don't loop them.
update public.users
  set onboarded_at = coalesce(onboarded_at, created_at)
  where onboarded_at is null;

comment on column public.users.onboarded_at is
  'Set when user completes or skips onboarding. NULL = needs onboarding; non-NULL = skip the onboarding gate.';
