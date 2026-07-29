-- Phase 2a of docs/pricing-confidence-plan.md: more published figures per cell.
--
-- The score is mean(weight) x min(1, n/10). At 4.4 rows per cell the sample factor was 0.44,
-- halving every result regardless of evidence quality. More SOURCES barely helped: each report
-- publishes one national figure per specialty, so nine new sources bought +2.4 rows per cell,
-- not +9. What raises n is more published FIGURES from the reports already cited.
--
-- 1. Robert Half role pages, stored TIER-ANCHORED rather than as national wildcards. The
--    publisher frames its own low/mid/high bands by experience: "the low end representing
--    candidates new to the role, the mid-range for those with moderate experience, and the
--    high end for professionals with extensive experience and advanced skills." That framing
--    is the publisher's, not an interpolation of ours, so low -> junior, mid -> mid,
--    high -> senior states what the source states. beginner and expert get nothing from these
--    rows: three published points place three rows, and no more.
--
-- 2. Additional Stack Overflow roles that genuinely belong to a specialty (an architect and a
--    QA engineer are both web development; a DBA and an applied scientist are both data work),
--    plus the mid band of the four Robert Half roles already present. Stored as national
--    wildcards, matching how those sources publish.
--
-- Measured result: 4.4 -> 5.3 rows per cell, average evidence 13.4% -> 16.1%. Short of the
-- ~30% projected in the plan, because the tier-anchored rows reach three tiers out of five and
-- n is still half the target of 10. See the migration that follows this one for what remains.
--
with tiered(slug, tier_slug, usd_hourly, discipline) as (values
  ('graphic-design', 'junior', 67.600, 'Graphic Designer (low band, $52,000/yr)'),
  ('graphic-design', 'mid', 87.425, 'Graphic Designer (mid band, $67,250/yr)'),
  ('graphic-design', 'senior', 103.350, 'Graphic Designer (high band, $79,500/yr)'),
  ('logo-design', 'junior', 67.600, 'Graphic Designer (low band, $52,000/yr) - nearest published role'),
  ('logo-design', 'mid', 87.425, 'Graphic Designer (mid band, $67,250/yr) - nearest published role'),
  ('logo-design', 'senior', 103.350, 'Graphic Designer (high band, $79,500/yr) - nearest published role'),
  ('web-dev', 'junior', 122.200, 'Web Developer (low band, $94,000/yr)'),
  ('web-dev', 'mid', 168.350, 'Web Developer (mid band, $129,500/yr)'),
  ('web-dev', 'senior', 214.500, 'Web Developer (high band, $165,000/yr)'),
  ('copywriting', 'junior', 83.850, 'Copywriter (low band, $64,500/yr)'),
  ('copywriting', 'mid', 103.025, 'Copywriter (mid band, $79,250/yr)'),
  ('copywriting', 'senior', 123.825, 'Copywriter (high band, $95,250/yr)'),
  ('content-writing', 'junior', 83.850, 'Copywriter (low band, $64,500/yr) - nearest published role'),
  ('content-writing', 'mid', 103.025, 'Copywriter (mid band, $79,250/yr) - nearest published role'),
  ('content-writing', 'senior', 123.825, 'Copywriter (high band, $95,250/yr) - nearest published role'),
  ('video-editing', 'junior', 78.000, 'Video Editor (low band, $60,000/yr)'),
  ('video-editing', 'mid', 92.950, 'Video Editor (mid band, $71,500/yr)'),
  ('video-editing', 'senior', 115.700, 'Video Editor (high band, $89,000/yr)'),
  ('ui-ux-design', 'junior', 125.450, 'UX Designer (low band, $96,500/yr)'),
  ('ui-ux-design', 'mid', 154.700, 'UX Designer (mid band, $119,000/yr)'),
  ('ui-ux-design', 'senior', 184.925, 'UX Designer (high band, $142,250/yr)'),
  ('digital-marketing', 'junior', 76.050, 'Digital Marketing Specialist (low band, $58,500/yr)'),
  ('digital-marketing', 'mid', 89.700, 'Digital Marketing Specialist (mid band, $69,000/yr)'),
  ('digital-marketing', 'senior', 107.250, 'Digital Marketing Specialist (high band, $82,500/yr)')
), sizes(project_size, hours) as (values ('small',8),('medium',24),('large',60),('enterprise',160))
insert into public.benchmark_records (
  specialty_id, city_id, experience_tier_id, project_size, price_sar, source, provenance,
  confidence, published_sample, captured_at, source_ref, collector_id, verified, verified_at, notes, active)
select sp.id, null, et.id, sizes.project_size::public.project_size,
  round(t.usd_hourly * 1.85 * sizes.hours),
  'founder_added'::public.benchmark_source, 'published_ref'::public.benchmark_provenance,
  0.70, 4200, timestamptz '2025-09-29',
  'Robert Half 2026 Salary Guide - https://www.roberthalf.com/us/en/insights/salary-guide',
  'published_ref_v1', true, now(),
  'Experience-anchored: the publisher states its low/mid/high bands reflect experience. '
    || t.discipline || ': / 1250 h x 1.25 x 1.30 = $' || round(t.usd_hourly,2)
    || '/hr x 1.85 (World Bank PA.NUS.PPP, Saudi Arabia 2024) x ' || sizes.hours
    || ' h assumed for a ' || sizes.project_size || ' project.',
  true
from tiered t
join public.specialties sp on sp.slug = t.slug
join public.experience_tiers et on et.slug = t.tier_slug
cross join sizes;

with extra(slug, usd_hourly, discipline, source_ref, sample, captured) as (values
  ('web-dev', 132.600, 'Architect, software or solutions ($102,000/yr)', 'Stack Overflow Developer Survey 2025 (23,928 respondents) - https://survey.stackoverflow.co/2025/work/', 23928, timestamptz '2025-07-01'),
  ('web-dev', 74.675, 'Developer, QA or test ($57,442.50/yr)', 'Stack Overflow Developer Survey 2025 (23,928 respondents) - https://survey.stackoverflow.co/2025/work/', 23928, timestamptz '2025-07-01'),
  ('web-dev', 94.845, 'Developer, desktop or enterprise ($72,958/yr)', 'Stack Overflow Developer Survey 2025 (23,928 respondents) - https://survey.stackoverflow.co/2025/work/', 23928, timestamptz '2025-07-01'),
  ('mobile-dev', 92.032, 'Developer, game or graphics ($70,794/yr)', 'Stack Overflow Developer Survey 2025 (23,928 respondents) - https://survey.stackoverflow.co/2025/work/', 23928, timestamptz '2025-07-01'),
  ('data-analytics', 110.719, 'Database administrator or engineer ($85,168.50/yr)', 'Stack Overflow Developer Survey 2025 (23,928 respondents) - https://survey.stackoverflow.co/2025/work/', 23928, timestamptz '2025-07-01'),
  ('data-analytics', 126.029, 'Applied scientist ($96,945.50/yr)', 'Stack Overflow Developer Survey 2025 (23,928 respondents) - https://survey.stackoverflow.co/2025/work/', 23928, timestamptz '2025-07-01'),
  ('cloud-devops', 71.692, 'System administrator ($55,148/yr)', 'Stack Overflow Developer Survey 2025 (23,928 respondents) - https://survey.stackoverflow.co/2025/work/', 23928, timestamptz '2025-07-01'),
  ('cloud-devops', 124.990, 'Cybersecurity/InfoSec professional ($96,146/yr)', 'Stack Overflow Developer Survey 2025 (23,928 respondents) - https://survey.stackoverflow.co/2025/work/', 23928, timestamptz '2025-07-01'),
  ('ai-automation', 126.029, 'Applied scientist ($96,945.50/yr)', 'Stack Overflow Developer Survey 2025 (23,928 respondents) - https://survey.stackoverflow.co/2025/work/', 23928, timestamptz '2025-07-01'),
  ('project-management', 169.000, 'Engineering manager ($130,000/yr)', 'Stack Overflow Developer Survey 2025 (23,928 respondents) - https://survey.stackoverflow.co/2025/work/', 23928, timestamptz '2025-07-01'),
  ('proofreading', 75.075, 'Proofreader (mid band, $57,750/yr)', 'Robert Half 2026 Salary Guide - https://www.roberthalf.com/us/en/job-details/proofreader', 4200, timestamptz '2025-09-29'),
  ('data-entry', 51.025, 'Data Entry Specialist (mid band, $39,250/yr)', 'Robert Half 2026 Salary Guide - https://www.roberthalf.com/us/en/job-details/data-entry-specialist', 4200, timestamptz '2025-09-29'),
  ('product-management', 155.025, 'Product Manager (mid band, $119,250/yr)', 'Robert Half 2026 Salary Guide - https://www.roberthalf.com/us/en/job-details/product-manager', 4200, timestamptz '2025-09-29'),
  ('project-management', 107.250, 'Project Manager (mid band, $82,500/yr)', 'Robert Half 2026 Salary Guide - https://www.roberthalf.com/us/en/job-details/project-manager', 4200, timestamptz '2025-09-29')
), sizes(project_size, hours) as (values ('small',8),('medium',24),('large',60),('enterprise',160))
insert into public.benchmark_records (
  specialty_id, city_id, experience_tier_id, project_size, price_sar, source, provenance,
  confidence, published_sample, captured_at, source_ref, collector_id, verified, verified_at, notes, active)
select sp.id, null, null, sizes.project_size::public.project_size,
  round(e.usd_hourly * 1.85 * sizes.hours),
  'founder_added'::public.benchmark_source, 'published_ref'::public.benchmark_provenance,
  case when e.sample >= 5000 then 0.80 else 0.70 end, e.sample, e.captured,
  e.source_ref, 'published_ref_v1', true, now(),
  'National reference, no city or seniority stated by the source. ' || e.discipline
    || ': / 1250 h x 1.25 x 1.30 = $' || round(e.usd_hourly,2)
    || '/hr x 1.85 (World Bank PA.NUS.PPP, Saudi Arabia 2024) x ' || sizes.hours
    || ' h assumed for a ' || sizes.project_size || ' project.',
  true
from extra e
join public.specialties sp on sp.slug = e.slug
cross join sizes;
