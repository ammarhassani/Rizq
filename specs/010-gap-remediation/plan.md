# Implementation Plan: Gap Remediation & Growth

**Branch**: `010-gap-remediation` | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-gap-remediation/spec.md`

## Summary

Close the highest-ratio post-009 gaps in priority-ordered, independently-shippable slices:
(P1) replace swallowed-error empty states with `WidgetError` retry on M7/M9/M12/Projects and
localize the Recent Proposals status enum; (P2) enforce `pro_until` expiry at the single tier
check and wire the tone-AI quota; (P3, **founder-gated**) Tap checkout; (P3) M4 AI-trend
layer + M8 FL verification. No migration for P1–P2/US5-M8; only the founder-gated Tap slice
adds a Payment table. Every money/quota change is unit-tested first (Principle IV).

## Technical Context

**Language/Version**: TypeScript, Next.js 16 App Router, React 19

**Primary Dependencies**: Supabase (Postgres + Auth + RLS), `next-intl`, DeepSeek via Vercel
AI SDK (`ai`, `@ai-sdk/deepseek`), Tailwind v4 + shadcn/ui, Framer Motion. Vitest for units,
Playwright for e2e. US4 only: `@tap-payments/*` (or REST) + Resend — **not installed until
greenlit**.

**Storage**: Supabase Postgres, RLS on every table. US1–US3 + US5 touch no schema. US4 adds a
`payments` table (provider charge id, amount, status, idempotency key) + RLS.

**Testing**: Vitest units with hand-built fixtures for tier/quota/error paths; Playwright
regression for error-state and enum-locale rendering (extends the committed `e2e/` harness).

**Target Platform**: Vercel serverless; mobile-first web (70%+ Saudi mobile traffic).

**Project Type**: Web application (Next.js App Router monorepo-style `src/`).

**Performance Goals**: No new blocking calls on render paths. M4 AI-trend is non-blocking —
the resolver result renders without waiting on DeepSeek.

**Constraints**: Honesty (Principle I) — no figure/label without provenance or a localized
key; AI output labeled. Arabic-first, both locales via catalog. Merge gate: `pnpm typecheck`
clean + `pnpm test` green.

**Scale/Scope**: 4 error surfaces + 1 enum widget (P1); 1 shared tier fn + 1 quota (P2); 1
payment flow (P3 gated); 2 feature builds (P3). ~13 source touch-points below.

### Anchor evidence (spec-vs-code)

- Tier expiry root: `src/app/actions/billing/upgrade.ts:43-45` — `isPro(role)` ignores
  `pro_until`; a `pro` grant never lapses. Single shared point → one guarded branch (FR-005).
- Reusable error state: `src/components/dashboard/WidgetError.tsx` (shipped 008); apply to
  `src/app/[locale]/methodology/page.tsx:113-116`, `calendar/page.tsx`, `documents/page.tsx`,
  `projects/page.tsx` (each destructures `{ data }`, ignores `error`).
- Enum leak: `src/components/dashboard/RecentProposalsWidget.tsx:~96` renders `p.status` raw
  for `en`; localized labels exist unused at `Proposals.list.status.*` in `messages/*.json`.
- Pricing quota (regression-guard FR-007): `src/lib/pricing/quota.ts` (`FREE_MONTHLY_QUERIES`)
  + DB trigger `20260514105416_enforce_query_quota_at_db_level.sql`.
- US4 stub: `upgrade.ts` `StartUpgradeResult.status = "coming_soon"` until Tap wired.

## Constitution Check

*GATE: passed (pre-Phase-0). Re-checked post-design — still passes.*

| Principle | Status | Note |
|---|---|---|
| I. Honesty (NON-NEGOTIABLE) | ✅ advances it | US1 removes false empty states; US2 removes raw-enum leak; US5 M4-trend is labeled + degrades gracefully. |
| II. Arabic-first / both locales | ✅ | US2 fixes an `en` leak; FR-011 requires catalog for all new strings. |
| III. Mobile-first | ✅ | No new layouts; error/retry states reuse the mobile-verified dashboard pattern. |
| IV. Test money & rules | ✅ gate | FR-012: units-first for FR-005/006/007 (+008 when greenlit). |
| V. Modules stand on own feet | ✅ | US1 completes the error-state requirement on 4 modules. |
| VI. Halal / Saudi / PDPL | ⚠️ US4 only | Tap flow must be riba-free + PDPL; **founder-gated**, not built now. |
| VII. AI as multiplier, labeled | ✅ | US5 M4-trend has a specific prompt/output/benefit, labeled, graceful fallback. |

**No violations to justify.** The single scope-sensitive item (Tap payments, US4) is a
constitution-declared *deferred* dependency and is explicitly founder-gated in the spec and
this plan — not inflated into the buildable scope. Complexity Tracking table therefore empty.

## Project Structure

### Documentation (this feature)

```text
specs/010-gap-remediation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── payments-tap.md  # founder-gated webhook + checkout contract
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── [locale]/
│   │   ├── methodology/page.tsx      # US1: error+retry
│   │   ├── calendar/page.tsx         # US1: error+retry
│   │   ├── documents/page.tsx        # US1: error+retry
│   │   └── projects/page.tsx         # US1: error+retry
│   └── actions/
│       ├── billing/upgrade.ts        # US3: pro_until expiry in isPro; US4: Tap start
│       └── billing/tapWebhook.ts     # US4 (founder-gated, new)
├── components/dashboard/
│   ├── WidgetError.tsx               # US1: reused as-is
│   └── RecentProposalsWidget.tsx     # US2: catalog status labels
├── lib/
│   ├── pricing/quota.ts              # US3: FR-007 regression guard
│   ├── ai/tone*.ts                   # US3: FR-006 tone-AI quota
│   ├── pricing/aiTrend.ts            # US5: M4 AI-trend (new, non-blocking)
│   └── billing/tier.ts              # US3: extract effective-tier resolver (if shared point moves)
messages/{ar,en}.json                 # US2/US5/US4: any new keys
supabase/migrations/                  # US4 only: payments table + RLS
e2e/ + src/**/*.test.ts               # regression: error-state, enum-locale, tier, quota
```

**Structure Decision**: Existing Next.js `src/` web-app layout. No new top-level structure.
US1/US2/US3/US5-M8 are edits to existing files; US5-M4 adds one lib module; US4 (gated) adds
one action + one migration + one contract.

## Complexity Tracking

> No constitution violations require justification. Table intentionally empty.

## Phasing (priority = build order)

1. **P1 — US1 error states + US2 enum labels.** No migration, no new deps. Units + e2e
   regression. Ship first.
2. **P2 — US3 monetization enforcement.** `isPro` expiry branch + tone quota + pricing-limit
   regression. Units-first (FR-012).
3. **P3 — US5 M4 AI-trend + M8 FL verification.** DeepSeek (labeled, graceful) + FL upload.
4. **P3 (BLOCKED) — US4 Tap payments.** Do not start until founder greenlights. Contract
   authored (`contracts/payments-tap.md`) so it is plan-ready the moment it unblocks.
