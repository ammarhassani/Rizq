-- Third wave: Robert Half 2026 Salary Guide, chosen to lift the specialties that were
-- deactivated in 20260729094000 back over the 3-record floor.
--
-- Methodology (free, national, no paywall): starting-salary projections built from actual
-- compensation for professionals Robert Half placed, independently validated against
-- Textkernel job-posting data, plus surveys of ~2,000 workers and ~2,200 hiring managers
-- conducted by an independent research firm in April 2025. Published 2025-09-29.
--
-- These are SALARIES, so each crosses the employment->freelance bridge before the PPP
-- conversion, exactly as the Stack Overflow rows do:
--   usd_hr    = annual / 1250 billable h x 1.25 overhead x 1.30 freelance premium
--   price_sar = usd_hr x 1.85 (World Bank PA.NUS.PPP, Saudi Arabia 2024) x PROJECT_HOURS[size]
--
-- Both endpoints of each published range are inserted: two facts from one source, which
-- is what gives the band its width. Confidence 0.50, matching the other bridged sources.
--
-- Reactivates product-management, project-management and proofreading. transcription and
-- motion-graphics stay off: no second source found for either yet.

with src(slug, usd_hourly, discipline, derivation, source_ref, captured_at) as (values
  ('proofreading',        64.025, 'Proofreader (low end, $49,250/yr)',            '$49,250/yr / 1250 h x 1.25 x 1.30',  'Robert Half 2026 Salary Guide — https://www.roberthalf.com/us/en/job-details/proofreader', timestamptz '2025-09-29'),
  ('proofreading',        89.050, 'Proofreader (high end, $68,500/yr)',           '$68,500/yr / 1250 h x 1.25 x 1.30',  'Robert Half 2026 Salary Guide — https://www.roberthalf.com/us/en/job-details/proofreader', timestamptz '2025-09-29'),
  ('data-entry',          48.425, 'Data Entry Specialist (low end, $37,250/yr)',  '$37,250/yr / 1250 h x 1.25 x 1.30',  'Robert Half 2026 Salary Guide — https://www.roberthalf.com/us/en/job-details/data-entry-specialist', timestamptz '2025-09-29'),
  ('data-entry',          53.950, 'Data Entry Specialist (high end, $41,500/yr)', '$41,500/yr / 1250 h x 1.25 x 1.30',  'Robert Half 2026 Salary Guide — https://www.roberthalf.com/us/en/job-details/data-entry-specialist', timestamptz '2025-09-29'),
  ('product-management', 120.575, 'Product Manager (low end, $92,750/yr)',        '$92,750/yr / 1250 h x 1.25 x 1.30',  'Robert Half 2026 Salary Guide — https://www.roberthalf.com/us/en/job-details/product-manager', timestamptz '2025-09-29'),
  ('product-management', 181.025, 'Product Manager (high end, $139,250/yr)',      '$139,250/yr / 1250 h x 1.25 x 1.30', 'Robert Half 2026 Salary Guide — https://www.roberthalf.com/us/en/job-details/product-manager', timestamptz '2025-09-29'),
  ('project-management',  90.350, 'Project Manager (low end, $69,500/yr)',        '$69,500/yr / 1250 h x 1.25 x 1.30',  'Robert Half 2026 Salary Guide — https://www.roberthalf.com/us/en/job-details/project-manager', timestamptz '2025-09-29'),
  ('project-management', 130.000, 'Project Manager (high end, $100,000/yr)',      '$100,000/yr / 1250 h x 1.25 x 1.30', 'Robert Half 2026 Salary Guide — https://www.roberthalf.com/us/en/job-details/project-manager', timestamptz '2025-09-29')
), sizes(project_size, hours) as (values
  ('small', 8), ('medium', 24), ('large', 60), ('enterprise', 160)
)
insert into public.benchmark_records (
  specialty_id, city_id, experience_tier_id, project_size,
  price_sar, source, provenance, confidence, captured_at,
  source_ref, collector_id, verified, verified_at, notes, active
)
select
  sp.id, null, null,
  sizes.project_size::public.project_size,
  round(src.usd_hourly * 1.85 * sizes.hours),
  'founder_added'::public.benchmark_source,
  'published_ref'::public.benchmark_provenance,
  0.50,
  src.captured_at,
  src.source_ref,
  'published_ref_v1',
  true, now(),
  'National reference, no city or seniority stated by the source. ' || src.discipline
    || ': ' || src.derivation || ' = $' || round(src.usd_hourly, 2)
    || '/hr x 1.85 (World Bank PA.NUS.PPP, Saudi Arabia 2024) x '
    || sizes.hours || ' h assumed for a ' || sizes.project_size || ' project.',
  true
from src
join public.specialties sp on sp.slug = src.slug
cross join sizes;

update public.specialties
   set active = true
 where slug in ('product-management', 'project-management', 'proofreading');
