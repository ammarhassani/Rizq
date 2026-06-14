-- ─────────────────────────────────────────────────────────────────────────
-- Invoice overhaul: a reusable items/services catalog + categorized fee presets,
-- and invoice fees. Client + >=1 item become required at the app layer. VAT is
-- fixed at 15% (toggle), applied to the taxable supply (items subtotal + fees).
-- ─────────────────────────────────────────────────────────────────────────

-- ── items: the freelancer's products/services catalog ──
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text,
  unit_price_sar numeric not null check (unit_price_sar >= 0),
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_items_user on public.items(user_id, is_active, name);
alter table public.items enable row level security;
revoke all on public.items from anon, authenticated;
grant select, insert, update, delete on public.items to authenticated;
drop policy if exists items_owner on public.items;
create policy items_owner on public.items for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── fee_presets: categorized fixed fees the user reuses ──
create table if not exists public.fee_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  category text,
  amount_sar numeric not null check (amount_sar >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_fee_presets_user on public.fee_presets(user_id, is_active, name);
alter table public.fee_presets enable row level security;
revoke all on public.fee_presets from anon, authenticated;
grant select, insert, update, delete on public.fee_presets to authenticated;
drop policy if exists fee_presets_owner on public.fee_presets;
create policy fee_presets_owner on public.fee_presets for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── invoices.fees: [{ name, category, amount_sar }] selected onto this invoice ──
alter table public.invoices add column if not exists fees jsonb not null default '[]'::jsonb;

-- ── recompute trigger now factors fees into the VAT base + total ──
create or replace function private.invoice_compute_before()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_fees numeric;
begin
  select coalesce(sum( (coalesce(f->>'amount_sar','0'))::numeric ), 0)
    into v_fees
    from jsonb_array_elements(coalesce(new.fees, '[]'::jsonb)) f;
  -- VAT applies to the taxable supply = items subtotal + fees.
  new.vat_sar := round((coalesce(new.subtotal_sar,0) + v_fees) * coalesce(new.vat_pct,0) / 100.0, 2);
  new.total_sar := coalesce(new.subtotal_sar,0) + v_fees + new.vat_sar;
  new.updated_at := now();
  return new;
end $$;
