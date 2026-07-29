-- Robert Walters Middle East Salary Survey 2026 — the first Saudi-priced source in the corpus.
--
-- Every published source until now was foreign, and each crossed the World Bank PPP factor to
-- become a riyal figure. That conversion is the least testable step in the chain: it says what
-- a dollar of purchasing power is worth here, not what a Saudi client pays.
--
-- These figures are already in riyals, for roles actually advertised in Saudi Arabia. The PPP
-- step disappears; only the employment->freelance bridge remains. That makes this the most
-- independent evidence in the corpus short of a real transaction, and it is registered as its
-- own evidence family (gulf_recruiter) so it can genuinely corroborate — or contradict — the
-- PPP-converted sources rather than being pooled with them.
--
-- Methodology, quoted: "Robert Walters analysed over 100,000 roles advertised in the Middle
-- East over a 12-month period to calculate the upper and lower limits of the salary range, as
-- well as the mean salary and pay rate of each advertised role." 26th annual edition, based on
-- placements made during 2025. published_sample 100000 -> confidence 0.90.
--
-- Extraction was verified rather than trusted: the Saudi tables list titles and figures in
-- separate column blocks, so a naive read misaligns them by two rows and would have assigned
-- salaries to the wrong roles. Reading-order extraction pairs them correctly, and every row
-- self-checks — the published average is exactly the midpoint of its published range
-- (25-40k -> 32.5k, 20-30k -> 25k, 60-120k -> 90k). Rows failing that check were not ingested.
--
-- CURRENCY NOTE: the Saudi pages carry a "Permanent Salary Per Month AED" header, which is a
-- template artifact — the page is titled Saudi Arabia and the figures are Saudi. AED and SAR
-- are both dollar-pegged (3.6725 and 3.75), so the two readings differ by under 2%, well inside
-- the noise of the hours assumption. No conversion is applied; the ambiguity is recorded rather
-- than silently resolved.
--
-- Only individual-contributor roles are used. Heads and Directors are salaried leadership, not
-- work a freelancer is engaged for.
--
--   sar_hourly = monthly x 12 / 1250 billable h x 1.25 overhead x 1.30 freelance premium
--   price_sar  = sar_hourly x PROJECT_HOURS[size]        (no PPP factor — already SAR)
--
-- WHAT IT DID: average evidence FELL, 44.3% -> 41.4%. Adding the best available source lowered
-- the score, because it disagrees with the PPP-converted families by 1.9x to 2.8x and the
-- agreement term now prices that disagreement in. That is the engine working: the PPP bridge
-- appears to understate Saudi rates by roughly half, and the corpus can finally say so.

with src(slug, sar_hourly, discipline) as (values
  ('web-dev',            390.0, 'Software Engineer (low band, SAR 25,000/month)'),
  ('web-dev',            624.0, 'Software Engineer (high band, SAR 40,000/month)'),
  ('data-analytics',     390.0, 'Data Analyst (low band, SAR 25,000/month)'),
  ('data-analytics',     624.0, 'Data Analyst (high band, SAR 40,000/month)'),
  ('ui-ux-design',       312.0, 'UI/UX Designer (low band, SAR 20,000/month)'),
  ('ui-ux-design',       624.0, 'UI/UX Designer (high band, SAR 40,000/month)'),
  ('ui-ux-design',       390.0, 'Product Designer (low band, SAR 25,000/month)'),
  ('ui-ux-design',       546.0, 'Product Designer (high band, SAR 35,000/month)'),
  ('product-management', 390.0, 'Product Owner (low band, SAR 25,000/month)'),
  ('product-management', 546.0, 'Product Owner (high band, SAR 35,000/month)'),
  ('product-management', 390.0, 'Product Analyst (low band, SAR 25,000/month)'),
  ('product-management', 546.0, 'Product Analyst (high band, SAR 35,000/month)'),
  ('digital-marketing',  468.0, 'Digital Marketing Manager (low band, SAR 30,000/month)'),
  ('digital-marketing',  702.0, 'Digital Marketing Manager (high band, SAR 45,000/month)'),
  ('digital-marketing',  280.8, 'Digital Marketing Executive (low band, SAR 18,000/month)'),
  ('digital-marketing',  390.0, 'Digital Marketing Executive (high band, SAR 25,000/month)'),
  ('digital-marketing',  312.0, 'Social Media Manager (low band, SAR 20,000/month)'),
  ('digital-marketing',  468.0, 'Social Media Manager (high band, SAR 30,000/month)')
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
    || ' SAR/hr x ' || sizes.hours || ' h assumed for a ' || sizes.project_size || ' project. '
    || 'Source header reads AED on a Saudi Arabia page; AED and SAR are both dollar-pegged and '
    || 'differ by under 2%, so no conversion is applied.',
  true
from src
join public.specialties sp on sp.slug = src.slug
cross join sizes;
