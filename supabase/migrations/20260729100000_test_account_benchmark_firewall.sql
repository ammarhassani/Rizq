-- Firewall: a test account must never contribute a price to the pricing corpus.
--
-- The e2e harness drives the golden path to a PAID invoice, and markInvoiceStatus calls
-- contribute_benchmark on exactly that event. Until now the only thing standing between
-- the harness and the benchmark was contribute_benchmarks defaulting to false — one
-- flipped default, one seed script, or one tester ticking a future consent checkbox, and
-- fabricated prices enter the corpus as "verified freelancer submissions".
--
-- There is no way to recognise a test account after the fact: 51 of 53 users are on
-- gmail.com and `role` only ever holds free/pro/admin. So the harness declares itself
-- (e2e/fixtures/users.ts sets this at provision time) and the RPC refuses it. The default
-- is false, so a real signup is unaffected.

alter table public.users
  add column if not exists is_test_account boolean not null default false;

comment on column public.users.is_test_account is
  'Set by the e2e harness at provision time. Such a user may exercise the whole app but can never contribute to benchmark_records — see contribute_benchmark().';

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
  v_is_test boolean;
  v_id uuid;
begin
  if v_uid is null then return null; end if;
  if p_price_sar is null or p_price_sar <= 0 then return null; end if;

  select contribute_benchmarks, is_test_account
    into v_consent, v_is_test
    from public.users where id = v_uid;

  -- Test accounts are refused before consent is even considered: a harness that sets
  -- the consent flag must still be unable to write a price.
  if coalesce(v_is_test, false) then return null; end if;

  -- Opt-in gate: no consent -> silent no-op (PDPL).
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

-- Retire the single existing `submitted` row: it was contributed by an e2e test account
-- on 2026-05-14, before this guard existed. It is a fabricated price and was only ever
-- invisible because k-anonymity needs 3 distinct contributors.
update public.benchmark_records
   set active = false,
       notes = coalesce(notes || ' | ', '') || 'Deactivated 2026-07-29: contributed by an e2e test account before the firewall existed.'
 where provenance = 'submitted'
   and source_ref = 'verified freelancer submission';
