-- ─────────────────────────────────────────────────────────────────────────
-- Phase 5.3 — Dashboard AI Business Insights cache (M0.6). Cached ~1h to
-- control DeepSeek cost. Owner-only. insights jsonb = [{ ar, en, kind }];
-- feedback jsonb = optional thumbs map keyed by insight index.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.dashboard_insights_cache (
  user_id uuid primary key references public.users(id) on delete cascade,
  insights jsonb not null default '[]'::jsonb,
  feedback jsonb,
  generated_at timestamptz not null default now(),
  valid_until timestamptz
);
alter table public.dashboard_insights_cache enable row level security;
revoke all on public.dashboard_insights_cache from anon, authenticated;
grant select, insert, update on public.dashboard_insights_cache to authenticated;
drop policy if exists dashboard_insights_cache_owner on public.dashboard_insights_cache;
create policy dashboard_insights_cache_owner on public.dashboard_insights_cache for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
