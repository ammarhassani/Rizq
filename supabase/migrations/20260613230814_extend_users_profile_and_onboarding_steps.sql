-- ─────────────────────────────────────────────────────────────────────────
-- Phase 5.9 — Onboarding v2 (M8): extend users with the deep profile. Purely
-- ADDITIVE (add column if not exists) — never drops/renames existing columns
-- (id,email,name,preferred_language,city,role,pro_until,...,onboarded_at stay).
-- These columns retroactively satisfy the graceful-fallback TODOs in M1/M4/M6
-- (brand_*, tagline_*, contact_*, default_*, preferred_tone, specialties).
-- ─────────────────────────────────────────────────────────────────────────

do $$ begin create type public.rate_confidence as enum ('exact','approximate','estimate'); exception when duplicate_object then null; end $$;
do $$ begin create type public.primary_goal as enum ('increase_income','stabilize_income','build_brand','track_finances','qualify_hadaf','find_clients'); exception when duplicate_object then null; end $$;
do $$ begin create type public.ip_terms as enum ('full_transfer','license','per_project'); exception when duplicate_object then null; end $$;

-- Identity & Compliance (Step 2)
alter table public.users add column if not exists full_name_ar text;
alter table public.users add column if not exists full_name_en text;
alter table public.users add column if not exists fl_number text;
alter table public.users add column if not exists fl_document_url text;
alter table public.users add column if not exists fl_verified boolean not null default false;
alter table public.users add column if not exists fl_verified_at timestamptz;
alter table public.users add column if not exists commercial_reg text;
alter table public.users add column if not exists vat_registered boolean not null default false;
alter table public.users add column if not exists vat_number text;

-- Professional Identity (Steps 3-4)
alter table public.users add column if not exists primary_specialty_id uuid references public.specialties(id);
alter table public.users add column if not exists specialties text[] not null default '{}';
alter table public.users add column if not exists experience_tier_id uuid references public.experience_tiers(id);
alter table public.users add column if not exists years_experience int;
alter table public.users add column if not exists city_id uuid references public.cities(id);
alter table public.users add column if not exists languages text[] not null default '{ar}';

-- Rate History (Step 5)
alter table public.users add column if not exists current_hourly_rate_sar numeric;
alter table public.users add column if not exists current_daily_rate_sar numeric;
alter table public.users add column if not exists current_project_rate_range jsonb;
alter table public.users add column if not exists previous_year_income_sar numeric;
alter table public.users add column if not exists income_goal_monthly_sar numeric;
alter table public.users add column if not exists rate_confidence public.rate_confidence not null default 'approximate';

-- Platform Presence (Step 6)
alter table public.users add column if not exists bahr_profile_url text;
alter table public.users add column if not exists mostaql_profile_url text;
alter table public.users add column if not exists khamsat_profile_url text;
alter table public.users add column if not exists linkedin_url text;
alter table public.users add column if not exists behance_url text;
alter table public.users add column if not exists personal_website_url text;
alter table public.users add column if not exists platform_ratings jsonb;

-- Portfolio & Past Work (Step 7)
alter table public.users add column if not exists portfolio_samples jsonb;
alter table public.users add column if not exists total_projects_completed int;
alter table public.users add column if not exists notable_clients text[];

-- Brand Identity (Step 8)
alter table public.users add column if not exists brand_name text;
alter table public.users add column if not exists brand_name_ar text;
alter table public.users add column if not exists logo_url text;
alter table public.users add column if not exists brand_colors jsonb;
alter table public.users add column if not exists tagline_ar text;
alter table public.users add column if not exists tagline_en text;
alter table public.users add column if not exists bio_ar text;
alter table public.users add column if not exists bio_en text;

-- Contact (Step 8)
alter table public.users add column if not exists contact_email text;
alter table public.users add column if not exists contact_phone text;
alter table public.users add column if not exists contact_whatsapp text;
alter table public.users add column if not exists contact_city text;

-- Business Defaults (Step 9)
alter table public.users add column if not exists default_deposit_pct int not null default 50;
alter table public.users add column if not exists default_revisions int not null default 2;
alter table public.users add column if not exists default_ip_terms public.ip_terms not null default 'full_transfer';
alter table public.users add column if not exists default_milestone_structure jsonb not null default '[{"pct":50,"trigger":"deposit"},{"pct":50,"trigger":"delivery"}]'::jsonb;
alter table public.users add column if not exists default_payment_method public.payment_method not null default 'bank_transfer';
alter table public.users add column if not exists default_payment_details text;
alter table public.users add column if not exists default_warranty_days int not null default 0;

-- Goals & Preferences (Step 10)
alter table public.users add column if not exists primary_goal public.primary_goal not null default 'increase_income';
alter table public.users add column if not exists goals text[] not null default '{}';
alter table public.users add column if not exists uses_bahr boolean not null default false;
alter table public.users add column if not exists uses_mostaql boolean not null default false;
alter table public.users add column if not exists uses_khamsat boolean not null default false;
alter table public.users add column if not exists preferred_tone text not null default 'balanced' check (preferred_tone in ('formal','balanced','friendly'));

-- Onboarding metadata
alter table public.users add column if not exists onboarding_step int not null default 0;
alter table public.users add column if not exists onboarding_completed boolean not null default false;
alter table public.users add column if not exists onboarding_completed_at timestamptz;
alter table public.users add column if not exists profile_completeness_pct int not null default 0;
alter table public.users add column if not exists profile_last_updated timestamptz not null default now();

-- ── onboarding_steps (config-driven; public read) ──
create table if not exists public.onboarding_steps (
  id int primary key,
  step_key text not null unique,
  title_ar text not null,
  title_en text not null,
  description_ar text,
  description_en text,
  required boolean not null default false,
  skippable boolean not null default true,
  estimated_seconds int,
  enabled boolean not null default true,
  sort_order int not null
);
alter table public.onboarding_steps enable row level security;
revoke all on public.onboarding_steps from anon, authenticated;
grant select on public.onboarding_steps to anon, authenticated;
drop policy if exists onboarding_steps_read on public.onboarding_steps;
create policy onboarding_steps_read on public.onboarding_steps for select to anon, authenticated using (enabled = true);

insert into public.onboarding_steps (id, step_key, title_ar, title_en, required, skippable, estimated_seconds, sort_order) values
(1,'welcome','مرحباً','Welcome',true,false,30,1),
(2,'identity','الهوية ووثيقة العمل الحر','Identity & FL Number',true,false,90,2),
(3,'location','المدينة','City & Location',true,false,30,3),
(4,'professional','الملف المهني','Professional Profile',true,false,60,4),
(5,'rates','سجل الأسعار','Rate History',true,false,120,5),
(6,'platforms','الحضور على المنصات','Platform Presence',false,true,60,6),
(7,'portfolio','الأعمال السابقة','Portfolio & Past Work',false,true,120,7),
(8,'brand','الهوية التجارية','Brand Identity',false,true,90,8),
(9,'defaults','الإعدادات الافتراضية','Business Defaults',false,true,60,9),
(10,'goals','الأهداف والتفضيلات','Goals & Preferences',false,true,30,10),
(11,'review','المراجعة والإنهاء','Review & Complete',true,false,30,11)
on conflict (id) do nothing;
