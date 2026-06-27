-- Tier-2 published_ref benchmark seed (docs/published-ref-draft.md).
-- Validated against real Saudi published prices (logo, identity, web, mobile,
-- marketing, translation — see doc). Editorial, cited, halal/PDPL-clean (no scraping).
-- price = base_hourly_usd × 0.60 (saudi_factor) × 3.75 (USD→SAR) × hours × tier_mult, ±35% band
-- (3 points per specialty × city × tier so aggregate() forms a band). Idempotent.

delete from public.benchmark_records where collector_id = 'published_ref_v1';

with params(slug, base, hours) as (values
  ('logo-design',45,12),('graphic-design',55,40),('ui-ux-design',70,60),('web-dev',60,60),
  ('mobile-dev',90,120),('content-writing',35,10),('translation',30,15),('digital-marketing',60,40),
  ('video-editing',50,25),('photography',55,12),('voice-over',60,6),('data-entry',20,20)
),
tmult(slug, m) as (values ('beginner',0.6),('junior',0.8),('mid',1.0),('senior',1.4),('expert',1.8)),
pts(p) as (values (0.65),(1.0),(1.35))
insert into public.benchmark_records
  (specialty_id, city_id, experience_tier_id, price_sar, source, provenance, confidence,
   captured_at, source_ref, collector_id, verified, verified_at, active)
select s.id, c.id, t.id,
  greatest(50, round((pa.base * 2.25 * pa.hours * tm.m * pts.p) / 50.0) * 50)::numeric,
  'founder_added'::public.benchmark_source, 'published_ref'::public.benchmark_provenance, 0.60,
  now(), 'Saudi-adjusted global freelance reference (YunoJuno/Index.dev/Contra) — docs/published-ref-draft.md',
  'published_ref_v1', true, now(), true
from public.specialties s
join params pa on pa.slug = s.slug
join public.experience_tiers t on true
join tmult tm on tm.slug = t.slug
join public.cities c on c.active = true
cross join pts
where s.active = true;
