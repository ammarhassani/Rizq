# Rizq — Project Context for Claude Code

## How every agent answers here (caveman)
**Applies to Claude Code and every other coding agent in this repo.** Reply terse, like a smart
caveman: drop articles, filler and pleasantries; fragments are fine; keep every bit of technical
substance. Technical terms, identifiers, error strings and commit-type keywords stay exact.

- Pattern: `[thing] [action] [reason]. [next step].`
- Not: "Sure! I'd be happy to help you with that. The issue you're experiencing is..."
- Yes: "Bug in auth middleware. Token expiry check uses `<` not `<=`. Fix:"
- **Written artifacts stay normal prose:** code, comments, commit messages, PR bodies, and the
  Arabic/English user-facing copy in `messages/*.json`. Compress the chat, never the product.
- **Drop caveman** for security warnings, irreversible-action confirmations, and any multi-step
  sequence where clipped grammar could be misread. Resume after.

The same rule is mirrored for other tools in [`AGENTS.md`](../AGENTS.md),
`.cursor/rules/caveman.mdc`, `.windsurf/rules/caveman.md`, `.clinerules/caveman.md`,
`.github/copilot-instructions.md` and `.opencode/AGENTS.md` — regenerate them all with
`/caveman-init`. Turn it off per-session with "stop caveman" / "normal mode".

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
- Backend: Node server (self-hosted) + Supabase (Postgres + Auth + Storage)
- Database: Supabase Postgres with Row Level Security on every table
- Auth: Supabase Auth (email + Google + LinkedIn OAuth)
- Analytics: PostHog · Errors: Sentry
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
  ❌ **DROPPED (reverted 2026-07-01)** — founder decision: Rizq is Saudi/SAR-only
  (foreign freelancers use their own tools; won't adopt an Arabic-branded app). All
  currency code removed; app is SAR-only again. The onboarding restructure it rode
  in with (single name, FL chip, 2-col, steppers, derived daily, no-max, goal wheel)
  was KEPT. Additive DB columns (users.rate_currency, invoices.currency + fx_*,
  fx_rates) left in place but inert/unused (drop later when convenient).
- `specs/008-production-validation/` — **Production-Maturity Validation**: prove the whole app is
  production-ready with evidence, not vibes. (A) static spec-vs-code audit of every module M0–M12 +
  cross-cutting lenses (money-math, honesty/provenance, RLS, i18n) → severity-ranked gaps; (B) committed
  Playwright e2e harness (`e2e/`) that self-signs-up a disposable user (email-confirm OFF), clears the
  onboarding gate, and drives every module + golden path (proposal→project→invoice→income→dashboard) +
  cross-cutting suites (RLS 2-user, axe a11y, RTL/i18n, mobile, share-token safety, realtime feedback)
  against real Supabase+DeepSeek; (C) merged `docs/validation/production-maturity-report.md` verdict.
  **No product-source changes** (validation only; role/label selectors, no `data-testid`). Adds
  `@playwright/test` dev dep. Plan: [specs/008-production-validation/plan.md](specs/008-production-validation/plan.md).
  ✅ **SHIPPED**: static audit (`docs/validation/business-logic-audit.md`) + committed Playwright
  harness (`e2e/`) + merged report (`docs/validation/production-maturity-report.md`); remediation
  applied (invoice→project link; `monthly_income` view now counts paid gigs with no delivery date;
  a11y + honesty fixes).
- `specs/009-settings-profile-kyc/` — **Profile as single KYC source of truth (Settings)**: one
  **Settings → Profile** page to complete/backfill the whole profile (reuses the onboarding `Step*`
  editors + `saveOnboardingStep` + `profileCompleteness`), with a strength bar + "what's missing (+X%)"
  list; section save → `router.refresh()` recomputes strength. Retire the duplicate **studio profile**
  (delete `/proposals/profile` + `StudioProfileForm` + the Proposals button + CommandPalette entry) after
  re-homing its only unique concept — **testimonials** — as a profile section (`TestimonialsEditor`). Replace
  the Proposals button with a **strength nudge** hidden at/above 80%. Extract snapshot loader +
  strength mapping to `lib/profile/snapshot.ts` (shared with onboarding). **No new fields/columns, no
  migration.** Plan: [specs/009-settings-profile-kyc/plan.md](specs/009-settings-profile-kyc/plan.md).
  ✅ **SHIPPED**: Settings → Profile KYC page (reuses `Step*` editors + autosave-on-real-edit); honest
  **core/optional** strength model (`lib/profile/strength.ts` — track-record is optional, never
  penalizes newcomers; retired `completeness.ts`); studio profile deleted (testimonials re-homed as a
  profile section); proposals strength nudge hidden ≥80%.
- `specs/010-gap-remediation/` — **Gap Remediation & Growth**: close highest-ratio post-009 gaps in
  priority-ordered independent slices. P1: `WidgetError` error+retry on M7/M9/M12/Projects (retire
  swallowed-error false-empty states) + localize Recent-Proposals status enum (no raw enum to `en`).
  P2: enforce `pro_until` expiry at the single `isPro` helper (`upgrade.ts:43` — grant never lapses
  today) + wire tone-AI quota + regression-guard pricing free tier = 5. P3: M4 AI-trend layer
  (labeled, non-blocking) + M8 FL verification (`fl_verified`, step-6 URLs, step-5 insight). P3
  **FOUNDER-GATED**: Tap payments (migration + external dep; contract authored, DO NOT BUILD until
  greenlit). No migration except the gated Tap slice. Plan:
  [specs/010-gap-remediation/plan.md](specs/010-gap-remediation/plan.md).
  ✅ **US1/US2/US3/US5 SHIPPED** (2026-07-26) incl. regressions: error-vs-empty server-component
  test (`src/app/__tests__/error-states.test.ts` — failure injected at `createClient`, element tree
  walked; Playwright can't fail a server-side read), proposal status labels extracted to
  `src/components/dashboard/proposalStatus.ts` + unit, `FREE_MONTHLY_QUERIES = 5` guard.
  Still open: quickstart US5 manual steps (live DeepSeek trend + FL upload); the remaining
  inline-ternary copy → `next-intl` catalog migration (deliberate follow-up, out of scope).
- `specs/011-power-user-pass-3/` — **Power-User Pass 3 Remediation**: the 18 defects found driving
  the app in Arabic as a freelancer (pass 3, 2026-07-26). 8 independent slices, **no migration**,
  no new dependency. P1 (MVP): Arabic ICU counts render `NaN` on the pricing result + public
  result page (pre-formatted number passed to a plural arg) and the sentence misstates provenance;
  VAT can be charged with `vat_registered=false` and no VAT number on the document; client-facing
  proposal/invoice leak the price floor + band, the freelancer's **auth email** (`brand.ts` contact
  fallback) and Rizq's own tagline as theirs; validation failures render as generic "try again"
  with no field. P2: onboarding rate verdict ignores the hourly rate, resume lands on the completed
  step, unchosen values shown/stored; pricing tool ignores the profile and the quota badge goes
  stale. P3: cover letter doesn't name the client + stated duration never reaches the timeline;
  money input accepts 3 decimals, mixed numerals, 404 outside the app shell. Plan:
  [specs/011-power-user-pass-3/plan.md](specs/011-power-user-pass-3/plan.md).
  ✅ **SHIPPED** (2026-07-26, all 8 slices, T001–T066): Arabic counts + honest provenance
  wording; VAT gated on `resolveVatEligibility` (registered **and** a recorded number, on the
  invoice form **and** the gig→invoice path) with the number printed on any VAT-carrying
  document; client-facing redaction via an allow-list in `forClientAudience()` (band, sample
  size, methodology link) + `contact.email` = `contact_email` only + no Rizq-tagline
  substitution, applied **at render** so stored artifacts stop leaking; field-level validation
  errors (`lib/validation/fieldErrors.ts`, plus a URL scheme allow-list — Zod's `.url()` accepts
  `javascript:`); onboarding verdict names the figure it judged, resume via
  `lib/onboarding/resume.ts`, nothing shown or stored as chosen unless chosen; pricing-tool
  profile prefill + live quota badge; cover letter names the client + `stated_duration` reaches
  the timeline; halala-precise money entry, one numeral system per view, 404 in the app shell.
  **Found while driving it, not in the plan:** CLDR resolves plain `ar` to LATIN digits, so
  ICU's `#` printed "5" beside the app's `ar-SA` "٥". Every plural message now takes a raw
  number for the category **and** a pre-formatted `{count}` for the digits; bare `#` is banned
  and `src/lib/format/count.test.ts` enforces all of it statically across both catalogues and
  every call site.
Active (`.specify/feature.json`): **011** — ✅ shipped end to end; re-verified in-browser in Arabic.
Feature 010: P1–P3 implemented, merge gate green; US4 (Tap) still blocked on founder approval.
<!-- SPECKIT END -->
## Validation history (read before trusting a "SHIPPED" tag)
- `docs/validation/business-logic-audit.md` — static spec-vs-code audit (2026-07-22).
- `docs/validation/production-maturity-report.md` — pass 1 verdict (2026-07-22). **Partly superseded.**
- `docs/validation/power-user-pass-3-2026-07-26.md` — **pass 3 remediation record**: the 18
  defects fixed and re-verified in-browser, plus one the plan did not predict (plain `ar`
  resolves to Latin digits, so ICU's `#` mixed numeral systems inside one Arabic sentence
  pair). Lists the claims this feature falsified and what was deliberately left undone.
- `docs/validation/power-user-pass-2026-07-26.md` — **pass 2**: the app driven as a freelancer would
  use it. Found 22 defects the static audit could not see, incl. three P0s that type-checked,
  unit-tested and conformed to spec while being visibly wrong in the product:
  onboarding never wrote `primary_specialty_id`/`city_id`/`experience_tier_id`; every proposal
  priced at the band ceiling and ignored the client's stated budget; a share link on a draft was
  dead and told the client the freelancer had revoked it. All 22 fixed and re-verified in-browser.

**Lesson encoded here:** a spec doc saying a field is "captured at onboarding" is not evidence.
Check the row. `docs/profile-source-of-truth.md` asserted exactly that for ~4 weeks while the
column was NULL for every user, and four features were built on top of the claim.
