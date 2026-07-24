-- Feature 010 stress-hardening (#5): when a Pro grant lapses mid-month, the free
-- monthly count must start at the lapse, not at the start of the month.
--
-- Before: a Pro who ran 12 lookups in July and lapsed on July 20 was instantly
-- "0 of 5 remaining" — queries made while legitimately unlimited retroactively
-- exhausted the free allowance. Now the window is max(month_start, pro_until),
-- matching the app-side rule in src/lib/pricing/quota.ts.

create or replace function private.enforce_query_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_bonus int;
  v_pro_until timestamptz;
  v_used int;
  v_limit int;
  v_month_start timestamptz;
  v_count_from timestamptz;
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

  -- Auth path: free=5/mo + bonus_quota, pro(active)/admin=unlimited
  select role, bonus_quota, pro_until into v_role, v_bonus, v_pro_until
    from public.users
    where id = new.user_id;

  -- Admin is always unlimited; pro is unlimited ONLY while pro_until is future.
  if v_role = 'admin' then
    return new;
  end if;
  if v_role = 'pro' and v_pro_until is not null and v_pro_until > now() then
    return new;
  end if;

  -- free tier (or lapsed pro / null role)
  v_limit := 5 + coalesce(v_bonus, 0);
  v_month_start := date_trunc('month', now() at time zone 'Asia/Riyadh');

  -- Count from the later of month-start and the moment Pro lapsed.
  v_count_from := v_month_start;
  if v_pro_until is not null and v_pro_until > v_month_start then
    v_count_from := v_pro_until;
  end if;

  select count(*) into v_used
    from public.queries
    where user_id = new.user_id
      and created_at >= v_count_from;

  if v_used >= v_limit then
    raise exception 'free quota exhausted'
      using errcode = '53400';
  end if;

  return new;
end $$;

comment on function private.enforce_query_quota() is
  'Atomic quota check before query insert. Anon=1 lifetime per session_id, free=5+bonus_quota counted from max(month_start, pro_until), admin unlimited, pro unlimited only while pro_until>now. Errcode 53400 on exhaustion.';
