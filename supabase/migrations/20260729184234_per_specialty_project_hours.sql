-- Per-specialty hours, replacing one flat assumption applied to twenty different crafts.
--
-- Until now every price in the product ran through 8 / 24 / 60 / 160 hours regardless of what
-- the work was. A logo and a bilingual web build were assumed to take the same time. That is not
-- a close-enough approximation; it is the single largest distortion in the engine, because hours
-- multiply every figure.
--
-- WHAT THIS IS: a reasoned estimate of craft effort, recorded as `reasoned` with n = 0 - the
-- lowest standing the provenance ladder has. A better assumption replacing a worse one, not a
-- measurement, and labelled so on every row it touches. The moment five freelancers state or
-- record real hours for a (specialty, size), resolveHours prefers theirs and this is overridden
-- without anyone editing code.
--
-- WHAT THIS IS NOT: generated prices. Hours are a scope question with a defensible craft answer
-- and a bounded range. Prices are the quantity the whole engine exists to estimate, and
-- inventing them would put fabricated evidence into the corpus wearing a source's clothes.
--
-- MEASURED EFFECT: 492 hours-derived rows recomputed. Writing fell hardest (content-writing
-- medium 4,153 -> 1,730 SAR), development rose (mobile-dev 4,004 -> 8,341). Average cross-family
-- disagreement fell from 3.4x to 2.75x, and the content-writing conflict - the 4x contradiction
-- that motivated the whole estimator rebuild - narrowed to 2.8x. A meaningful part of that
-- "regime conflict" was never a disagreement between sources at all. It was one flat hours
-- assumption inflating every writing price by roughly 2.4x.

with hours(slug, small, medium, large, enterprise) as (values
  -- Design and creative: concept work is front-loaded, revisions dominate the larger sizes.
  ('logo-design',         6,  16,  40, 100),
  ('graphic-design',      5,  14,  35,  90),
  ('ui-ux-design',       10,  30,  80, 200),
  ('video-editing',       6,  20,  55, 150),
  ('photography',         5,  14,  35,  90),   -- shoot plus selection and retouching
  ('voice-over',          2,   6,  16,  40),   -- studio time is short; usage rights drive price
  -- Development: the only work where a "small" job still carries setup and deployment overhead.
  ('web-dev',            12,  40, 100, 280),
  ('mobile-dev',         16,  50, 130, 350),   -- two platforms, store review, device testing
  ('data-analytics',      8,  25,  70, 180),
  ('cloud-devops',        8,  24,  65, 170),
  ('ai-automation',      10,  30,  80, 200),
  -- Writing: fast per deliverable, and the old flat 24h for a medium job was roughly 2.4x out.
  ('content-writing',     3,  10,  28,  70),
  ('copywriting',         4,  12,  30,  75),
  ('translation',         3,   9,  25,  65),
  ('proofreading',        2,   6,  18,  45),
  -- Business and support.
  ('digital-marketing',   6,  20,  55, 140),
  ('data-entry',          4,  12,  35,  90),
  ('product-management', 12,  40, 100, 260),
  ('project-management', 10,  32,  85, 220),
  ('business-strategy',  10,  30,  75, 190)
), flat(project_size, old_hours) as (values
  ('small', 8), ('medium', 24), ('large', 60), ('enterprise', 160)
), resolved as (
  select sp.id specialty_id, f.project_size,
         case f.project_size
           when 'small' then h.small when 'medium' then h.medium
           when 'large' then h.large else h.enterprise
         end::numeric new_hours
  from hours h
  join public.specialties sp on sp.slug = h.slug
  cross join flat f
)
-- 1. Record the estimates, replacing the flat seed.
insert into public.project_hours (specialty_id, project_size, hours, provenance, n, as_of)
select specialty_id, project_size::public.project_size, new_hours, 'reasoned', 0, now()
from resolved
on conflict (specialty_id, project_size, provenance)
do update set hours = excluded.hours, as_of = excluded.as_of;

-- 2. Recompute the prices derived through the flat assumption. Identified by the derivation
--    phrase written into every such row at ingestion, so nothing else is touched: the editorial
--    seed and the founder rows are direct project prices and never crossed hours.
with hours(slug, small, medium, large, enterprise) as (values
  ('logo-design',6,16,40,100),('graphic-design',5,14,35,90),('ui-ux-design',10,30,80,200),
  ('video-editing',6,20,55,150),('photography',5,14,35,90),('voice-over',2,6,16,40),
  ('web-dev',12,40,100,280),('mobile-dev',16,50,130,350),('data-analytics',8,25,70,180),
  ('cloud-devops',8,24,65,170),('ai-automation',10,30,80,200),('content-writing',3,10,28,70),
  ('copywriting',4,12,30,75),('translation',3,9,25,65),('proofreading',2,6,18,45),
  ('digital-marketing',6,20,55,140),('data-entry',4,12,35,90),('product-management',12,40,100,260),
  ('project-management',10,32,85,220),('business-strategy',10,30,75,190)
), ratio as (
  select sp.id specialty_id, b.project_size,
         (case b.project_size when 'small' then h.small when 'medium' then h.medium
                              when 'large' then h.large else h.enterprise end)::numeric
         / (case b.project_size when 'small' then 8 when 'medium' then 24
                                when 'large' then 60 else 160 end)::numeric as k,
         case b.project_size when 'small' then h.small when 'medium' then h.medium
                             when 'large' then h.large else h.enterprise end as new_hours
  from hours h
  join public.specialties sp on sp.slug = h.slug
  cross join (select distinct project_size from public.benchmark_records where project_size is not null) b
)
update public.benchmark_records r
   set price_sar = round(r.price_sar * ratio.k),
       notes = coalesce(r.notes || ' | ', '')
               || 'Hours revised ' || (case r.project_size when 'small' then 8 when 'medium' then 24
                    when 'large' then 60 else 160 end)
               || 'h -> ' || ratio.new_hours || 'h for this specialty (reasoned estimate, n=0). '
               || 'One flat figure had been applied to every craft; a logo and a web build do not '
               || 'take the same time. Overridden automatically once 5 freelancers state or record real hours.'
  from ratio
 where r.specialty_id = ratio.specialty_id
   and r.project_size = ratio.project_size
   and r.active and r.verified
   and r.notes like '%h assumed for a%';
