-- run_ingestion must carry published_sample through, or every future ingest silently lands
-- as "unstated" and the derivation in the collectors is thrown away at the database boundary
-- — the same discard feature 012 exists to stop, one layer down.
create or replace function public.run_ingestion(
  p_collector_id text,
  p_source_desc  text,
  p_rows         jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run_id uuid;
  v_kept   int := 0;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.collector_registry where id = p_collector_id) then
    raise exception 'unknown collector %', p_collector_id using errcode = '22023';
  end if;

  insert into public.ingestion_runs (collector_id, source_desc, rows_in, status)
  values (p_collector_id, p_source_desc, jsonb_array_length(coalesce(p_rows, '[]'::jsonb)), 'running')
  returning id into v_run_id;

  insert into public.benchmark_records (
    specialty_id, city_id, experience_tier_id, project_size,
    price_sar, source, provenance, confidence, captured_at,
    source_ref, collector_id, verified, verified_at, notes, active,
    published_sample
  )
  select
    (r ->> 'specialty_id')::uuid,
    (r ->> 'city_id')::uuid,
    (r ->> 'experience_tier_id')::uuid,
    nullif(r ->> 'project_size', '')::public.project_size,
    (r ->> 'price_sar')::numeric,
    'founder_added'::public.benchmark_source,  -- legacy column; provenance is authoritative
    (r ->> 'provenance')::public.benchmark_provenance,
    (r ->> 'confidence')::numeric,
    coalesce((r ->> 'captured_at')::timestamptz, now()),
    r ->> 'source_ref',
    p_collector_id,
    true, now(),
    r ->> 'notes',
    true,
    -- Absent or null -> NULL, which reads as "publisher stated no sample": the safe default.
    nullif(r ->> 'published_sample', '')::integer
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) as r
  where (r ->> 'price_sar')::numeric > 0;

  get diagnostics v_kept = row_count;

  update public.ingestion_runs
    set status = 'completed', finished_at = now(), rows_kept = v_kept
    where id = v_run_id;

  return v_run_id;
exception when others then
  update public.ingestion_runs
    set status = 'failed', finished_at = now(), error = sqlerrm
    where id = v_run_id;
  raise;
end;
$$;

revoke all on function public.run_ingestion(text, text, jsonb) from public;
revoke execute on function public.run_ingestion(text, text, jsonb) from anon;
grant execute on function public.run_ingestion(text, text, jsonb) to authenticated;
