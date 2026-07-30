-- Saudi businesses publishing what they charge Saudi clients, in riyals, for named deliverables.
--
-- The first evidence in this corpus that crosses NO bridge. Not the currency bridge, not the
-- employment bridge, not the hours assumption. A Riyadh studio price list saying "logo,
-- 3 concepts, multiple revisions, files delivered - 1,000 SAR" is the same kind of statement the
-- engine is trying to make. Everything else here is a foreign number wearing three transforms.
--
-- Sizes map to the DELIVERABLE each source names, never to assumed hours. That is the other half
-- of the fix: the Saudi market does not sell a few hours of anything. Its smallest advertised
-- unit is a complete thing - one logo, one landing page, one article, one finished video, one
-- translated page. Our small column had been priced in a unit that does not transact.
--
-- Two kinds of source, kept separate so the citation can say which:
--   'Saudi freelance rate guide' - explicitly freelance rates (qemma-soft, 20 Apr 2026)
--   'Saudi published rate card'  - an agency own sold packages, CR-registered firms
-- Agencies run roughly 2x freelance where a source states both, which is why the saudi_market
-- family carries a small positive offset rather than none.
--
-- confidence 0.50: published prices with no stated sample. This family standing comes from
-- being unbridged, not from sample size.
--
-- MEASURED EFFECT (small project, against the morning of 2026-07-31):
--   logo 2,013 -> 814 (Saudi published 500) | content-writing 1,273 -> 484 (275)
--   video-editing 3,435 -> 930 (700) | web-dev 7,291 -> 3,460 (1,500)
--   digital-marketing 6,884 -> 1,911 (1,500)
--
-- NOTE: two source URLs contain Arabic path segments; they are recorded here in transliterated
-- form to keep this file ASCII-safe. The live rows carry the exact URLs.

insert into public.benchmark_records (
  specialty_id, city_id, experience_tier_id, project_size, price_sar, source, provenance,
  confidence, published_sample, captured_at, source_ref, collector_id, verified, verified_at, notes, active)
select sp.id, null, null, v.size::public.project_size, v.price,
  'founder_added'::public.benchmark_source, 'published_ref'::public.benchmark_provenance,
  0.50, null, v.captured::timestamptz, v.src, 'saudi_market_v1', true, now(), v.note, true
from (values
  ('logo-design','small',500,'Saudi freelance rate guide - qemma-soft, 20 Apr 2026 (https://qemma-soft.com/en/blog/freelancing-guide-saudi-arabia-2026)','2026-04-20','Freelance, complete single logo, low end of the stated 500-3,000 Saudi range. Priced by deliverable, not hours.'),
  ('logo-design','medium',1000,'Saudi published rate card - elryad Riyadh studio (https://elryad.com/ar/logo-prices)','2026-01-01','Studio package: logo, 3 concepts, multiple revisions, files delivered. No brand guide.'),
  ('logo-design','large',2000,'Saudi published rate card - elryad Riyadh studio (https://elryad.com/ar/logo-prices)','2026-01-01','Studio package: logo plus full stationery - card, letterhead, envelopes, signature, seal.'),
  ('logo-design','enterprise',3499,'Saudi published rate card - elryad Riyadh studio (https://elryad.com/ar/logo-prices)','2026-01-01','Studio top package: logo, full identity and a bilingual AR/EN company profile.'),
  ('logo-design','medium',1199,'Saudi published rate card - Marhaba (https://mrhbaa.com/branding/logo-design/logo-cost/)','2026-01-01','Gold tier: 4 concepts, unlimited revisions, all formats plus EPS, business card, letterhead, brand book, 7-10 days.'),
  ('logo-design','large',2499,'Saudi published rate card - Marhaba (https://mrhbaa.com/branding/logo-design/logo-cost/)','2026-01-01','Platinum tier: 5 concepts, all formats plus 3D, stationery, brand book, 5 social designs, 10-14 days.'),
  ('graphic-design','small',500,'Saudi published rate card - elryad Riyadh studio (https://elryad.com/ar/logo-prices)','2026-01-01','Single designed mark, one concept, one revision round.'),
  ('graphic-design','medium',1500,'Saudi published rate card - elryad Riyadh studio (https://elryad.com/ar/logo-prices)','2026-01-01','Visual identity without the logo: card, letterhead, envelopes, signature, seal, branded items.'),
  ('graphic-design','large',3499,'Saudi published rate card - elryad Riyadh studio (https://elryad.com/ar/logo-prices)','2026-01-01','Identity plus complete bilingual company profile document.'),
  ('web-dev','small',1500,'Saudi published rate card - safwaweb Riyadh (https://safwaweb.com/website-cost-saudi-arabia)','2026-01-01','Landing page, single purpose, 1-2 weeks, bilingual.'),
  ('web-dev','medium',3000,'Saudi published rate card - safwaweb Riyadh (https://safwaweb.com/website-cost-saudi-arabia)','2026-01-01','Corporate site, 5-7 pages, bilingual Arabic/English, 2-4 weeks.'),
  ('web-dev','large',9000,'Saudi published rate card - safwaweb Riyadh (https://safwaweb.com/website-cost-saudi-arabia)','2026-01-01','Custom build, 10-20 pages, 4-8 weeks.'),
  ('web-dev','enterprise',25000,'Saudi published rate card - safwaweb Riyadh (https://safwaweb.com/website-cost-saudi-arabia)','2026-01-01','Custom web application, top of the stated band.'),
  ('web-dev','medium',5000,'Saudi freelance rate guide - qemma-soft, 20 Apr 2026 (https://qemma-soft.com/en/blog/freelancing-guide-saudi-arabia-2026)','2026-04-20','Five-page website, explicitly freelance not agency, midpoint of stated 2,000-8,000.'),
  ('web-dev','medium',2200,'Saudi published rate card - Manjaz CR 4030409112 (https://mnjz.sa/blog-detail/12)','2026-01-01','Company site silver tier: responsive, Arabic admin panel, unlimited pages, hosting included.'),
  ('web-dev','large',7000,'Saudi published rate card - Manjaz CR 4030409112 (https://mnjz.sa/blog-detail/12)','2026-01-01','E-commerce diamond tier, whole delivered store.'),
  ('mobile-dev','small',8000,'Saudi freelance rate guide - qemma-soft, 20 Apr 2026 (https://qemma-soft.com/en/blog/freelancing-guide-saudi-arabia-2026)','2026-04-20','Simple app, freelance, low end of stated 8,000-30,000.'),
  ('mobile-dev','medium',15000,'Saudi published rate card - safwaweb Riyadh (https://safwaweb.com/website-cost-saudi-arabia)','2026-01-01','iOS plus Android MVP, 10-24 weeks stated.'),
  ('mobile-dev','large',30000,'Saudi freelance rate guide - qemma-soft, 20 Apr 2026 (https://qemma-soft.com/en/blog/freelancing-guide-saudi-arabia-2026)','2026-04-20','Simple app, top of stated freelance band.'),
  ('mobile-dev','enterprise',80000,'Saudi published rate card - safwaweb Riyadh (https://safwaweb.com/website-cost-saudi-arabia)','2026-01-01','Full consumer app, upper end of the stated band extended to complex builds.'),
  ('content-writing','small',275,'Saudi freelance rate guide - qemma-soft, 20 Apr 2026 (https://qemma-soft.com/en/blog/freelancing-guide-saudi-arabia-2026)','2026-04-20','One 1,000-word Arabic article, freelance, midpoint of stated 150-400.'),
  ('content-writing','medium',900,'Saudi published rate card - Digital Gravity KSA (https://www.digitalgravityksa.com/blog/how-much-does-a-digital-marketing-agency-cost-in-saudi-arabia/)','2026-01-01','SEO-optimised written piece, agency rate, low-mid of stated 450-2,500 per piece.'),
  ('content-writing','large',2500,'Saudi published rate card - Digital Gravity KSA (https://www.digitalgravityksa.com/blog/how-much-does-a-digital-marketing-agency-cost-in-saudi-arabia/)','2026-01-01','Long-form piece, top of stated per-piece band.'),
  ('translation','small',400,'Saudi published rate card - hip.sa Riyadh licensed office (https://hip.sa/certified-translation-price)','2025-08-05','Roughly 5 standard pages at 40-120 SAR per page (page = 250-300 words).'),
  ('translation','medium',1200,'Saudi published rate card - hip.sa Riyadh licensed office (https://hip.sa/certified-translation-price)','2025-08-05','Roughly 15 standard pages at the same published per-page rate.'),
  ('translation','large',3500,'Saudi published rate card - hip.sa Riyadh licensed office (https://hip.sa/certified-translation-price)','2025-08-05','Roughly 45 standard pages, or a shorter specialised legal/medical set at 100-250 per page.'),
  ('voice-over','small',700,'Saudi published rate card - Saudi voice-over rate guides (https://wizfreelance.com/blogs/voice-over-prices-saudi)','2026-01-01','One to two finished minutes at the stated Saudi band of 200-1,000 per finished minute.'),
  ('voice-over','medium',2000,'Saudi published rate card - Saudi voice-over rate guides (https://wizfreelance.com/blogs/voice-over-prices-saudi)','2026-01-01','Three to five finished minutes at the mid band of 500-700 per minute.'),
  ('voice-over','large',5000,'Saudi published rate card - Saudi voice-over rate guides (https://wizfreelance.com/blogs/voice-over-prices-saudi)','2026-01-01','Roughly ten finished minutes, experienced reader.'),
  ('video-editing','small',700,'Saudi freelance rate guide - qemma-soft, 20 Apr 2026 (https://qemma-soft.com/en/blog/freelancing-guide-saudi-arabia-2026)','2026-04-20','Three-minute video, freelance, midpoint of stated 300-1,200.'),
  ('video-editing','medium',1800,'Saudi published rate card - mezalla (https://www.mezalla.com/video-editing-prices-saudi)','2025-01-01','Medium edit, low-mid of the stated Saudi 1,500-5,000 band.'),
  ('video-editing','large',5000,'Saudi published rate card - mezalla (https://www.mezalla.com/video-editing-prices-saudi)','2025-01-01','Edit with effects, stated 5,000+ tier.'),
  ('digital-marketing','small',1500,'Saudi freelance rate guide - qemma-soft, 20 Apr 2026 (https://qemma-soft.com/en/blog/freelancing-guide-saudi-arabia-2026)','2026-04-20','One month of social media management, freelance, low end of stated 1,500-5,000 per month.'),
  ('digital-marketing','medium',3500,'Saudi published rate card - boldbrand (https://boldbrand.sa/social-media-package-prices-in-saudi-arabia/)','2026-06-28','One month, advanced tier: varied content including stories and short video, engagement. Ad spend excluded.'),
  ('digital-marketing','large',9000,'Saudi published rate card - boldbrand (https://boldbrand.sa/social-media-package-prices-in-saudi-arabia/)','2026-06-28','One month, professional tier: multi-platform, paid campaign management, analytics.')
) as v(slug, size, price, src, captured, note)
join public.specialties sp on sp.slug = v.slug and sp.active;
