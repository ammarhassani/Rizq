-- ─────────────────────────────────────────────────────────────────────────
-- Phase 6.11 — PDPL right-to-erasure. A signed-in user can delete THEIR OWN
-- account. Deleting auth.users cascades to public.users (FK on delete cascade)
-- and onward to all owned rows. SECURITY DEFINER (owned by the migration admin
-- role) so it can remove the auth row; strictly scoped to auth.uid().
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  -- Defensive: clear the two non-cascade self-references in proposal_versions
  -- (changed_by) for this user so the cascade isn't blocked.
  update public.proposal_versions set changed_by = user_id
    where changed_by = v_uid and user_id <> v_uid;
  -- Delete the auth user → cascades public.users + all owned data.
  delete from auth.users where id = v_uid;
end $$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
comment on function public.delete_my_account() is
  'PDPL right-to-erasure: deletes the calling user''s auth account, cascading all owned data. Scoped to auth.uid().';
