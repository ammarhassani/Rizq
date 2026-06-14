-- ─────────────────────────────────────────────────────────────────────────
-- Phase 1.1 — Provenance system on benchmark_records (FLRP spec §M4.2)
-- Adds the 4-collector provenance model alongside the legacy `source` enum.
-- Existing founder-curated seed is reclassified to provenance='founder' so it
-- never masquerades as published data (honesty architecture, spec §II.2).
--
-- The existing private.on_submission_approve() trigger is intentionally NOT
-- modified: the new column DEFAULTS (provenance='submitted', confidence=0.50,
-- captured_at=now()) already produce the right values for an approved crowd
-- submission, so the working trigger keeps functioning untouched.
-- ─────────────────────────────────────────────────────────────────────────

-- Provenance enum: spec §V.2 five values + 'founder' (editorial seed class).
do $$ begin
  create type public.benchmark_provenance as enum (
    'published_ref', 'ingested', 'partner', 'submitted', 'reasoned', 'founder'
  );
exception when duplicate_object then null; end $$;

-- New columns (nullable first so we can backfill, then constrain provenance).
alter table public.benchmark_records
  add column if not exists provenance  public.benchmark_provenance,
  add column if not exists source_ref   text,
  add column if not exists captured_at  timestamptz,
  add column if not exists confidence   numeric(3, 2)
    check (confidence is null or (confidence >= 0 and confidence <= 1)),
  add column if not exists collector_id text;

comment on column public.benchmark_records.provenance is
  'Data origin under the 4-collector model. Drives resolvePrice weighting.';
comment on column public.benchmark_records.confidence is
  'Per-row trust 0..1. Multiplied by provenance weight + freshness in resolvePrice.';
comment on column public.benchmark_records.captured_at is
  'When this row entered our dataset (distinct from recorded_at = when the price was charged).';

-- Backfill existing rows from the legacy `source` enum.
update public.benchmark_records set
  provenance   = 'founder'::public.benchmark_provenance,
  confidence   = 0.30,
  captured_at  = coalesce(captured_at, recorded_at, created_at),
  source_ref   = coalesce(source_ref, 'Rizq founder editorial seed (sprint-3)'),
  collector_id = coalesce(collector_id, 'founder_seed_v1')
where source = 'founder_added' and provenance is null;

update public.benchmark_records set
  provenance   = 'submitted'::public.benchmark_provenance,
  confidence   = case when verified then 0.50 else 0.30 end,
  captured_at  = coalesce(captured_at, recorded_at, created_at),
  source_ref   = coalesce(source_ref, 'verified freelancer submission'),
  collector_id = coalesce(collector_id, 'submitted')
where source = 'user_submitted' and provenance is null;

-- Any other legacy sources (scraped/survey) → submitted-ish, low confidence.
update public.benchmark_records set
  provenance   = 'submitted'::public.benchmark_provenance,
  confidence   = coalesce(confidence, 0.30),
  captured_at  = coalesce(captured_at, recorded_at, created_at),
  collector_id = coalesce(collector_id, 'legacy')
where provenance is null;

-- Enforce NOT NULL + sane defaults for forward inserts (the crowd trigger
-- relies on these defaults).
alter table public.benchmark_records
  alter column provenance set not null,
  alter column provenance set default 'submitted',
  alter column confidence set default 0.50,
  alter column captured_at set default now();

-- Index for provenance-aware reads.
create index if not exists benchmark_provenance_idx
  on public.benchmark_records (specialty_id, experience_tier_id, provenance)
  where active = true and flagged_as_outlier = false;

comment on table public.benchmark_records is
  'Pricing dataset under the FLRP provenance model. Legacy founder seed = provenance:founder (conf 0.30). resolvePrice weights by provenance × confidence × freshness.';
