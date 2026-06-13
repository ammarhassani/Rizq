# Phase 5 — Dashboard (M0) + Calendar (M9) + HADAF (M5) + Onboarding v2 (M8)

> Execute via subagent-driven dev (fresh implementer per task → review → fix). Migrations applied by the controller via Supabase MCP, then committed as files (Phase 1-4 convention). No founder dogfood checkpoints — build to shippable (`build-autonomously-until-ship`). Branch `phase-5-dashboard-calendar-hadaf-onboarding` off `phase-4-invoicing` (stacked; nothing merges to main).

**Goal:** The cross-module surfaces that turn 4 separate modules into one product: a **Dashboard** home (M0, the post-login landing), a unified **Calendar** (M9, read-only over all modules), the **HADAF** eligibility tracker (M5, Vision-2030 income-support progress), and **Onboarding v2** (M8, the deep profile builder that captures the freelancer's professional DNA and unlocks personalization the earlier modules currently stub with defaults).

**Order (spec §VI):** dashboard tables → dashboard UI → calendar view+prefs → calendar UI → hadaf tables → hadaf calc → hadaf UI → onboarding schema → onboarding AI → wire nav/quick-actions. Dashboard/Calendar/HADAF read EXISTING module tables, so they don't depend on M8's new user columns; M8 lands later in the phase and then lets us (optionally, in 5.10) wire proposal/invoice artifact branding to real `users.brand_*`/`default_*` instead of Rizq defaults.

---

## Decisions (locked from spec)
- **Honesty:** AI insights/action-plan labeled "تحليل رِزق —" + "هذا تحليل آلي — ليس استشارة مهنية." (M0) / "هذه خطة مقترحة … ليست نصيحة مالية." (M5). Never fabricate; only provided data. HADAF UI carries the official disclaimer + hrdf.org.sa link; "رِزق ليست جهة حكومية".
- **Pluggable:** `widget_registry` + `dashboard_preferences` (M0); `calendar_events` UNION view (M9); `hadaf_rules_config` singleton (M5); `onboarding_steps` config (M8). New widget/event-source/program/step = config row + component, no refactor.
- **Calendar view reality check:** the spec's view references `proposals.delivery_date`/`proposals.title` — THOSE COLUMNS DON'T EXIST. Implement the proposals branch using real columns: event_date = `coalesce((scope_json->>'delivery_date')::date, expires_at::date)`, title = `coalesce(client_name, 'عرض تقديمي')`. gigs/invoices/clients branches use real columns as specced. View is `security_invoker = true` (per-user RLS, no cross-user leak — the P3 lesson). Filter to non-terminal statuses.
- **HADAF feed:** monthly paid income per Riyadh-month from `gigs` (status='paid'); reuse `monthly_income` view (paid_sar) where possible. `calculateHadafStatus` is a PURE function (rules + monthly incomes → {streak, status, months_to_qualify, estimated_subsidy, history}) — unit-tested. Cache in `hadaf_status_cache` (7-day TTL).
- **AI gating:** M0 insights + M9 scheduling insight + M5 action plan are all "included" for free per monetization table (Calendar AI, Client AI insights all "Included"; M0 business insights "—"/Included). Build free; cache to control cost (M0 1hr, M5 7-day).
- **M8 users extension:** ADD all M8.1 columns to `users` via `add column if not exists` (idempotent; never drop). New enums: `rate_confidence`, `primary_goal`, `ip_terms` (reuse existing if present — `proposal`/invoice already have ip-terms-like enums; check). `default_ip_terms`/`default_payment_method` reuse existing enums. RLS unchanged (self-only). Many columns (`preferred_tone`, `brand_*`, `tagline_*`, `contact_*`, `default_*`, `specialties`) retroactively satisfy the graceful-fallback TODOs left in P2/P3/P4.
- **FL document + portfolio uploads** need a private Storage bucket (Step 2/7) — defer the actual bucket + OCR vision to Phase 6 (M12 Document Vault owns storage). For Phase 5: capture `fl_number`/text fields; make the upload + AI-FL-validation a best-effort optional that no-ops if storage isn't wired (flag clearly). Tagline AI suggestion (Step 8) IS in scope (text-only, cheap).
- **Routes:** `/[locale]/dashboard` (post-login landing; update auth redirect + AuthNavSlot), `/[locale]/calendar`, `/[locale]/hadaf`, `/[locale]/onboarding` (multi-step; v0.1 had a basic one — extend, don't break existing users).

---

## Tasks

### P5.1 — Dashboard schema [controller/MCP]
Migration: `dashboard_preferences` (user_id PK→users, widgets jsonb default the 6-widget array, layout jsonb, updated_at) + RLS self-only; `widget_registry` (id PK, name_ar/en, icon, source_module, default_order, min_tier, enabled, config_schema) + public read (config table) + seed the 7 widgets. Apply, verify, commit.

### P5.2 — Dashboard UI
`/[locale]/dashboard` server page: auth-gate, render the widget grid (2-col desktop / 1-col mobile) from widget_registry ∩ user prefs. Widgets (each self-contained, owner-scoped, graceful empty state + skeleton + error boundary): **AI Business Insights** (hero, DeepSeek, cached 1hr in a small cache table or reuse a column — store last insight + generated_at; thumbs feedback best-effort), **Recent proposals** (last 5), **Upcoming deadlines** (reuse `getUpcomingInvoiceDueDates` + calendar view next-7d), **Active clients** (count + no-contact>60d flag), **Monthly income** (monthly_income current vs last), **Quick pricing** (resolvePrice mini), **Quick actions** (New Proposal/Log Gig/Add Client/Generate Invoice — always visible). Set `/dashboard` as the post-login landing.

### P5.3 — AI Business Insights (M0.6)
`src/lib/ai/businessInsights.ts` (pure prompt builder + generateObject → 2-4 labeled insights) + action `generateBusinessInsightsAction` (aggregates last-30d proposals, 3mo gigs, clients, 6mo income, next-30d deadlines; cached 1hr; labeled; no-fabrication). Pure builder unit-tested.

### P5.4 — Calendar schema [controller/MCP]
Migration: `calendar_preferences` table + RLS self-only; `calendar_events` view (`security_invoker=true`) UNION of proposals(scope_json/expires_at)/gigs/invoices/clients per the reality-check decision; grant select to authenticated only. Apply, verify (advisors + a per-user select), commit.

### P5.5 — Calendar UI (M9.3)
`/[locale]/calendar`: month view (Saudi Sun–Sat, Fri–Sat weekend highlight, event dots color-coded by module, tap-day→agenda), agenda view (grouped Today/Tomorrow/This Week/…), week view (basic). Hijri date display when `show_hijri` (Intl `islamic-umalqura` calendar — no external API). AI scheduling insight card. Events tap → source module. Read from `calendar_events` view (owner-scoped by RLS).

### P5.6 — HADAF schema + rules [controller/MCP]
Migration: `hadaf_preferences`, `hadaf_status_cache`, `hadaf_rules_config` (singleton, seed the documented 2026 rules: min 700, 3 months, 40%, bahr, source_url) + RLS (prefs/cache self-only; rules_config public read). Apply, verify, commit.

### P5.7 — HADAF calculator (M5.2)
`src/lib/hadaf/calculate.ts` PURE `calculateHadafStatus(rules, monthlyIncomes[], today)` → {current_streak, current_month_status, current_month_income, months_to_qualify, estimated_subsidy, streak_history}. Unit-tested (qualifying streak, broken streak, no-data, subsidy math, month boundaries Riyadh-tz). Action to compute from `monthly_income`/gigs + cache (7-day TTL).

### P5.8 — HADAF UI + AI action plan (M5.3, M5.6)
`/[locale]/hadaf`: 3 state cards (qualifying streak w/ animated 3-segment bar / not-qualifying w/ gap + AI action plan / no-data→M3 CTA), monthly history table (12mo), prominent disclaimer + hrdf link. `src/lib/ai/hadafActionPlan.ts` (pure builder + generateText, labeled, 3-5 bullets, when not_qualifying) + action.

### P5.9 — Onboarding v2 schema [controller/MCP]
Migration `extend_users_profile`: `add column if not exists` ALL M8.1 columns on `users` (identity/FL, professional, rate history, platform, portfolio, brand, contact, business defaults, goals, onboarding metadata); new enums rate_confidence/primary_goal (reuse ip_terms/payment_method if present). `onboarding_steps` config table + seed the 11 steps. RLS unchanged. Apply, verify (no break to existing user rows; existing onboarding still works), commit.

### P5.10 — Onboarding v2 flow + AI tagline + cross-module wiring
Extended onboarding UI at `/[locale]/onboarding` (11 steps, config-driven, save-per-step into users, profile_completeness_pct, skip on optional, resume from onboarding_step). `src/lib/ai/taglineSuggestion.ts` (pure builder + generateObject {ar,en} suggestions from specialty/bio) + action (Step 8). FL upload + AI-FL-validation = best-effort optional, no-op without storage (flag for Phase 6/M12). **Wiring (5.10):** nav links + quick-actions across modules; optionally upgrade proposal/invoice artifact assembly to read real `users.brand_*`/`tagline_*`/`contact_*`/`default_*`/`preferred_tone` now that they exist (replaces the Rizq-default fallback — keep the fallback for null fields).

### P5.x — Tests + capstone
Unit: hadaf calculator, business-insights/tagline/action-plan pure builders, calendar event grouping, profile_completeness. Verify sweep (typecheck/test/build) + `get_advisors` + final whole-branch review (`git diff phase-4-invoicing..HEAD`) + fixes. Check: view security_invoker (no cross-user leak), users-extension didn't break existing flows, RLS on all new tables, AI labeled, no secret leak, calendar proposals-branch uses real columns.

---

## Exit gate (spec §VI Phase 5)
Dashboard renders without errors. Calendar shows events from all modules. HADAF calculator produces correct outputs. Onboarding flow works end-to-end. (Human dogfood deferred to ship; engineering delivers the working build-verified flow.)
