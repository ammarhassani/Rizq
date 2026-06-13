-- ─────────────────────────────────────────────────────────────────────────
-- Phase 5.4 — Calendar (M9): calendar_events is a VIEW (no writes) UNION-ing
-- proposals/gigs/invoices/clients. security_invoker=true so each branch is
-- filtered by the querying user's RLS (no cross-user leak — the P3 lesson).
-- NOTE: proposals has NO delivery_date/title columns — event_date comes from
-- scope_json->>'delivery_date' (guarded) else expires_at; title from client_name.
-- ─────────────────────────────────────────────────────────────────────────

-- ── calendar_preferences (owner-only) ──
create table if not exists public.calendar_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  default_view text not null default 'month' check (default_view in ('month','week','agenda')),
  show_hijri boolean not null default false,
  enabled_sources jsonb not null default '["proposal","gig","invoice","client_followup"]'::jsonb,
  working_days int[] not null default '{0,1,2,3,4}',          -- Sun-Thu (Saudi work week)
  working_hours_start time not null default '08:00',
  working_hours_end time not null default '17:00',
  updated_at timestamptz not null default now()
);
alter table public.calendar_preferences enable row level security;
revoke all on public.calendar_preferences from anon, authenticated;
grant select, insert, update on public.calendar_preferences to authenticated;
drop policy if exists calendar_preferences_owner on public.calendar_preferences;
create policy calendar_preferences_owner on public.calendar_preferences for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── calendar_events view (security_invoker → per-user RLS) ──
create or replace view public.calendar_events with (security_invoker = true) as
select * from (
  -- Proposal deadlines (event_date from scope_json delivery_date, else expiry)
  select
    p.id as event_id,
    'proposal_deadline' as event_type,
    p.user_id,
    p.client_id,
    coalesce(
      case when (p.scope_json->>'delivery_date') ~ '^\d{4}-\d{2}-\d{2}$'
           then (p.scope_json->>'delivery_date')::date else null end,
      p.expires_at::date
    ) as event_date,
    coalesce(p.client_name, 'عرض تقديمي') as title_ar,
    coalesce(p.client_name, 'Proposal') as title_en,
    p.status::text as status,
    'proposal' as source_module,
    p.id as source_id,
    jsonb_build_object('proposal_id', p.id, 'status', p.status) as metadata
  from public.proposals p
  where p.status not in ('draft','declined','expired')

  union all

  -- Gig delivery dates
  select
    g.id, 'gig_delivery', g.user_id, g.client_id,
    g.delivery_date,
    g.title, g.title,
    g.status::text, 'gig', g.id,
    jsonb_build_object('gig_id', g.id, 'status', g.status, 'amount_sar', g.amount_sar)
  from public.gigs g
  where g.delivery_date is not null and g.status <> 'cancelled'

  union all

  -- Invoice due dates
  select
    i.id, 'invoice_due', i.user_id, i.client_id,
    i.due_date,
    'فاتورة: ' || i.invoice_number, 'Invoice: ' || i.invoice_number,
    i.status::text, 'invoice', i.id,
    jsonb_build_object('invoice_id', i.id, 'total_sar', i.total_sar, 'status', i.status)
  from public.invoices i
  where i.due_date is not null and i.status not in ('paid','cancelled')

  union all

  -- Client follow-up reminders (30d after last contact)
  select
    c.id, 'client_followup', c.user_id, c.id,
    (c.last_contacted_at + interval '30 days')::date,
    'متابعة: ' || c.name, 'Follow-up: ' || coalesce(c.name_en, c.name),
    'active', 'client', c.id,
    jsonb_build_object('client_id', c.id, 'last_contacted', c.last_contacted_at)
  from public.clients c
  where c.last_contacted_at is not null
    and c.last_contacted_at < (now() - interval '30 days')
    and c.is_active = true
) all_events
where event_date is not null;

revoke all on public.calendar_events from anon, authenticated;
grant select on public.calendar_events to authenticated;
