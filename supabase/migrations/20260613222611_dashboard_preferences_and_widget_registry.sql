-- ─────────────────────────────────────────────────────────────────────────
-- Phase 5.1 — Dashboard (M0): per-user widget layout + config-driven registry.
-- Dashboard itself is a read-aggregation over existing module tables (no data
-- table). dashboard_preferences = owner-only; widget_registry = public-read
-- config (new widget = INSERT a row + build the component, no refactor).
-- ─────────────────────────────────────────────────────────────────────────

-- ── dashboard_preferences (owner-only) ──
create table if not exists public.dashboard_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  widgets jsonb not null default '["insights","proposals","deadlines","clients","income","quick_actions"]'::jsonb,
  layout jsonb,
  updated_at timestamptz not null default now()
);
alter table public.dashboard_preferences enable row level security;
revoke all on public.dashboard_preferences from anon, authenticated;
grant select, insert, update on public.dashboard_preferences to authenticated;
drop policy if exists dashboard_preferences_owner on public.dashboard_preferences;
create policy dashboard_preferences_owner on public.dashboard_preferences for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── widget_registry (config-driven; public read of enabled rows) ──
create table if not exists public.widget_registry (
  id text primary key,
  name_ar text not null,
  name_en text not null,
  icon text not null,                       -- lucide icon name
  source_module text not null,              -- 'M0','M1',...
  default_order int not null,
  min_tier public.user_role not null default 'free',
  enabled boolean not null default true,
  config_schema jsonb
);
alter table public.widget_registry enable row level security;
revoke all on public.widget_registry from anon, authenticated;
grant select on public.widget_registry to anon, authenticated;
drop policy if exists widget_registry_read on public.widget_registry;
create policy widget_registry_read on public.widget_registry for select to anon, authenticated
  using (enabled = true);

insert into public.widget_registry (id, name_ar, name_en, icon, source_module, default_order, min_tier) values
('insights','تحليلات رِزق','Rizq Insights','sparkles','M0',1,'free'),
('proposals','أحدث العروض','Recent Proposals','file-text','M1',2,'free'),
('deadlines','المواعيد القادمة','Upcoming Deadlines','calendar-clock','M9',3,'free'),
('clients','العملاء النشطون','Active Clients','users','M2',4,'free'),
('income','دخل الشهر','Monthly Income','wallet','M3',5,'free'),
('quick_pricing','تسعيرة سريعة','Quick Pricing','tag','M4',6,'free'),
('quick_actions','إجراءات سريعة','Quick Actions','zap','M0',7,'free')
on conflict (id) do nothing;
