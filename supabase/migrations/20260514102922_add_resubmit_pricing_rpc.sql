-- Sprint 5 follow-up: let users update a 'needs_info' submission and
-- flip it back to 'pending' for re-review. Mirrors submit_pricing() but
-- targets an existing row owned by the caller.
--
-- The RPC keeps the prior moderator_notes intact (so admin sees the
-- thread of what they asked for) and clears reviewed_at/reviewed_by so
-- the row looks fresh in the pending queue.

create or replace function public.resubmit_pricing(
  p_submission_id      uuid,
  p_specialty_id       uuid,
  p_city_id            uuid,
  p_experience_tier_id uuid,
  p_project_type       text,
  p_project_size       public.project_size,
  p_price_sar          numeric,
  p_project_duration_days int,
  p_client_type        public.client_type,
  p_notes              text,
  p_proof_url          text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_existing record;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  -- Caller must own the submission AND it must be in needs_info.
  select id, user_id, status
    into v_existing
  from public.pricing_submissions
  where id = p_submission_id;

  if v_existing.id is null then
    raise exception 'submission not found' using errcode = 'P0002';
  end if;

  if v_existing.user_id <> v_uid then
    raise exception 'not owner' using errcode = '42501';
  end if;

  if v_existing.status <> 'needs_info' then
    raise exception 'submission not in needs_info state' using errcode = '22023';
  end if;

  update public.pricing_submissions
  set
    specialty_id        = p_specialty_id,
    city_id             = p_city_id,
    experience_tier_id  = p_experience_tier_id,
    project_type        = nullif(trim(p_project_type), ''),
    project_size        = p_project_size,
    price_sar           = p_price_sar,
    project_duration_days = p_project_duration_days,
    client_type         = p_client_type,
    notes               = nullif(trim(p_notes), ''),
    proof_url           = nullif(trim(p_proof_url), ''),
    status              = 'pending',
    submitted_at        = now(),
    -- Keep moderator_notes intact so the admin sees what they asked for;
    -- they can clear it on next approval if they want.
    reviewed_at         = null,
    reviewed_by         = null
  where id = p_submission_id;

  return p_submission_id;
end $$;

revoke all on function public.resubmit_pricing(uuid, uuid, uuid, uuid, text, public.project_size, numeric, int, public.client_type, text, text) from public, anon;
grant execute on function public.resubmit_pricing(uuid, uuid, uuid, uuid, text, public.project_size, numeric, int, public.client_type, text, text) to authenticated;

comment on function public.resubmit_pricing is
  'Owner-only update of a needs_info submission. Flips status back to pending. Caller cannot impersonate other users; auth.uid() is authoritative.';
