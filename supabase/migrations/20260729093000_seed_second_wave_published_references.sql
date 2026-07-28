-- Tier 2, second wave: four more cited sources, chosen to lift the specialties added in
-- 20260729090000 above the 3-record floor rather than to pad the row count.
--
-- All national, all seniority-agnostic → city_id / experience_tier_id NULL.
--
-- Sources (each verified against its own page, not a search summary):
--   Stack Overflow Developer Survey 2025 — 23,928 respondents, median ANNUAL salary by
--     role. https://survey.stackoverflow.co/2025/work/
--   ProCopywriters Survey 2024 — 298 UK freelance respondents, average DAY rate by job
--     title. https://www.procopywriters.co.uk/2024/07/how-much-do-copywriters-charge-per-day-in-2024/
--   Nonprofit.ist Consultant Cost & Compensation Survey 2025 — 300+ consultants across
--     39 US states and 7 countries. https://www.nonprofit.ist/nonprofitconsultantsurvey
--   IEEE-USA Consultants Fee Survey 2025 — regional median hourly fees.
--     https://insight.ieeeusa.org/articles/2025-ieee-usa-consultants-fee-survey-report-now-available/
--
-- Three different units arrive here, so each is normalised to a USD hourly equivalent
-- BEFORE the shared conversion. The arithmetic is written into every row's `notes`:
--
--   Salary (Stack Overflow):  usd_hr = annual / 1250 billable h × 1.25 overhead × 1.30 premium
--     — the employment→freelance bridge from collectors/openData.ts. A salaried median is
--       not a freelance rate; the overhead and premium terms are what make it one.
--   Day rate (ProCopywriters): usd_hr = (gbp_day / 0.664153) / 8
--     — 0.664153 = World Bank PA.NUS.PPP, United Kingdom 2024. GBP → international $ via
--       the UK factor, then international $ → SAR via the Saudi factor below. Two published
--       factors, no invented FX hop.
--   Hourly (consulting surveys): used as published.
--
-- Then, for every row: price_sar = usd_hr × 1.85 × PROJECT_HOURS[size]
--   1.85 = World Bank PA.NUS.PPP, Saudi Arabia 2024.
--
-- Confidence 0.50 rather than the 0.60 of a directly-published freelance rate: each of
-- these carries one extra modelling step (a salary bridge, or a currency bridge) that a
-- quoted freelance rate does not.
--
-- Stack Overflow medians are GLOBAL and nominal USD; treating them as international
-- dollars is an approximation, stated here and in each row's notes. It is the weakest
-- assumption in this migration.

with src(slug, usd_hourly, discipline, derivation, source_ref, captured_at) as (values
  -- Stack Overflow Developer Survey 2025 — median annual salary → freelance hourly
  ('cloud-devops',       134.045, 'Cloud infrastructure engineer', '$103,112.50/yr ÷ 1250 h × 1.25 × 1.30', 'Stack Overflow Developer Survey 2025 (23,928 respondents) — https://survey.stackoverflow.co/2025/work/', timestamptz '2025-07-01'),
  ('cloud-devops',       113.114, 'DevOps engineer',               '$87,011/yr ÷ 1250 h × 1.25 × 1.30',     'Stack Overflow Developer Survey 2025 (23,928 respondents) — https://survey.stackoverflow.co/2025/work/', timestamptz '2025-07-01'),
  ('data-analytics',     107.783, 'Data scientist',                '$82,910/yr ÷ 1250 h × 1.25 × 1.30',     'Stack Overflow Developer Survey 2025 (23,928 respondents) — https://survey.stackoverflow.co/2025/work/', timestamptz '2025-07-01'),
  ('data-analytics',     105.573, 'Data engineer',                 '$81,210/yr ÷ 1250 h × 1.25 × 1.30',     'Stack Overflow Developer Survey 2025 (23,928 respondents) — https://survey.stackoverflow.co/2025/work/', timestamptz '2025-07-01'),
  ('data-analytics',      81.413, 'Data or business analyst',      '$62,625/yr ÷ 1250 h × 1.25 × 1.30',     'Stack Overflow Developer Survey 2025 (23,928 respondents) — https://survey.stackoverflow.co/2025/work/', timestamptz '2025-07-01'),
  ('ai-automation',      116.256, 'AI/ML engineer',                '$89,427/yr ÷ 1250 h × 1.25 × 1.30',     'Stack Overflow Developer Survey 2025 (23,928 respondents) — https://survey.stackoverflow.co/2025/work/', timestamptz '2025-07-01'),
  ('ai-automation',       81.597, 'Developer, AI apps',            '$62,767/yr ÷ 1250 h × 1.25 × 1.30',     'Stack Overflow Developer Survey 2025 (23,928 respondents) — https://survey.stackoverflow.co/2025/work/', timestamptz '2025-07-01'),
  ('web-dev',            103.665, 'Developer, back-end',           '$79,742/yr ÷ 1250 h × 1.25 × 1.30',     'Stack Overflow Developer Survey 2025 (23,928 respondents) — https://survey.stackoverflow.co/2025/work/', timestamptz '2025-07-01'),
  ('web-dev',             94.262, 'Developer, full-stack',         '$72,509/yr ÷ 1250 h × 1.25 × 1.30',     'Stack Overflow Developer Survey 2025 (23,928 respondents) — https://survey.stackoverflow.co/2025/work/', timestamptz '2025-07-01'),
  ('web-dev',             80.620, 'Developer, front-end',          '$62,015/yr ÷ 1250 h × 1.25 × 1.30',     'Stack Overflow Developer Survey 2025 (23,928 respondents) — https://survey.stackoverflow.co/2025/work/', timestamptz '2025-07-01'),
  ('mobile-dev',          90.492, 'Developer, mobile',             '$69,609/yr ÷ 1250 h × 1.25 × 1.30',     'Stack Overflow Developer Survey 2025 (23,928 respondents) — https://survey.stackoverflow.co/2025/work/', timestamptz '2025-07-01'),
  ('ui-ux-design',        78.000, 'UX/Research Ops/UI design',     '$60,000/yr ÷ 1250 h × 1.25 × 1.30',     'Stack Overflow Developer Survey 2025 (23,928 respondents) — https://survey.stackoverflow.co/2025/work/', timestamptz '2025-07-01'),
  ('product-management', 130.000, 'Product manager',               '$100,000/yr ÷ 1250 h × 1.25 × 1.30',    'Stack Overflow Developer Survey 2025 (23,928 respondents) — https://survey.stackoverflow.co/2025/work/', timestamptz '2025-07-01'),
  ('project-management',  89.601, 'Project manager',               '$68,924/yr ÷ 1250 h × 1.25 × 1.30',     'Stack Overflow Developer Survey 2025 (23,928 respondents) — https://survey.stackoverflow.co/2025/work/', timestamptz '2025-07-01'),

  -- ProCopywriters Survey 2024 — average day rate by job title
  ('copywriting',         82.061, 'Copywriter (220 respondents)',      '£436/day ÷ 0.664153 (UK PPP 2024) ÷ 8 h', 'ProCopywriters Survey 2024 (298 freelance respondents) — https://www.procopywriters.co.uk/2024/07/how-much-do-copywriters-charge-per-day-in-2024/', timestamptz '2024-07-01'),
  ('content-writing',     75.474, 'Content writer (38 respondents)',   '£401/day ÷ 0.664153 (UK PPP 2024) ÷ 8 h', 'ProCopywriters Survey 2024 (298 freelance respondents) — https://www.procopywriters.co.uk/2024/07/how-much-do-copywriters-charge-per-day-in-2024/', timestamptz '2024-07-01'),

  -- Consulting fee surveys — published hourly, used as-is.
  -- Publication month is not stated on either; dated conservatively to the start of the
  -- year, which lowers their freshness weight rather than flattering it.
  ('business-strategy',  159.000, 'Average consultant hourly rate', 'published hourly, used as-is', 'Nonprofit.ist Consultant Cost & Compensation Survey 2025 (300+ consultants, 39 US states) — https://www.nonprofit.ist/nonprofitconsultantsurvey', timestamptz '2025-01-01'),
  ('business-strategy',  175.000, 'Median fee, West North Central', 'published hourly, used as-is', 'IEEE-USA Consultants Fee Survey 2025 — https://insight.ieeeusa.org/articles/2025-ieee-usa-consultants-fee-survey-report-now-available/', timestamptz '2025-01-01'),
  ('business-strategy',  235.000, 'Median fee, Mountain region',    'published hourly, used as-is', 'IEEE-USA Consultants Fee Survey 2025 — https://insight.ieeeusa.org/articles/2025-ieee-usa-consultants-fee-survey-report-now-available/', timestamptz '2025-01-01')
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
    || '/hr × 1.85 (World Bank PA.NUS.PPP, Saudi Arabia 2024) × '
    || sizes.hours || ' h assumed for a ' || sizes.project_size || ' project.',
  true
from src
join public.specialties sp on sp.slug = src.slug
cross join sizes;
