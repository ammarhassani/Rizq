# Phase 6 (FINAL) — Methodology (M7) + Rate Calculator (M10) + Document Vault (M12) + Monetization + Polish

> Execute via subagent-driven dev. Migrations by the controller via Supabase MCP, committed as files. No founder dogfood checkpoints — build to shippable (`build-autonomously-until-ship`). Branch `phase-6-methodology-rate-vault-monetization` off `phase-5-dashboard-calendar-hadaf-onboarding` (stacked; nothing merges to main). This is the LAST phase before the FLRP transformation is shippable.

**Goal:** Close the suite — the credibility surface (M7 Methodology, linked from every number), the reverse-pricing tool (M10 Rate Calculator), secure document storage (M12 Vault), the monetization layer (Pro upgrade flow + tier enforcement + upgrade modal), and the cross-cutting polish (PDPL export/delete, mobile/Arabic pass, perf). After this phase the suite is feature-complete per spec v2.

---

## Decisions (locked from spec + reality)
- **Tap Payments = founder blocker.** Real payment processing needs a Tap merchant account + API keys (PCI/Saudi-compliant) the founder must provision. BUILD the upgrade-flow UI + the post-payment role-grant path + the upgrade modal, but DEFER live Tap charging behind a clear seam (a `startUpgrade` action that, until Tap keys exist, routes to a "contact us / coming soon" state OR an admin-grant). Flag the founder: provide Tap keys to go live. Tier ENFORCEMENT already exists (DB quota triggers read `users.role`); this phase adds the upgrade *surface*, not new enforcement.
- **Honesty:** M7 is the honesty architecture made public — content describes the REAL pipeline already built (Collector 1 reasoned priors labeled "تحليل رِزق", Collector 2 published references, Collector 3 Saudi Open Data, weighted percentile, freshness, provenance citations). AI FAQ answers ONLY from methodology content; "خارج نطاق المنهجية المنشورة" when out of scope. M10 AI narrative never discourages/over-promises. M12 AI categorization/expiry labeled + confidence-scored.
- **Pluggable:** `methodology_sections` (config), `document_categories` (config), rate calculator is a pure function. New section/category = INSERT.
- **M12 Storage:** private `documents` bucket (Supabase Storage), RLS so users access only their own paths (`{user_id}/...`); signed URLs for view/share; time-limited share tokens. Soft-delete (`deleted_at`). OCR/vision deferred — AI categorization uses filename + user-entered context (text-only); expiry detection from user-entered or AI-on-text (no vision). Wire M8's deferred FL document upload here.
- **M10 storage:** small `rate_calculator_defaults` table (per spec) OR reuse users columns; use a dedicated table to keep it clean. Pure `calculateRate` over resolvePrice (M4) + monthly_income (M3) history.
- **PDPL (6.11):** ship a basic account data export (JSON of the user's own rows) + account deletion (cascade via FK on delete cascade already in place) action, + a privacy note. Cookie consent / full policy = lightweight.
- **No marketplace scraping. RLS owner-only on documents + rate defaults. AI labeled. Mobile-first 375px RTL.**

---

## Tasks

### P6.1 — Methodology schema + seed [controller/MCP]
`methodology_sections` (id PK, parent_id, sort_order, title_ar/en, content_ar/en markdown, icon, deep_link, last_updated, enabled) + public read. Seed the real sections: how-we-collect (3 collectors), reasoned-priors (AI-labeled), published-refs, open-data, weighted-percentile, freshness-decay, provenance-confidence, personal-history-weighting, what-we-dont-do (no scraping/PDPL). Apply, verify, commit.

### P6.2 — Methodology page + AI FAQ + citation deep-links
`/[locale]/methodology` (public, SSG-friendly): renders sections from the table (markdown → RTL), anchored by `deep_link`. AI FAQ island (`/lib/ai/methodologyFaq.ts` pure builder + action) answering from section content, labeled, out-of-scope honest. **Citation deep-links (6.2):** the artifact `verification`/`pricing` citation + the /tool result + provenance citations link to `/methodology#<section>`. (Proposal/invoice artifacts already have `methodologyHref: "/methodology"` — point citations at the right fragment.)

### P6.3 — Rate Calculator (M10)
Schema: `rate_calculator_defaults` (owner-only). Pure `src/lib/rate/calculate.ts` `calculateRate(input, marketData)` → hourly/daily/per-project, market_percentile, is_realistic (≤90), suggestion — UNIT-TESTED. `/[locale]/rate-calculator` UI: target SAR/mo, working days, billable hrs/day, projects/mo; prefill specialty/city/tier from M8 profile; call resolvePrice for market band + percentile; show results + reality check. AI positioning narrative (`/lib/ai/ratePositioning.ts` pure builder + action, labeled, never discourage/over-promise). M3 history calibration ("you currently earn X").

### P6.4 — Document Vault schema + Storage [controller/MCP]
`document_categories` (config seed: freelance_doc, commercial_reg, tax_cert, contract, portfolio, nda, other) + `documents` (full M12.1) + RLS owner CRUD + a shared-public-read path via a `get_shared_document` RPC (token + not-expired) mirroring the proposal/invoice share pattern (NO broad anon SELECT). Private `documents` Storage bucket + Storage RLS policies (users r/w only their `{user_id}/` prefix). Apply, verify (advisors), commit.

### P6.5 — Document Vault UI + AI
`/[locale]/documents` (list: category filter, expiry badges, search), upload (file → Storage `{user_id}/{uuid}`, insert row), detail (signed-URL view/download, share toggle w/ expiry, tags, category). AI: `/lib/ai/documentCategorize.ts` (filename + user context → {category, confidence}) + `/lib/ai/documentExpiry.ts` (user-entered/text → {expiry_date, confidence}) — labeled suggestion chips. Wire M8 FL upload → Vault. Quota: free 10 / pro 50 documents (DB trigger or action check).

### P6.6 — Monetization: Pro upgrade flow (Tap deferred)
`/[locale]/upgrade` (Pro benefits, SAR 49/mo, annual SAR 490). `startUpgradeAction` behind a seam: if Tap keys absent → "coming soon / contact" state + (admin) manual grant path; structured so adding Tap webhooks later flips it live. A `subscriptions`-free model: Pro = `users.role='pro'` + `pro_until` (existing column). Flag founder: Tap merchant credentials needed to charge.

### P6.7 — Tier enforcement surface + upgrade modal
Enforcement already in DB (quota triggers on proposals/clients/gigs/invoices read users.role). Add a reusable `UpgradeModal` shown on `quota_exhausted` (53400) across modules with the natural upgrade copy ("You've used N/N this month — upgrade for more + AI"). Audit each module's quota_exhausted handling → surface the modal. Pro-gated AI features (client insights/persona, income forecast, CSV) show an upgrade nudge for free users (already partially present — make consistent).

### P6.8–6.10 — Polish
- Perf: dynamic-import heavy client islands, check bundle; aim mobile-friendly (full Lighthouse run is founder-side, but remove obvious regressions).
- Mobile responsiveness: 375px pass across the new modules (dashboard/calendar/hadaf/onboarding/rate/documents/methodology).
- Arabic content review: Saudi-polite phrasing across new i18n; AI prompt output quality (the labeled-honesty guards already in place).

### P6.11 — PDPL
`exportMyDataAction` (owner's rows → JSON download) + `deleteMyAccountAction` (cascade delete via FK) + a settings/privacy surface. Privacy note + the "رِزق ليست جهة حكومية / data stays in Rizq" reassurance already in HADAF.

### P6.x — Final capstone
Unit: calculateRate, rate-positioning/methodology-faq/document-categorize/expiry pure builders. Full sweep (typecheck/test/build) + `get_advisors` + **whole-branch review** (`git diff phase-5-...HEAD`) + fixes. Security: documents Storage RLS (no cross-user file access), share RPC (no anon leak), no secret. Then declare Phase 6 + the FLRP transformation **shippable** and hand the founder the go-live checklist (Tap keys, DeepSeek key rotation, Qemma dataset, merge-to-main decision).

---

## Exit gate (spec §VI Phase 6)
Founder uses full suite 1 week bug-free; 5 freelancers dogfood; Methodology live + linked from every artifact; all AI useful/accurate. (Human dogfood is the founder's; engineering delivers the shippable, build-verified suite + the go-live checklist of genuine external blockers.)
