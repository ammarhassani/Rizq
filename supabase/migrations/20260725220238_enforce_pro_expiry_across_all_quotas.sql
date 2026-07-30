-- Feature 010 / US2: a Pro grant that has lapsed must stop granting Pro limits.
--
-- Every quota trigger returned early on `role = 'pro'` without ever reading `pro_until`, so a
-- grant that expired in March still bought unlimited proposals in July. The app-side helper
-- (`isPro` in lib/upgrade.ts) was fixed to check expiry; the DB triggers are the actual
-- enforcement point and were not, which meant the paywall was advisory.
--
-- Two rules, applied to all five triggers:
--   1. Pro limits apply only while `pro_until > now()`. Otherwise the free limit applies.
--   2. For the monthly quotas, a lapsed Pro counts from max(month_start, pro_until) — usage
--      accrued while legitimately unlimited must not retroactively exhaust the free allowance.
--      This mirrors 20260724143050 for the query quota and lib/pricing/quota.ts in the app.
--
-- NOTE: this migration was applied to the project on 2026-07-25 but its file was never written.
-- Recovered verbatim from supabase_migrations.schema_migrations on 2026-07-31 — a rebuild from
-- this directory alone would otherwise have restored the unenforced triggers. The document and
-- client quotas are lifetime counts, so rule 2 does not apply to them.

create or replace function private.enforce_proposal_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_pro_until timestamptz;
  v_used int;
  v_month_start timestamptz;
  v_count_from timestamptz;
begin
  select role, pro_until into v_role, v_pro_until
    from public.users where id = new.user_id;

  if v_role = 'admin' then return new; end if;
  if v_role = 'pro' and v_pro_until is not null and v_pro_until > now() then
    return new;
  end if;

  v_month_start := date_trunc('month', now() at time zone 'Asia/Riyadh');
  v_count_from := v_month_start;
  if v_pro_until is not null and v_pro_until > v_month_start then
    v_count_from := v_pro_until;
  end if;

  select count(*) into v_used from public.proposals
    where user_id = new.user_id and created_at >= v_count_from;

  if v_used >= 2 then
    raise exception 'free proposal quota exhausted' using errcode = '53400';
  end if;
  return new;
end $$;

create or replace function private.enforce_invoice_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_pro_until timestamptz;
  v_used int;
  v_limit int;
  v_month_start timestamptz;
  v_count_from timestamptz;
begin
  select role, pro_until into v_role, v_pro_until
    from public.users where id = new.user_id;

  if v_role = 'admin' then return new; end if;

  v_limit := case
    when v_role = 'pro' and v_pro_until is not null and v_pro_until > now() then 30
    else 3
  end;

  v_month_start := date_trunc('month', now() at time zone 'Asia/Riyadh');
  v_count_from := v_month_start;
  if v_limit = 3 and v_pro_until is not null and v_pro_until > v_month_start then
    v_count_from := v_pro_until;
  end if;

  select count(*) into v_used from public.invoices
    where user_id = new.user_id and created_at >= v_count_from;

  if v_used >= v_limit then
    raise exception 'invoice quota exhausted' using errcode = '53400';
  end if;
  return new;
end $$;

create or replace function private.enforce_document_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_pro_until timestamptz;
  v_used int;
  v_limit int;
begin
  select role, pro_until into v_role, v_pro_until
    from public.users where id = new.user_id;

  if v_role = 'admin' then return new; end if;

  v_limit := case
    when v_role = 'pro' and v_pro_until is not null and v_pro_until > now() then 50
    else 10
  end;

  select count(*) into v_used from public.documents
    where user_id = new.user_id and deleted_at is null;

  if v_used >= v_limit then
    raise exception 'document quota exhausted' using errcode = '53400';
  end if;
  return new;
end $$;

create or replace function private.enforce_client_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_pro_until timestamptz;
  v_used int;
begin
  select role, pro_until into v_role, v_pro_until
    from public.users where id = new.user_id;

  if v_role = 'admin' then return new; end if;
  if v_role = 'pro' and v_pro_until is not null and v_pro_until > now() then
    return new;
  end if;

  select count(*) into v_used from public.clients where user_id = new.user_id;
  if v_used >= 10 then
    raise exception 'free client quota exhausted' using errcode = '53400';
  end if;
  return new;
end $$;

create or replace function private.enforce_gig_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_pro_until timestamptz;
  v_used int;
  v_month_start timestamptz;
  v_count_from timestamptz;
begin
  select role, pro_until into v_role, v_pro_until
    from public.users where id = new.user_id;

  if v_role = 'admin' then return new; end if;
  if v_role = 'pro' and v_pro_until is not null and v_pro_until > now() then
    return new;
  end if;

  v_month_start := date_trunc('month', now() at time zone 'Asia/Riyadh');
  v_count_from := v_month_start;
  if v_pro_until is not null and v_pro_until > v_month_start then
    v_count_from := v_pro_until;
  end if;

  select count(*) into v_used from public.gigs
    where user_id = new.user_id and created_at >= v_count_from;

  if v_used >= 20 then
    raise exception 'free gig quota exhausted' using errcode = '53400';
  end if;
  return new;
end $$;

comment on function private.enforce_proposal_quota() is
  'Free 2 proposals/month. Pro unlimited only while pro_until is future; counts from max(month_start, pro_until).';
comment on function private.enforce_invoice_quota() is
  'Free 3 invoices/month, active Pro 30. Lapsed Pro counts from max(month_start, pro_until).';
comment on function private.enforce_document_quota() is
  'Free 10 documents total, active Pro 50. Lapsed/null role falls back to free.';
comment on function private.enforce_client_quota() is
  'Free 10 clients total. Pro unlimited only while pro_until is future.';
comment on function private.enforce_gig_quota() is
  'Free 20 gigs/month. Pro unlimited only while pro_until is future; counts from max(month_start, pro_until).';
