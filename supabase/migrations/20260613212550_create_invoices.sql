-- ─────────────────────────────────────────────────────────────────────────
-- Phase 4.1 — Simple Invoicing (M6): invoices schema.
-- Owner-scoped RLS; per-user advisory-locked sequence numbering; vat/total
-- compute trigger; free=3 / pro=30 / admin=∞ monthly quota; RPC-only public
-- share surface (NO broad anon SELECT — the P2.8 lesson). Reuses the existing
-- public.payment_method enum and the proposal_share_channel enum for logging.
-- ─────────────────────────────────────────────────────────────────────────

do $$ begin create type public.invoice_status as enum
  ('draft','sent','viewed','paid','overdue','cancelled');
exception when duplicate_object then null; end $$;

-- ── invoices ──
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  gig_id uuid references public.gigs(id) on delete set null,
  proposal_id uuid references public.proposals(id) on delete set null,
  -- numbering (assigned by private.invoice_assign_number on insert)
  invoice_number text not null,
  invoice_sequence int not null,
  -- content
  description text,
  items jsonb not null default '[]'::jsonb,
  subtotal_sar numeric not null check (subtotal_sar >= 0),
  vat_pct numeric not null default 0 check (vat_pct >= 0),
  vat_sar numeric not null default 0,
  total_sar numeric not null default 0,
  -- payment
  payment_method public.payment_method not null default 'bank_transfer',
  payment_details text,
  due_date date,
  -- status
  status public.invoice_status not null default 'draft',
  -- output / share
  public_share boolean not null default false,
  share_token text unique,
  share_viewed_at timestamptz,
  share_view_count int not null default 0,
  pdf_url text,
  artifact_json jsonb,
  -- ai
  ai_reminder_drafted_at timestamptz,
  ai_reminder_text_ar text,
  -- lifecycle
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  paid_at timestamptz,
  unique (user_id, invoice_sequence)
);
create index if not exists idx_invoices_user_status on public.invoices(user_id, status);
create index if not exists idx_invoices_user_created on public.invoices(user_id, created_at desc);
create index if not exists idx_invoices_client on public.invoices(client_id);
create index if not exists idx_invoices_gig on public.invoices(gig_id) where gig_id is not null;
create index if not exists idx_invoices_proposal on public.invoices(proposal_id) where proposal_id is not null;
create index if not exists idx_invoices_due on public.invoices(user_id, due_date) where status in ('sent','viewed');

-- ── deferred-from-P3 FK: gigs.invoice_id → invoices(id) ──
do $$ begin
  alter table public.gigs
    add constraint gigs_invoice_id_fkey
    foreign key (invoice_id) references public.invoices(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ── RLS (owner-only; public surface is the get_shared_invoice RPC, not a policy) ──
alter table public.invoices enable row level security;
revoke all on public.invoices from anon, authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
drop policy if exists invoices_owner on public.invoices;
create policy invoices_owner on public.invoices for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── compute vat/total BEFORE write ──
create or replace function private.invoice_compute_before()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  new.vat_sar := round(coalesce(new.subtotal_sar,0) * coalesce(new.vat_pct,0) / 100.0, 2);
  new.total_sar := coalesce(new.subtotal_sar,0) + new.vat_sar;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists invoices_compute_before on public.invoices;
create trigger invoices_compute_before before insert or update on public.invoices
  for each row execute function private.invoice_compute_before();

-- ── per-user sequence number assignment (advisory-locked) BEFORE INSERT ──
create or replace function private.invoice_assign_number()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_seq int;
begin
  -- serialize per user so concurrent inserts get distinct sequences
  perform pg_advisory_xact_lock(hashtext('rizq:invoice_seq:' || new.user_id::text));
  select coalesce(max(invoice_sequence),0)+1 into v_seq
    from public.invoices where user_id = new.user_id;
  new.invoice_sequence := v_seq;
  new.invoice_number := 'INV-'
    || to_char(now() at time zone 'Asia/Riyadh','YYYY') || '-'
    || lpad(v_seq::text, 4, '0');
  return new;
end $$;
drop trigger if exists invoices_assign_number on public.invoices;
create trigger invoices_assign_number before insert on public.invoices
  for each row execute function private.invoice_assign_number();

-- ── monthly quota (free=3, pro=30, admin=∞) BEFORE INSERT ──
create or replace function private.enforce_invoice_quota()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_role public.user_role; v_used int; v_limit int; v_month_start timestamptz;
begin
  select role into v_role from public.users where id = new.user_id;
  if v_role = 'admin' then return new; end if;
  v_limit := case when v_role = 'pro' then 30 else 3 end;  -- null/unknown role → free
  v_month_start := date_trunc('month', now() at time zone 'Asia/Riyadh');
  select count(*) into v_used from public.invoices
    where user_id = new.user_id and created_at >= v_month_start;
  if v_used >= v_limit then
    raise exception 'invoice quota exhausted' using errcode='53400';
  end if;
  return new;
end $$;
drop trigger if exists enforce_invoice_quota_before on public.invoices;
create trigger enforce_invoice_quota_before before insert on public.invoices
  for each row execute function private.enforce_invoice_quota();

-- ── public share surface: RPC only (returns ONLY safe render fields) ──
create or replace function public.get_shared_invoice(p_token text)
returns table (
  id             uuid,
  invoice_number text,
  status         public.invoice_status,
  artifact_json  jsonb,
  total_sar      numeric,
  due_date       date
)
language sql security definer set search_path='' stable as $$
  select i.id, i.invoice_number, i.status, i.artifact_json, i.total_sar, i.due_date
  from public.invoices i
  where i.share_token = p_token
    and i.public_share = true
    and i.status <> 'draft'
  limit 1;
$$;
revoke all on function public.get_shared_invoice(text) from public;
grant execute on function public.get_shared_invoice(text) to anon, authenticated;
comment on function public.get_shared_invoice(text) is
  'Public share surface: returns ONLY safe artifact fields for a publicly shared, non-draft invoice. Keeps user_id/raw client rows private.';

-- ── anon-callable view logger (bumps count; sent→viewed) ──
create or replace function public.log_invoice_view(
  p_token   text,
  p_channel public.proposal_share_channel,
  p_agent   text
)
returns void language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  select id into v_id from public.invoices
    where share_token = p_token and public_share = true and status <> 'draft';
  if v_id is null then return; end if;  -- silent no-op for invalid/private/draft
  update public.invoices
    set share_view_count = share_view_count + 1,
        share_viewed_at = now(),
        status = case when status = 'sent' then 'viewed' else status end
    where id = v_id;
end $$;
revoke all on function public.log_invoice_view(text, public.proposal_share_channel, text) from public;
grant execute on function public.log_invoice_view(text, public.proposal_share_channel, text) to anon, authenticated;
comment on function public.log_invoice_view(text, public.proposal_share_channel, text) is
  'Anon-callable view logger for publicly shared, non-draft invoices. No-op for invalid/private tokens.';
