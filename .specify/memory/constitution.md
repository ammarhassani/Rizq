# Rizq (رِزق) Constitution

Rizq is a Saudi Freelancer Operating System (FLRP — Freelancer Resource Planning).
This constitution governs **how** we build. The master product/technical spec
([`docs/spec-v2-flrp.md`](../../docs/spec-v2-flrp.md)) governs **what** we build.
Where any older note conflicts with this document or the v2 spec, this document and
the v2 spec win.

## Core Principles

### I. Honesty Is the Moat (NON-NEGOTIABLE)
Rizq's only defensible advantage is credibility. Every number, status, or claim shown
to a user **must** cite its source or explicitly declare its uncertainty:
- Price/market data declares its dominant provenance (`published_ref` / `reasoned` /
  `ingested` / `submitted` / `user_entered`), sample size, and date range.
- No fabricated sample sizes. No figures rounded for comfort. No invented confidence.
- Every AI-generated insight is prefixed so the user always knows when AI is speaking:
  `تحليل رِزق —` / `Rizq Insight —`.
- Claims auto-upgrade as real data arrives; they never overstate what the data supports.

A feature that cannot be honest about its data does not ship.

### II. Arabic-First, RTL by Default
Arabic is the base language; English is the toggle, not the foundation. The entire UI
is RTL by default. Every user-facing string ships in both Arabic and English via
`next-intl`. Copy is Saudi-appropriate and human-reviewed — never machine-translated
filler. RTL/LTR mixing (numbers, Latin names, currency) is handled deliberately.

### III. Mobile-First
70%+ of Saudi traffic is mobile. Every surface is designed mobile-first and verified at
real device widths before it is considered done. Keep the path to first value short
(≤3 inputs) and avoid modal interruptions before the paywall moment.

### IV. Test the Money and the Rules
Business logic that touches money, quotas, eligibility, or pricing is unit-tested with
hand-built fixtures **before** it ships: price resolution, quota enforcement, HADAF
thresholds, invoice/fee math, and scope extraction all carry tests. TDD is the default
for these cores. The suite stays green — `pnpm test` is a merge gate, not an afterthought.

### V. Every Module Stands on Its Own Feet
No module is a thin wrapper around a database query. Each module owns its data model
(tables, RLS, indexes), server-side business logic with edge cases, a complete UX surface
(loading, empty, error, and edge states), a Saudi-compliance posture, an honesty layer,
an extensibility design, and a concrete AI-enhancement plan. A module is "done" only when:
the happy path works end-to-end on mobile, empty/error/loading states are designed,
honesty citations are wired, and cross-module integrations are live.

### VI. Halal and Saudi-Compliant by Default
No riba in payments. No haram framing in copy. PDPL-aware handling of all personal data
(export, deletion, consent). **No marketplace scraping — ever** (PDPL + Anti-Cyber Crime
Law hard exclusion). All pricing data is licensed, editorial, model-reasoned, or
user-consented. Compliance is a gate, not a cleanup pass.

### VII. AI as Capability Multiplier, Not Decoration
DeepSeek (via the Vercel AI SDK) is used only where it genuinely beats static logic —
with a specific prompt, a specific output, and a specific user benefit. Never "AI-powered"
as a checkbox. AI output is always labeled (Principle I) and always degrades gracefully
when the model is slow or unavailable.

## Technology and Compliance Constraints

**Locked stack** (do not swap without founder approval):
- Next.js 16 App Router + TypeScript; Tailwind CSS v4 + shadcn/ui (base-nova, RTL on)
- Framer Motion for purposeful motion (transitions, shimmer skeletons, number reveals)
- `next-intl` (Arabic primary, English secondary, full RTL)
- Supabase Postgres + Auth + Storage, **Row Level Security on every table**
- DeepSeek + Vercel AI SDK (`ai`, `@ai-sdk/*`) for all AI features
- Self-hosted Node server (founder decision, 2026-07-25 — replaces Vercel);
  Sentry (errors) + PostHog
- Payments (Tap) and transactional email (Resend) are **planned/deferred** to the
  monetization phase — not yet integrated.

**Brand:** deep green `#1A5F3F`, gold `#C8A951`, cream `#FAF5EC`, ink `#1A1A1A`;
Tajawal (Arabic), Inter (English); tabular numerals for all prices.

**Compliance gates (non-negotiable):** PDPL, halal, and Saudi cultural appropriateness
are verified per feature, not deferred.

## Development Workflow and Quality Gates

- **Source of truth:** read the relevant Part of [`docs/spec-v2-flrp.md`](../../docs/spec-v2-flrp.md)
  before building a feature. This constitution is the *how*; the v2 spec is the *what*.
- **Spec-driven flow (Spec Kit):** `/speckit.constitution` → `/speckit.specify` →
  `/speckit.clarify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement`.
  Non-trivial features get a spec before code.
- **Propose approach before significant code.** Confirm direction, then build.
- **Commits** are small, atomic, and clearly messaged.
- **Merge gate:** `pnpm typecheck` clean **and** `pnpm test` green. No exceptions.
- **No scope inflation** beyond the spec without founder approval.

## Governance

This constitution supersedes ad-hoc practice. [`docs/spec-v2-flrp.md`](../../docs/spec-v2-flrp.md)
is the master product/technical spec; this document is the engineering charter that sits
above it on matters of *how* we work.

Amendments are versioned with semantic versioning and dated:
- **MAJOR** — a principle is removed or redefined in a backward-incompatible way.
- **MINOR** — a new principle or section is added.
- **PATCH** — clarifications and wording that do not change intent.

Every review verifies compliance with these principles. Added complexity must be
justified against Principle V (stands on its own feet) and YAGNI.

**Version**: 1.1.0 | **Ratified**: 2026-06-24 | **Last Amended**: 2026-07-25
