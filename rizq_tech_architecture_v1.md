# Rizq (رِزق) v0.1 — Tech Architecture Document

| Field | Value |
|---|---|
| Document version | v1.0 |
| Author | Ammar Al-Hassani (with Claude Code as engineering lead) |
| Date | May 12, 2026 |
| Status | Draft — for build planning |
| Stack decision | Vercel-based (locked) |
| Related docs | Rizq BRD v1.0, Rizq PRD v1.0 |

---

## 1. Architecture Overview

Rizq is a serverless web application running on Vercel's edge network, with Supabase as the managed database and authentication provider. The architecture is deliberately simple to enable a solo founder + AI engineer to ship in weeks, not months.

### 1.1 Architecture Diagram (textual)

```
┌─────────────────────────────────────────────────────────────────┐
│  USER (Saudi freelancer, browser, mostly mobile)                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  VERCEL (Next.js 14 App Router + Edge Functions)                │
│   • Server-rendered pages (Arabic RTL + English)                │
│   • API routes (serverless functions)                           │
│   • Edge middleware (auth checks, rate limiting)                │
│   • CDN (static assets, images)                                 │
└─────┬────────────────────────────────────────────┬──────────────┘
      │                                            │
      ▼                                            ▼
┌──────────────────────┐                ┌──────────────────────┐
│  SUPABASE            │                │  EXTERNAL SERVICES   │
│   • PostgreSQL DB    │                │   • Tap Payments     │
│   • Auth (email,     │                │   • Resend (email)   │
│     OAuth providers) │                │   • PostHog          │
│   • Row Level Sec.   │                │     (analytics)      │
│   • Storage          │                │   • Sentry (errors)  │
│     (CSVs, exports)  │                │   • Anthropic API    │
│                      │                │     (for Layer 2,    │
│                      │                │     not v0.1)        │
└──────────────────────┘                └──────────────────────┘
```

### 1.2 Why This Stack

| Component | Choice | Why |
|---|---|---|
| Frontend framework | **Next.js 14 (App Router)** | Server components, edge runtime, built-in i18n, Vercel-native |
| Hosting | **Vercel** | Locked by user decision; best-in-class for Next.js |
| Database | **Supabase Postgres** | Free tier sufficient, managed, includes auth + storage + RLS |
| Authentication | **Supabase Auth** | Free, supports email + OAuth (Google, Apple, LinkedIn) |
| Styling | **Tailwind CSS + shadcn/ui** | Fast iteration, Arabic RTL support, no design system to maintain |
| Forms | **react-hook-form + zod** | Type-safe validation, minimal boilerplate |
| State management | **React Server Components + URL state** | No Redux/Zustand needed for v0.1 |
| Analytics | **PostHog** | Free tier, product analytics + session replay, self-hostable later |
| Error tracking | **Sentry** | Free tier, alerts on production errors |
| Email | **Resend** | Free tier 3K/month, clean DX, transactional emails |
| Payments | **Tap Payments** | Saudi-compliant, Mada + Visa + Mastercard + Apple Pay |
| Deployment | **Vercel git integration** | Push to main → deploys to production |
| Domain | **TBD (rizq.sa preferred, fallback rizq.app)** | Founder to acquire |
| Monitoring | **Vercel Analytics + Supabase logs** | Built-in, no extra setup |

---

## 2. Tech Stack Details

### 2.1 Frontend

**Framework:** Next.js 14 with App Router

```
Key Next.js features used:
- Server components (default — for SEO and performance)
- Client components (only where interactivity is needed)
- Server actions (form submissions without API routes)
- Edge runtime (for middleware and lightweight API)
- next-intl (Arabic + English i18n with RTL support)
- next-themes (light/dark mode — defer to v0.2 if not needed)
```

**UI components:** shadcn/ui (copy-paste, no npm dependency, full ownership)

**Typography:**
- Arabic: Tajawal (Google Fonts) or IBM Plex Sans Arabic
- English: Inter or Geist
- Headings: bolder weight; body: regular; numbers: tabular

**Icons:** Lucide React (tree-shakeable, well-supported)

### 2.2 Backend (Serverless)

**Pattern:** Vercel serverless functions for API routes; Supabase for persistence and auth

**API Routes (Next.js):**
```
/api/auth/*          - Supabase auth callbacks
/api/benchmark       - Pricing query (rate-limited, quota-aware)
/api/submissions     - User pricing data submissions
/api/admin/*         - Founder-only routes (allowlist-gated)
/api/payments/*      - Tap webhooks for subscription events
/api/health          - Health check for monitoring
```

**Rate limiting:** Upstash Redis (free tier) or simple in-DB counter

### 2.3 Database (Supabase Postgres)

**Connection:** Direct via Supabase client (no separate ORM needed for v0.1)

**Migration strategy:** SQL files in version control, applied via Supabase dashboard or CLI

---

## 3. Data Model

### 3.1 Tables

#### `users` (managed by Supabase Auth, extended with profile)
```sql
- id (uuid, pk)
- email (string, unique)
- created_at (timestamp)
- name (string, optional)
- preferred_language (enum: ar|en, default ar)
- city (string, optional, for profile context)
- role (enum: free|pro|admin, default free)
- pro_until (timestamp, nullable)
- query_count_this_month (int, default 0)
- bonus_quota (int, default 0)
- referred_by (uuid, fk to users.id, nullable)
- last_active (timestamp)
```

#### `specialties`
```sql
- id (uuid, pk)
- slug (string, unique, e.g., "graphic-design")
- name_ar (string)
- name_en (string)
- category (enum: design|development|writing|marketing|media|other)
- active (boolean, default true)
- sort_order (int)
```

#### `cities`
```sql
- id (uuid, pk)
- slug (string, unique, e.g., "riyadh")
- name_ar (string)
- name_en (string)
- region (enum: central|western|eastern|southern|northern)
- active (boolean, default true)
```

#### `experience_tiers`
```sql
- id (uuid, pk)
- slug (string, e.g., "junior")
- name_ar (string)
- name_en (string)
- years_min (int)
- years_max (int, nullable)
- sort_order (int)
```

#### `benchmark_records` (the dataset)
```sql
- id (uuid, pk)
- specialty_id (fk)
- city_id (fk)
- experience_tier_id (fk)
- project_type (string, e.g., "logo", "full website")
- price_sar (decimal)
- project_duration_days (int, nullable)
- client_type (enum: individual|smb|corporate|government|other, nullable)
- source (enum: scraped|user_submitted|founder_added|survey, required)
- source_url (string, nullable, for scraped data)
- source_user_id (fk to users.id, nullable, for submitted data)
- verified (boolean, default false)
- verified_at (timestamp, nullable)
- verified_by (fk to users.id, nullable)
- notes (text, nullable)
- recorded_at (timestamp, when the price was charged)
- created_at (timestamp, when record entered DB)
- flagged_as_outlier (boolean, default false)
- active (boolean, default true)
```

#### `queries` (user query log)
```sql
- id (uuid, pk)
- user_id (fk, nullable for anon)
- session_id (string, for anon tracking)
- specialty_id (fk)
- city_id (fk)
- experience_tier_id (fk)
- project_type (string, nullable)
- filters_json (jsonb, advanced filters used)
- result_min (decimal)
- result_median (decimal)
- result_max (decimal)
- result_sample_size (int)
- created_at (timestamp)
```

#### `subscriptions`
```sql
- id (uuid, pk)
- user_id (fk)
- tap_subscription_id (string, external)
- plan (enum: pro|pro_plus)
- status (enum: active|past_due|cancelled|expired)
- amount_sar (decimal)
- billing_cycle (enum: monthly|annual)
- started_at (timestamp)
- current_period_end (timestamp)
- cancelled_at (timestamp, nullable)
```

#### `payment_events` (audit log)
```sql
- id (uuid, pk)
- subscription_id (fk)
- event_type (enum: created|charged|failed|refunded|cancelled)
- amount_sar (decimal)
- tap_event_id (string)
- raw_payload (jsonb)
- created_at (timestamp)
```

#### `pricing_submissions` (user-submitted data, before verification)
```sql
- id (uuid, pk)
- user_id (fk)
- specialty_id (fk)
- city_id (fk)
- experience_tier_id (fk)
- project_type (string)
- price_sar (decimal)
- project_duration_days (int, nullable)
- client_type (enum, nullable)
- notes (text, nullable)
- proof_url (string, nullable, Supabase storage)
- status (enum: pending|approved|rejected|needs_info)
- moderator_notes (text, nullable)
- submitted_at (timestamp)
- reviewed_at (timestamp, nullable)
```

### 3.2 Indexes (key ones)

```sql
- benchmark_records (specialty_id, city_id, experience_tier_id, active, verified)
- benchmark_records (recorded_at DESC)
- queries (user_id, created_at DESC)
- queries (created_at) - for analytics
- subscriptions (user_id, status)
- pricing_submissions (status, submitted_at)
- users (role, pro_until)
```

### 3.3 Row Level Security (RLS) Policies

Supabase RLS is critical for security on the client-side queries:

- **Users**: can read/write only their own row
- **Benchmark records**: anyone can read (where verified = true and active = true), only admins can write
- **Queries**: users can read only their own queries, anyone can insert (anon allowed)
- **Subscriptions**: users can read only their own
- **Pricing submissions**: users can read only their own; admins read all
- **Admin tables**: admin role only

---

## 4. Key Algorithms / Logic

### 4.1 Pricing Benchmark Calculation

```
INPUT: specialty, city, experience_tier, optional filters
PROCESS:
  1. Query benchmark_records WHERE
     - specialty_id matches
     - city_id matches (with fallback to same region)
     - experience_tier_id matches (with fallback to adjacent tiers)
     - verified = true
     - active = true
     - flagged_as_outlier = false
  2. If sample_size < 5:
     - Try fallback: same specialty + region (instead of city)
     - If still < 5: return "insufficient data" + suggested alternatives
  3. Calculate:
     - min = 10th percentile
     - median = 50th percentile
     - max = 90th percentile
     - sample_size = count of records used
  4. Log query in `queries` table
  5. Decrement user quota (if free)
OUTPUT: { min, median, max, sample_size, fallback_used }
```

### 4.2 Quota Enforcement

```
ON every /api/benchmark call:
  - If user is anonymous: check session cookie, allow 1 free query
  - If user is free: check (query_count_this_month + 1 <= 3 + bonus_quota)
  - If user is pro: unlimited, no check
  - If quota exceeded: return 402 Payment Required with upgrade URL
```

### 4.3 Outlier Detection (Run Weekly)

```
FOR EACH (specialty × city × experience_tier) combination:
  - Calculate IQR (interquartile range)
  - Flag records where price < Q1 - 1.5*IQR OR price > Q3 + 1.5*IQR
  - Set flagged_as_outlier = true
  - Send admin notification for review
```

---

## 5. External Integrations

### 5.1 Tap Payments

**Purpose:** Handle Pro subscription payments (Saudi-compliant, Mada + Visa + Mastercard + Apple Pay)

**Integration approach:**
- Use Tap's hosted checkout page (lowest PCI burden)
- Webhook endpoint: `/api/payments/tap-webhook` to handle subscription events
- Test mode for initial development
- Production keys in Vercel environment variables

**Events to handle:**
- `charge.captured` → Activate Pro
- `subscription.created` → Create subscription record
- `subscription.cancelled` → Set status to cancelled
- `charge.failed` → Email user, retry per Tap policy

### 5.2 Supabase Auth

**Providers configured:**
- Email + password (mandatory)
- Google OAuth
- Apple OAuth
- LinkedIn OAuth (high priority — KSA market)

**Email templates:** Customize in Supabase dashboard for Arabic + English

### 5.3 Resend (Transactional Email)

**Emails to send:**
- Welcome email after signup (Arabic + English versions)
- Email verification
- Password reset
- Pro upgrade confirmation
- Payment receipt
- Pricing submission verified notification
- Quota reset notification (monthly)

### 5.4 PostHog (Analytics)

**Events to track:**
- Page views
- Signup
- First query
- Quota exhausted
- Upgrade clicked
- Upgrade completed
- Cancellation
- Submission created
- Submission verified

### 5.5 Sentry (Error Tracking)

**Alert thresholds:**
- Production error rate > 1% → email founder
- Payment failures → immediate Slack/email
- Database connection failures → immediate

---

## 6. Security and Compliance

### 6.1 Authentication & Authorization

- Bcrypt password hashing via Supabase Auth
- JWT tokens (signed by Supabase, validated server-side)
- Role-based access control (free / pro / admin)
- Row Level Security policies on every table

### 6.2 Data Protection

- HTTPS everywhere (Vercel default)
- Personal data encrypted at rest (Supabase default)
- API keys in Vercel environment variables (never in code)
- Rate limiting on auth endpoints (5 attempts / 15 min)
- CAPTCHA on signup if abuse detected (defer until needed)

### 6.3 Saudi PDPL Compliance

- Privacy policy in Arabic + English
- User data export feature (defer to v0.2 unless required earlier)
- User data deletion request flow
- Data residency: Supabase region selection (prefer KSA/UAE region if available, otherwise EU)
- Consent management for analytics cookies

### 6.4 Halal Compliance

- No riba (interest-bearing) payment processing
- No gambling-related features
- Tap Payments confirmed Sharia-compliant Saudi processor
- Subscription is service-fee, not loan-based — clearly halal

---

## 7. Development Workflow

### 7.1 Environment Setup

```
Local dev:
- Node.js 20+
- pnpm (package manager)
- Vercel CLI for local emulation
- Supabase CLI for local DB

Repos:
- Single monorepo on GitHub: rizq-app
- Branch strategy: main (production) + feature branches
- PR-based merging (even solo — keeps quality)

Environments:
- Local: localhost:3000 + Supabase local
- Preview: Vercel preview deployments per PR
- Production: rizq.sa (or chosen domain)
```

### 7.2 Claude Code as CTO

**Workflow:**
1. Founder specifies a feature from the PRD
2. Claude Code:
   - Reads relevant PRD section
   - Proposes implementation approach
   - Founder approves
   - Claude Code writes code, tests, deploys to preview
3. Founder reviews preview, requests changes
4. Founder merges to main → production deploy

**Claude Code responsibilities:**
- All code: components, API routes, migrations, tests
- Documentation: inline + README
- Bug fixes: triage and fix
- Performance optimization
- Security review

**Founder responsibilities (cannot be delegated to Claude Code):**
- Product decisions (what to build)
- Customer conversations
- Marketing content + brand voice
- Data curation and verification
- Legal review of contracts (Layer 3)
- Payment processor setup (requires real ID)

### 7.3 Testing Strategy

- Unit tests: critical business logic (quota enforcement, pricing calculation)
- E2E tests: signup → first query → upgrade flow (Playwright)
- Manual testing: every feature before production deploy
- Beta testers: 10 freelancer friends before public launch

### 7.4 Deployment

- Vercel auto-deploys on push to main
- Database migrations: manual run via Supabase CLI before deploy
- Rollback: Vercel one-click rollback to previous deployment
- Downtime: aim for zero; Supabase migrations should be backward-compatible

---

## 8. Cost Estimate

| Service | Tier | Monthly Cost (SAR) |
|---|---|---|
| Vercel | Hobby (free) | 0 |
| Supabase | Free tier | 0 |
| Domain (rizq.sa) | Annual ~SAR 200 | ~17 |
| Resend | Free tier (3K emails) | 0 |
| PostHog | Free tier (1M events) | 0 |
| Sentry | Developer free tier | 0 |
| Tap Payments | 2.85% per transaction | Variable |
| Upstash Redis (rate limiting) | Free tier | 0 |
| Anthropic API (Layer 2 only) | Pay-per-use, ~$0.01/query | 0 in v0.1 |
| **TOTAL FIXED v0.1** | | **~17 SAR/month** |

**Upgrade triggers:**
- Vercel: when bandwidth exceeds 100GB/month (≈10K+ active users)
- Supabase: when DB exceeds 500MB or 50K monthly active users
- Resend: when emails exceed 3K/month
- PostHog: when events exceed 1M/month

At each trigger, the cost step-up is modest (Supabase Pro is $25/mo).

---

## 9. Build Sequence (Recommended)

This is the order Claude Code should build, post-validation:

**Sprint 1 (Weekend 1-2 post-validation): Foundation**
- Repo setup, Next.js + Tailwind + shadcn scaffold
- Supabase project + initial schema (specialties, cities, experience_tiers, benchmark_records)
- Seed data: load 500+ records from founder's manual curation
- Landing page with email signup
- Basic auth (email + password + Google OAuth)
- Static "About" and "How it works" pages

**Sprint 2 (Weekend 3-4): Core Tool**
- Pricing benchmark tool (US-04, US-05)
- Anonymous query (1 free)
- Result page with min/median/max + sample size
- Share result (link)
- Mobile responsive polish

**Sprint 3 (Weekend 5-6): Authentication & Quota**
- Authenticated signup + profile
- Quota enforcement (3/month for free)
- User dashboard (query history)
- Email verification (Resend)

**Sprint 4 (Weekend 7-8): Monetization**
- Pro tier upgrade flow
- Tap Payments integration
- Webhook handler
- Subscription management UI
- Cancellation flow

**Sprint 5 (Weekend 9-10): Community Data**
- Pricing submission form (US-08)
- Admin review queue
- Bonus quota credit
- Notifications

**Sprint 6 (Weekend 11-12): Admin & Polish**
- Admin panel with metrics dashboard
- Analytics integration (PostHog)
- Error tracking (Sentry)
- Performance optimization (Lighthouse 85+)
- Final QA + beta tester round

**Sprint 7 (Weekend 13-14): Public Launch**
- Pre-launch marketing push (LinkedIn KSA, X)
- Press / influencer outreach
- Launch day support readiness
- Monitor + fix + iterate

**Reality check:** This is 14 weekends — about 3.5 months — for someone with Claude Code as CTO. Adjust based on validation timing and life events (wedding, work). No SLA, best-effort.

---

## 10. Known Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Supabase free tier limits hit faster than expected | Monitor weekly; upgrade to Pro ($25/mo) before hitting hard limits |
| Tap Payments integration delays | Have Moyasar as fallback; test both early |
| Saudi domain (rizq.sa) takes weeks to acquire | Use rizq.app or myrizq.com as launch domain; migrate later |
| Mostaql blocks scraping for seed data | Augment with surveys, X scraping, founder network |
| LLM API costs in Layer 2 unexpectedly high | Cache common queries; add per-user daily limits |
| Vercel cold-start issues for Saudi users | Use Vercel Edge functions for critical routes; benchmark from Saudi IP |
| Sole founder + Claude Code = bus factor of 1 | Document everything; consider co-founder if scaling beyond 100 users |

---

## 11. Open Architecture Questions

1. **Domain & SSL:** Should we set up email at the domain (founder@rizq.sa) for trust? Adds Google Workspace cost (~SAR 30/month).
2. **Scraping legality:** Saudi data privacy law and Mostaql ToS — should we operate purely on user-submitted + manually surveyed data to avoid risk?
3. **Caching strategy:** Should benchmark results be cached at the edge for common queries? Saves DB calls but adds complexity.
4. **API access:** Should we expose a public API in v0.2 for Saudi platform partnerships?
5. **Multi-tenancy:** If we ever expand to UAE or Egypt, do we use one DB or separate?
6. **Backup strategy:** Supabase auto-backups daily — is that enough, or should we export weekly to cold storage?

---

## 12. Sign-off

| Stakeholder | Role | Sign-off |
|---|---|---|
| Ammar Al-Hassani | Founder / Product Owner | _Pending_ |
| Claude Code | Engineering Lead | _Pending_ |

---

**End of Tech Architecture v1.0**
