# Rizq (رِزق) v0.1 — Product Requirements Document (PRD)

| Field | Value |
|---|---|
| Document version | v1.1 |
| Product version | v0.1 (Layer 1: Pricing Benchmark MVP) |
| Author | Ammar Al-Hassani |
| Date created | 2026-05-12 |
| Date updated | 2026-05-14 |
| Status | **v0.1 mostly shipped; this PRD reflects current state + remaining work to launch** |
| Related docs | `brd.md`, `architecture.md`, `engine.md` (v0.2+ vision) |

---

## 0. Current state (2026-05-14)

What is already built and deployed on `rizq-tan.vercel.app`:

- ✅ Bilingual (Arabic-primary RTL + English) landing page with hero, how-it-works, pricing, FAQ, footer.
- ✅ Email waitlist capture (Resend-ready, stored in Supabase).
- ✅ Auth: email + password, Google + LinkedIn OAuth, email verification, password reset.
- ✅ Onboarding flow (language preference, city, specialty) with idempotency + skip option.
- ✅ Pricing tool: specialty × city × tier × project-size → SQL-aggregated quartile statistics.
- ✅ Statistical core: min / median / max + sample size + insufficient-data refusal + 24h dedupe.
- ✅ Freemium quota: 1 lifetime anonymous, 3+bonus per Riyadh month for free, unlimited for Pro/admin. Atomic DB-trigger enforcement (no race).
- ✅ Crowd-sourced submissions with optional proof upload + admin review queue + bonus quota on approval.
- ✅ User dashboard: query history, submissions, bonus tracking, profile settings.
- ✅ Admin: review queue + approve/reject/edit with rate limits.
- ✅ Error boundaries (locale-scoped + global), 404 page, sanitized error logging (no PII).
- ✅ Sentry + PostHog instrumentation wired (DSN/keys to be set at launch).

What remains to ship v0.1 publicly:

- 🚧 **Seed data**: tool is live but returns `insufficient_data` for most combinations. Need 500+ records before public launch (see §7.1).
- 🚧 **Tap Payments + Pro tier paywall**: free quota dead-ends with no upgrade path.
- 🚧 **Sentry DSN + PostHog project key + Resend domain verification.**
- 🚧 **Public-facing legal pages** (privacy + terms — routes exist, content TBD).
- 🚧 **OG images for social sharing.**
- 🚧 **Public methodology page** (referenced from every result; not yet written).

What is **deferred** beyond v0.1 (see `engine.md` for the v0.2+ vision):

- 🔜 Smart pricing engine (scope extraction + Bayesian + active elicitation) — v0.2.
- 🔜 Proposal artifact generator — v0.3.
- 🔜 Outcome tracking + per-freelancer models — v0.4.
- 🔜 Client KYC + capture surfaces (WhatsApp, email) — v0.5.
- 🔜 Buyer-side mode — v0.6.

---

## 1. Product Overview

**Rizq v0.1** is a web application that gives Saudi national freelancers a data-backed pricing benchmark for their services. The user enters their specialty, city, and experience; receives a Saudi-specific price range with statistical confidence; and optionally exports/shares the result.

**Out-of-scope for v0.1** (deferred to later versions):
- AI proposal generator (Layer 2 → v0.2)
- Arabic contract templates (Layer 3 → v0.3)
- Income tracking / HADAF eligibility (Suite expansion → v1.0)
- Mobile native app (web responsive is sufficient)
- Multi-language beyond Arabic + English

---

## 2. Goals and Non-Goals

### 2.1 Product Goals

| # | Goal | Why it matters |
|---|---|---|
| 1 | Deliver a Saudi-specific pricing benchmark in <60 seconds from landing | Speed-to-value drives free signup conversion |
| 2 | Build trust through data transparency (show sample sizes, methodology) | Trust is the moat; competitors will appear |
| 3 | Convert free users to Pro within 14 days of signup | Without recurring revenue, no business |
| 4 | Capture user-submitted pricing data to expand the dataset | Data network effect = long-term moat |
| 5 | Maintain a delightful Arabic-first UX | Cultural fit drives word-of-mouth |

### 2.2 Non-Goals for v0.1

- Lead generation / client matching
- Invoicing or accounting
- Project management or time tracking
- Community features (forums, chat)
- AI-generated content of any kind
- Internationalization beyond Saudi Arabia

---

## 3. User Stories

### 3.1 Anonymous Visitor

- **US-01:** As a Saudi freelancer browsing LinkedIn, I see a Rizq post and click through to the landing page so I can understand what the product offers.
- **US-02:** As a curious visitor, I want to try the pricing tool without signing up so I can evaluate if it's worth my email.
- **US-03:** As a visitor on mobile, I want the landing page to be fully usable on my phone since most Saudi LinkedIn traffic is mobile.

### 3.2 Free User

- **US-04:** As a free user, I want to enter my specialty/city/experience and get a price range so I know what to charge.
- **US-05:** As a free user, I want to see the source/sample size behind the recommendation so I can trust it.
- **US-06:** As a free user, I want to share my benchmark result with a friend (link or screenshot-friendly).
- **US-07:** As a free user, I want to be told clearly when I hit my 3-query limit and what I get if I upgrade.
- **US-08:** As a free user, I want to submit my own pricing data anonymously to help the community (gives me a sense of contribution + earns me bonus queries).

### 3.3 Pro User (SAR 49/month)

- **US-09:** As a Pro user, I want unlimited benchmark queries so I can use Rizq for every bid.
- **US-10:** As a Pro user, I want advanced filters (project complexity, client size, contract type) so the benchmark is more precise to my situation.
- **US-11:** As a Pro user, I want to save my queries and refer back to them so I can track my pricing strategy over time.
- **US-12:** As a Pro user, I want to export my benchmark as a clean PDF so I can include it in proposals or share with clients.
- **US-13:** As a Pro user, I want to cancel my subscription easily without contacting support.

### 3.4 Founder / Admin

- **US-14:** As the founder, I want to see daily/weekly metrics (signups, queries, conversions, churn) so I can spot trends.
- **US-15:** As the founder, I want to review user-submitted pricing data before it enters the public dataset so I can prevent garbage data.
- **US-16:** As the founder, I want to easily add or update benchmark data records so the dataset stays fresh.

---

## 4. Functional Requirements

### 4.1 Public Landing Page

**Purpose:** Convert visitors to either email signup or direct trial.

**Requirements:**
- Arabic-first (RTL layout), with toggle to English
- Hero section: brand name, tagline, single primary CTA ("جرّب الأداة مجانًا" / "Try the tool free")
- "How it works" section: 3 steps with icons
- Social proof section: testimonials from beta users (placeholder until validation)
- Pricing section: free tier features + Pro tier features + price
- FAQ section: 5–8 common questions
- Footer: contact, T&Cs, privacy policy, founder bio link
- Performance: <2 second load on Saudi 4G
- SEO meta tags optimized for Arabic queries like "تسعير المستقلين السعوديين"

**Acceptance criteria:**
- Landing page renders correctly on Chrome, Safari, mobile Safari, Firefox
- All Arabic text displays with proper RTL direction
- Primary CTA is visible without scrolling on 1080p screens and iPhone 12+
- Email signup form submits to database without errors

### 4.2 Pricing Benchmark Tool (Core Feature)

**User flow:**
1. User lands on tool page (signed in or anonymous)
2. User selects: Specialty (dropdown) → City (dropdown) → Experience years (slider or buttons) → Project type (optional dropdown)
3. User clicks "احسب سعري" / "Calculate my price"
4. Loading state (1–3 seconds with skeleton UI)
5. Result page shows:
   - **Price range** (min – median – max) in SAR
   - **Sample size** ("بناءً على X مستقل سعودي")
   - **Confidence band** (visual indicator)
   - **Comparison context** ("أعلى من X% من المستقلين في تخصصك")
   - **CTA** to save, share, or upgrade

**Specialty dropdown (initial v0.1 list, expandable):**
- Graphic Design — تصميم جرافيك
- Logo Design — تصميم شعار
- UI/UX Design — تصميم واجهات
- Web Development — برمجة مواقع
- Mobile App Development — برمجة تطبيقات
- Content Writing (Arabic) — كتابة محتوى عربي
- Translation EN↔AR — ترجمة إنجليزي عربي
- Digital Marketing — تسويق رقمي
- Video Editing — مونتاج فيديو
- Photography — تصوير فوتوغرافي
- Voice Over — تعليق صوتي
- Data Entry — إدخال بيانات

**City dropdown (initial v0.1 list):**
- Riyadh — الرياض
- Jeddah — جدة
- Dammam — الدمام
- Khobar — الخبر
- Makkah — مكة
- Medina — المدينة المنورة
- Other Saudi cities — مدن سعودية أخرى

**Experience tiers:**
- Beginner: 0–1 years — مبتدئ
- Junior: 1–3 years — مبتدئ متقدم
- Mid-level: 3–5 years — متوسط الخبرة
- Senior: 5–10 years — خبير
- Expert: 10+ years — خبير متقدم

**Project type modifiers (optional advanced):**
- Project size (small / medium / large / enterprise)
- Timeline (urgent / normal / flexible)
- Client type (individual / SMB / corporate / government)

**Acceptance criteria:**
- All dropdowns populate from database (not hardcoded)
- Pricing calculation returns within 3 seconds
- Result displays accurate min/median/max from underlying data
- Sample size is honestly displayed (no rounding up)
- Empty-result handling: if <5 data points exist for the combination, show "بيانات غير كافية" message + alternative suggestion

### 4.3 Authentication

**Requirements:**
- Email + password signup
- OAuth: Google, Apple, LinkedIn (last is highly relevant for Saudi market)
- Email verification within 24h
- Password reset flow
- "Remember me" option
- Session expires after 30 days inactivity

**Out of scope for v0.1:**
- Two-factor authentication (defer to v0.2)
- Single Sign-On (SSO)
- Phone number authentication
- Nafath integration (defer until government partnership scenario)

**Acceptance criteria:**
- Signup completes in <30 seconds
- Email confirmation sent within 1 minute
- OAuth flows redirect correctly
- Failed login attempts rate-limited (5 attempts per 15 min)

### 4.4 Freemium Quota System

**Requirements:**
- Anonymous users: 1 free query without signup (cookie-tracked)
- Authenticated free users: 3 queries per calendar month (rolling 30 days)
- Quota resets at calendar month boundary
- Bonus quota mechanism: user submits verified pricing data → earns +2 queries
- Pro users: unlimited queries
- Clear UI showing remaining queries: "بقي لديك ٢ من ٣ استعلامات هذا الشهر"

**Acceptance criteria:**
- Quota enforcement prevents 4th query for free users
- Upgrade modal appears when quota exhausted
- Bonus quota credited within 24h of data submission verification
- Quota resets correctly at month boundary

### 4.5 User Data Submission (Crowd-sourced Dataset Growth)

**Purpose:** Grow the dataset through community contribution; reward contributors with bonus quota.

**Requirements:**
- "Share your pricing" form accessible from result page and dedicated route
- Fields: Specialty, city, experience, project type, price charged, project duration, client type, anonymous notes
- Optional: Upload proof (Mostaql screenshot, invoice, signed contract — for verification)
- Privacy: All submissions anonymized in public dataset
- Verification queue: Founder reviews before data enters public benchmark
- Gamification: Submitter earns +2 free queries upon verification

**Acceptance criteria:**
- Submission form has <10 fields
- Submission completes in <2 minutes
- Verified submissions enter benchmark within 7 days
- Submitter receives confirmation email when verified

### 4.6 Pro Subscription Management

**Requirements:**
- Upgrade flow: Free user → click "Upgrade" → payment page → Pro activated in <60 seconds
- Payment: Saudi-compliant processor (Tap Payments primary, Moyasar fallback)
- Supported payment methods: Mada, Visa, Mastercard, Apple Pay
- Billing cycle: Monthly, charged on signup anniversary
- Cancellation: One-click cancel from settings; access continues until billing period ends
- Refund policy: Pro-rated refund within first 7 days; no refunds after
- Receipts: Auto-emailed after each successful charge; ZATCA-compliant invoice if user requests

**Acceptance criteria:**
- Payment failures show clear error messages in Arabic
- Subscription state updates in real-time
- Cancellation flow takes <30 seconds
- All transactions logged for compliance

### 4.7 User Dashboard

**Requirements:**
- Saved queries list with quick re-run
- Query history (last 30 queries)
- Subscription status + billing info
- Profile settings (name, email, password change, language preference)
- Data contribution stats (submissions, bonus quota earned)
- Logout

**Acceptance criteria:**
- Dashboard loads in <2 seconds
- All data displays correctly in Arabic and English
- Settings changes save without page reload

### 4.8 Admin Panel (Founder-Only)

**Requirements:**
- Authentication: Founder-only access (single user, email allowlist)
- Metrics dashboard:
  - Total signups, free users, paying users, MRR
  - Query volume (daily, weekly, monthly)
  - Top specialties / cities queried
  - Conversion funnel (visitor → signup → first query → upgrade)
  - Churn metrics
- Data management:
  - Review queue for user-submitted pricing data
  - Approve / reject / edit submissions
  - Add new benchmark records manually
  - Bulk import from CSV
- User management:
  - Search users, view query history, grant bonus quota, refund payments

**Acceptance criteria:**
- Admin panel inaccessible to non-admin users
- Metrics refresh at least daily
- Data approval flow is single-click

---

## 5. Non-Functional Requirements

### 5.1 Performance

- Landing page Time to First Byte (TTFB): <800ms
- Pricing tool calculation: <3 seconds end-to-end
- Page transitions: <500ms perceived
- Mobile performance: Lighthouse score ≥85

### 5.2 Reliability

- Uptime target: 99% (acknowledging solo-founder reality)
- Graceful degradation: tool still works if analytics fail
- Daily database backups
- Status page (optional v0.1): communicate downtime

### 5.3 Security

- HTTPS everywhere
- Bcrypt password hashing
- SQL injection protection (use parameterized queries)
- Rate limiting on all endpoints
- API keys for LLM/payment services stored in Vercel environment variables
- Personal data encryption at rest
- Compliance with Saudi PDPL 2023

### 5.4 Accessibility

- WCAG 2.1 AA target
- Keyboard navigation supported
- Screen reader friendly Arabic and English
- High contrast mode
- Text scalable to 200% without breaking layout

### 5.5 Localization

- Primary: Arabic (Saudi dialect-aware, MSA-formal where appropriate)
- Secondary: English
- All Arabic text uses proper RTL rendering
- Number formatting respects locale (Arabic numerals vs. Hindi-Arabic numerals — use Arabic standard ١٢٣)
- Date formatting: Gregorian primary, Hijri available

### 5.6 Browser Support

- Chrome (latest 2 versions)
- Safari (latest 2 versions, iOS Safari)
- Firefox (latest 2 versions)
- Edge (latest 2 versions)
- Samsung Internet (latest)

---

## 6. UX / UI Principles

### 6.1 Design Language

- **Tone:** Warm, trustworthy, respectful — not corporate-cold, not casual-meme
- **Color:** Earthy palette evoking blessing/sustenance — deep green (#1A5F3F), gold accent (#C8A951), cream background (#FAF5EC), dark text (#1A1A1A)
- **Typography:** Tajawal or IBM Plex Sans Arabic for Arabic; Inter for English
- **Imagery:** Avoid stock photo clichés; use illustrations or no imagery initially
- **Motion:** Subtle and purposeful — loading skeletons, smooth transitions, no excessive animation

### 6.2 Voice and Tone

- Speaks like a thoughtful Saudi friend who happens to have data
- Religious resonance OK but never preachy ("اقبض رزقك" yes; "بإذن الله ستربح" — not unless contextual)
- Honest about limitations ("بناءً على 12 مستقل في الرياض" — don't pretend the dataset is bigger than it is)
- Encourages without flattering ("سعرك العادل" — not "أنت الأفضل!")

### 6.3 Trust Signals

- Founder name and face on the landing page
- "Made in Saudi" badge prominent
- Sample size visible on every result
- "How we calculate" explainer accessible from every result
- T&Cs and privacy in plain Arabic, not legalese

---

## 7. Data Requirements

### 7.1 Initial Seed Dataset

**Target: 500+ pricing data points before public launch.**

Sources:
1. Manual scraping of public Mostaql / Khamsat / Bahr completed projects (200+ records)
2. Founder's personal network of freelancers (30+ records, surveyed manually)
3. Public job postings on Twitter/X and LinkedIn (100+ records)
4. Government data if accessible (HRDF, MHRSD freelance income statistics)
5. Beta tester contributions (target 50+ from validation phase)

### 7.2 Data Quality Standards

- Every record must include: specialty, city, experience tier, project type, price (SAR), date, source
- Outliers flagged: prices >3x or <0.3x median for the category
- Stale data flagged: records >18 months old shown with date qualifier
- Minimum sample size for benchmark display: 5 records per combination

### 7.3 Data Privacy

- All public benchmark data is anonymized
- No freelancer's individual identity or client identity is exposed
- User submissions can be revoked at any time
- Data exports request flow available for users (PDPL compliance)

---

## 8. Out-of-Scope (Reminders)

- 🔜 **Smart pricing engine** (scope extraction + Bayesian + active elicitation) → v0.2, see `engine.md`
- 🔜 **Proposal artifact generator** (bilingual PDF + share links + read-receipts) → v0.3, see `engine.md`
- 🔜 **Outcome tracking + per-freelancer models** → v0.4, see `engine.md`
- 🔜 **Client KYC** (Wathiq / Maroof / Etimad enrichment) → v0.5, see `engine.md`
- 🔜 **Capture surfaces** (WhatsApp Business / Gmail / browser extension) → v0.5, see `engine.md`
- 🔜 **Buyer-side mode** (engine as neutral pricing authority for both sides) → v0.6, see `engine.md`
- ❌ Arabic contract templates (separate Layer 3 product)
- ❌ Late payment chasing / reminder bot
- ❌ Lead generation / freelancer-client matching
- ❌ ZATCA invoice generation
- ❌ Time tracking
- ❌ Native mobile apps
- ❌ Community features
- ❌ Multi-currency support (SAR only)
- ❌ Multi-country support (Saudi only)

---

## 9. Launch Criteria

v0.1 launches publicly when ALL of these are true:

- [ ] Validation passed (≥30% WTP in survey, ≥50 responses)
- [ ] Seed dataset has ≥500 records across at least 10 specialties
- [ ] All US-01 through US-13 acceptance criteria met
- [ ] Payment flow tested with real cards (Mada + Visa)
- [ ] Landing page Lighthouse score ≥85
- [ ] Privacy policy and T&Cs published
- [ ] Founder ready to handle support for first 30 days
- [ ] Analytics tracking confirmed working (PostHog or similar)

---

## 10. Open Questions (resolved as of 2026-05-14)

| # | Question | Decision | Status |
|---|---|---|---|
| 1 | Public benchmark page for SEO, or gated? | Anonymous gets 1 lifetime query (cookie-tracked); rest gated. | ✅ Shipped |
| 2 | Anonymous quota: 1 or 0? | 1 lifetime query. | ✅ Shipped |
| 3 | Submission feature in v0.1 or v0.2? | v0.1 — it's the moat. | ✅ Shipped |
| 4 | LinkedIn OAuth at launch? | Yes — KSA market signal. | ✅ Shipped (Google + LinkedIn live; Apple deferred) |
| 5 | Annual pricing tier at launch? | Defer to Month 3 — validate monthly first. | 🚧 Open |
| 6 | Refund policy: 7-day vs pro-rated? | Pro-rated only. | 🚧 Open (to be wired into Tap integration) |
| 7 | ZATCA-compliant invoices? | Only on user request until VAT threshold crossed. | 🚧 Open |

### Still-open questions for the founder

8. **Tap Payments vs Moyasar as primary**? Tap was the architecture default; confirm before integration starts.
9. **Pro pricing**: confirmed SAR 49/month — should there also be a freelancer-lifetime offering for early supporters?
10. **Seed data**: are we still on track for 500+ records pre-launch via the documented sources, or do we need a paid data acquisition push?
11. **Launch channel**: LinkedIn (founder-led) + Twitter/X first, or wait for press? Choice affects which OG images get priority.
12. **Methodology page tone**: technical (statistics, sample sizes) or trust-first (founder voice + examples)? Will shape the public face.

---

## 11. Document Approval

| Stakeholder | Role | Sign-off |
|---|---|---|
| Ammar Al-Hassani | Founder / Product Owner | _Pending_ |
| Claude Code | Engineering Lead | _Acknowledged — v0.1 implementation aligned with this PRD as of 2026-05-14_ |

---

**End of PRD v1.1**

For the v0.2+ pricing engine vision (patent-shaped active-elicitation system), see [`engine.md`](./engine.md).
