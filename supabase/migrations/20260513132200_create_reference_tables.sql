-- ─────────────────────────────────────────────────────────────────────────
-- Reference data: specialties, cities, experience_tiers
-- All public-readable (anon allowed) — needed to populate the tool form
-- before signin. Only admins / service-role can write.
-- ─────────────────────────────────────────────────────────────────────────

-- regions enum for city.region
do $$ begin
  create type public.saudi_region as enum (
    'central', 'western', 'eastern', 'southern', 'northern'
  );
exception when duplicate_object then null; end $$;

-- ── specialties ──
create table public.specialties (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_ar text not null,
  name_en text not null,
  category text not null,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.specialties enable row level security;
revoke all on public.specialties from anon, authenticated;
grant select on public.specialties to anon, authenticated;

create policy specialties_public_read on public.specialties
  for select to anon, authenticated
  using (active = true);

insert into public.specialties (slug, name_ar, name_en, category, sort_order) values
  ('graphic-design',     'تصميم جرافيك',         'Graphic Design',           'design',      10),
  ('logo-design',        'تصميم شعار',           'Logo Design',              'design',      20),
  ('ui-ux-design',       'تصميم واجهات',         'UI/UX Design',             'design',      30),
  ('web-dev',            'برمجة مواقع',          'Web Development',          'development', 40),
  ('mobile-dev',         'برمجة تطبيقات',        'Mobile App Development',   'development', 50),
  ('content-writing',    'كتابة محتوى عربي',     'Content Writing (Arabic)', 'writing',     60),
  ('translation',        'ترجمة إنجليزي عربي',   'Translation EN↔AR',        'writing',     70),
  ('digital-marketing',  'تسويق رقمي',           'Digital Marketing',        'marketing',   80),
  ('video-editing',      'مونتاج فيديو',         'Video Editing',            'media',       90),
  ('photography',        'تصوير فوتوغرافي',      'Photography',              'media',      100),
  ('voice-over',         'تعليق صوتي',           'Voice Over',               'media',      110),
  ('data-entry',         'إدخال بيانات',         'Data Entry',               'other',      120);

-- ── cities ──
create table public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_ar text not null,
  name_en text not null,
  region public.saudi_region not null,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.cities enable row level security;
revoke all on public.cities from anon, authenticated;
grant select on public.cities to anon, authenticated;

create policy cities_public_read on public.cities
  for select to anon, authenticated
  using (active = true);

insert into public.cities (slug, name_ar, name_en, region, sort_order) values
  ('riyadh',  'الرياض',            'Riyadh',  'central',  10),
  ('jeddah',  'جدة',               'Jeddah',  'western',  20),
  ('makkah',  'مكة',               'Makkah',  'western',  25),
  ('medina',  'المدينة المنورة',   'Medina',  'western',  30),
  ('dammam',  'الدمام',            'Dammam',  'eastern',  40),
  ('khobar',  'الخبر',             'Khobar',  'eastern',  50),
  ('other',   'مدن سعودية أخرى',   'Other Saudi cities', 'central', 100);

-- ── experience tiers ──
create table public.experience_tiers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_ar text not null,
  name_en text not null,
  years_min int not null,
  years_max int,
  sort_order int not null default 0
);

alter table public.experience_tiers enable row level security;
revoke all on public.experience_tiers from anon, authenticated;
grant select on public.experience_tiers to anon, authenticated;

create policy tiers_public_read on public.experience_tiers
  for select to anon, authenticated
  using (true);

insert into public.experience_tiers (slug, name_ar, name_en, years_min, years_max, sort_order) values
  ('beginner', 'مبتدئ',        'Beginner',  0,  1,    10),
  ('junior',   'مبتدئ متقدم',  'Junior',    1,  3,    20),
  ('mid',      'متوسط الخبرة', 'Mid-level', 3,  5,    30),
  ('senior',   'خبير',         'Senior',    5,  10,   40),
  ('expert',   'خبير متقدم',   'Expert',   10, null, 50);

-- ── project_size enum (used by tool input + benchmark_records filter) ──
do $$ begin
  create type public.project_size as enum (
    'small', 'medium', 'large', 'enterprise'
  );
exception when duplicate_object then null; end $$;

-- ── client_type enum (per architecture §3.1 benchmark_records) ──
do $$ begin
  create type public.client_type as enum (
    'individual', 'smb', 'corporate', 'government', 'other'
  );
exception when duplicate_object then null; end $$;

-- ── source enum for benchmark_records (per architecture) ──
do $$ begin
  create type public.benchmark_source as enum (
    'scraped', 'user_submitted', 'founder_added', 'survey'
  );
exception when duplicate_object then null; end $$;
