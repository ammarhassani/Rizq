-- Serverless-safe rate limiting: the atomic RPCs.
--
-- PostgREST only exposes the `public` schema, so the RPCs must live there to be
-- callable at all. Access is locked down by GRANTs instead of by schema: EXECUTE
-- is revoked from anon/authenticated and granted only to service_role, so the
-- functions are reachable by the server and unreachable by any browser client.
-- (Keys are IP-derived and server-chosen; a client-callable limiter would let
-- anyone burn a victim's budget by passing that victim's key.) The counter table
-- stays in `private` — the SECURITY DEFINER body reaches it, PostgREST cannot.

drop function if exists private.check_rate_limit(text, int, int);
drop function if exists private.refund_rate_limit(text);

/**
 * Atomically count a hit against `p_key` and report whether it is allowed.
 * The whole read-modify-write is one statement, so concurrent lambdas cannot
 * race past the limit the way the in-memory version could.
 */
create or replace function public.check_rate_limit(
  p_key text,
  p_limit int,
  p_window_ms int
)
returns table(allowed boolean, remaining int, reset_in_ms int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
  v_expires timestamptz;
begin
  -- Opportunistic cleanup so the table can't grow unbounded. ~1% of calls.
  if random() < 0.01 then
    delete from private.rate_limits where expires_at < now() - interval '1 hour';
  end if;

  insert into private.rate_limits as rl (key, count, expires_at)
  values (p_key, 1, now() + make_interval(secs => p_window_ms / 1000.0))
  on conflict (key) do update
    set count = case when rl.expires_at <= now() then 1 else rl.count + 1 end,
        expires_at = case
          when rl.expires_at <= now() then now() + make_interval(secs => p_window_ms / 1000.0)
          else rl.expires_at
        end
  returning rl.count, rl.expires_at into v_count, v_expires;

  return query select
    v_count <= p_limit,
    greatest(0, p_limit - v_count),
    greatest(0, (extract(epoch from (v_expires - now())) * 1000)::int);
end $$;

/**
 * Give back one hit — used when an attempt failed for a benign reason (a typo'd
 * or already-registered email) that created nothing and isn't abuse, so honest
 * users don't lock themselves out while fixing a mistake.
 */
create or replace function public.refund_rate_limit(p_key text)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.rate_limits
     set count = greatest(0, count - 1)
   where key = p_key and expires_at > now();
$$;

revoke all on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
revoke all on function public.refund_rate_limit(text) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;
grant execute on function public.refund_rate_limit(text) to service_role;
