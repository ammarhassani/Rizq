-- Tier 2 quantity unblock (docs/data-strategy.md).
--
-- Published rate reports state ONE national figure per discipline. They do not say
-- "Riyadh" and they do not say "senior". Until now benchmark_records required both,
-- so the only way to store such a source was to fan one number across 35 cells and
-- let the citation call it 35 records — the exact overstatement the source-count
-- work of 2026-07-28 exists to expose.
--
-- Making city_id / experience_tier_id nullable lets a row say what its source says:
-- NULL = "applies to any city" / "applies to any tier". resolvePrice reads NULL as a
-- wildcard, so a national reference supports every cell of its specialty without ever
-- claiming to be specific to one.

alter table public.benchmark_records alter column city_id drop not null;
alter table public.benchmark_records alter column experience_tier_id drop not null;

comment on column public.benchmark_records.city_id is
  'City the price was recorded for. NULL = the source published a national figure and did not name a city; resolvePrice matches such a row for any city.';
comment on column public.benchmark_records.experience_tier_id is
  'Experience tier the price was recorded for. NULL = the source did not split by seniority; resolvePrice matches such a row for any tier.';

-- Specialty expansion — only disciplines a Tier A source actually prices, so every
-- new cell has evidence behind it rather than an empty band.
--   YunoJuno 2026 Contractor & Freelancer Rates Report → data, product, project,
--     AI, cloud, strategy, motion/creative
--   EFA 2026 rate chart (2025 rates) → copywriting, proofreading, transcription
insert into public.specialties (slug, name_ar, name_en, category, active, sort_order) values
  ('data-analytics',      'تحليل البيانات',            'Data & Analytics',        'development', true, 55),
  ('cloud-devops',        'حوسبة سحابية وDevOps',      'Cloud & DevOps',          'development', true, 56),
  ('ai-automation',       'ذكاء اصطناعي وأتمتة',       'AI & Automation',         'development', true, 57),
  ('product-management',  'إدارة المنتجات',            'Product Management',      'other',       true, 121),
  ('project-management',  'إدارة المشاريع',            'Project Management',      'other',       true, 122),
  ('business-strategy',   'استشارات واستراتيجية',      'Strategy & Consulting',   'other',       true, 123),
  ('copywriting',         'كتابة إعلانية',             'Copywriting',             'writing',     true, 71),
  ('proofreading',        'تدقيق لغوي',                'Proofreading & Editing',  'writing',     true, 72),
  ('transcription',       'تفريغ صوتي',                'Transcription',           'writing',     true, 73),
  ('motion-graphics',     'موشن جرافيك',               'Motion Graphics',         'media',       true, 111)
on conflict (slug) do nothing;
