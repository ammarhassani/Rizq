-- Hardening: move quota enforcement to a BEFORE INSERT trigger so the
-- count-then-write check is atomic. Previously the app counted queries,
-- then called log_query — between the two, parallel requests could
-- race past the limit by 1+. The trigger runs in the same transaction
-- as the insert, eliminating that window.
--
-- Errcode 53400 maps to "quota exhausted" in the server action.

create or replace function private.enforce_query_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_bonus int;
  v_used int;
  v_limit int;
  v_month_start timestamptz;
begin
  -- Anon path: 1 lifetime query per session_id
  if new.user_id is null then
    if new.session_id is null then
      raise exception 'session_id required for anon query'
        using errcode = '22023';
    end if;
    select count(*) into v_used
      from public.queries
      where session_id = new.session_id;
    if v_used >= 1 then
      raise exception 'anon quota exhausted'
        using errcode = '53400';
    end if;
    return new;
  end if;

  -- Auth path: free=3/mo + bonus_quota, pro/admin=unlimited
  select role, bonus_quota into v_role, v_bonus
    from public.users
    where id = new.user_id;

  if v_role is null or v_role = 'pro' or v_role = 'admin' then
    return new;
  end if;

  -- v_role = 'free'
  v_limit := 3 + coalesce(v_bonus, 0);
  v_month_start := date_trunc('month', now() at time zone 'Asia/Riyadh');

  select count(*) into v_used
    from public.queries
    where user_id = new.user_id
      and created_at >= v_month_start;

  if v_used >= v_limit then
    raise exception 'free quota exhausted'
      using errcode = '53400';
  end if;

  return new;
end $$;

drop trigger if exists enforce_query_quota_before_insert on public.queries;
create trigger enforce_query_quota_before_insert
  before insert on public.queries
  for each row
  execute function private.enforce_query_quota();

comment on function private.enforce_query_quota() is
  'Atomic quota check before query insert. Anon=1 lifetime per session_id, free=3+bonus_quota per Riyadh-time month, pro/admin=unlimited. Errcode 53400 on exhaustion.';
