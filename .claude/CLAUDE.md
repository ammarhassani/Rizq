# Rizq — Project Context for Claude Code

## Product
Rizq (رِزق) is a **Saudi Freelancer Operating System (FLRP — Freelancer Resource
Planning)**. It manages a freelancer's professional life end-to-end. Proposals are the
wedge; pricing is one module among many. It is **not** "just a pricing tool."

> The project was started as a pricing benchmark, closed over a data-sourcing problem,
> then revived as the FLRP suite. Treat `docs/spec-v2-flrp.md` as the single source of
> truth. Older docs were removed (they live in git history).

## Source of truth (read before building)
- `docs/spec-v2-flrp.md` — **master product + technical spec.** Read the relevant Part
  before implementing a feature.
- `.specify/memory/constitution.md` — engineering charter (how we build).
- This file — quick context for Claude Code.

## Modules
M0 Dashboard · **M1 Proposal Studio (the wedge)** · M2 Client Book · M3 Income Ledger ·
M4 Pricing Lookup · M5 HADAF Dashboard · M6 Simple Invoicing · M7 Methodology Hub ·
M8 Onboarding v2 · M9 Calendar · M10 Rate Calculator · M12 Document Vault.

## Stack (locked)
- Frontend: Next.js 16 App Router + TypeScript + Tailwind CSS v4 + shadcn/ui (base-nova, RTL on)
- Animation: Framer Motion
- i18n: next-intl (Arabic primary, English secondary, full RTL)
- AI: DeepSeek via the Vercel AI SDK (`ai`, `@ai-sdk/deepseek`, `@ai-sdk/react`)
- Backend: Vercel serverless + Supabase (Postgres + Auth + Storage)
- Database: Supabase Postgres with Row Level Security on every table
- Auth: Supabase Auth (email + Google + LinkedIn OAuth)
- Analytics: PostHog + Vercel Analytics · Errors: Sentry
- Planned/deferred: Tap Payments (payments), Resend (email)

## Design Principles
1. Arabic-first. RTL by default. English is the toggle, not the base.
2. Mobile-first. 70%+ of Saudi traffic is mobile.
3. Frictionless. ≤3 inputs to first value. No modal interruptions until the paywall moment.
4. Animated with purpose. Framer Motion transitions, shimmer skeletons, animated number reveals. No gratuitous motion.
5. Honesty through transparency. Every number cites its provenance or declares uncertainty; AI output is labeled. (See constitution Principle I.)
6. Halal by default. No riba in payments, no haram framing, no marketplace scraping.

## Brand
- Name: رِزق / Rizq
- Tagline (AR): سعّر بثقة. اقبض رزقك. — (EN): Price with confidence. Earn your rizq.
- Palette: deep green #1A5F3F, gold #C8A951, cream #FAF5EC, ink #1A1A1A
- Typography: Tajawal (Arabic), Inter (English), tabular numerals for prices

## Working agreement with Claude Code
1. Read the relevant Part of `docs/spec-v2-flrp.md` before implementing a feature.
2. Propose approach before writing significant code.
3. For non-trivial features, use the Spec Kit flow (`/speckit.specify` → `plan` → `tasks` → `implement`).
4. Write tests for business logic (pricing, quota, eligibility, money math).
5. Use Arabic + English in all user-facing copy.
6. Commit small, atomic changes with clear messages.
7. Merge gate: `pnpm typecheck` clean and `pnpm test` green.
8. Never inflate scope beyond the spec without founder approval.
