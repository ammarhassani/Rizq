-- Serverless-safe rate limiting: the counter table.
--
-- The limiter was an in-process Map, which is ineffective on Vercel: every
-- lambda instance keeps its own counters and cold starts reset them, so the
-- auth brute-force guards (login / signup / forgot-password / resend) were
-- effectively unenforced in production. Postgres is the state every instance
-- already shares, so the counter lives here.
--
-- The table stays in `private`: PostgREST cannot reach it, and only the
-- SECURITY DEFINER RPCs (see the follow-up migration) touch it.

create table if not exists private.rate_limits (
  key         text primary key,
  count       int not null default 0,
  expires_at  timestamptz not null
);

comment on table private.rate_limits is
  'Shared rate-limit counters. Server-only; keys are server-derived, never client-supplied.';
