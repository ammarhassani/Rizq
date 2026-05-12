# Rizq (رِزق)

The pricing benchmark for Saudi freelancers — معيار التسعير للمستقلين السعوديين.

## What is this?

Rizq helps Saudi national freelancers know what to charge by giving them a real, data-backed price benchmark based on the Saudi market.

**Tagline:** سعّر بثقة. اقبض رزقك. / Price with confidence. Earn your rizq.

## Stack

- Next.js 16 App Router + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Framer Motion
- Supabase (DB + Auth + Storage)
- Vercel (hosting + serverless)
- Tap Payments (Saudi-compliant)

## Development

```bash
pnpm install
cp .env.local.example .env.local
# Fill in env vars
pnpm dev
```

Visit http://localhost:3000

## Documentation

- [BRD](./docs/brd.md) — Business requirements
- [PRD](./docs/prd.md) — Product requirements
- [Architecture](./docs/architecture.md) — Technical architecture

## Status

Pre-launch. Currently in development.

---

Built by Ammar Al-Hassani with Claude Code as engineering partner.
