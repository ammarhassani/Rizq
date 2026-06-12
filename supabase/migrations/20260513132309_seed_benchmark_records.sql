-- ─────────────────────────────────────────────────────────────────────────
-- Founder-curated seed: 150 records across
-- 2 specialties (graphic-design, web-dev) × 3 cities (riyadh, jeddah, dammam)
-- × 5 tiers × 5 records each
--
-- All marked source='founder_added' + verified=true so the tool can read
-- them. Ammar replaces these with real data as it's collected; the seed
-- block can be deleted once the real dataset is ≥ this size.
--
-- City multipliers calibrated from typical Saudi-market spreads.
-- ─────────────────────────────────────────────────────────────────────────

with base_prices as (
  -- (specialty_slug, tier_slug, price_min, price_max) in SAR for Riyadh baseline
  select * from (values
    ('graphic-design', 'beginner',   80,    300),
    ('graphic-design', 'junior',    250,    700),
    ('graphic-design', 'mid',       600,   1500),
    ('graphic-design', 'senior',   1200,   3000),
    ('graphic-design', 'expert',   2800,   7500),
    ('web-dev',        'beginner',  400,   1800),
    ('web-dev',        'junior',   1500,   4500),
    ('web-dev',        'mid',      4000,  10000),
    ('web-dev',        'senior',   9000,  24000),
    ('web-dev',        'expert',  22000,  55000)
  ) as t(spec_slug, tier_slug, pmin, pmax)
),
city_multipliers as (
  select * from (values
    ('riyadh', 1.00),
    ('jeddah', 0.93),
    ('dammam', 0.87)
  ) as t(city_slug, mult)
),
matrix as (
  select
    s.id  as specialty_id,
    c.id  as city_id,
    et.id as experience_tier_id,
    bp.pmin * cm.mult as p_min,
    bp.pmax * cm.mult as p_max,
    generate_series(1, 5) as record_no
  from base_prices bp
    join public.specialties s on s.slug = bp.spec_slug
    join public.experience_tiers et on et.slug = bp.tier_slug
    join city_multipliers cm on true
    join public.cities c on c.slug = cm.city_slug
)
insert into public.benchmark_records (
  specialty_id, city_id, experience_tier_id,
  project_type, price_sar, source, verified,
  recorded_at, notes
)
select
  specialty_id, city_id, experience_tier_id,
  'standard project',
  -- Random within range, rounded to nearest 10 SAR for readability
  round((p_min + (p_max - p_min) * random()) / 10) * 10,
  'founder_added'::public.benchmark_source,
  true,
  now() - (random() * interval '180 days'),
  'sprint-3 seed; replace with real data as collected'
from matrix;

-- Cache check — should be exactly 150
do $$
declare
  n int;
begin
  select count(*) into n from public.benchmark_records;
  if n <> 150 then
    raise notice 'expected 150 seed records, got %', n;
  end if;
end $$;
