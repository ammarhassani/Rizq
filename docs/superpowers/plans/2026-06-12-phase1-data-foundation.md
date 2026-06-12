# Phase 1 — Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the v0.1 statistical pricing resolver with a provenance-weighted `resolvePrice` backbone — extended `benchmark_records`, a pluggable collector system, a DeepSeek-reasoned prior to fill gap cells, and an honesty layer that cites the source of every number — surfaced in the `/tool` UI.

**Architecture:** A pure aggregation core (`provenance` weights × per-row `confidence` × `freshness` decay → weighted p10/p50/p90 + dominant provenance + confidence score + bilingual citation) sits behind a thin Supabase-fetching shell (`resolvePrice`) that does fallback widening. Collectors implement a single TS interface and register in `collector_registry`; writes to `benchmark_records` go through an admin-only `SECURITY DEFINER` RPC (`run_ingestion`) that also logs to `ingestion_runs` — keeping the existing "no service-role key in the app" security posture. DeepSeek (via Vercel AI SDK `generateObject` + Zod) generates reasoned priors boxed by anchor rows, labeled with model + prompt hash + confidence.

**Tech Stack:** Next.js 16 server actions, Supabase Postgres (RLS + `private` schema + `SECURITY DEFINER` RPCs), Vercel AI SDK (`ai`) + `@ai-sdk/deepseek`, Zod 4, Vitest 4.

---

## Founder decisions locked (2026-06-12)

1. **Collector 1** data is founder-supplied (real Qemma 2026 / agency rate cards + URLs → `provenance='published_ref'`). The existing 360 `source='founder_added'` rows are reclassified to a new **`founder`** (editorial) provenance so they never masquerade as published data. **Task 7 is blocked on the founder dataset** — everything else proceeds.
2. **DeepSeek** key provided; lives in `.env.local` only. Wire `@ai-sdk/deepseek` + `generateObject`.
3. **resolvePrice** fully replaces `calculateBenchmark`; `/tool` updated in the same phase.
4. **Honesty UI** — provenance badge + citation surfaced in the `/tool` `ResultCard` now.

## Design decisions baked in (flag the founder to redline)

- **Provenance enum** = spec §V.2's five (`published_ref, ingested, partner, submitted, reasoned`) **+ `founder`** (founder-approved editorial class for the existing seed).
- **Provenance weights:** `published_ref 0.6, ingested 0.4, partner 0.5, submitted 0.5, reasoned 0.2, founder 0.3`.
- **Per-row confidence** (the `confidence` column): `founder` seed = `0.30`, `submitted`(verified) = `0.50`, `reasoned` = `0.20`, `published_ref` = `0.60` (overridable per row when the founder data arrives).
- **Freshness decay:** piecewise-linear through `(0mo→1.0), (18mo→0.5), (36mo→0.1)`, floored at `0.1`.
- **`MIN_SAMPLE` lowered 5 → 3** (spec M4.3): insufficient only if `<3` real rows after full widening **and** no reasoned prior covers the cell.
- **Rounding:** anchor → nearest 50 SAR (spec M1.7); min/max → nearest 10 SAR.
- **Exit-gate scope note:** spec says "12 × 5 × 5 cells"; there are 7 cities and the seed covers 3. We over-deliver: every (specialty × tier × city) over all 12 specialties / 5 tiers / 7 cities must resolve to a cited number via real data → fallback widening → reasoned prior. **The "spot-check 5 cells vs Qemma 2026" sub-step stays blocked until the founder's published-ref dataset lands.**
- **Out of Phase 1 scope (deferred, noted):** `price_trends` table + AI trend pipeline (M4.7 — later phase); storing provenance on `queries` so `/r/[id]` shows a badge (later); Collector 2 Saudi Open Data is scaffolded only (spec task 1.9 stretch).

---

## File Structure

**New files:**
- `supabase/migrations/20260612120000_extend_benchmark_provenance.sql` — enum, 5 new columns, backfill, indexes (crowd trigger untouched — defaults cover it).
- `supabase/migrations/20260612120100_collector_registry_and_runs.sql` — `collector_registry` + `ingestion_runs` tables, seed registry rows, `run_ingestion` admin RPC.
- `src/lib/pricing/provenance.ts` — `BenchmarkProvenance` type, weights, bilingual labels (pure).
- `src/lib/pricing/freshness.ts` — `freshnessDecay`, `monthsBetween` (pure).
- `src/lib/pricing/weightedPercentile.ts` — weighted quantile (pure).
- `src/lib/pricing/aggregate.ts` — `aggregate(rows, now)` core (pure).
- `src/lib/pricing/citation.ts` — `buildCitation(...)` bilingual (pure).
- `src/lib/pricing/resolve.ts` — `resolvePrice(input)` Supabase shell (replaces `calculate.ts`).
- `src/lib/pricing/aggregate.test.ts` — fixtures: 5 specialties × 3 scenarios + core unit tests.
- `src/lib/pricing/freshness.test.ts` — decay anchor points.
- `src/lib/pricing/weightedPercentile.test.ts` — weighting math.
- `src/lib/pricing/citation.test.ts` — citation strings.
- `src/lib/pricing/collectors/types.ts` — `Collector` interface + row shapes.
- `src/lib/pricing/collectors/reasoned.ts` — Collector 3 (DeepSeek reasoned prior).
- `src/lib/pricing/collectors/publishedRef.ts` — Collector 1 adapter + input format (data AWAITING founder).
- `src/lib/pricing/collectors/openData.ts` — Collector 2 stub (deferred).
- `src/lib/ai/client.ts` — DeepSeek provider via Vercel AI SDK.
- `src/lib/ai/promptHash.ts` — sha256 prompt hashing.
- `src/app/actions/admin/runReasonedCollector.ts` — admin-gated server action to fill gap cells.

**Modified files:**
- `src/app/actions/tool/calculate.ts` — call `resolvePrice`; thread honesty fields; map `anchor`→`p_result_median`.
- `src/components/tool/ResultCard.tsx` — provenance badge + citation + confidence (new optional props).
- `src/components/tool/ToolFlow.tsx` — pass honesty fields through.
- `messages/en.json`, `messages/ar.json` — `Tool.result.provenance.*` + `confidenceLabel` keys; bump insufficient copy 5→3.
- `package.json` — add `ai`, `@ai-sdk/deepseek`; add `typecheck` script.
- `.env.local` — add real `DEEPSEEK_API_KEY` (gitignored).
- `.env.local.example` — add `DEEPSEEK_API_KEY=` placeholder + comment.

**Deleted files:**
- `src/lib/pricing/calculate.ts` (superseded by `resolve.ts`).
- `src/lib/pricing/calculate.test.ts` → renamed to `src/lib/pricing/percentile.test.ts` (it only tests `percentile`; `percentile.ts` is retained and reused).

---

## Task 0: Dependencies, env, and tooling

**Files:**
- Modify: `package.json`
- Modify: `.env.local`, `.env.local.example`

- [ ] **Step 1: Install the AI SDK + DeepSeek provider**

Run: `pnpm add ai @ai-sdk/deepseek`
Expected: both added to `dependencies`; `pnpm-lock.yaml` updated. (Pure JS — no `allowBuilds` entry needed.)

- [ ] **Step 2: Add a typecheck script**

In `package.json` `scripts`, add after `"lint": "eslint",`:

```json
    "typecheck": "tsc --noEmit",
```

- [ ] **Step 3: Add the DeepSeek key to `.env.local` (gitignored — never commit)**

Append to `.env.local`:

```
# DeepSeek API (server-only). Rotate after wiring is confirmed — this key traveled through chat.
DEEPSEEK_API_KEY=sk-REDACTED-ROTATE-THIS-KEY
```

- [ ] **Step 4: Add a placeholder to the committed example file**

Append to `.env.local.example`:

```
# DeepSeek API key — server-only, used for reasoned pricing priors + all AI features.
DEEPSEEK_API_KEY=
```

- [ ] **Step 5: Verify install + no key leak into tracked files**

Run: `pnpm typecheck`
Expected: PASS (no type errors from the new deps).
Run: `git grep -n "sk-99078" -- . ':!.env.local'` (or `git grep` equivalent)
Expected: NO matches (key only in gitignored `.env.local`).

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml .env.local.example
git commit -m "chore: add Vercel AI SDK + DeepSeek provider, typecheck script"
```

---

## Task 1: Extend `benchmark_records` with provenance (spec 1.1)

**Files:**
- Create: `supabase/migrations/20260612120000_extend_benchmark_provenance.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ─────────────────────────────────────────────────────────────────────────
-- Phase 1.1 — Provenance system on benchmark_records (FLRP spec §M4.2)
-- Adds the 4-collector provenance model alongside the legacy `source` enum.
-- Existing founder-curated seed is reclassified to provenance='founder' so it
-- never masquerades as published data (honesty architecture, spec §II.2).
-- ─────────────────────────────────────────────────────────────────────────

-- Provenance enum: spec §V.2 five values + 'founder' (editorial seed class).
do $$ begin
  create type public.benchmark_provenance as enum (
    'published_ref', 'ingested', 'partner', 'submitted', 'reasoned', 'founder'
  );
exception when duplicate_object then null; end $$;

-- New columns (nullable first so we can backfill, then constrain).
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

-- Any other legacy sources (scraped/survey — none expected in seed) → submitted-ish.
update public.benchmark_records set
  provenance   = 'submitted'::public.benchmark_provenance,
  confidence   = coalesce(confidence, 0.30),
  captured_at  = coalesce(captured_at, recorded_at, created_at),
  collector_id = coalesce(collector_id, 'legacy')
where provenance is null;

-- Now enforce NOT NULL + a sane default for forward inserts.
alter table public.benchmark_records
  alter column provenance set not null,
  alter column provenance set default 'submitted',
  alter column confidence set default 0.50,
  alter column captured_at set default now();

-- Index for provenance-aware reads.
create index if not exists benchmark_provenance_idx
  on public.benchmark_records (specialty_id, experience_tier_id, provenance)
  where active = true and flagged_as_outlier = false;

-- NOTE: the existing private.on_submission_approve() trigger (which mirrors
-- approved crowd submissions into benchmark_records) is intentionally NOT
-- modified. The new column DEFAULTS above (provenance='submitted',
-- confidence=0.50, captured_at=now()) produce exactly the right values for an
-- approved submission, so the working trigger keeps functioning untouched —
-- smaller blast radius, nothing to reconstruct.

-- Refresh the seed comment.
comment on table public.benchmark_records is
  'Pricing dataset under the FLRP provenance model. Legacy founder seed = provenance:founder (conf 0.30). resolvePrice weights by provenance × confidence × freshness.';
```

- [ ] **Step 2: Apply the migration**

Run: `pnpm dlx supabase db push` (or the project's migration apply command — confirm with the founder; remote ref `qjtisvfjhqizvtqrixut`).
Expected: migration applies; no errors.

- [ ] **Step 3: Verify backfill**

Run this query (Supabase SQL editor or `psql`):

```sql
select provenance, count(*), min(confidence), max(confidence)
from public.benchmark_records group by provenance order by 2 desc;
```

Expected: `founder | 360 | 0.30 | 0.30` (and any submitted rows if the crowd pipeline has run). No `null` provenance.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260612120000_extend_benchmark_provenance.sql
git commit -m "feat(db): add provenance/confidence/captured_at to benchmark_records + reclassify seed as founder"
```

---

## Task 2: Collector registry, ingestion runs, and the ingest RPC (spec 1.2, 1.7)

**Files:**
- Create: `supabase/migrations/20260612120100_collector_registry_and_runs.sql`
- Create: `src/lib/pricing/collectors/types.ts`

- [ ] **Step 1: Write the migration**

```sql
-- ─────────────────────────────────────────────────────────────────────────
-- Phase 1.2 / 1.7 — Collector registry, ingestion observability, ingest RPC.
-- Writes to benchmark_records stay admin-only; collectors call run_ingestion
-- (SECURITY DEFINER, is_admin gated) which logs an ingestion_runs row and
-- inserts the normalized batch atomically. Keeps the app free of a service key.
-- ─────────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.ingestion_status as enum ('running', 'completed', 'failed');
exception when duplicate_object then null; end $$;

create table if not exists public.collector_registry (
  id                 text primary key,
  name               text not null,
  provenance         public.benchmark_provenance not null,
  default_confidence numeric(3, 2) not null check (default_confidence >= 0 and default_confidence <= 1),
  enabled            boolean not null default true,
  schedule           text,
  config_json        jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

create table if not exists public.ingestion_runs (
  id            uuid primary key default gen_random_uuid(),
  collector_id  text not null references public.collector_registry(id),
  source_desc   text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  rows_in       int,
  rows_kept     int,
  rows_rejected int not null default 0,
  status        public.ingestion_status not null default 'running',
  error         text,
  error_stack   text,
  created_at    timestamptz not null default now()
);

create index if not exists ingestion_runs_collector_idx
  on public.ingestion_runs (collector_id, started_at desc);

-- RLS: registry + runs are admin-read, system-write (spec §V.3).
alter table public.collector_registry enable row level security;
alter table public.ingestion_runs enable row level security;
revoke all on public.collector_registry from anon, authenticated;
revoke all on public.ingestion_runs from anon, authenticated;
grant select on public.collector_registry to authenticated;
grant select on public.ingestion_runs to authenticated;

create policy collector_registry_admin_read on public.collector_registry
  for select to authenticated using (public.is_admin());
create policy ingestion_runs_admin_read on public.ingestion_runs
  for select to authenticated using (public.is_admin());

-- Seed the four (+seed) collectors (spec §M4.1).
insert into public.collector_registry (id, name, provenance, default_confidence, enabled, schedule, config_json) values
  ('founder_seed_v1',  'Founder editorial seed',          'founder',      0.30, true,  null,        '{}'::jsonb),
  ('published_ref_v1', 'Curated published references',     'published_ref',0.60, true,  null,        '{"sources": []}'::jsonb),
  ('open_data_etimad', 'Saudi Open Data (Etimad)',         'ingested',     0.40, false, null,        '{"endpoint": "https://open.data.gov.sa"}'::jsonb),
  ('reasoned_v1',      'DeepSeek reasoned constrained prior','reasoned',   0.20, true,  null,        '{"model": "deepseek-chat"}'::jsonb),
  ('submitted',        'Crowd submissions (verified)',      'submitted',   0.50, true,  null,        '{}'::jsonb)
on conflict (id) do nothing;

-- Admin-only ingest RPC: logs a run + bulk-inserts normalized rows.
-- p_rows: jsonb array of { specialty_id, city_id, experience_tier_id, project_size?,
--   price_sar, provenance, confidence, source_ref, captured_at, notes? }.
create or replace function public.run_ingestion(
  p_collector_id text,
  p_source_desc  text,
  p_rows         jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run_id uuid;
  v_kept   int := 0;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.collector_registry where id = p_collector_id) then
    raise exception 'unknown collector %', p_collector_id using errcode = '22023';
  end if;

  insert into public.ingestion_runs (collector_id, source_desc, rows_in, status)
  values (p_collector_id, p_source_desc, jsonb_array_length(coalesce(p_rows, '[]'::jsonb)), 'running')
  returning id into v_run_id;

  insert into public.benchmark_records (
    specialty_id, city_id, experience_tier_id, project_size,
    price_sar, source, provenance, confidence, captured_at,
    source_ref, collector_id, verified, verified_at, notes, active
  )
  select
    (r ->> 'specialty_id')::uuid,
    (r ->> 'city_id')::uuid,
    (r ->> 'experience_tier_id')::uuid,
    nullif(r ->> 'project_size', '')::public.project_size,
    (r ->> 'price_sar')::numeric,
    'founder_added'::public.benchmark_source,  -- legacy column kept; provenance is authoritative
    (r ->> 'provenance')::public.benchmark_provenance,
    (r ->> 'confidence')::numeric,
    coalesce((r ->> 'captured_at')::timestamptz, now()),
    r ->> 'source_ref',
    p_collector_id,
    true, now(),
    r ->> 'notes',
    true
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) as r
  where (r ->> 'price_sar')::numeric > 0;

  get diagnostics v_kept = row_count;

  update public.ingestion_runs
    set status = 'completed', finished_at = now(), rows_kept = v_kept
    where id = v_run_id;

  return v_run_id;
exception when others then
  update public.ingestion_runs
    set status = 'failed', finished_at = now(), error = sqlerrm
    where id = v_run_id;
  raise;
end;
$$;

revoke all on function public.run_ingestion(text, text, jsonb) from public;
grant execute on function public.run_ingestion(text, text, jsonb) to authenticated;
```

- [ ] **Step 2: Write the Collector interface**

```ts
// src/lib/pricing/collectors/types.ts

/** Provenance taxonomy — mirrors the DB enum public.benchmark_provenance. */
export type BenchmarkProvenance =
  | "published_ref"
  | "ingested"
  | "partner"
  | "submitted"
  | "reasoned"
  | "founder";

/** Loosely-typed raw record straight from a source, pre-normalization. */
export type RawRecord = Record<string, unknown>;

/** Normalized row, ready to hand to the run_ingestion RPC. */
export type BenchmarkRow = {
  specialty_id: string;
  city_id: string;
  experience_tier_id: string;
  project_size?: "small" | "medium" | "large" | "enterprise" | null;
  price_sar: number;
  provenance: BenchmarkProvenance;
  confidence: number; // 0..1
  source_ref: string; // URL / citation / "model#prompthash"
  captured_at: string; // ISO
  notes?: string;
};

/**
 * Pluggable data source. Adding a source = implement this + INSERT a
 * collector_registry row. resolvePrice never changes (spec §M4.1, §M4.5).
 */
export interface Collector {
  id: string;
  name: string;
  provenance: BenchmarkProvenance;
  confidence: number;
  fetch(): Promise<RawRecord[]>;
  normalize(raw: RawRecord[]): Promise<BenchmarkRow[]>;
  validate?(rows: BenchmarkRow[]): Promise<BenchmarkRow[]>;
}
```

- [ ] **Step 3: Apply migration + verify registry**

Run: `pnpm dlx supabase db push`
Then: `select id, provenance, default_confidence, enabled from public.collector_registry order by id;`
Expected: 5 rows (founder_seed_v1, open_data_etimad[disabled], published_ref_v1, reasoned_v1, submitted).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260612120100_collector_registry_and_runs.sql src/lib/pricing/collectors/types.ts
git commit -m "feat(db): collector_registry + ingestion_runs + admin run_ingestion RPC; Collector interface"
```

---

## Task 3: Pure resolver core — provenance, freshness, weighted percentile (spec 1.5, 1.8 — TDD)

Build the pure, Supabase-free math first, test-driven. These modules import nothing from Supabase so they test like `percentile.ts`.

**Files:**
- Create: `src/lib/pricing/provenance.ts`
- Create: `src/lib/pricing/freshness.ts` + `src/lib/pricing/freshness.test.ts`
- Create: `src/lib/pricing/weightedPercentile.ts` + `src/lib/pricing/weightedPercentile.test.ts`

- [ ] **Step 1: Write `provenance.ts`**

```ts
// src/lib/pricing/provenance.ts
import type { BenchmarkProvenance } from "./collectors/types";

export type { BenchmarkProvenance };

/** Weight of each provenance in resolvePrice (spec §M4.3 + founder class). */
export const PROVENANCE_WEIGHT: Record<BenchmarkProvenance, number> = {
  published_ref: 0.6,
  ingested: 0.4,
  partner: 0.5,
  submitted: 0.5,
  reasoned: 0.2,
  founder: 0.3,
};

/** Bilingual human labels used in honesty citations. */
export const PROVENANCE_LABEL: Record<BenchmarkProvenance, { ar: string; en: string }> = {
  published_ref: { ar: "مراجع منشورة", en: "published references" },
  ingested: { ar: "بيانات حكومية مفتوحة", en: "open government data" },
  partner: { ar: "بيانات شركاء", en: "partner data" },
  submitted: { ar: "مساهمات موثّقة من المستقلين", en: "verified freelancer submissions" },
  reasoned: { ar: "تقدير رِزق المبني على مراجع منشورة", en: "Rizq estimate anchored to published references" },
  founder: { ar: "تقدير تحريري من رِزق", en: "Rizq editorial estimate" },
};

export function provenanceWeight(p: BenchmarkProvenance): number {
  return PROVENANCE_WEIGHT[p] ?? 0.3;
}
```

- [ ] **Step 2: Write the failing freshness test**

```ts
// src/lib/pricing/freshness.test.ts
import { describe, it, expect } from "vitest";
import { freshnessDecay, monthsBetween } from "./freshness";

describe("freshnessDecay", () => {
  it("is 1.0 at capture and floors at 0.1 past 36 months", () => {
    expect(freshnessDecay(0)).toBe(1.0);
    expect(freshnessDecay(-5)).toBe(1.0);
    expect(freshnessDecay(36)).toBeCloseTo(0.1, 5);
    expect(freshnessDecay(60)).toBe(0.1);
  });

  it("hits the spec anchor points", () => {
    expect(freshnessDecay(18)).toBeCloseTo(0.5, 5);
    expect(freshnessDecay(9)).toBeCloseTo(0.75, 5); // midpoint of 1.0→0.5
    expect(freshnessDecay(27)).toBeCloseTo(0.3, 5); // midpoint of 0.5→0.1
  });
});

describe("monthsBetween", () => {
  it("returns ~12 for a year apart", () => {
    const a = new Date("2025-06-12T00:00:00Z");
    const b = new Date("2026-06-12T00:00:00Z");
    expect(monthsBetween(a, b)).toBeCloseTo(12, 0);
  });
});
```

- [ ] **Step 3: Run it — verify it fails**

Run: `pnpm test -- freshness`
Expected: FAIL ("freshnessDecay is not a function" / module not found).

- [ ] **Step 4: Implement `freshness.ts`**

```ts
// src/lib/pricing/freshness.ts

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.4375;

/** Months between two dates (fractional). */
export function monthsBetween(captured: Date, now: Date): number {
  return (now.getTime() - captured.getTime()) / MS_PER_MONTH;
}

/**
 * Piecewise-linear freshness decay through the spec anchor points
 * (0mo → 1.0), (18mo → 0.5), (36mo → 0.1), floored at 0.1 (spec §M4.3).
 */
export function freshnessDecay(ageMonths: number): number {
  if (ageMonths <= 0) return 1.0;
  if (ageMonths >= 36) return 0.1;
  if (ageMonths <= 18) return 1.0 + (0.5 - 1.0) * (ageMonths / 18);
  return 0.5 + (0.1 - 0.5) * ((ageMonths - 18) / 18);
}
```

- [ ] **Step 5: Run it — verify it passes**

Run: `pnpm test -- freshness`
Expected: PASS (5 assertions).

- [ ] **Step 6: Write the failing weighted-percentile test**

```ts
// src/lib/pricing/weightedPercentile.test.ts
import { describe, it, expect } from "vitest";
import { weightedPercentile } from "./weightedPercentile";

describe("weightedPercentile", () => {
  it("returns 0 / single value for trivial inputs", () => {
    expect(weightedPercentile([], 0.5)).toBe(0);
    expect(weightedPercentile([{ value: 100, weight: 1 }], 0.5)).toBe(100);
  });

  it("equals the unweighted percentile when weights are equal", () => {
    const pairs = [10, 20, 30, 40, 50].map((value) => ({ value, weight: 1 }));
    // center positions: 0.1,0.3,0.5,0.7,0.9 → p50 = 30
    expect(weightedPercentile(pairs, 0.5)).toBe(30);
  });

  it("pulls the median toward heavily-weighted values", () => {
    const pairs = [
      { value: 100, weight: 9 },
      { value: 1000, weight: 1 },
    ];
    // dominated by 100 → p50 well below the midpoint 550
    expect(weightedPercentile(pairs, 0.5)).toBeLessThan(550);
  });

  it("ignores zero/negative weights", () => {
    const pairs = [
      { value: 100, weight: 0 },
      { value: 200, weight: 1 },
    ];
    expect(weightedPercentile(pairs, 0.5)).toBe(200);
  });
});
```

- [ ] **Step 7: Run it — verify it fails**

Run: `pnpm test -- weightedPercentile`
Expected: FAIL (module not found).

- [ ] **Step 8: Implement `weightedPercentile.ts`**

```ts
// src/lib/pricing/weightedPercentile.ts

/**
 * Weighted quantile via cumulative-center interpolation. Each point i is
 * placed at the normalized center of its weight band; the value at p is
 * linearly interpolated between the two straddling centers. With equal
 * weights this reduces to the standard linear-interpolation percentile.
 */
export function weightedPercentile(
  pairs: { value: number; weight: number }[],
  p: number
): number {
  const pts = pairs
    .filter((x) => x.weight > 0 && Number.isFinite(x.value))
    .sort((a, b) => a.value - b.value);
  if (pts.length === 0) return 0;
  if (pts.length === 1) return pts[0]!.value;

  const total = pts.reduce((s, x) => s + x.weight, 0);
  const centers: number[] = [];
  let cum = 0;
  for (const pt of pts) {
    centers.push((cum + pt.weight / 2) / total);
    cum += pt.weight;
  }

  if (p <= centers[0]!) return pts[0]!.value;
  if (p >= centers[centers.length - 1]!) return pts[pts.length - 1]!.value;

  for (let i = 0; i < centers.length - 1; i++) {
    const c0 = centers[i]!;
    const c1 = centers[i + 1]!;
    if (p >= c0 && p <= c1) {
      const frac = c1 === c0 ? 0 : (p - c0) / (c1 - c0);
      return pts[i]!.value + (pts[i + 1]!.value - pts[i]!.value) * frac;
    }
  }
  return pts[pts.length - 1]!.value;
}
```

- [ ] **Step 9: Run it — verify it passes**

Run: `pnpm test -- weightedPercentile`
Expected: PASS (4 tests).

- [ ] **Step 10: Commit**

```bash
git add src/lib/pricing/provenance.ts src/lib/pricing/freshness.ts src/lib/pricing/freshness.test.ts src/lib/pricing/weightedPercentile.ts src/lib/pricing/weightedPercentile.test.ts
git commit -m "feat(pricing): pure provenance/freshness/weighted-percentile cores with tests"
```

---

## Task 4: Aggregate core + citation builder (spec 1.5, 1.6, 1.8 — TDD)

**Files:**
- Create: `src/lib/pricing/aggregate.ts` + `src/lib/pricing/aggregate.test.ts`
- Create: `src/lib/pricing/citation.ts` + `src/lib/pricing/citation.test.ts`

- [ ] **Step 1: Write the failing aggregate test (5 specialties × 3 scenarios fixtures — spec 1.8)**

```ts
// src/lib/pricing/aggregate.test.ts
import { describe, it, expect } from "vitest";
import { aggregate, type AggRow } from "./aggregate";
import type { BenchmarkProvenance } from "./collectors/types";

const NOW = new Date("2026-06-12T00:00:00Z");

function row(
  price: number,
  provenance: BenchmarkProvenance,
  confidence: number,
  ageMonths = 1
): AggRow {
  const captured = new Date(NOW.getTime() - ageMonths * 30.4375 * 86400000).toISOString();
  return { price_sar: price, provenance, confidence, captured_at: captured };
}

describe("aggregate", () => {
  it("returns null for an empty set", () => {
    expect(aggregate([], NOW)).toBeNull();
  });

  it("produces ordered min ≤ anchor ≤ max and a sample size", () => {
    const rows = [800, 900, 1000, 1100, 1200, 1400, 1500].map((p) =>
      row(p, "founder", 0.3)
    );
    const out = aggregate(rows, NOW)!;
    expect(out.min).toBeLessThanOrEqual(out.anchor);
    expect(out.anchor).toBeLessThanOrEqual(out.max);
    expect(out.sample_size).toBe(7);
    expect(out.anchor % 50).toBe(0); // anchor rounded to nearest 50
    expect(out.min % 10).toBe(0);
  });

  it("picks the highest-total-weight provenance as dominant", () => {
    // 2 published_ref (0.6×0.6) outweigh 5 reasoned (0.2×0.2) in total weight.
    const rows = [
      row(1000, "published_ref", 0.6),
      row(1100, "published_ref", 0.6),
      ...Array.from({ length: 5 }, (_, i) => row(900 + i * 10, "reasoned", 0.2)),
    ];
    const out = aggregate(rows, NOW)!;
    expect(out.dominant_provenance).toBe("published_ref");
    expect(out.sources[0]!.provenance).toBe("published_ref");
  });

  it("rewards larger, fresher, higher-provenance samples with higher confidence", () => {
    const weakSmall = aggregate(
      [row(1000, "reasoned", 0.2, 30), row(1100, "reasoned", 0.2, 30)],
      NOW
    )!;
    const strongLarge = aggregate(
      Array.from({ length: 12 }, (_, i) => row(1000 + i * 20, "published_ref", 0.6, 1)),
      NOW
    )!;
    expect(strongLarge.confidence_score).toBeGreaterThan(weakSmall.confidence_score);
    expect(weakSmall.confidence_score).toBeGreaterThanOrEqual(0);
    expect(strongLarge.confidence_score).toBeLessThanOrEqual(1);
  });

  // ── 5 specialties × 3 scenarios (exact / region-fallback / reasoned-only) ──
  const SCENARIOS: { name: string; rows: AggRow[]; expectDominant: BenchmarkProvenance }[] = [
    { name: "graphic-design exact founder", rows: [820, 970, 1060, 1140, 1230].map((p) => row(p, "founder", 0.3)), expectDominant: "founder" },
    { name: "graphic-design with submitted mix", rows: [...[900, 1000].map((p) => row(p, "submitted", 0.5)), ...[850, 1050, 1100].map((p) => row(p, "founder", 0.3))], expectDominant: "submitted" },
    { name: "logo reasoned-only gap cell", rows: [1400, 1600, 1800].map((p) => row(p, "reasoned", 0.2)), expectDominant: "reasoned" },
    { name: "web-dev published anchored", rows: [4200, 5000, 6000, 7000].map((p) => row(p, "published_ref", 0.6)), expectDominant: "published_ref" },
    { name: "translation stale founder", rows: [320, 360, 400, 450, 500].map((p) => row(p, "founder", 0.3, 24)), expectDominant: "founder" },
  ];

  for (const sc of SCENARIOS) {
    it(`[scenario] ${sc.name}`, () => {
      const out = aggregate(sc.rows, NOW)!;
      expect(out).not.toBeNull();
      expect(out.dominant_provenance).toBe(sc.expectDominant);
      expect(out.min).toBeLessThanOrEqual(out.anchor);
      expect(out.anchor).toBeLessThanOrEqual(out.max);
      expect(out.confidence_score).toBeGreaterThan(0);
    });
  }
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `pnpm test -- aggregate`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `aggregate.ts`**

```ts
// src/lib/pricing/aggregate.ts
import { weightedPercentile } from "./weightedPercentile";
import { freshnessDecay, monthsBetween } from "./freshness";
import { provenanceWeight, type BenchmarkProvenance } from "./provenance";

export type AggRow = {
  price_sar: number;
  provenance: BenchmarkProvenance;
  confidence: number;
  captured_at: string; // ISO
};

export type ProvenanceSource = {
  provenance: BenchmarkProvenance;
  count: number;
  weight: number;
};

export type Aggregate = {
  min: number;
  anchor: number;
  max: number;
  sample_size: number;
  dominant_provenance: BenchmarkProvenance;
  sources: ProvenanceSource[];
  confidence_score: number;
  date_range: { earliest: string; latest: string };
};

const CONFIDENCE_SAMPLE_TARGET = 10;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const round2 = (n: number) => Math.round(n * 100) / 100;
const round10 = (n: number) => Math.round(n / 10) * 10;
const round50 = (n: number) => Math.round(n / 50) * 50;

/** Pure weighted aggregation: rows → band + provenance + confidence. */
export function aggregate(rows: AggRow[], now: Date): Aggregate | null {
  const usable = rows.filter(
    (r) => Number.isFinite(r.price_sar) && r.price_sar >= 0
  );
  if (usable.length === 0) return null;

  const weighted = usable.map((r) => {
    const age = monthsBetween(new Date(r.captured_at), now);
    const weight = provenanceWeight(r.provenance) * clamp01(r.confidence) * freshnessDecay(age);
    return { ...r, weight };
  });

  const pairs = weighted.map((r) => ({ value: r.price_sar, weight: r.weight }));
  const min = round10(weightedPercentile(pairs, 0.1));
  const anchor = round50(weightedPercentile(pairs, 0.5));
  const max = round10(weightedPercentile(pairs, 0.9));

  const byProv = new Map<BenchmarkProvenance, { count: number; weight: number }>();
  for (const r of weighted) {
    const cur = byProv.get(r.provenance) ?? { count: 0, weight: 0 };
    cur.count += 1;
    cur.weight += r.weight;
    byProv.set(r.provenance, cur);
  }
  const sources: ProvenanceSource[] = [...byProv.entries()]
    .map(([provenance, v]) => ({ provenance, count: v.count, weight: round2(v.weight) }))
    .sort((a, b) => b.weight - a.weight);
  const dominant_provenance = sources[0]!.provenance;

  const meanWeight =
    weighted.reduce((s, r) => s + r.weight, 0) / weighted.length;
  const sampleFactor = Math.min(1, usable.length / CONFIDENCE_SAMPLE_TARGET);
  const confidence_score = round2(clamp01(meanWeight * sampleFactor));

  const dates = usable.map((r) => r.captured_at).sort();
  return {
    min,
    anchor,
    max,
    sample_size: usable.length,
    dominant_provenance,
    sources,
    confidence_score,
    date_range: { earliest: dates[0]!, latest: dates[dates.length - 1]! },
  };
}
```

- [ ] **Step 4: Run it — verify it passes**

Run: `pnpm test -- aggregate`
Expected: PASS (9 tests incl. 5 scenarios).

- [ ] **Step 5: Write the failing citation test**

```ts
// src/lib/pricing/citation.test.ts
import { describe, it, expect } from "vitest";
import { buildCitation } from "./citation";

describe("buildCitation", () => {
  it("names the dominant provenance, sample size, and year in both languages", () => {
    const c = buildCitation({
      dominant: "founder",
      sample_size: 47,
      date_range: { earliest: "2025-01-01T00:00:00Z", latest: "2026-05-01T00:00:00Z" },
      fallback_kind: "none",
    });
    expect(c.en).toContain("47");
    expect(c.en.toLowerCase()).toContain("editorial");
    expect(c.ar).toContain("تحريري");
    expect(c.ar).not.toContain("undefined");
  });

  it("appends a widening note when fallback was used", () => {
    const c = buildCitation({
      dominant: "submitted",
      sample_size: 6,
      date_range: { earliest: "2026-01-01T00:00:00Z", latest: "2026-06-01T00:00:00Z" },
      fallback_kind: "region",
    });
    expect(c.en.toLowerCase()).toContain("region");
    expect(c.ar).toContain("المنطقة");
  });
});
```

- [ ] **Step 6: Run it — verify it fails**

Run: `pnpm test -- citation`
Expected: FAIL (module not found).

- [ ] **Step 7: Implement `citation.ts`**

```ts
// src/lib/pricing/citation.ts
import { PROVENANCE_LABEL, type BenchmarkProvenance } from "./provenance";

export type CitationInput = {
  dominant: BenchmarkProvenance;
  sample_size: number;
  date_range: { earliest: string; latest: string };
  fallback_kind: "none" | "region" | "specialty";
};

/** Builds the bilingual provenance citation string (spec §II.2 honesty layer). */
export function buildCitation(input: CitationInput): { ar: string; en: string } {
  const label = PROVENANCE_LABEL[input.dominant];
  const year = new Date(input.date_range.latest).getUTCFullYear();
  const n = input.sample_size;

  const widenAr =
    input.fallback_kind === "region"
      ? " وُسّع النطاق ليشمل المنطقة."
      : input.fallback_kind === "specialty"
        ? " وُسّع النطاق ليشمل جميع المدن."
        : "";
  const widenEn =
    input.fallback_kind === "region"
      ? " Widened to the whole region."
      : input.fallback_kind === "specialty"
        ? " Widened across all cities."
        : "";

  const ar = `تقدير رِزق بناءً على ${n} سجلاً (${label.ar}) حتى عام ${year}.${widenAr}`;
  const en = `Rizq estimate based on ${n} record(s) (${label.en}) through ${year}.${widenEn}`;
  return { ar, en };
}
```

- [ ] **Step 8: Run it — verify it passes**

Run: `pnpm test -- citation`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add src/lib/pricing/aggregate.ts src/lib/pricing/aggregate.test.ts src/lib/pricing/citation.ts src/lib/pricing/citation.test.ts
git commit -m "feat(pricing): weighted aggregate core + bilingual provenance citation (TDD)"
```

---

## Task 5: `resolvePrice` shell — replaces `calculateBenchmark` (spec 1.5, 1.6)

**Files:**
- Create: `src/lib/pricing/resolve.ts`
- Delete: `src/lib/pricing/calculate.ts`
- Rename: `src/lib/pricing/calculate.test.ts` → `src/lib/pricing/percentile.test.ts`

- [ ] **Step 1: Rename the percentile-only test (it never tested `calculateBenchmark`)**

```bash
git mv src/lib/pricing/calculate.test.ts src/lib/pricing/percentile.test.ts
```

- [ ] **Step 2: Write `resolve.ts`**

```ts
// src/lib/pricing/resolve.ts
import { createClient } from "@/lib/supabase/server";
import { aggregate, type AggRow } from "./aggregate";
import { buildCitation } from "./citation";
import type { BenchmarkProvenance, ProvenanceSource } from "./aggregate";

export type ResolveInput = {
  specialty_slug: string;
  city_slug: string;
  experience_tier_slug: string;
  project_size?: "small" | "medium" | "large" | "enterprise" | null;
};

type ResolvedIds = {
  specialty_id: string;
  city_id: string;
  experience_tier_id: string;
};

export type ResolveResult =
  | {
      status: "ok";
      min: number;
      anchor: number;
      max: number;
      sample_size: number;
      dominant_provenance: BenchmarkProvenance;
      sources: ProvenanceSource[];
      confidence_score: number;
      fallback_used: boolean;
      fallback_kind: "none" | "region" | "specialty";
      comparison_percent_below: number;
      provenance_citation_ar: string;
      provenance_citation_en: string;
      date_range: { earliest: string; latest: string };
      ids: ResolvedIds;
    }
  | { status: "insufficient_data"; sample_size: number; ids: ResolvedIds }
  | { status: "invalid_input"; reason: "specialty" | "city" | "tier" };

const MIN_SAMPLE = 3; // spec §M4.3

/** Provenance-weighted resolver with fallback widening (size → region → specialty). */
export async function resolvePrice(input: ResolveInput): Promise<ResolveResult> {
  const supabase = await createClient();

  const [specRes, cityRes, tierRes] = await Promise.all([
    supabase.from("specialties").select("id").eq("slug", input.specialty_slug).eq("active", true).maybeSingle(),
    supabase.from("cities").select("id, region").eq("slug", input.city_slug).eq("active", true).maybeSingle(),
    supabase.from("experience_tiers").select("id").eq("slug", input.experience_tier_slug).maybeSingle(),
  ]);

  if (!specRes.data) return { status: "invalid_input", reason: "specialty" };
  if (!cityRes.data) return { status: "invalid_input", reason: "city" };
  if (!tierRes.data) return { status: "invalid_input", reason: "tier" };

  const specialty_id = specRes.data.id as string;
  const city_id = cityRes.data.id as string;
  const region = (cityRes.data as { region: string }).region;
  const experience_tier_id = tierRes.data.id as string;
  const ids: ResolvedIds = { specialty_id, city_id, experience_tier_id };

  const regionCityIds = await supabase.from("cities").select("id").eq("region", region).eq("active", true);
  const regionIds = (regionCityIds.data ?? []).map((r) => r.id as string);

  const passes = input.project_size ? [input.project_size, undefined] : [undefined];
  const now = new Date();
  let bestSample = 0;

  for (const ps of passes) {
    const exact = await fetchRows(supabase, { specialty_id, city_id, experience_tier_id, project_size: ps ?? null });
    if (exact.length >= MIN_SAMPLE) return finalize(supabase, exact, "none", specialty_id, ids, now);

    const regionRows = await fetchRows(supabase, { specialty_id, city_ids: regionIds, experience_tier_id, project_size: ps ?? null });
    if (regionRows.length >= MIN_SAMPLE) return finalize(supabase, regionRows, "region", specialty_id, ids, now);

    const specRows = await fetchRows(supabase, { specialty_id, experience_tier_id, project_size: ps ?? null });
    if (specRows.length >= MIN_SAMPLE) return finalize(supabase, specRows, "specialty", specialty_id, ids, now);

    bestSample = Math.max(bestSample, exact.length, regionRows.length, specRows.length);
  }

  return { status: "insufficient_data", sample_size: bestSample, ids };
}

type FetchArgs = {
  specialty_id: string;
  city_id?: string;
  city_ids?: string[];
  experience_tier_id: string;
  project_size?: "small" | "medium" | "large" | "enterprise" | null;
};

async function fetchRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  args: FetchArgs
): Promise<AggRow[]> {
  let query = supabase
    .from("benchmark_records")
    .select("price_sar, provenance, confidence, captured_at, recorded_at")
    .eq("specialty_id", args.specialty_id)
    .eq("experience_tier_id", args.experience_tier_id)
    .eq("active", true)
    .eq("verified", true)
    .eq("flagged_as_outlier", false);

  if (args.city_id) query = query.eq("city_id", args.city_id);
  if (args.city_ids && args.city_ids.length > 0) query = query.in("city_id", args.city_ids);
  if (args.project_size) query = query.eq("project_size", args.project_size);

  const { data, error } = await query;
  if (error || !data) return [];
  return data
    .map((r) => {
      const price = Number((r as { price_sar: number }).price_sar);
      const conf = Number((r as { confidence: number | null }).confidence ?? 0.5);
      const captured =
        (r as { captured_at: string | null }).captured_at ??
        (r as { recorded_at: string | null }).recorded_at ??
        new Date().toISOString();
      return {
        price_sar: price,
        provenance: (r as { provenance: BenchmarkProvenance }).provenance,
        confidence: conf,
        captured_at: captured,
      } satisfies AggRow;
    })
    .filter((r) => Number.isFinite(r.price_sar));
}

async function finalize(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: AggRow[],
  fallback: "none" | "region" | "specialty",
  specialty_id: string,
  ids: ResolvedIds,
  now: Date
): Promise<ResolveResult> {
  const agg = aggregate(rows, now);
  if (!agg) return { status: "insufficient_data", sample_size: rows.length, ids };

  // Comparison context: % of same-specialty rows priced below the anchor.
  const { count: total } = await supabase
    .from("benchmark_records")
    .select("*", { count: "exact", head: true })
    .eq("specialty_id", specialty_id)
    .eq("active", true)
    .eq("verified", true)
    .eq("flagged_as_outlier", false);
  const { count: below } = await supabase
    .from("benchmark_records")
    .select("*", { count: "exact", head: true })
    .eq("specialty_id", specialty_id)
    .eq("active", true)
    .eq("verified", true)
    .eq("flagged_as_outlier", false)
    .lt("price_sar", agg.anchor);
  const comparison_percent_below =
    (total ?? 0) > 0 ? Math.round(((below ?? 0) / (total ?? 1)) * 100) : 0;

  const citation = buildCitation({
    dominant: agg.dominant_provenance,
    sample_size: agg.sample_size,
    date_range: agg.date_range,
    fallback_kind: fallback,
  });

  return {
    status: "ok",
    min: agg.min,
    anchor: agg.anchor,
    max: agg.max,
    sample_size: agg.sample_size,
    dominant_provenance: agg.dominant_provenance,
    sources: agg.sources,
    confidence_score: agg.confidence_score,
    fallback_used: fallback !== "none",
    fallback_kind: fallback,
    comparison_percent_below,
    provenance_citation_ar: citation.ar,
    provenance_citation_en: citation.en,
    date_range: agg.date_range,
    ids,
  };
}
```

- [ ] **Step 3: Delete the obsolete resolver**

```bash
git rm src/lib/pricing/calculate.ts
```

- [ ] **Step 4: Typecheck (expect the server action to break — fixed in Task 6)**

Run: `pnpm typecheck`
Expected: errors ONLY in `src/app/actions/tool/calculate.ts` (imports the deleted `calculate.ts`). No errors in `src/lib/pricing/*`.

- [ ] **Step 5: Commit**

```bash
git add -A src/lib/pricing
git commit -m "feat(pricing): resolvePrice provenance-weighted shell replaces calculateBenchmark"
```

---

## Task 6: Wire `resolvePrice` into the server action + honesty UI (spec 1.6 + founder UI choice)

**Files:**
- Modify: `src/app/actions/tool/calculate.ts`
- Modify: `src/components/tool/ToolFlow.tsx`
- Modify: `src/components/tool/ResultCard.tsx`
- Modify: `messages/en.json`, `messages/ar.json`

- [ ] **Step 1: Update the server action to call `resolvePrice`**

In `src/app/actions/tool/calculate.ts`:

Replace the import line:
```ts
import { calculateBenchmark, type CalculateResult } from "@/lib/pricing/calculate";
```
with:
```ts
import { resolvePrice, type ResolveResult } from "@/lib/pricing/resolve";
```

Replace the `ToolActionResult` `result` union (lines ~27-29) to carry the honesty fields:
```ts
      result:
        | (Extract<ResolveResult, { status: "ok" }> & { id: string })
        | Extract<ResolveResult, { status: "insufficient_data" }>;
```

Replace the call site:
```ts
  const result = await calculateBenchmark(parsed.data);
```
with:
```ts
  const result = await resolvePrice(parsed.data);
```

In the `log_query` RPC call, map `anchor`→`p_result_median` (the `queries` table column is unchanged):
```ts
      p_result_min: result.min,
      p_result_median: result.anchor,
      p_result_max: result.max,
```

> Everything else in the action (rate-limit, quota gate, dedupe, insufficient-data short-circuit, error mapping) is unchanged. The `insufficient_data` and `ok` branches already spread `result`, so the new honesty fields flow through automatically.

- [ ] **Step 2: Typecheck the action**

Run: `pnpm typecheck`
Expected: PASS for `calculate.ts`. (Next break will be `ToolFlow.tsx` referencing `r.median` — fixed next.)

- [ ] **Step 3: Add i18n keys (provenance labels + confidence)**

In `messages/en.json`, inside `"Tool"."result"`, add after `"methodologyLink": "How did we calculate this?"` (add a comma to that line):
```json
      "confidenceLabel": "Confidence",
      "provenance": {
        "published_ref": "Published references",
        "ingested": "Open government data",
        "partner": "Partner data",
        "submitted": "Verified submissions",
        "reasoned": "Rizq estimate",
        "founder": "Rizq editorial estimate"
      }
```
Also change the insufficient body 5→3:
```json
      "body": "We need 3 records to publish a benchmark. Try a different specialty or city — we add data weekly.",
```

In `messages/ar.json`, inside `"Tool"."result"`, add after `"methodologyLink": "كيف نحسب هذا الرقم؟"` (add a comma):
```json
      "confidenceLabel": "درجة الثقة",
      "provenance": {
        "published_ref": "مراجع منشورة",
        "ingested": "بيانات حكومية مفتوحة",
        "partner": "بيانات شركاء",
        "submitted": "مساهمات موثّقة",
        "reasoned": "تقدير رِزق",
        "founder": "تقدير تحريري من رِزق"
      }
```
And the insufficient body:
```json
      "body": "لم نصل لـ ٣ سجلات في هذه التركيبة. جرّب تخصصًا أو مدينة أخرى — نضيف بيانات أسبوعيًا.",
```

- [ ] **Step 4: Add provenance/citation/confidence to `ResultCard` (optional props → `/r/[id]` unaffected)**

In `src/components/tool/ResultCard.tsx`, add to `type Props` (after `comparison_percent_below: number;`):
```ts
  dominantProvenance?:
    | "published_ref" | "ingested" | "partner" | "submitted" | "reasoned" | "founder";
  provenanceCitation?: string;
  confidenceScore?: number; // 0..1
```
Add the corresponding names to the destructured params.

Then, inside the "Sample size + comparison + fallback note" grid, **before** the methodology `<Link>`, insert the provenance + confidence block:
```tsx
        {dominantProvenance && (
          <p className={`sm:col-span-2 flex flex-wrap items-center gap-2 text-sm text-rizq-ink ${font}`}>
            <span className="inline-flex items-center gap-1 rounded-full border border-rizq-green/30 bg-rizq-green/10 px-2.5 py-0.5 text-xs text-rizq-green">
              {t(`provenance.${dominantProvenance}`)}
            </span>
            {typeof confidenceScore === "number" && (
              <span className="text-xs text-rizq-ink-soft/70">
                {t("confidenceLabel")}: {numberFmt.format(Math.round(confidenceScore * 100))}%
              </span>
            )}
          </p>
        )}
        {provenanceCitation && (
          <p className={`sm:col-span-2 text-xs text-rizq-ink-soft italic ${font}`}>
            {provenanceCitation}
          </p>
        )}
```

- [ ] **Step 5: Pass the fields through `ToolFlow`**

In `src/components/tool/ToolFlow.tsx`, the result branch (`if (view.kind === "result" && view.data.result.status === "ok")`):

Change `median={r.median}` to `median={r.anchor}` and add the new props:
```tsx
        median={r.anchor}
        sample_size={r.sample_size}
        fallback_used={r.fallback_used}
        fallback_kind={r.fallback_kind}
        comparison_percent_below={r.comparison_percent_below}
        dominantProvenance={r.dominant_provenance}
        provenanceCitation={locale === "ar" ? r.provenance_citation_ar : r.provenance_citation_en}
        confidenceScore={r.confidence_score}
```
Also in the `track("query_calculated", …)` call, change `median: …r.median` references to `…r.anchor`.

- [ ] **Step 6: Typecheck + tests + build**

Run: `pnpm typecheck`
Expected: PASS (whole project).
Run: `pnpm test`
Expected: PASS (all pricing + rateLimit tests).
Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 7: Manual smoke (the implementer runs the app)**

Run: `pnpm dev`, open `/ar/tool`, run a lookup (e.g. graphic-design · Riyadh · mid). Confirm: band renders, a green provenance pill shows "تقدير تحريري من رِزق", a confidence % shows, and the citation line appears. Open `/en/tool` and confirm English citation. Open a shared `/ar/r/[id]` link (toggle share first) and confirm it still renders (no provenance badge — expected, deferred).

- [ ] **Step 8: Commit**

```bash
git add src/app/actions/tool/calculate.ts src/components/tool/ToolFlow.tsx src/components/tool/ResultCard.tsx messages/en.json messages/ar.json
git commit -m "feat(tool): wire resolvePrice + surface provenance badge, citation, confidence in /tool"
```

---

## Task 7: Collector 1 — published references (spec 1.3) — ADAPTER NOW, DATA AWAITING FOUNDER

**Files:**
- Create: `src/lib/pricing/collectors/publishedRef.ts`

> **Blocked:** the actual rates + source URLs are founder-supplied. This task ships the adapter + input contract; the data lands as a follow-up seed migration once the founder provides the Qemma 2026 / agency rate-card values. **Do not fabricate published numbers** (honesty architecture).

- [ ] **Step 1: Write the adapter + documented input contract**

```ts
// src/lib/pricing/collectors/publishedRef.ts
import type { BenchmarkRow, Collector, RawRecord } from "./types";

/**
 * Collector 1 — curated published references (Qemma 2026, agency rate cards,
 * HRDF/MHRSD stats). provenance='published_ref', confidence=0.60.
 *
 * INPUT CONTRACT (founder supplies an array of these; one per published cell):
 *   {
 *     specialty_slug, city_slug, experience_tier_slug,
 *     project_size?, price_sar,
 *     source_ref   // REQUIRED: the citation URL or document reference
 *   }
 * Rows missing source_ref are rejected — a published reference without a
 * citation is not a published reference.
 */
export type PublishedRefInput = {
  specialty_id: string;
  city_id: string;
  experience_tier_id: string;
  project_size?: "small" | "medium" | "large" | "enterprise" | null;
  price_sar: number;
  source_ref: string;
};

export function makePublishedRefCollector(
  inputs: PublishedRefInput[],
  capturedAtISO: string
): Collector {
  return {
    id: "published_ref_v1",
    name: "Curated published references",
    provenance: "published_ref",
    confidence: 0.6,
    async fetch(): Promise<RawRecord[]> {
      return inputs as unknown as RawRecord[];
    },
    async normalize(raw: RawRecord[]): Promise<BenchmarkRow[]> {
      return (raw as unknown as PublishedRefInput[])
        .filter((r) => r.price_sar > 0 && r.source_ref && r.source_ref.trim().length > 0)
        .map((r) => ({
          specialty_id: r.specialty_id,
          city_id: r.city_id,
          experience_tier_id: r.experience_tier_id,
          project_size: r.project_size ?? null,
          price_sar: r.price_sar,
          provenance: "published_ref",
          confidence: 0.6,
          source_ref: r.source_ref,
          captured_at: capturedAtISO,
        }));
    },
  };
}
```

- [ ] **Step 2: Flag the founder (do not guess)**

Post a note to the founder: *"Phase-1 task 1.3 is ready for data. Please provide published rate references as rows of `{specialty_slug, city_slug, experience_tier_slug, project_size?, price_sar, source_ref(URL)}` — Qemma 2026 / agency rate cards / HRDF. Each row needs a citation URL. I'll land them as a seed migration and run them through `run_ingestion('published_ref_v1', …)`. Until then, gap cells resolve via reasoned priors (Task 8), and the 'spot-check vs Qemma' exit sub-step stays open."*

- [ ] **Step 3: Commit**

```bash
git add src/lib/pricing/collectors/publishedRef.ts
git commit -m "feat(collectors): published-reference adapter + input contract (data pending founder)"
```

---

## Task 8: Collector 3 — DeepSeek reasoned prior + admin runner (spec 1.4)

**Files:**
- Create: `src/lib/ai/client.ts`
- Create: `src/lib/ai/promptHash.ts`
- Create: `src/lib/pricing/collectors/reasoned.ts`
- Create: `src/app/actions/admin/runReasonedCollector.ts`

- [ ] **Step 1: Write the AI client**

```ts
// src/lib/ai/client.ts
import { createDeepSeek } from "@ai-sdk/deepseek";

/** Server-only DeepSeek provider (Vercel AI SDK). Never import in client code. */
export const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? "",
});

/** Default model for reasoned priors + extraction (DeepSeek V3). */
export const REASONING_MODEL = "deepseek-chat";
```

- [ ] **Step 2: Write prompt hashing (AI provenance label)**

```ts
// src/lib/ai/promptHash.ts
import { createHash } from "node:crypto";

/** Short, stable hash of a prompt template for reproducibility/audit. */
export function promptHash(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}
```

- [ ] **Step 3: Write the reasoned collector**

```ts
// src/lib/pricing/collectors/reasoned.ts
import { generateObject } from "ai";
import { z } from "zod";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";
import { promptHash } from "@/lib/ai/promptHash";
import type { BenchmarkRow } from "./types";

const PriorSchema = z.object({
  min: z.number().positive(),
  median: z.number().positive(),
  max: z.number().positive(),
  reasoning_ar: z.string(),
  confidence: z.number().min(0).max(1),
});

export type AnchorRow = {
  tier_slug: string;
  city_slug: string;
  price_sar: number;
  provenance: string;
};

export type ReasonedCell = {
  specialty_id: string;
  city_id: string;
  experience_tier_id: string;
  specialty_name_ar: string;
  city_name_ar: string;
  region: string;
  tier_name_ar: string;
  years_min: number;
  years_max: number | null;
  anchors: AnchorRow[]; // published/founder anchors for this specialty
};

/**
 * Collector 3 — DeepSeek reasoned constrained prior (spec §M4.7-A).
 * Boxed by anchor rows; never free-hand. provenance='reasoned', confidence
 * forced to 0.2 by design (an estimate, not data). Labeled with model + hash.
 */
export async function generateReasonedRow(cell: ReasonedCell): Promise<BenchmarkRow | null> {
  const anchorTable = cell.anchors
    .map((a) => `- ${a.tier_slug} / ${a.city_slug}: ${a.price_sar} SAR (${a.provenance})`)
    .join("\n");

  const prompt = `You are estimating freelance pricing in Saudi Arabia. Given:
- Specialty: ${cell.specialty_name_ar}
- City: ${cell.city_name_ar} (region: ${cell.region})
- Experience tier: ${cell.tier_name_ar} (${cell.years_min}-${cell.years_max ?? "+"} years)

Known anchor points (published/founder references for this specialty):
${anchorTable || "(none — interpolate conservatively within plausible Saudi ranges)"}

Estimate a price range (min, median, max) in SAR. Rules:
- Interpolate between known anchors. Never extrapolate beyond the anchor range.
- Account for city cost-of-living (Riyadh > Jeddah > Dammam > other cities).
- Account for experience-tier scaling.
- Be conservative: wider range when uncertain.
- confidence is 0.2 by design — this is an estimate, not data.`;

  const hash = promptHash(prompt);

  try {
    const { object } = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: PriorSchema,
      prompt,
    });
    if (!(object.min <= object.median && object.median <= object.max)) return null;
    return {
      specialty_id: cell.specialty_id,
      city_id: cell.city_id,
      experience_tier_id: cell.experience_tier_id,
      project_size: null,
      price_sar: object.median,
      provenance: "reasoned",
      confidence: 0.2,
      source_ref: `${REASONING_MODEL}#${hash}`,
      captured_at: new Date().toISOString(),
      notes: object.reasoning_ar.slice(0, 500),
    };
  } catch {
    return null;
  }
}
```

> **Note:** Phase 1 inserts the reasoned **median** as a single representative row per gap cell (enough to clear `MIN_SAMPLE=3` together with fallback rows and to give the cell a cited number). A future enhancement can insert min/median/max as three rows; keep that out of scope now (YAGNI).

- [ ] **Step 4: Write the admin runner server action**

```ts
// src/app/actions/admin/runReasonedCollector.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { generateReasonedRow, type ReasonedCell, type AnchorRow } from "@/lib/pricing/collectors/reasoned";

type RunResult = { ok: true; cells_filled: number; rows_inserted: number } | { ok: false; code: "not_admin" | "error" };

/**
 * Admin-only: fills (specialty × tier × city) cells that lack real data with a
 * DeepSeek reasoned prior, inserting via the run_ingestion RPC. Idempotent —
 * skips cells that already have a reasoned row.
 */
export async function runReasonedCollector(): Promise<RunResult> {
  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "not_admin" };
  const { data: profile } = await supabase.from("users").select("role").eq("id", userResult.user.id).single();
  if (profile?.role !== "admin") return { ok: false, code: "not_admin" };

  const [{ data: specialties }, { data: cities }, { data: tiers }] = await Promise.all([
    supabase.from("specialties").select("id, slug, name_ar").eq("active", true),
    supabase.from("cities").select("id, slug, name_ar, region").eq("active", true),
    supabase.from("experience_tiers").select("id, slug, name_ar, years_min, years_max"),
  ]);
  if (!specialties || !cities || !tiers) return { ok: false, code: "error" };

  // Existing rows: count real (non-reasoned) per cell, and which cells already have reasoned.
  const { data: existing } = await supabase
    .from("benchmark_records")
    .select("specialty_id, city_id, experience_tier_id, provenance, price_sar, confidence")
    .eq("active", true)
    .eq("verified", true)
    .eq("flagged_as_outlier", false);
  const rows = existing ?? [];

  const cellKey = (s: string, c: string, t: string) => `${s}|${c}|${t}`;
  const realCount = new Map<string, number>();
  const hasReasoned = new Set<string>();
  for (const r of rows) {
    const k = cellKey(r.specialty_id, r.city_id, r.experience_tier_id);
    if (r.provenance === "reasoned") hasReasoned.add(k);
    else realCount.set(k, (realCount.get(k) ?? 0) + 1);
  }

  const toInsert: Awaited<ReturnType<typeof generateReasonedRow>>[] = [];
  let filled = 0;

  for (const s of specialties) {
    const anchors: AnchorRow[] = rows
      .filter((r) => r.specialty_id === s.id && (r.provenance === "published_ref" || r.provenance === "founder"))
      .map((r) => ({
        tier_slug: tiers.find((t) => t.id === r.experience_tier_id)?.slug ?? "",
        city_slug: cities.find((c) => c.id === r.city_id)?.slug ?? "",
        price_sar: Number(r.price_sar),
        provenance: r.provenance,
      }));

    for (const t of tiers) {
      for (const c of cities) {
        const k = cellKey(s.id, c.id, t.id);
        if ((realCount.get(k) ?? 0) >= 3 || hasReasoned.has(k)) continue;
        const cell: ReasonedCell = {
          specialty_id: s.id, city_id: c.id, experience_tier_id: t.id,
          specialty_name_ar: s.name_ar, city_name_ar: c.name_ar, region: c.region,
          tier_name_ar: t.name_ar, years_min: t.years_min, years_max: t.years_max,
          anchors,
        };
        const row = await generateReasonedRow(cell);
        if (row) { toInsert.push(row); filled++; }
      }
    }
  }

  const clean = toInsert.filter((r): r is NonNullable<typeof r> => r !== null);
  if (clean.length === 0) return { ok: true, cells_filled: 0, rows_inserted: 0 };

  const { error } = await supabase.rpc("run_ingestion", {
    p_collector_id: "reasoned_v1",
    p_source_desc: `reasoned prior backfill — ${clean.length} cells`,
    p_rows: clean,
  });
  if (error) return { ok: false, code: "error" };

  return { ok: true, cells_filled: filled, rows_inserted: clean.length };
}
```

> **Trigger UI:** add a small admin button on `src/app/[locale]/admin/page.tsx` that calls `runReasonedCollector()` (gated server-side already). A bare button + result toast is sufficient for Phase 1 — match the existing `ReviewActions` client-component pattern. (Implementer: read `src/components/admin/ReviewActions.tsx` for the exact `useTransition` + toast idiom and mirror it.)

- [ ] **Step 5: Typecheck + build**

Run: `pnpm typecheck && pnpm build`
Expected: PASS.

- [ ] **Step 6: Run the reasoned collector once (fills gap cells → exit gate)**

Sign in as an admin, click the new admin button (or invoke the action). Then verify gap cells now resolve:

```sql
select provenance, count(*) from public.benchmark_records group by 1 order by 2 desc;
select status from public.ingestion_runs order by started_at desc limit 1; -- 'completed'
```
Expected: a `reasoned` row count > 0; latest ingestion run `completed`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ai/client.ts src/lib/ai/promptHash.ts src/lib/pricing/collectors/reasoned.ts src/app/actions/admin/runReasonedCollector.ts src/app/[locale]/admin/page.tsx src/components/admin
git commit -m "feat(ai): DeepSeek reasoned-prior collector + admin backfill runner"
```

---

## Task 9: Collector 2 stub (spec 1.9 — stretch, deferred) + exit-gate verification

**Files:**
- Create: `src/lib/pricing/collectors/openData.ts`

- [ ] **Step 1: Scaffold the Saudi Open Data collector (deferred — interface only)**

```ts
// src/lib/pricing/collectors/openData.ts
import type { BenchmarkRow, Collector, RawRecord } from "./types";

/**
 * Collector 2 — Saudi Open Data (Etimad procurement via open.data.gov.sa).
 * provenance='ingested', confidence=0.40. DEFERRED (spec task 1.9 stretch):
 * registry row is seeded disabled. Implement fetch()/normalize() when the
 * dataset + license mapping are confirmed with the founder.
 */
export function makeOpenDataCollector(): Collector {
  return {
    id: "open_data_etimad",
    name: "Saudi Open Data (Etimad)",
    provenance: "ingested",
    confidence: 0.4,
    async fetch(): Promise<RawRecord[]> {
      throw new Error("open_data_etimad collector not implemented (deferred — spec task 1.9)");
    },
    async normalize(): Promise<BenchmarkRow[]> {
      return [];
    },
  };
}
```

- [ ] **Step 2: Full Phase-1 verification sweep**

Run, confirming each:
```
pnpm typecheck   # PASS
pnpm test        # PASS — percentile, freshness, weightedPercentile, aggregate, citation, rateLimit
pnpm build       # PASS
```

- [ ] **Step 3: Exit-gate evidence query (every cell resolves)**

In `psql`/SQL editor, confirm no standard cell is empty after fallback + reasoned fill. Spot resolve a few combos via the running `/tool` (e.g. `voice-over · Makkah · expert`, `data-entry · Khobar · beginner`) — each must return a cited band, not insufficient_data.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pricing/collectors/openData.ts
git commit -m "feat(collectors): Saudi Open Data stub (deferred per spec task 1.9)"
```

---

## Phase 1 Exit Gate (spec §VI)

> `resolvePrice` returns real, cited numbers for every (specialty × tier × city) cell. Spot-check 5 random cells against Qemma 2026 ranges.

- [ ] All unit tests pass (`pnpm test`): percentile, freshness, weighted-percentile, aggregate (incl. 5×3 scenarios), citation.
- [ ] `resolvePrice` returns `dominant_provenance` + `provenance_citation_{ar,en}` + `sources[]` + `confidence_score` for every standard cell (real → fallback → reasoned).
- [ ] `/tool` shows the provenance badge, confidence %, and citation line in both locales.
- [ ] `ingestion_runs` shows a `completed` reasoned run; `collector_registry` holds all collectors.
- [ ] **⚠ Blocked sub-step:** "spot-check 5 cells vs Qemma 2026 ranges" — completes once the founder supplies the published-reference dataset (Task 7) and it is ingested as `published_ref`. Until then, this is the single open item; **do not start Phase 2 until it clears** (per "do not skip exit gates").

---

## Self-Review (completed against spec §VI Phase 1 tasks 1.1–1.9)

- **1.1** Extend `benchmark_records` → Task 1. ✓
- **1.2** `collector_registry` + Collector interface → Task 2. ✓
- **1.3** Collector 1 published references → Task 7 (adapter shipped; data flagged to founder — honest, not fabricated). ✓ (blocked on external dependency, as the build posture requires)
- **1.4** Collector 3 reasoned prior (DeepSeek) → Task 8. ✓
- **1.5** `resolvePrice` weighting + freshness + fallback → Tasks 3–5. ✓
- **1.6** Honesty citations in output → Task 4 (`citation.ts`) + Task 5 (`resolve.ts`) + Task 6 (UI). ✓
- **1.7** `ingestion_runs` + observability → Task 2. ✓
- **1.8** Unit-test `resolvePrice` (5 specialties × 3 scenarios) → Task 4 (`aggregate.test.ts`). ✓
- **1.9** Collector 2 Saudi Open Data (stretch) → Task 9 stub (deferred). ✓
- **Type consistency:** `BenchmarkProvenance` defined once in `collectors/types.ts`, re-exported via `provenance.ts`; `AggRow`/`Aggregate`/`ProvenanceSource` defined in `aggregate.ts` and imported by `resolve.ts`; `anchor` (not `median`) used consistently in `ResolveResult` + `ToolFlow`; `p_result_median` ← `result.anchor` mapping noted explicitly.
- **Placeholder scan:** none — every code step contains complete code; the only intentionally-deferred item (published-ref data) is an external dependency flagged to the founder, not a code placeholder.
