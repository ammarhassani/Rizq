-- ─────────────────────────────────────────────────────────────────────────
-- Phase 5.6 — HADAF Eligibility (M5): config-driven rules + per-user prefs +
-- computed status cache. Informational only (NOT a government service).
-- hadaf_rules_config is a singleton (id=1), public-read so the calculator + UI
-- read the live rules; prefs + cache are owner-only.
-- ─────────────────────────────────────────────────────────────────────────

do $$ begin create type public.hadaf_month_status as enum
  ('qualifying','not_qualifying','no_data');
exception when duplicate_object then null; end $$;

-- ── hadaf_rules_config (singleton, config-driven) ──
create table if not exists public.hadaf_rules_config (
  id int primary key default 1,
  rules_json jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text not null default 'manual',
  constraint hadaf_rules_singleton check (id = 1)
);
alter table public.hadaf_rules_config enable row level security;
revoke all on public.hadaf_rules_config from anon, authenticated;
grant select on public.hadaf_rules_config to anon, authenticated;
drop policy if exists hadaf_rules_read on public.hadaf_rules_config;
create policy hadaf_rules_read on public.hadaf_rules_config for select to anon, authenticated using (true);

insert into public.hadaf_rules_config (id, rules_json, updated_by) values
(1, '{
  "platform": "bahr",
  "minimum_monthly_income_sar": 700,
  "consecutive_months_required": 3,
  "subsidy_pct": 40,
  "max_subsidy_sar": null,
  "eligibility_requirements": ["saudi_national","active_bahr_account","freelance_work_document"],
  "effective_date": "2026-01-01",
  "source_url": "https://hrdf.org.sa"
}'::jsonb, 'manual')
on conflict (id) do nothing;

-- ── hadaf_preferences (owner-only) ──
create table if not exists public.hadaf_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  target_monthly_sar numeric not null default 700,
  bahr_only boolean not null default true,
  notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.hadaf_preferences enable row level security;
revoke all on public.hadaf_preferences from anon, authenticated;
grant select, insert, update on public.hadaf_preferences to authenticated;
drop policy if exists hadaf_preferences_owner on public.hadaf_preferences;
create policy hadaf_preferences_owner on public.hadaf_preferences for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── hadaf_status_cache (owner-only; computed, 7-day TTL) ──
create table if not exists public.hadaf_status_cache (
  user_id uuid primary key references public.users(id) on delete cascade,
  current_streak int not null default 0,
  current_month_status public.hadaf_month_status not null default 'no_data',
  current_month_income numeric not null default 0,
  months_to_qualify int not null default 3,
  estimated_subsidy numeric,
  streak_history jsonb,                       -- [{ month, income, qualifying }] last 12mo
  ai_action_plan_ar text,
  ai_action_plan_en text,
  generated_at timestamptz not null default now(),
  valid_until timestamptz
);
alter table public.hadaf_status_cache enable row level security;
revoke all on public.hadaf_status_cache from anon, authenticated;
grant select, insert, update on public.hadaf_status_cache to authenticated;
drop policy if exists hadaf_status_cache_owner on public.hadaf_status_cache;
create policy hadaf_status_cache_owner on public.hadaf_status_cache for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
