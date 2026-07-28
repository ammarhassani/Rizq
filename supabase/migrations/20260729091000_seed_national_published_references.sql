-- Tier 2 seed: two real rate reports, stored at the granularity they actually publish.
--
-- Both are national and seniority-agnostic, so city_id and experience_tier_id are NULL
-- (see 20260729090000). Neither is fanned across the city × tier grid — a single figure
-- becomes a single row per project size, and the citation counts 2 sources, not 200.
--
-- Conversion (mirrors src/lib/pricing/collectors/publishedRef.ts, unit-tested there):
--   price_sar = usd_hourly × 1.85 × PROJECT_HOURS[size]
--   1.85 = World Bank PA.NUS.PPP, Saudi Arabia 2024 (purchasing power, NOT the SAMA peg —
--          the peg would price local work at the US dollar rate, a claim about currency
--          rather than about what the work is worth here).
--   PROJECT_HOURS = small 8 · medium 24 · large 60 · enterprise 160 (stated assumption,
--          shared by every collector, to be replaced by a regression on real paid data).
--
-- Sources, both free and dated:
--   YunoJuno 2026 Contractor & Freelancer Rates Report — 182,000 booking data points
--     across 2024–2025, 12 disciplines. https://www.yunojuno.com/freelancer-rates-report
--   Editorial Freelancers Association 2026 rate chart — 1,100+ members surveyed
--     Nov 2025–Jan 2026 on rates charged during 2025. https://www.the-efa.org/rates/
--
-- Where a source publishes a RANGE, both endpoints are inserted: two facts from one
-- source, which is what the band should be built from. Where it publishes a single
-- average, one row goes in. `photography` and `data-entry` get nothing — no credible
-- source prices them, and an honest gap beats a manufactured number.

with src(slug, usd_hourly, discipline, source_ref, captured_at) as (values
  -- YunoJuno 2026 — average rates by discipline (USD hourly)
  ('web-dev',            88.0, 'Software Engineering',        'YunoJuno 2026 Contractor & Freelancer Rates Report — https://www.yunojuno.com/freelancer-rates-report', timestamptz '2026-01-15'),
  ('mobile-dev',         88.0, 'Software Engineering',        'YunoJuno 2026 Contractor & Freelancer Rates Report — https://www.yunojuno.com/freelancer-rates-report', timestamptz '2026-01-15'),
  ('cloud-devops',       93.0, 'Cloud & Infrastructure',      'YunoJuno 2026 Contractor & Freelancer Rates Report — https://www.yunojuno.com/freelancer-rates-report', timestamptz '2026-01-15'),
  ('data-analytics',     83.0, 'Data & Analytics',            'YunoJuno 2026 Contractor & Freelancer Rates Report — https://www.yunojuno.com/freelancer-rates-report', timestamptz '2026-01-15'),
  ('ai-automation',      78.0, 'AI & Automation',             'YunoJuno 2026 Contractor & Freelancer Rates Report — https://www.yunojuno.com/freelancer-rates-report', timestamptz '2026-01-15'),
  ('product-management', 86.0, 'Product Management',          'YunoJuno 2026 Contractor & Freelancer Rates Report — https://www.yunojuno.com/freelancer-rates-report', timestamptz '2026-01-15'),
  ('project-management', 67.0, 'Project Management',          'YunoJuno 2026 Contractor & Freelancer Rates Report — https://www.yunojuno.com/freelancer-rates-report', timestamptz '2026-01-15'),
  ('business-strategy',  85.0, 'Strategy',                    'YunoJuno 2026 Contractor & Freelancer Rates Report — https://www.yunojuno.com/freelancer-rates-report', timestamptz '2026-01-15'),
  ('ui-ux-design',       75.0, 'UX',                          'YunoJuno 2026 Contractor & Freelancer Rates Report — https://www.yunojuno.com/freelancer-rates-report', timestamptz '2026-01-15'),
  ('graphic-design',     63.0, 'Designers',                   'YunoJuno 2026 Contractor & Freelancer Rates Report — https://www.yunojuno.com/freelancer-rates-report', timestamptz '2026-01-15'),
  ('logo-design',        63.0, 'Designers',                   'YunoJuno 2026 Contractor & Freelancer Rates Report — https://www.yunojuno.com/freelancer-rates-report', timestamptz '2026-01-15'),
  ('digital-marketing',  69.0, 'Marketing & Communications',  'YunoJuno 2026 Contractor & Freelancer Rates Report — https://www.yunojuno.com/freelancer-rates-report', timestamptz '2026-01-15'),
  ('video-editing',      69.0, 'Creatives',                   'YunoJuno 2026 Contractor & Freelancer Rates Report — https://www.yunojuno.com/freelancer-rates-report', timestamptz '2026-01-15'),
  ('motion-graphics',    69.0, 'Creatives',                   'YunoJuno 2026 Contractor & Freelancer Rates Report — https://www.yunojuno.com/freelancer-rates-report', timestamptz '2026-01-15'),

  -- EFA 2026 rate chart — both endpoints of each published range
  ('content-writing',    75.0, 'Ghostwriting, articles/essays (low end)',  'Editorial Freelancers Association 2026 rate chart (1,100+ respondents, 2025 rates) — https://www.the-efa.org/rates/', timestamptz '2026-02-01'),
  ('content-writing',   100.0, 'Ghostwriting, articles/essays (high end)', 'Editorial Freelancers Association 2026 rate chart (1,100+ respondents, 2025 rates) — https://www.the-efa.org/rates/', timestamptz '2026-02-01'),
  ('copywriting',        75.0, 'Ghostwriting, articles/essays (low end)',  'Editorial Freelancers Association 2026 rate chart (1,100+ respondents, 2025 rates) — https://www.the-efa.org/rates/', timestamptz '2026-02-01'),
  ('copywriting',       100.0, 'Ghostwriting, articles/essays (high end)', 'Editorial Freelancers Association 2026 rate chart (1,100+ respondents, 2025 rates) — https://www.the-efa.org/rates/', timestamptz '2026-02-01'),
  ('proofreading',       40.0, 'Proofreading, nonfiction (low end)',       'Editorial Freelancers Association 2026 rate chart (1,100+ respondents, 2025 rates) — https://www.the-efa.org/rates/', timestamptz '2026-02-01'),
  ('proofreading',       55.0, 'Proofreading, nonfiction (high end)',      'Editorial Freelancers Association 2026 rate chart (1,100+ respondents, 2025 rates) — https://www.the-efa.org/rates/', timestamptz '2026-02-01'),
  ('translation',        47.5, 'Translation, to English (low end)',        'Editorial Freelancers Association 2026 rate chart (1,100+ respondents, 2025 rates) — https://www.the-efa.org/rates/', timestamptz '2026-02-01'),
  ('translation',        75.0, 'Translation, from English (high end)',     'Editorial Freelancers Association 2026 rate chart (1,100+ respondents, 2025 rates) — https://www.the-efa.org/rates/', timestamptz '2026-02-01'),
  ('transcription',      52.5, 'Transcription (low end)',                  'Editorial Freelancers Association 2026 rate chart (1,100+ respondents, 2025 rates) — https://www.the-efa.org/rates/', timestamptz '2026-02-01'),
  ('transcription',      57.5, 'Transcription (high end)',                 'Editorial Freelancers Association 2026 rate chart (1,100+ respondents, 2025 rates) — https://www.the-efa.org/rates/', timestamptz '2026-02-01')
), sizes(project_size, hours) as (values
  ('small', 8), ('medium', 24), ('large', 60), ('enterprise', 160)
)
insert into public.benchmark_records (
  specialty_id, city_id, experience_tier_id, project_size,
  price_sar, source, provenance, confidence, captured_at,
  source_ref, collector_id, verified, verified_at, notes, active
)
select
  sp.id,
  null,
  null,
  sizes.project_size::public.project_size,
  round(src.usd_hourly * 1.85 * sizes.hours),
  'founder_added'::public.benchmark_source,   -- legacy column; provenance is authoritative
  'published_ref'::public.benchmark_provenance,
  0.60,
  src.captured_at,
  src.source_ref,
  'published_ref_v1',
  true,
  now(),
  'National reference, no city or seniority stated by the source. '
    || src.discipline || ': $' || src.usd_hourly || '/hr × 1.85 (World Bank PA.NUS.PPP, Saudi Arabia 2024) × '
    || sizes.hours || ' h assumed for a ' || sizes.project_size || ' project.',
  true
from src
join public.specialties sp on sp.slug = src.slug
cross join sizes;
