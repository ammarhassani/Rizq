# Rizq — Project Initialization Guide

This is the exact sequence to initialize the Rizq codebase with Claude Code as your CTO.

---

## Prerequisites (do these first, takes 15 minutes)

1. **Install Node.js 20+**
   - macOS: `brew install node`
   - Verify: `node --version` should show v20+

2. **Install pnpm** (faster than npm)
   - `npm install -g pnpm`

3. **Install Claude Code**
   - Follow: https://docs.claude.com/en/docs/claude-code/quickstart
   - Confirm: `claude --version`

4. **Sign up for accounts (free tiers):**
   - GitHub: https://github.com (you likely have this — ammarhassani)
   - Vercel: https://vercel.com — sign in with GitHub
   - Supabase: https://supabase.com — sign in with GitHub
   - Resend: https://resend.com — for transactional emails
   - PostHog: https://posthog.com — for analytics
   - Sentry: https://sentry.io — for error tracking

5. **Tap Payments account** (defer until Sprint 4)
   - https://www.tap.company/sa
   - Requires Saudi commercial registration OR personal freelance document
   - Takes 3-5 business days to activate

---

## Step 1 — Create the GitHub Repo

```bash
# In your browser:
# Go to github.com/new
# Repository name: rizq
# Description: The pricing benchmark for Saudi freelancers — معيار التسعير للمستقلين السعوديين
# Visibility: Private (until launch)
# Initialize with: README, .gitignore (Node), MIT License
# Click "Create repository"
```

---

## Step 2 — Clone & Initialize on Your Machine

```bash
# Clone the empty repo
cd ~/projects   # or wherever you keep code
git clone https://github.com/ammarhassani/rizq.git
cd rizq

# Initialize Next.js 14 with TypeScript, Tailwind, App Router, ESLint
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
# Answer "No" to: Customize default Tailwind import alias

# Install core dependencies
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add framer-motion lucide-react
pnpm add react-hook-form @hookform/resolvers zod
pnpm add date-fns
pnpm add next-intl
pnpm add @vercel/analytics

# Install shadcn/ui
pnpm dlx shadcn@latest init
# Answer:
#   - Style: New York
#   - Base color: Neutral (we'll customize)
#   - CSS variables: Yes

# Install initial shadcn components
pnpm dlx shadcn@latest add button input label select form card dialog sheet toast

# Install dev dependencies
pnpm add -D @types/node prettier prettier-plugin-tailwindcss

# Initial test to confirm everything works
pnpm dev
# Visit http://localhost:3000 — should show Next.js welcome page
# Press Ctrl+C to stop
```

---

## Step 3 — Initialize Claude Code in This Project

```bash
# From the rizq/ directory
claude init

# Claude Code will scan the project and create .claude/ directory
# This is where Claude Code stores its project context
```

---

## Step 4 — Create the Foundational Files

Replace these files with the contents below. Claude Code will use them as authoritative project context.

### File 1: `.claude/CLAUDE.md` (Claude Code's project memory)

```markdown
# Rizq — Project Context for Claude Code

## Product
Rizq (رِزق) is a web suite for Saudi national freelancers. v0.1 is a Saudi-localized service pricing benchmark.

## Stack (locked)
- Frontend: Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui
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
```

### File 2: `docs/brd.md`
Copy the full contents of `rizq_brd_v1.md` (from the previous session output) into this file.

### File 3: `docs/prd.md`
Copy the full contents of `rizq_prd_v1.md` into this file.

### File 4: `docs/architecture.md`
Copy the full contents of `rizq_tech_architecture_v1.md` into this file.

### File 5: `.env.local.example`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry
SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# Tap Payments (later)
TAP_SECRET_KEY=
TAP_PUBLIC_KEY=
TAP_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### File 6: Updated `README.md`

```markdown
# Rizq (رِزق)

The pricing benchmark for Saudi freelancers — معيار التسعير للمستقلين السعوديين.

## What is this?

Rizq helps Saudi national freelancers know what to charge by giving them a real, data-backed price benchmark based on the Saudi market.

**Tagline:** سعّر بثقة. اقبض رزقك. / Price with confidence. Earn your rizq.

## Stack

- Next.js 14 App Router + TypeScript
- Tailwind CSS + shadcn/ui
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
```

---

## Step 5 — Configure Tailwind for Rizq Brand

Replace `tailwind.config.ts` with this:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        rizq: {
          green: "#1A5F3F",
          "green-light": "#2A8B5C",
          "green-dark": "#0F4128",
          gold: "#C8A951",
          "gold-light": "#E6C77A",
          "gold-dark": "#9E8A3D",
          cream: "#FAF5EC",
          "cream-dark": "#E8E0CC",
          ink: "#1A1A1A",
          "ink-soft": "#3D3D3D",
        },
      },
      fontFamily: {
        arabic: ["Tajawal", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontVariantNumeric: {
        tabular: "tabular-nums",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.6s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

---

## Step 6 — The Initial Commit

```bash
# Stage everything
git add .

# Initial commit
git commit -m "chore: initialize Rizq project

- Next.js 14 App Router with TypeScript
- Tailwind CSS + shadcn/ui foundation
- Framer Motion installed
- Supabase + Resend + PostHog + Sentry dependencies
- Project documentation (BRD, PRD, Tech Architecture)
- Claude Code context (.claude/CLAUDE.md)
- Rizq brand tokens in Tailwind config
- Bilingual setup (Arabic RTL primary, English secondary)

This is v0.0 — scaffold only. No business logic yet.
Next: Sprint 1 (landing page + email signup) per Tech Arch §9."

# Push to GitHub
git push origin main
```

---

## Step 7 — Connect to Vercel

```bash
# Install Vercel CLI
pnpm add -g vercel

# Link project
vercel link

# Pull production env vars (empty for now, but sets up structure)
vercel env pull .env.local

# Deploy a preview
vercel
```

Then in the Vercel dashboard:
1. Connect the `rizq` repo
2. Set deployment branch: `main`
3. Production deploys automatically on every push to `main`
4. Preview deploys automatically on every PR

---

## Step 8 — Create Supabase Project

```bash
# In browser:
# 1. Go to supabase.com/dashboard
# 2. New project: name "rizq"
# 3. Database password: generate strong, save in 1Password
# 4. Region: Frankfurt (closest to KSA with GDPR-compliant data residency)
#    OR Singapore if Frankfurt feels slow
# 5. Pricing: Free tier
# 6. Wait ~2 minutes for provisioning
```

Copy these from the Supabase dashboard → Settings → API:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret, server-only)

Then add these as environment variables in Vercel (Settings → Environment Variables).

---

## Step 9 — Tell Claude Code What's Next

After everything above is set up, in your terminal:

```bash
cd ~/projects/rizq
claude
```

Then say to Claude Code:

> Read `.claude/CLAUDE.md`, `docs/brd.md`, `docs/prd.md`, `docs/architecture.md`.
>
> We just finished v0.0 (scaffold). Next is Sprint 1 per architecture.md §9:
>
> - Set up next-intl for Arabic (default) + English (toggle), with proper RTL
> - Create the brand foundation: load Tajawal + Inter fonts, set up the Rizq color palette
> - Build the landing page per PRD §4.1, in both Arabic and English
> - Add email signup form connected to Supabase (waitlist table)
> - Make it mobile-perfect and animated with Framer Motion (fade-in hero, slide-up sections)
>
> Constraints:
> - No business logic yet, no auth, no payments — just landing + waitlist
> - Lighthouse mobile score must be ≥ 85
> - Arabic RTL must be flawless, not retrofitted
> - Match the design principles in .claude/CLAUDE.md
>
> Propose your implementation approach first, then start.

Claude Code will read the docs, propose, you approve, and it builds.

---

## What You Have After All This

- ✅ A GitHub repo connected to Vercel for auto-deploy
- ✅ A working Next.js app on localhost:3000
- ✅ Supabase project ready for data
- ✅ Claude Code initialized with full project context
- ✅ Brand tokens configured in Tailwind
- ✅ Clear "next sprint" instruction for Claude Code

You haven't built the product yet. You've built the **factory** that will build the product.

---

## What I'm Still Watching For

Per our conversation: I'm not going to pretend I'm not concerned about validation. The init above is real progress on the infrastructure layer. But the moment Claude Code starts building Sprint 1 (landing page), you have ~1 week of work before you also need real Saudi freelancer voices coming in.

Ideal sequence over the next 14 days:
- **This weekend:** Run init steps 1–9 (3-4 hours total)
- **Mon-Tue:** Post the validation survey + LinkedIn post (from `rizq_day1_launch_kit.md`)
- **Wed-Sun:** Claude Code builds landing page in parallel with you collecting survey responses
- **Following weekend:** Review survey data + first deployed landing page together

Build and validate **in parallel**, not "build then validate."

---

اللهم بارك. Now go.
