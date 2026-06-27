-- Tier 3 data flywheel (docs/data-strategy.md): consented, anonymized freelancer
-- price submissions feed the benchmark engine. PDPL: opt-in only; aggregate-only;
-- k-anonymity enforced at read (resolvePrice). A paid invoice = ground truth (verified).

-- Opt-in consent (default OFF per PDPL).
alter table public.users add column if not exists contribute_benchmarks boolean not null default false;

-- SECURITY DEFINER so the app needs no service-role key (mirrors run_ingestion),
-- but records source_user_id for k-anonymity — which run_ingestion does not.
create or replace function public.contribute_benchmark(
  p_specialty_id uuid,
  p_city_id uuid,
  p_experience_tier_id uuid,
  p_price_sar numeric,
  p_project_size public.project_size,
  p_source_ref text,
  p_confidence numeric default 0.7
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_consent boolean;
  v_id uuid;
begin
  if v_uid is null then return null; end if;
  if p_price_sar is null or p_price_sar <= 0 then return null; end if;

  -- Opt-in gate: no consent → silent no-op (PDPL).
  select contribute_benchmarks into v_consent from public.users where id = v_uid;
  if not coalesce(v_consent, false) then return null; end if;

  insert into public.benchmark_records (
    specialty_id, city_id, experience_tier_id, project_size,
    price_sar, source, provenance, confidence, captured_at,
    source_ref, source_user_id, collector_id, verified, verified_at, active
  ) values (
    p_specialty_id, p_city_id, p_experience_tier_id, p_project_size,
    p_price_sar, 'user_submitted'::public.benchmark_source, 'submitted'::public.benchmark_provenance,
    least(greatest(coalesce(p_confidence, 0.7), 0), 1), now(),
    p_source_ref, v_uid, 'flywheel_v1', true, now(), true
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.contribute_benchmark(uuid, uuid, uuid, numeric, public.project_size, text, numeric) from public;
grant execute on function public.contribute_benchmark(uuid, uuid, uuid, numeric, public.project_size, text, numeric) to authenticated;
