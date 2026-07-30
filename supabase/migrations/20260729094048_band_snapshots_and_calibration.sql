-- Feature 013 P4: record what the freelancer was shown, before learning anything from what they
-- charged.
--
-- Rizq displays a band, the freelancer quotes near it, the client pays near the quote. So
-- ln(paid / anchor) tends to zero regardless of what the market would have borne, and any
-- calibration built on paid prices measures how persuasive our own suggestion was rather than
-- what Saudi clients actually pay. The posterior converges to our own prior and calls it
-- evidence. Three of five hostile reviewers on the pricing council caught this independently;
-- none of the five experts did.
--
-- Only the DEVIATION between suggestion and charge carries information the anchor did not
-- already contain, and saw_band_first = false marks the observations that are clean outright.
--
-- This ships BEFORE any calibration code consumes a transaction, because every proposal created
-- without it is permanently uninformative and cannot be reconstructed later.

create table if not exists public.band_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  proposal_id uuid references public.proposals(id) on delete cascade,
  specialty_id uuid,
  experience_tier_id uuid,
  project_size public.project_size,
  anchor_sar numeric,
  min_sar numeric,
  max_sar numeric,
  band_kind text,
  evidence_composition jsonb,
  saw_band_first boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.band_snapshots is
  'What Rizq showed a freelancer at the moment they priced, and whether they saw it before choosing. The reflexivity instrument: without it, calibrating on paid prices measures the anchor''s persuasiveness rather than the market.';
comment on column public.band_snapshots.saw_band_first is
  'FALSE marks the only observations that carry information the displayed anchor did not already contain. These are the valuable ones.';

alter table public.band_snapshots enable row level security;

drop policy if exists band_snapshots_owner_all on public.band_snapshots;
create policy band_snapshots_owner_all on public.band_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists band_snapshots_user_created_idx
  on public.band_snapshots (user_id, created_at desc);

create table if not exists public.pricing_calibration (
  family text primary key,
  delta_log numeric not null default 0,
  n_obs integer not null default 0,
  distinct_contributors integer not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.pricing_calibration is
  'Learned log-offset per evidence family. Empty table = priors hold = bands unchanged. Updated only from k-anonymous cells, from ln(charged/anchor_shown), winsorized at +/- ln 3.';

alter table public.pricing_calibration enable row level security;

drop policy if exists pricing_calibration_read_all on public.pricing_calibration;
create policy pricing_calibration_read_all on public.pricing_calibration
  for select using (true);

create table if not exists public.project_hours (
  specialty_id uuid not null references public.specialties(id) on delete cascade,
  project_size public.project_size not null,
  hours numeric not null check (hours > 0),
  provenance text not null check (provenance in ('reasoned', 'stated', 'measured')),
  n integer not null default 0,
  as_of timestamptz not null default now(),
  primary key (specialty_id, project_size, provenance)
);

comment on table public.project_hours is
  'Assumed, stated or measured effort per project size. NEVER inferred from paid divided by a Rizq-suggested rate: the freelancer quoted that anchor, so the measurement would return the constant it was built to test.';

alter table public.project_hours enable row level security;

drop policy if exists project_hours_read_all on public.project_hours;
create policy project_hours_read_all on public.project_hours
  for select using (true);

insert into public.project_hours (specialty_id, project_size, hours, provenance, n)
select sp.id, s.size::public.project_size, s.hours, 'reasoned', 0
from public.specialties sp
cross join (values ('small', 8), ('medium', 24), ('large', 60), ('enterprise', 160)) as s(size, hours)
on conflict do nothing;
