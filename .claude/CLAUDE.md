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

<!-- SPECKIT START -->
## Project reframe — spec stack (all planned; implementation next, in order)
- `specs/002-project-hub/` — projects DB hub. ✅ **SHIPPED** (code + migrations applied).
- `specs/003-project-wizard/` — Project Lifecycle Wizard: guided "Start a project" (brief →
  AI proposal → project → invoice), 3 resumable stages. Pure **orchestration**, **no migrations**;
  lifecycle stage **derived**. spec+plan+tasks done → **implement first** (the MVP).
- `specs/004-project-workspace/` — tabbed project workspace: Files (Document Vault scoped),
  Deliverables (curated view), Tasks/milestones (money deferred), and real GitHub-first OAuth
  integrations as a **security-gated** final phase (secrets server-only, never exported).
  spec+plan+tasks done → implement after 003.
- `specs/005-guided-project-mode/` — **Guided Project Mode**: make the whole app honor guided
  project context (a URL `from=project:{id}` origin + a shared contextual back/return + context
  framing) **without cloning screens**, plus a 3-way Project Start chooser (use existing proposal /
  create new / set up directly = money-free blank). **No migration**; reuses `resolveLifecycle` +
  `createProjectFromProposal`. spec+plan done (4 phases: P1 nav-origin → P2 continuity → P3 framing
  → P4 chooser) → **tasks next**. ✅ **SHIPPED** (all 4 phases live).
- `specs/006-profile-source-of-truth/` — **Profile as Source of Truth + Onboarding Re-engineering**:
  the ~70-field profile becomes a typed `FreelancerProfile` loaded once and **passed as a parameter**
  to every engine (defaults from profile; AI fills only brief-specific gaps) — retiring downstream
  patches (specialty disambiguation, years→tier). **No migration** (schema already holds it).
  4 phases: P1 specialty prior + stated-rate anchor → P2 brand/defaults/VAT→invoices + goal/tone →
  P3 onboarding strength-meter + resumable → P4 smart prefill + live preview.
  ✅ **SHIPPED** (P1–P4): specialty prior + stated-rate anchor; invoice VAT/terms;
  dashboard income-goal bar; onboarding meter + payoff + URL prefill + live brand
  preview + live **price** preview (StepRates → real resolver + provenance).
- `specs/007-multi-currency-fx/` — **Multi-Currency Pricing + FX Conversion**: freelancer picks a
  pricing/display currency (USD/AED/EUR/GBP); SAR stays the engine/benchmark/HADAF base; convert at
  the **boundary** using **cited** FX (source + as-of; SAR↔USD = SAMA peg 3.75), never invented
  numbers; graceful SAR-only fallback. 4 phases: P1 currency model + FX service + conversion lib →
  P2 onboarding selector + convert stated anchor (feature-006 boundary) → P3 invoice currency + VAT
  rule → P4 converted-figure display. Additive migration (`users.rate_currency`, `invoices.currency`
  + FX basis). ✅ **migration applied + P1–P2 + dashboard + gig-invoice SHIPPED**:
  conversion lib + FX service; onboarding preferred-currency selector; proposal
  stated-rate→SAR anchor; dashboard income in preferred currency (live-verified
  USD = SAR/3.75, cited); gig→invoice records currency + artifact renders it.
  ✅ **COMPLETE end-to-end**: onboarding selector · pricing anchor · dashboard ·
  invoices (gig + manual form, convert-on-save) · proposal PriceEditor secondary —
  all show the preferred currency with cited FX; SAR stays the ledger base.
Active (`.specify/feature.json`): **007**.
<!-- SPECKIT END -->
