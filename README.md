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
pnpm test        # vitest run  (751 unit tests)
pnpm test:e2e    # playwright — drives the real app vs real Supabase + DeepSeek
pnpm lint        # eslint
```

The e2e harness self-signs-up disposable users, so **email confirmation must be OFF** in
Supabase Auth and signup is rate-limited 5 / 5 min / IP. See [`e2e/README.md`](./e2e/README.md).

## Spec-driven development

This repo uses **GitHub Spec Kit**. The engineering charter lives in
[`.specify/memory/constitution.md`](./.specify/memory/constitution.md); features are
specced via the `speckit-*` skills (`/speckit.specify` → `/speckit.plan` →
`/speckit.tasks` → `/speckit.implement`).

## Working with coding agents

Every agent in this repo answers in **caveman style** — terse, no filler, all technical
substance kept. Code, commits and the shipped Arabic/English copy stay normal prose. The rule
lives in [`AGENTS.md`](./AGENTS.md) and is mirrored to Cursor, Windsurf, Cline, Copilot and
OpenCode rule files (regenerate with `/caveman-init`).

## Documentation

- [`docs/spec-v2-flrp.md`](./docs/spec-v2-flrp.md) — **master spec (source of truth)**
- [`.specify/memory/constitution.md`](./.specify/memory/constitution.md) — engineering principles
- [`.claude/CLAUDE.md`](./.claude/CLAUDE.md) — context for Claude Code + validation history
- [`AGENTS.md`](./AGENTS.md) — conventions for every other coding agent
- [`docs/validation/`](./docs/validation/) — audit + power-user validation passes, newest last

## Status

Revived as the FLRP suite; feature-complete across the six build phases of the v2 spec and in
pre-launch hardening / dogfooding. Two validation passes are on record — a static spec-vs-code
audit and a live power-user pass ([2026-07-26](./docs/validation/power-user-pass-2026-07-26.md),
22 defects found and fixed).

**Known gaps before launch:** payments are not live (Tap is founder-gated), email needs a
verified Resend domain, `pro_until` expiry is not yet enforced, and there is no ZATCA
e-invoicing (QR / simplified tax invoice) yet. The pricing benchmark itself is thin — n=5 on
most specialty/city pairs, which every price honestly cites.

---

Built by Ammar Al-Hassani with Claude Code as engineering partner.
