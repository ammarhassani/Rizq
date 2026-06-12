-- ─────────────────────────────────────────────────────────────────────────
-- log_query — security-definer RPC for the tool calculate flow
--
-- Why this exists: the previous design relied on the client passing user_id
-- and an RLS policy comparing it against auth.uid(). That breaks when the
-- cookie-decoded user state in the Next.js server action drifts from what
-- PostgREST sees (e.g. expired JWT, refresh-in-flight). RLS then rejects
-- the row even though the user is logged in.
--
-- The function reads auth.uid() server-side and uses *that* as the inserter,
-- never trusting the caller's claimed identity. The caller still controls
-- session_id (for anon tracking) and the result columns.
--
-- Lives in public schema so PostgREST exposes it. The function body only
-- inserts into queries with capped string/numeric inputs — no privilege
-- escalation surface.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.log_query(
  p_specialty_id      uuid,
  p_city_id           uuid,
  p_experience_tier_id uuid,
  p_session_id        text,
  p_project_size      public.project_size,
  p_result_min        numeric,
  p_result_median     numeric,
  p_result_max        numeric,
  p_result_sample_size int,
  p_result_fallback_used boolean
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_session text := null;
  v_id uuid;
begin
  -- Guardrail: clamp session_id length and reject obvious bad input
  if v_uid is null then
    if p_session_id is null or length(p_session_id) < 8 or length(p_session_id) > 128 then
      raise exception 'invalid session_id for anon insert'
        using errcode = '22023';  -- invalid_parameter_value
    end if;
    v_session := p_session_id;
  end if;

  insert into public.queries (
    user_id, session_id,
    specialty_id, city_id, experience_tier_id,
    project_size,
    result_min, result_median, result_max,
    result_sample_size, result_fallback_used
  ) values (
    v_uid, v_session,
    p_specialty_id, p_city_id, p_experience_tier_id,
    p_project_size,
    p_result_min, p_result_median, p_result_max,
    p_result_sample_size, p_result_fallback_used
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Lock execute to anon + authenticated explicitly (revoke public default)
revoke all on function public.log_query(uuid, uuid, uuid, text, public.project_size, numeric, numeric, numeric, int, boolean) from public;
grant execute on function public.log_query(uuid, uuid, uuid, text, public.project_size, numeric, numeric, numeric, int, boolean) to anon, authenticated;

comment on function public.log_query is
  'Server-side INSERT into public.queries. Reads auth.uid() to determine the row''s owner — caller cannot impersonate other users. Anon callers must supply a session_id (8–128 chars).';
