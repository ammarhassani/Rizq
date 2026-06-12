-- ─────────────────────────────────────────────────────────────────────────
-- Expanded seed: cover all 12 specialties so the tool returns a real result
-- for every realistic selection. Records distributed 6 per (specialty × tier)
-- across riyadh/jeddah/dammam (random) so specialty-level fallback (which
-- ignores city) always clears MIN_SAMPLE=5.
--
-- Replaces the prior 150-record seed. Total: 12 × 5 × 6 = 360 records.
-- ─────────────────────────────────────────────────────────────────────────

-- Clear out the prior founder_added seed
delete from public.benchmark_records where source = 'founder_added';

-- Per-(specialty, tier) min/max in SAR for riyadh baseline.
-- Calibrated from typical Saudi market ranges across Mostaql/Khamsat-style work.
with base_prices as (
  select * from (values
    -- design
    ('graphic-design',     'beginner',   80,    300),
    ('graphic-design',     'junior',    250,    700),
    ('graphic-design',     'mid',       600,   1500),
    ('graphic-design',     'senior',   1200,   3000),
    ('graphic-design',     'expert',   2800,   7500),
    ('logo-design',        'beginner',  120,    400),
    ('logo-design',        'junior',    350,    900),
    ('logo-design',        'mid',       800,   2000),
    ('logo-design',        'senior',   1800,   4500),
    ('logo-design',        'expert',   4000,  10000),
    ('ui-ux-design',       'beginner',  300,    900),
    ('ui-ux-design',       'junior',    800,   2200),
    ('ui-ux-design',       'mid',      2000,   5000),
    ('ui-ux-design',       'senior',   4500,  11000),
    ('ui-ux-design',       'expert',  10000,  28000),
    -- development
    ('web-dev',            'beginner',  400,   1800),
    ('web-dev',            'junior',   1500,   4500),
    ('web-dev',            'mid',      4000,  10000),
    ('web-dev',            'senior',   9000,  24000),
    ('web-dev',            'expert',  22000,  55000),
    ('mobile-dev',         'beginner',  700,   2500),
    ('mobile-dev',         'junior',   2500,   6500),
    ('mobile-dev',         'mid',      6000,  14000),
    ('mobile-dev',         'senior',  13000,  32000),
    ('mobile-dev',         'expert',  30000,  75000),
    -- writing
    ('content-writing',    'beginner',   50,    200),
    ('content-writing',    'junior',    150,    500),
    ('content-writing',    'mid',       400,   1200),
    ('content-writing',    'senior',   1000,   3000),
    ('content-writing',    'expert',   2500,   7000),
    ('translation',        'beginner',   40,    150),
    ('translation',        'junior',    120,    400),
    ('translation',        'mid',       300,    900),
    ('translation',        'senior',    750,   2000),
    ('translation',        'expert',   1800,   5000),
    -- marketing
    ('digital-marketing',  'beginner',  500,   1500),
    ('digital-marketing',  'junior',   1400,   4000),
    ('digital-marketing',  'mid',      3500,   9000),
    ('digital-marketing',  'senior',   8000,  20000),
    ('digital-marketing',  'expert',  18000,  50000),
    -- media
    ('video-editing',      'beginner',  200,    600),
    ('video-editing',      'junior',    500,   1500),
    ('video-editing',      'mid',      1300,   3500),
    ('video-editing',      'senior',   3000,   8000),
    ('video-editing',      'expert',   7000,  18000),
    ('photography',        'beginner',  150,    500),
    ('photography',        'junior',    400,   1200),
    ('photography',        'mid',      1000,   2800),
    ('photography',        'senior',   2400,   6000),
    ('photography',        'expert',   5500,  14000),
    ('voice-over',         'beginner',  100,    400),
    ('voice-over',         'junior',    300,    900),
    ('voice-over',         'mid',       750,   2000),
    ('voice-over',         'senior',   1700,   4500),
    ('voice-over',         'expert',   4000,  10000),
    -- other
    ('data-entry',         'beginner',   30,    120),
    ('data-entry',         'junior',     80,    280),
    ('data-entry',         'mid',       220,    700),
    ('data-entry',         'senior',    600,   1700),
    ('data-entry',         'expert',   1400,   4000)
  ) as t(spec_slug, tier_slug, pmin, pmax)
),
seed_cities as (
  select id, slug,
    case slug
      when 'riyadh' then 1.00
      when 'jeddah' then 0.93
      when 'dammam' then 0.87
    end as mult
  from public.cities
  where slug in ('riyadh', 'jeddah', 'dammam')
),
project_sizes as (
  select * from (values
    -- size, weight (out of 6 records per specialty+tier)
    ('small',      2),
    ('medium',     2),
    ('large',      1),
    ('enterprise', 1)
  ) as t(size, n)
),
size_runs as (
  -- expand each size to its repeat count, then number them 1..6
  select
    bp.spec_slug, bp.tier_slug, bp.pmin, bp.pmax,
    ps.size, gs.idx,
    row_number() over (partition by bp.spec_slug, bp.tier_slug order by ps.size, gs.idx) as record_no
  from base_prices bp
    cross join project_sizes ps
    cross join lateral generate_series(1, ps.n) as gs(idx)
),
priced as (
  select
    sr.*,
    -- random pick of a city for each record (uniform across 3)
    (array(select slug from seed_cities order by random()))[1 + (sr.record_no - 1) % 3] as picked_city
  from size_runs sr
),
final as (
  select
    s.id  as specialty_id,
    sc.id as city_id,
    et.id as experience_tier_id,
    p.size::public.project_size as size,
    -- price within range, scaled by city, rounded to nearest 10 SAR
    round((p.pmin + (p.pmax - p.pmin) * random()) * sc.mult / 10) * 10 as price
  from priced p
    join public.specialties s on s.slug = p.spec_slug
    join public.experience_tiers et on et.slug = p.tier_slug
    join seed_cities sc on sc.slug = p.picked_city
)
insert into public.benchmark_records (
  specialty_id, city_id, experience_tier_id,
  project_type, project_size, price_sar,
  source, verified, recorded_at, notes
)
select
  specialty_id, city_id, experience_tier_id,
  'standard project', size, price,
  'founder_added'::public.benchmark_source,
  true,
  now() - (random() * interval '180 days'),
  'sprint-3 expanded seed (12 specialties)'
from final;

-- Sanity check
do $$
declare n int; specs int;
begin
  select count(*) into n from public.benchmark_records where source = 'founder_added';
  select count(distinct specialty_id) into specs from public.benchmark_records where source = 'founder_added';
  raise notice 'seed records: %, specialties covered: %', n, specs;
end $$;
