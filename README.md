# Rizq (رِزق)

**The operating system for Saudi freelancers — نظام تشغيل المستقلين السعوديين.**

Tagline: سعّر بثقة. اقبض رزقك. / Price with confidence. Earn your rizq.

## What is this?

Rizq is a **Freelancer Resource Planning (FLRP) suite** — it manages a Saudi
freelancer's professional life end-to-end, not just pricing. Proposals are the wedge;
pricing is one module among many. The suite is defensible through workflow lock-in and
an honesty-first data architecture, not a data monopoly.

> **History:** Rizq started as a pricing-benchmark tool, was closed over a pricing-data
> sourcing problem, then revived as the FLRP suite. The single source of truth for all
> current and future work is [`docs/spec-v2-flrp.md`](./docs/spec-v2-flrp.md). The old
> pre-revival docs were removed to avoid confusion (they remain in git history).

### Modules

| ID | Module | What it does |
|----|--------|--------------|
| M0  | Dashboard Home    | Cross-module overview, AI business insights |
| M1  | **Proposal Studio** | Brief → priced bilingual proposal artifact (the wedge) |
| M2  | Client Book       | Freelancer CRM — دفتر العملاء |
| M3  | Income Ledger     | Gig logging, income summary, forecasting |
| M4  | Pricing Lookup    | Quick market price lookup (anonymous SEO funnel) |
| M5  | HADAF Dashboard   | Vision-2030 freelancer eligibility tracker |
| M6  | Simple Invoicing  | Gig → bilingual invoice + share link |
| M7  | Methodology Hub   | Public credibility / citations surface |
| M8  | Onboarding v2     | Specialties, brand block, business defaults |
| M9  | Calendar          | Unified deadlines across modules, Hijri support |
| M10 | Rate Calculator   | Income target → required rate |
| M12 | Document Vault    | Encrypted credential/contract storage |

## Stack

- **Next.js 16** App Router + TypeScript + **Tailwind CSS v4** + shadcn/ui (RTL)
- **Framer Motion** for purposeful animation
- **next-intl** — Arabic-primary, full RTL, English toggle
- **Supabase** — Postgres + Auth + Storage, Row Level Security on every table
- **DeepSeek** via the **Vercel AI SDK** for all AI features
- **Self-hosted Node server** · **Sentry** (errors) · **PostHog**
- _Planned/deferred:_ Tap Payments, Resend (email)

## Getting started

Requires **Node.js 20+** (24 LTS recommended) and **pnpm**.

```bash
pnpm install
cp .env.local.example .env.local   # then fill in the values
pnpm dev                           # → http://localhost:3000 (redirects to /ar)
```

Minimum env vars to run locally (see `.env.local.example`): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DEEPSEEK_API_KEY`, `NEXT_PUBLIC_APP_URL`. PostHog and
Sentry keys are optional for local development.

## Scripts

```bash
pnpm dev         # start the dev server (Turbopack)
pnpm build       # production build
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest run
pnpm lint        # eslint
```

## Spec-driven development

This repo uses **GitHub Spec Kit**. The engineering charter lives in
[`.specify/memory/constitution.md`](./.specify/memory/constitution.md); features are
specced via the `speckit-*` skills (`/speckit.specify` → `/speckit.plan` →
`/speckit.tasks` → `/speckit.implement`).

## Documentation

- [`docs/spec-v2-flrp.md`](./docs/spec-v2-flrp.md) — **master spec (source of truth)**
- [`.specify/memory/constitution.md`](./.specify/memory/constitution.md) — engineering principles
- [`.claude/CLAUDE.md`](./.claude/CLAUDE.md) — context for Claude Code

## Status

Revived as the FLRP suite; feature-complete across the six build phases of the v2 spec
and in pre-launch hardening / dogfooding.

---

Built by Ammar Al-Hassani with Claude Code as engineering partner.
