# Phase 3 — Client Book (M2) + Income Ledger (M3) Implementation Plan

> Execute via subagent-driven dev (fresh implementer per task → spec + quality review → fix loop). Migrations applied by the controller via Supabase MCP, then committed as files (matching Phase 1/2 convention). No founder dogfood checkpoints — build to shippable (per `build-autonomously-until-ship`).

**Goal:** A freelancer's CRM (دفتر العملاء) — track clients, gig history, contact timeline, with proactive AI follow-ups — and an Income Ledger (دفتر الدخل) — log gigs in <30s, see monthly income paid/pending/overdue, AI forecasting. These create the structured switching cost and feed HADAF (M5) later.

**Architecture:** Same stack as P1/P2. Clients/gigs are owner-scoped tables (RLS). Gig changes auto-update client rollups via a DB trigger. Income aggregation via SQL views. AI (DeepSeek) for client insights, follow-up drafting, persona, income forecasting, anomaly detection, category suggestion — all labeled "تحليل رِزق —", pure guards unit-tested, live calls spot-verified. Cross-module: M1 accepted proposal → one-tap create gig; gigs/clients link to proposals.

**Cross-phase FKs now addable (P2 deferred them):** add `proposals.client_id → clients(id)` (currently all null), `gigs.client_id → clients(id)`, `gigs.proposal_id → proposals(id)`. Invoice FK (`gigs.invoice_id`) stays nullable/no-FK until Phase 4 (M6).

---

## Decisions
- **Shared enums:** ADD `'agency'` to the existing `public.client_type` enum (M2 needs it; benchmark just won't use it). New enums: `client_source`, `client_timeline_event`, `follow_up_priority`, `gig_status`, `payment_method`.
- **Arabic search:** `create extension if not exists pg_trgm` + GIN trigram index on `clients.name` (Arabic fuzzy search).
- **Client rollups:** `clients.total_gigs/total_value_sar/avg_payment_days` maintained by a `gigs` AFTER trigger (recompute the affected client from `client_gig_summary` logic) — not trusted from the client; also a read view `client_gig_summary`.
- **Quotas (spec §IV):** free = 10 clients (total), 20 gigs/Riyadh-month, pro/admin unlimited — atomic BEFORE-INSERT triggers in `private`, errcode 53400 (mirror `enforce_query_quota`).
- **Income views:** `monthly_income`, `income_rolling_avg` (per M3.2). `income_projections` table cached AI forecast (7-day TTL).
- **AI gating:** client AI insights/forecasting are Pro per §IV; follow-up drafting + category suggestion available on free. Enforce in the actions (role check) — keep simple, log if skipped.
- **CSV export (P3.12):** Pro-tier server action returning CSV of monthly income.

---

## Tasks

### P3.1 — Schema (clients, client_timeline, gigs, income_projections, views, FKs, triggers) [controller/MCP]
One migration: enums (+ `agency`); `pg_trgm`; `clients` + 5 indexes (incl. trigram) + RLS (owner CRUD) + 10-client quota trigger; `client_timeline` + RLS (owner via user_id); `gigs` + indexes + RLS + 20/mo quota trigger; `income_projections` + RLS; views `client_gig_summary`, `monthly_income`, `income_rolling_avg`; FKs `proposals.client_id→clients`, `gigs.client_id→clients`, `gigs.proposal_id→proposals`; `gigs` AFTER INSERT/UPDATE/DELETE trigger → recompute the client's `total_gigs/total_value_sar/avg_payment_days` (+ deposit_sar/remaining_sar generated on gig write). Apply via MCP, verify (tables/RLS/triggers/views + get_advisors), commit the file.

### P3.2 — Client Book UI
`/[locale]/clients` (list: AI-prioritized sort, trigram search, filter chips, follow-up badges, Proposal/empty states), `/[locale]/clients/[id]` (detail: header, AI insight card, contact tap-links tel/mailto/wa.me, gig history, linked proposals, notes, timeline), `/[locale]/clients/new` + edit. Server actions: createClient, updateClient, archiveClient, addNote. Owner-scoped + 10-client quota.

### P3.3–3.5 — Client AI
`src/lib/ai/clientInsights.ts` (2–3 observations from gig/proposal history, labeled), `clientFollowup.ts` (one-tap Saudi-polite check-in draft), `clientPersona.ts` (persona after ≥3 gigs) + `follow_up_priority` scoring (rule-based `f(days_since_contact, total_value, avg_payment_days, has_active_proposal)` — pure + tested). Actions wire them; insights/persona Pro-gated.

### P3.6 — gigs schema → folded into P3.1.

### P3.7 — Income Ledger UI
`/[locale]/income` (list: current-month header w/ paid/pending, month comparison, AI projection chip, gig cards w/ status badges, filter chips, fast-add FAB), add-gig form (≤30s: title autocomplete, amount, client search/inline, status pills, delivery date, optional category+notes), gig detail (anomaly banner, payment timeline, linked proposal/invoice/client, mark-paid/overdue), monthly summary (bar chart, table). Actions: createGig, updateGig, markGigStatus.

### P3.8 — Income AI
`src/lib/ai/income.ts` — category suggestion (from title+specialties), anomaly detection (vs user history for category), forecasting (pipeline → projected range, cached in `income_projections`, 7-day TTL) + narrative. Pure helpers tested; forecasting Pro-gated.

### P3.9 — views → folded into P3.1.

### P3.10 — Cross-module wiring
M1 accepted proposal → "Create gig" one-tap (pre-fill title/amount/client/category from proposal) — add to proposal detail (markStatus 'accepted' → CTA). M2→M3 client pre-fill on gig form. M3 save → client rollup trigger (P3.1) + `client_timeline` event (gig_created/completed). Proposal/gig/invoice events feed `client_timeline`.

### P3.11 — Empty states for both modules (first-run, no data → clear CTA).
### P3.12 — CSV export (Pro): monthly income → CSV server action + button.

### P3.x — Tests + capstone
Unit: follow_up_priority scoring, anomaly threshold, category mapping, deposit/remaining math, monthly aggregation shape. Verify sweep (typecheck/test/build) + security advisors + final whole-branch review + fixes.

---

## Exit gate (spec §VI Phase 3)
Founder logs 10 real clients + 20 real gigs; AI follow-ups useful; forecasting reasonable; cross-module wiring works. (Human dogfood deferred to ship; engineering delivers the working flow build-verified.)
