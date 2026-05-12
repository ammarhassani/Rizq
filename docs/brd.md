# Rizq (رِزق) — Business Requirements Document (BRD)

| Field | Value |
|---|---|
| Document version | v1.0 |
| Author | Ammar Al-Hassani (Founder) |
| Date | May 12, 2026 |
| Status | Draft — pre-validation |
| Stakeholders | Founder (solo), Claude Code (CTO/engineering), early adopters (TBD via validation) |

---

## 1. Executive Summary

**Rizq** is a web-based suite of tools designed exclusively for Saudi national freelancers (المستقلون السعوديون). The product launches with a single tool — a Saudi-localized service pricing benchmark — and expands organically into a complete operating system for the Saudi freelancer's professional life.

The product addresses a confirmed market gap: despite 1.5M+ Saudi national freelancers generating SAR 72.5B in economic value annually, no Arabic-first, Saudi-localized SaaS tool exists for the most universally cited pain point — service pricing. Existing solutions (Mostaql, Khamsat, Bahr, Qoyod) serve different parts of the freelancer's life but leave pricing as a guessing game.

**Business goal:** Achieve 1,000–3,000 SAR/month in side income for the founder within 6 months of launch through subscription revenue (49 SAR/month Pro tier), while building a brand that can grow into a multi-tool freelance suite over 24 months.

---

## 2. Background and Context

### 2.1 Market Context

- **Total addressable population:** 1.5M+ active Saudi national freelancers (MHRSD/Future Work Company, 2024)
- **Economic contribution:** SAR 72.5 billion / ~USD 19 billion (~2% of Saudi GDP, 2023)
- **Growth rate:** ~22% YoY in registered freelancers
- **Geographic concentration:** Riyadh 27%, Makkah 22%, Eastern Province 14%
- **Demographics:** 25–34 dominant age bracket; 62% bachelor's degree holders
- **Vision 2030 alignment:** Saudi government actively promotes freelance work through the freelance.sa platform, Bahr platform, and HADAF income support (40% subsidy on monthly Bahr earnings ≥ SAR 700)

### 2.2 The Core Problem

Saudi freelancers consistently report pricing as a top source of anxiety and economic loss:

- **Under-pricing**: Loss of fair compensation, working unsustainable hours
- **Over-pricing**: Loss of contracts to lower-bidding competitors
- **Negotiation weakness**: Clients exploit the absence of a public benchmark
- **No data**: Every existing Arabic article on freelance pricing ends in vague frameworks rather than concrete numbers

Existing solutions are all foreign-language (English/USD-denominated) or focus on different problems (lead generation, invoicing, escrow). The Saudi freelancer pricing benchmark space is empty.

### 2.3 Why Now

- ZATCA digital transformation has normalized Saudi SaaS subscriptions (Qoyod, Wafeq prove WTP at 60–199 SAR/month)
- AI tooling (LLMs, embeddings, vector search) makes hyper-localized data products buildable by solo founders
- Vision 2030 has legitimized the freelance career path, creating a rapidly growing first-time-freelancer cohort with acute pricing confusion
- Existing players (Mostaql, Khamsat, Bahr) have not addressed this gap despite a decade of operation

---

## 3. Business Objectives

### 3.1 Primary Objectives (Year 1)

| # | Objective | Metric | Target |
|---|---|---|---|
| 1 | Generate sustainable side income | Monthly Recurring Revenue (MRR) | 2,000–5,000 SAR/month by Month 6 |
| 2 | Validate willingness-to-pay | % of waitlist that converts to paid | ≥3% conversion |
| 3 | Build a defensible Saudi freelance brand | Active waitlist + paying users | 1,000+ waitlist, 100+ paying by Month 12 |
| 4 | Establish the data moat | Verified Saudi pricing data points | 5,000+ benchmark records by Month 12 |
| 5 | Maintain founder's day job | Hours/week spent on Rizq | ≤15 hours/week, mostly weekends |

### 3.2 Secondary Objectives

- Establish founder as a recognized voice in Saudi freelance community (LinkedIn KSA, X)
- Generate organic content/data that becomes a research asset
- Build the foundation for Layer 2 (proposals) and Layer 3 (contracts) without scope-creeping v0.1

### 3.3 Non-Goals (Explicitly Out of Scope)

- Building a freelance marketplace (lead generation) — disqualified by two-sided liquidity requirement
- Building accounting / ZATCA invoicing — commoditized by free tools (Zoho Invoice, Qoyod Lite)
- Serving expatriate freelancers — different pain profile, doesn't fit current focus
- Mental health, community, or networking features — wrong founder, wrong stack
- Mobile app — web suite only, mobile-responsive

---

## 4. Stakeholders and Users

### 4.1 Internal Stakeholders

| Role | Person | Responsibility |
|---|---|---|
| Founder / Product / Marketing | Ammar Al-Hassani | Strategy, validation, content, customer voice |
| Engineering / CTO | Claude Code (AI agent) | All technical implementation |
| Legal | TBD (likely outsourced for contracts in Layer 3) | Contract template review |

### 4.2 Primary User Persona

**"Khalid the Saudi Freelance Designer"**

- 28 years old, Saudi national, lives in Riyadh
- Holds Saudi Freelance Work Document (وثيقة العمل الحر)
- Active on Mostaql and Khamsat; takes occasional direct clients
- Monthly income: SAR 4,000–12,000 (volatile)
- 3–4 years freelancing, started after university
- Uses Excel/WhatsApp/Notes app to track work and clients
- Pain: "I never know if I'm pricing right. My friend gets paid double for the same logo design."
- Has paid for: Mostaql commissions (effectively), Canva Pro, occasionally ChatGPT Plus
- Would pay 49 SAR/month if the product proved itself in the first month

### 4.3 Secondary User Personas

- **Sara the Saudi Freelance Writer** — content writer, Khamsat-heavy, more price-sensitive
- **Faisal the Saudi Freelance Developer** — higher income (SAR 8,000–25,000/mo), willing to pay 99 SAR/mo, values data accuracy
- **Nora the Saudi Marketing Consultant** — direct clients only, no platform, needs benchmarks for proposals

---

## 5. Business Model

### 5.1 Revenue Streams

**Primary (v0.1):**
- **Freemium SaaS subscription**
  - Free tier: 3 benchmark queries/month
  - Pro tier: SAR 49/month (unlimited queries + advanced filters)
  - Pro+ tier (future): SAR 99/month (proposal generator + contract templates)

**Future / Secondary (v0.2+):**
- Annual pricing (10× monthly = SAR 490/year, ~17% discount)
- One-time data exports for power users
- White-label/API access for Saudi platforms (Mostaql/Khamsat partnership scenario)
- Sponsored placements (carefully — must not compromise data integrity)

### 5.2 Unit Economics (Projected)

| Metric | Target |
|---|---|
| Average Revenue Per User (ARPU) | SAR 49/month |
| Customer Acquisition Cost (CAC) | <SAR 30 (organic-first) |
| Gross margin | ~85% (LLM API costs are the main variable cost) |
| Churn (monthly) | <8% target |
| Lifetime Value (LTV) | SAR 600+ |
| LTV:CAC ratio | 20:1 target |

### 5.3 Pricing Rationale

- **49 SAR/month** sits below Qoyod Lite (60 SAR/mo) — proves Saudi freelancers will pay
- Above coffee/snacks — passes the "is this worth it" smell test
- 49 × 12 = 588 SAR/year — less than 1% of a SAR 60K freelance income
- Free tier removes signup friction during validation phase
- 3 queries/month is enough to demonstrate value, low enough to force upgrade for active bidders (who bid 5–20/week)

---

## 6. Success Metrics

### 6.1 Validation Phase Metrics (Pre-Build)

| Metric | Pass | Pivot | Kill |
|---|---|---|---|
| Survey responses | ≥50 | 20–49 | <20 |
| % expressing pricing as top pain | ≥40% | 25–39% | <25% |
| % willing to pay 39+ SAR/mo | ≥30% | 15–29% | <15% |
| Email waitlist signups | ≥100 | 30–99 | <30 |
| Qualitative depth (specific stories) | 10+ rich responses | 3–9 | <3 |

**Decision rules:**
- **All "Pass" → build Layer 1**
- **Any "Pivot" → narrow niche (e.g., Saudi designers only), re-test**
- **Any "Kill" → pivot to contract generator as v0.1 wedge**

### 6.2 Build & Launch Phase Metrics

| Metric | Target |
|---|---|
| Time from validation pass to v0.1 launch | Best-effort, no SLA |
| Free tier signups in first month post-launch | 200+ |
| Free → Pro conversion rate | 5–10% |
| Pro tier retention (Month 1) | ≥75% |
| Net Promoter Score (NPS) | ≥40 |

### 6.3 Growth Phase Metrics (Months 3–6)

| Metric | Target |
|---|---|
| Monthly Recurring Revenue (MRR) | SAR 2,000–5,000 |
| Paying users | 50–100 |
| Organic traffic / month | 5,000+ |
| Brand mentions on Saudi LinkedIn/X | 10+/month |

---

## 7. Strategic Constraints

### 7.1 Founder Constraints

- **Time:** ≤15 hours/week, mostly weekends + 2 weekday evenings
- **Capital:** ≤SAR 10,000 upfront (domain, hosting, ads, legal review for contracts)
- **Employment:** Must not conflict with Al-Rajhi Bank role (data analyst, banking sector)
- **Family:** Wedding/engagement timeline — cannot eat evenings during peak months
- **Skills gap:** Founder is data-strong but not a hardcore coder; relies on Claude Code as engineering layer

### 7.2 Technical Constraints

- **Stack: Vercel-based.** Next.js + Supabase + Vercel Edge Functions
- **No mobile app** in v0.1 — web responsive only
- **Halal payment processing only** — Tap Payments or Moyasar (Saudi-compliant)
- **Data sovereignty** — user data should be stored in compliant cloud regions; verify Supabase region options

### 7.3 Market Constraints

- **Competing free tools** (Mostaql, Khamsat exist for matching/escrow; not pricing benchmarks)
- **Cultural expectations** — Saudi market expects polished Arabic UX, religious sensitivity (halal framing, no riba)
- **Trust barrier** — Saudi consumers prefer brands with Saudi national founders; founder identity matters
- **Acquisition channels** — limited to organic (LinkedIn, X, freelance communities) + optional minimal paid (Twitter/X ads, LinkedIn ads)

### 7.4 Regulatory Constraints

- **No financial advice** — Rizq provides market data, not financial planning
- **No tax/legal advice** — disclaimer required, especially for Layer 3 (contracts)
- **Personal data protection** — comply with Saudi Personal Data Protection Law (PDPL), 2023
- **VAT registration** — required only if Rizq itself exceeds SAR 375K revenue (not an immediate concern)

---

## 8. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Mostaql or Bahr launches a competing pricing tool | Medium | High | Move fast; build data moat (5K+ records); brand affinity through Saudi-founder authenticity |
| Validation reveals pricing is NOT the top pain | Medium | Medium | Pre-committed pivot path: contracts as v0.1 wedge |
| Saudi freelancers refuse to pay for Arabic SaaS | Low-Medium | High | Freemium model with low (49 SAR) Pro price; existing proof from Qoyod adoption |
| Founder burnout from wedding + day job + build | Medium | High | No-SLA discipline; ship Layer 1 only; ruthless scope control |
| Data accuracy disputes (someone says benchmark is wrong) | High | Medium | Show source counts ("based on 47 Saudi designers in Riyadh"); allow community correction |
| Mostaql/Khamsat block scraping | Medium | Medium | Diversify data sources: user-submitted data, surveys, public job posts, Twitter/X scraping |
| ChatGPT/Claude commoditize the proposal layer | High | Low (for v0.1) | Layer 1 (pricing) is the moat, not the proposal layer |
| Legal exposure on inaccurate pricing recommendations | Low | Medium | Clear "benchmark not advice" disclaimer; T&Cs |

---

## 9. High-Level Roadmap

### Phase 0 — Validation (current phase, no SLA)
- Landing page live
- Survey collecting responses
- Brand presence established on LinkedIn KSA + X Saudi tech
- 50+ survey responses + 100+ waitlist signups before any code

### Phase 1 — v0.1 Layer 1: Pricing Benchmark (post-validation)
- Core pricing benchmark web app
- Free tier (3 queries/month) + Pro (49 SAR/month, unlimited)
- 500+ seed data points across 10 categories × 5 cities × 3 experience levels
- Public launch on LinkedIn + X
- First 10 paying customers

### Phase 2 — v0.2 Layer 2: AI Proposal Generator (Month 3–4 post-launch)
- Browser extension OR web tool
- Paste Mostaql/Khamsat brief → returns Arabic proposal with price from Layer 1
- Pro+ tier introduced at 99 SAR/month
- Target: 20% of Pro users upgrade

### Phase 3 — v0.3 Layer 3: Arabic Contract Templates (Month 6–8 post-launch)
- 5–10 halal contract templates, lawyer-reviewed
- E-signature integration
- Pro+ tier features expanded

### Phase 4 — Suite expansion (Month 12+)
- Income tracking + HADAF eligibility advisor
- Client CRM
- Optional: ZATCA-compliant invoice generation (only if freelancers > SAR 375K become significant in user base)

---

## 10. Open Questions

- Which Saudi payment processor is fastest to integrate on Vercel/Supabase: Tap, Moyasar, or HyperPay?
- Should the data moat be deepened by user-submitted "I just got paid SAR X for Y" reports? (Yes — but how to incentivize honestly?)
- Should there be a free public benchmark page (SEO play) vs. all-gated content?
- At what point does Rizq need a formal commercial registration (CR) vs. operate under the founder's freelance document?
- Should we offer annual pricing at launch or wait for Month 3?

---

## 11. Sign-off

| Stakeholder | Role | Sign-off |
|---|---|---|
| Ammar Al-Hassani | Founder, Product Owner | _Pending_ |
| Claude Code | Engineering | _Pending after PRD review_ |

---

**End of BRD v1.0**
