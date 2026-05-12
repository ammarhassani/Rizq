# Rizq — Project Context for Claude Code

## Product
Rizq (رِزق) is a web suite for Saudi national freelancers. v0.1 is a Saudi-localized service pricing benchmark.

## Stack (locked)
- Frontend: Next.js 16 App Router + TypeScript + Tailwind CSS v4 + shadcn/ui (base-nova preset, RTL on)
- Animation: Framer Motion
- i18n: next-intl (Arabic primary, English secondary, full RTL)
- Backend: Vercel serverless functions + Supabase
- Database: Supabase Postgres with Row Level Security
- Auth: Supabase Auth (email + Google + Apple + LinkedIn OAuth)
- Payments: Tap Payments (Saudi-compliant)
- Email: Resend
- Analytics: PostHog
- Errors: Sentry

## Design Principles
1. Arabic-first. RTL by default. English is the toggle, not the base.
2. Mobile-first. 70%+ of Saudi LinkedIn traffic is mobile.
3. Frictionless. ≤3 inputs to first value. No modal interruptions until paywall moment.
4. Animated with purpose. Framer Motion for transitions, skeleton loaders with shimmer, animated number reveals on pricing results. No gratuitous motion.
5. Trust through transparency. Always show sample size. Always show methodology link.
6. Halal by default. No riba in payments, no haram framing in copy.

## Brand
- Name: رِزق / Rizq
- Tagline (AR): سعّر بثقة. اقبض رزقك.
- Tagline (EN): Price with confidence. Earn your rizq.
- Palette: Deep green #1A5F3F, gold #C8A951, cream #FAF5EC, dark #1A1A1A
- Typography: Tajawal (Arabic), Inter (English), tabular numerals for prices

## Out of scope for v0.1 (do NOT build these unless explicitly asked)
- AI proposal generator (v0.2)
- Contract templates (v0.3)
- Lead generation / matchmaking
- ZATCA invoicing
- Time tracking
- Community / forums
- Native mobile apps

## Source of truth documents
- `docs/brd.md` — Business requirements
- `docs/prd.md` — Product requirements
- `docs/architecture.md` — Tech architecture
- This file (`.claude/CLAUDE.md`) — Project context

## Working agreement with Claude Code
1. Read the relevant section of PRD before implementing a feature
2. Propose approach before writing significant code
3. Write tests for business logic (quota enforcement, pricing calculation)
4. Use Arabic + English in all user-facing copy
5. Commit small, atomic changes with clear messages
6. Never inflate scope beyond v0.1 spec without founder approval
