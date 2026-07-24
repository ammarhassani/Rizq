-- Feature 010 (US3 / FR-005 + FR-007): align the DB quota backstop with the app.
--
-- Two fixes to private.enforce_query_quota():
--   1. Free monthly limit 3 -> 5. spec-v2 Part IV.1 and the /upgrade page both
--      advertise 5 free lookups/month; feature 008 fixed the app constant
--      (FREE_MONTHLY_QUERIES) but this trigger still hard-blocked at 3, so free
--      users were paywalled two lookups early at the DB level.
--   2. Honor pro_until. The old check treated ANY role='pro' as unlimited, so a
--      lapsed grant never expired at the DB layer (mirrors the app-side
--      isProActive fix in src/lib/billing/tier.ts). An expired pro now falls
--      through to the free monthly count.

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

  -- Admin is always unlimited; pro is unlimited ONLY while pro_until is in the
  -- future. Null role (unknown) is treated as free below.
  if v_role = 'admin' then
    return new;
  end if;
  if v_role = 'pro' and v_pro_until is not null and v_pro_until > now() then
    return new;
  end if;

  -- free tier (or lapsed pro / null role)
  v_limit := 5 + coalesce(v_bonus, 0);
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

comment on function private.enforce_query_quota() is
  'Atomic quota check before query insert. Anon=1 lifetime per session_id, free=5+bonus_quota per Riyadh-time month, admin unlimited, pro unlimited only while pro_until>now. Errcode 53400 on exhaustion.';
