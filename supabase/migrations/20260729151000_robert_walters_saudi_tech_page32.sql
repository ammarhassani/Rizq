-- Second Saudi table from the same survey (Technology & Digital, individual contributors).
-- Same verification: 19 titles, 19 ranges, reading-order paired, every average the midpoint of
-- its range. Leadership titles (Head of / Director) are skipped - salaried leadership is not
-- work a freelancer is engaged for.
--
-- These add no sample credit: the sample is counted once per SOURCE, so more roles from the
-- same 100,000-role survey widen the price evidence without pretending to be more observations.

with src(slug, sar_hourly, discipline) as (values
  ('project-management', 624.0,  'Project Manager (low band, SAR 40,000/month)'),
  ('project-management', 780.0,  'Project Manager (high band, SAR 50,000/month)'),
  ('project-management', 624.0,  'Programme Manager (low band, SAR 40,000/month)'),
  ('project-management', 780.0,  'Programme Manager (high band, SAR 50,000/month)'),
  ('data-analytics',     546.0,  'Data Scientist (low band, SAR 35,000/month)'),
  ('data-analytics',     780.0,  'Data Scientist (high band, SAR 50,000/month)'),
  ('data-analytics',     468.0,  'Business Analyst (low band, SAR 30,000/month)'),
  ('data-analytics',     624.0,  'Business Analyst (high band, SAR 40,000/month)'),
  ('product-management', 468.0,  'Product Manager (low band, SAR 30,000/month)'),
  ('product-management', 702.0,  'Product Manager (high band, SAR 45,000/month)'),
  ('product-management', 546.0,  'Product Lead (low band, SAR 35,000/month)'),
  ('product-management', 702.0,  'Product Lead (high band, SAR 45,000/month)'),
  ('web-dev',            468.0,  'Senior Software Engineer (low band, SAR 30,000/month)'),
  ('web-dev',            546.0,  'Senior Software Engineer (high band, SAR 35,000/month)'),
  ('ui-ux-design',       468.0,  'Product Design Lead (low band, SAR 30,000/month)'),
  ('ui-ux-design',       624.0,  'Product Design Lead (high band, SAR 40,000/month)')
), sizes(project_size, hours) as (values ('small',8),('medium',24),('large',60),('enterprise',160))
insert into public.benchmark_records (
  specialty_id, city_id, experience_tier_id, project_size, price_sar, source, provenance,
  confidence, published_sample, captured_at, source_ref, collector_id, verified, verified_at, notes, active)
select sp.id, null, null, sizes.project_size::public.project_size,
  round(src.sar_hourly * sizes.hours),
  'founder_added'::public.benchmark_source, 'published_ref'::public.benchmark_provenance,
  0.90, 100000, timestamptz '2025-12-15',
  'Robert Walters Middle East Salary Survey 2026 (100,000+ roles analysed) — https://www.robertwalters.ae/our-services/saudi-arabia-salary-survey.html',
  'published_ref_v1', true, now(),
  'Saudi-advertised salary, already in SAR — no PPP conversion applied. ' || src.discipline
    || ': x 12 / 1250 h x 1.25 overhead x 1.30 freelance premium = ' || round(src.sar_hourly, 2)
    || ' SAR/hr x ' || sizes.hours || ' h assumed for a ' || sizes.project_size || ' project.',
  true
from src
join public.specialties sp on sp.slug = src.slug
cross join sizes;
