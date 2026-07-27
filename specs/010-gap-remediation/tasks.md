---
description: "Task list for feature 010 — Gap Remediation & Growth"
---

# Tasks: Gap Remediation & Growth

**Input**: Design documents from `/specs/010-gap-remediation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/payments-tap.md

**Tests**: Included ONLY where the constitution mandates them (Principle IV — money, quota,
eligibility, and honesty/error paths). UI-only edits get a Playwright regression, not a unit.

**Organization**: By user story (priority order). Each story is an independent, shippable slice.

> **Implementation status (2026-07-24):** US1+US2 (P1), US3 FR-005/FR-007 (P2), US5-M4 AI-trend
> (P3), and FR-006 tone quota **SHIPPED** — typecheck clean, `pnpm test` **734/734**, quota
> migration applied to remote. **Deferred:** US5-M8 (FL verification must not be faked — needs a
> real verification mechanism; platform-URLs + rate-insight = clean follow-up). US4 Tap founder-gated.
> **SHIPPED** — typecheck clean, `pnpm test` 724/724. FR-006 (tone quota), US5 (M4-trend +
> M8), and US4 (Tap, founder-gated) **NOT started** — see notes at those tasks. One migration
> created but **not yet applied to remote** (see T016).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different file, no incomplete-task dependency)
- **[Story]**: US1–US5 (setup/foundational/polish carry no story label)

## Path Conventions

Next.js web app, single `src/` at repo root. Migrations in `supabase/migrations/`, catalog in
`messages/{ar,en}.json`, e2e in `e2e/`, units co-located as `*.test.ts`.

---

## Phase 1: Setup (Shared)

**Purpose**: Locate reuse points; no new infrastructure (WidgetError + fl_verified already exist).

- [X] T001 Confirm `Proposals.list.status.*` keys exist for all 7 statuses (draft/final/sent/viewed/accepted/declined/expired) in both `messages/en.json` and `messages/ar.json`; add any missing key in both locales.
- [X] T002 [P] Locate the tone-AI call site + its quota hook (grep `src/lib/ai/tone*` and the calling server action); record the exact file path in a comment on T015.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None. Every slice is an independent edit to existing files — no shared prerequisite
must land first. Slices may proceed in parallel after Setup.

**Checkpoint**: Proceed directly to user stories.

---

## Phase 3: User Story 1 — Honest error states (Priority: P1) 🎯 MVP

**Goal**: M7/M9/M12/Projects render error+retry on a failed read, never a false empty state.

**Independent Test**: Force each page's primary query to fail → `WidgetError` shows; a genuine
zero-row success still shows the empty-state CTA.

### Tests for User Story 1

- [X] T003 [P] [US1] Forced-failure spec — for methodology, calendar, documents, projects: read fails → error+retry present, empty CTA absent; zero-row success → empty CTA present. **Landed as `src/app/__tests__/error-states.test.ts`, not Playwright**: all four reads happen in server components, so a browser-side `page.route()` can't fail them, and the alternatives (a test-only failure flag in product code, or a second dev server behind a failing Supabase proxy) both cost more than they prove. The unit test injects the failure at `createClient()` and walks the returned React element tree — no DOM, no product-source change. Mutation-checked: forcing `loadError = false` in the documents page fails it.

### Implementation for User Story 1

- [X] T004 [P] [US1] `src/app/[locale]/methodology/page.tsx` — destructure `{ data, error }` on the sections read; render `WidgetError` on `error`, empty CTA only on empty success.
- [X] T005 [P] [US1] `src/app/[locale]/calendar/page.tsx` — same error-vs-empty split on the events read.
- [X] T006 [P] [US1] `src/app/[locale]/documents/page.tsx` — same on the vault list read.
- [X] T007 [P] [US1] `src/app/[locale]/projects/page.tsx` — same on the projects list read.
- [X] T008 [US1] No new keys needed — `WidgetError` reuses `Dashboard.couldnTLoad` / `Dashboard.tapRetry`, present in both `messages/ar.json` and `messages/en.json`.

**Checkpoint**: US1 shippable. No raw empty-on-error on the four surfaces.

---

## Phase 4: User Story 2 — Both languages read correctly (Priority: P1)

**Goal**: Recent Proposals status renders a localized label for both locales; no raw enum to `en`.

**Independent Test**: Dashboard in `en` shows "Viewed"/"Declined" (catalog), not `viewed`; `ar`
unchanged.

### Tests for User Story 2

- [X] T009 [P] [US2] Unit `src/components/dashboard/proposalStatus.test.ts` — every status resolves to a non-enum label in `en` (and a Latin-free one in `ar`); unknown enum humanizes, never leaks raw. Maps extracted to `src/components/dashboard/proposalStatus.ts` so the mapping is testable without rendering React.

### Implementation for User Story 2

- [X] T010 [US2] `src/components/dashboard/RecentProposalsWidget.tsx` — replace `isAr ? (statusLabelsAr[p.status] ?? p.status) : p.status` with catalog lookup (`Proposals.list.status.*`) for both locales + a `humanize()` fallback for unknown enums; keep the committed dark-theme status-pill classes.

**Checkpoint**: US1 + US2 both shippable (the P1 MVP).

---

## Phase 5: User Story 3 — Monetization enforced (Priority: P2)

**Goal**: `pro_until` expiry enforced at the single tier check; tone-AI quota wired; pricing free
tier = 5 guarded.

**Independent Test**: `pro_until` in the past → `isPro:false`; tone quota exhausted → refused; 6th
pricing lookup refused (not 4th).

### Tests for User Story 3 (units-first — Principle IV)

- [X] T011 [P] [US3] Unit `src/app/actions/billing/upgrade.test.ts` — `isPro`: past `pro_until`→free, future→pro, null→free, `role='admin'`→pro regardless, `pro_until <= now` (equal)→free.
- [X] T012 [P] [US3] Unit for tone-AI quota — free user at limit → quota-exhausted/upgrade response; under limit → allowed.
- [X] T013 [P] [US3] Unit `src/lib/pricing/quota.test.ts` — regression: `FREE_MONTHLY_QUERIES === 5` (constant exported for the guard).

### Implementation for User Story 3

- [X] T014 [US3] `src/app/actions/billing/upgrade.ts:43-45` — change `isPro` to take `pro_until`: `role==='admin' || (role==='pro' && pro_until != null && new Date(pro_until) > now)`; update `getAuthContext`/`getMyTier` callers so the effective tier flows from the one guarded point.
- [X] T015 [US3] Wire the tone-AI per-tier quota at the call site found in T002 (reuse the pricing quota mechanism); return the standard quota-exhausted response on exceed.
- [X] T016 [US3] Verify `src/lib/pricing/quota.ts` and DB trigger `20260514105416_enforce_query_quota_at_db_level.sql` both enforce 5; fix if either drifted.

**Checkpoint**: Advertised limits == enforced limits; grants lapse correctly.

---

## Phase 6: User Story 5 — M4 AI-trend + M8 FL verification (Priority: P3)

**Goal**: Labeled, non-blocking M4 trend line; M8 FL upload sets `fl_verified` + restores dropped
onboarding pieces.

**Independent Test**: Lookup shows a labeled trend line; DeepSeek timeout → price renders without
it. FL upload → `fl_verified` set, completeness reflects it.

### Tests for User Story 5

- [X] T017 [P] [US5] Unit `src/lib/pricing/aiTrend.test.ts` — model-unavailable → result renders, trend line omitted (never blocks/throws); output carries the `تحليل رِزق —`/`Rizq Insight —` prefix.

### Implementation for User Story 5

- [X] T018 [US5] `src/lib/pricing/aiTrend.ts` (new) — non-blocking DeepSeek call returning a labeled trend annotation; graceful fallback (null) on timeout/unavailable.
- [X] T019 [US5] Wire `aiTrend` into the pricing result render (ResultCard / M4 surface) behind a truthy guard; never await it on the price's critical path.
- [X] ~~T020 [US5] M8 onboarding FL step~~ **DROPPED PERMANENTLY** — a `fl_verified` boolean flipped on upload is a false credibility claim (Principle I). See FR-010.
- [X] T021 [US5] M8 — restored the `platforms` step (StepPlatforms + wizard wiring + save schema + Settings section; columns/grants already existed, no migration) and the step-5 rate reality-check line in OnboardingPricePreview.
- [X] T022 [P] [US5] Trend line + M8 strings — bilingual inline (labels are platform brand names / short comparison lines); no catalog churn.

**Checkpoint**: US5 shippable independently of US1–US3.

---

## Phase 7: User Story 4 — Tap payments (Priority: P3) ⛔ FOUNDER-GATED — DO NOT START

**Goal**: Real Tap checkout + idempotent `pro_until` grant. **Blocked until founder greenlights the
monetization phase** (Constitution: Tap deferred; no scope inflation without founder approval).

**Independent Test** (when greenlit): sandbox payment advances `pro_until`; replayed webhook does
not double-grant; direct client write to `payments`/`users.pro_until` denied by RLS.

- [ ] T023 [US4] ⛔ BLOCKED — Migration in `supabase/migrations/` creating `payments` (per data-model.md) with owner-only SELECT RLS and denied authenticated INSERT/UPDATE.
- [ ] T024 [US4] ⛔ BLOCKED — `src/app/actions/billing/upgrade.ts` — replace `startUpgrade` `coming_soon` stub with Tap charge creation + `payments` insert (`initiated`) + redirect URL (contracts/payments-tap.md §1).
- [ ] T025 [US4] ⛔ BLOCKED — `src/app/api/billing/tap/webhook/route.ts` (new) — signature-verified, idempotent-on-`provider_charge_id` grant that extends `users.pro_until` with `GREATEST` (contracts/payments-tap.md §2).
- [ ] T026 [P] [US4] ⛔ BLOCKED — Unit: replayed `paid` webhook extends `pro_until` exactly once; `pro_until` only moves forward; riba-free/PDPL copy check.

**Checkpoint**: Do not merge any T023–T026 work without founder sign-off.

---

## Phase 8: Polish & Cross-Cutting

- [X] T027 Quickstart validation — US1, US2 and US3 are covered by automated regressions (error-vs-empty tree test, status-label unit, `isPro` expiry + tone quota + `FREE_MONTHLY_QUERIES` units). US5 driven live in Arabic on 2026-07-27, with two findings recorded rather than a tick:
  - **The AI-trend line cannot render with today's corpus.** `computeMarketTrend` needs `MIN_TREND_SAMPLE = 8` rows for one (specialty, city, tier), but the largest such group in `benchmark_records` holds **6** — 0 of 420 groups reach 8 (1,621 records total, Nov 2025 – Jun 2026). Two lookups confirmed it in the browser: the price renders, the trend line is silently absent. The omission is *correct* behaviour (thin data must not assert a direction), but the feature is unreachable in production, so the "labeled, non-blocking" claim has never been seen by a user. Either the trend computes at a wider scope than the band (specialty + tier nationally does clear 8 with a 7-month span) and says so in its label, or the corpus grows first. **Founder call — not taken unilaterally.**
  - The FL-upload half of this step is stale in `quickstart.md`: T020 dropped it permanently (a `fl_verified` boolean flipped on upload is a false credibility claim). Nothing sets `fl_verified` today, by design.
- [X] T028 Merge gate — 2026-07-26: `tsc --noEmit` clean; `pnpm test` 768 tests / 64 files green.
- [X] T029 [P] Follow-up recorded (not attempted here): the remaining inline-ternary copy → `next-intl` catalog migration, tracked in `.claude/CLAUDE.md` under feature 010.

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: start immediately. T001 blocks US2 (T010) and US1 error copy (T008).
- **Foundational (Phase 2)**: empty — no blocker.
- **User stories**: all independent after Setup. Recommended order = priority: US1 → US2 (the P1
  MVP) → US3 → US5. **US4 stays blocked** regardless of the others.
- **Polish (Phase 8)**: after all shipped slices.

### Within each story

- Units/regression (where present) written first and made to fail, then implementation (Principle IV).
- US1 pages (T004–T007) are all `[P]` — different files.
- US3 units (T011–T013) `[P]`; T014 is the shared-point edit (do before/with T015 callers).

### Parallel opportunities

- T004–T007 (four pages) in parallel.
- T011–T013 (three units) in parallel.
- Different stories in parallel by different developers after Setup.

---

## Implementation Strategy

### MVP (P1): US1 + US2

1. Phase 1 Setup → 2. US1 (error states) → 3. US2 (enum labels) → validate → ship. This alone
   closes the honesty/i18n defects on 5 surfaces.

### Incremental

MVP → US3 (monetization) → US5 (M4-trend + M8) → each tested + shipped independently. **US4
(Tap) only enters the pipeline after explicit founder approval.**

---

## Notes

- `[P]` = different files, no dependency. `[Story]` = traceability to spec.md.
- WidgetError and `fl_verified*` columns already exist — reuse, do not recreate.
- Commit small + atomic per task; merge gate is typecheck + test green.
- T014 is the root-cause fix (one shared `isPro`); do not patch expiry per-caller.
