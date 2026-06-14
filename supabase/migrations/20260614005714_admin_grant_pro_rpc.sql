-- ─────────────────────────────────────────────────────────────────────────
-- Phase 6.6 fix — admin-only Pro grant. users.role/pro_until are REVOKED from
-- the authenticated role (column grants), so an admin acting via the cookie
-- client cannot update them directly. This SECURITY DEFINER RPC verifies the
-- caller is an admin (auth.uid() role='admin') then sets role='pro' + extends
-- pro_until. The manual go-live path until Tap Payments is wired.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.admin_grant_pro(p_user_id uuid, p_months int)
returns timestamptz
language plpgsql security definer set search_path='' as $$
declare v_caller_role public.user_role; v_base timestamptz; v_new timestamptz; v_exists boolean;
begin
  select role into v_caller_role from public.users where id = auth.uid();
  if v_caller_role is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_months is null or p_months <= 0 or p_months > 120 then
    raise exception 'invalid months' using errcode = '22023';
  end if;
  select true, greatest(coalesce(pro_until, now()), now())
    into v_exists, v_base
    from public.users where id = p_user_id;
  if v_exists is null then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  v_new := v_base + make_interval(months => p_months);
  update public.users set role = 'pro', pro_until = v_new where id = p_user_id;
  return v_new;
end $$;
revoke all on function public.admin_grant_pro(uuid, int) from public;
grant execute on function public.admin_grant_pro(uuid, int) to authenticated;
comment on function public.admin_grant_pro(uuid, int) is
  'Admin-only Pro grant. Verifies caller role=admin, sets target role=pro + extends pro_until by N months. Manual go-live path until Tap.';
