# Rizq — Design Consultation Brief

**For:** Claude Design (hired UI/UX engineer — consult + edit)
**From:** Founder
**Repo:** this one. You have full read/write access.

---

## Your engagement

You are the UI/UX design engineer for **Rizq**. Two things are true about your mandate:

1. **Brand: full redesign freedom.** The current identity (deep-green `#1A5F3F` / gold
   `#C8A951` / cream `#FAF5EC`, Tajawal + Inter, the current logo and component look) is a
   *baseline, not a cage*. You may rethink the visual language end-to-end — palette, type,
   logo, motion, component styling, information architecture. If you believe a different
   direction serves this product and this audience better, propose it.

2. **Authority: audit first, then edit what's approved.** Do **not** start rewriting screens
   on day one. **Phase 1** is a written audit + a brand/visual direction proposal. The founder
   picks what to pursue. **Phase 2** you implement the approved items on a branch. (Details in
   *Deliverables* and *Workflow* below.)

The freedom is on the **look**. It is **not** on the product's hard constraints (Arabic-first,
mobile-first, honesty, halal, locked tech stack, green merge gate) — see *Hard constraints*.

---

## What Rizq is (context you must internalize)

Rizq (رِزق, "sustenance/livelihood") is a **Saudi Freelancer Operating System** — an FLRP
(Freelancer Resource Planning) suite. It runs a solo freelancer's whole professional life:
proposals, clients, income, invoicing, pricing intelligence, a goals dashboard (HADAF),
methodology, calendar, documents. **Proposals are the wedge**; pricing is one module among many.
It is deliberately **not** "just a pricing tool," and it must not *feel* like a heavy enterprise
ERP either.

**Who uses it:** independent freelancers in Saudi Arabia. **Arabic is their first language.**
**70%+ are on mobile.** They are price-sensitive, time-poor, and skeptical of tools that feel
foreign or dishonest. The emotional target is **calm, premium, trustworthy, effortless** — a
tool that respects them and gets out of the way.

**Tagline:** سعّر بثقة. اقبض رزقك. — *Price with confidence. Earn your rizq.*

---

## Read these first (before auditing)

- `docs/spec-v2-flrp.md` — master product + technical spec. Read the **Design Principles** and
  skim the per-module Parts. This is the single source of truth for *what each screen is for*.
- `.specify/memory/constitution.md` — engineering charter. **Principle I (honesty/transparency)**
  is load-bearing for the UI: every number cites its provenance or declares uncertainty; AI
  output is labeled. Your redesign must keep this legible, not bury it for prettiness.
- `.claude/CLAUDE.md` — quick project context + the shipped-feature history.

---

## The three surfaces to evaluate

### 1. Landing / marketing (`/ar`, `/en`)
The conversion surface for logged-out visitors.
- **Entry:** `src/components/landing/MarketingLanding.tsx` composes the page.
- **Pieces:** `Hero`, `ValueProps`, `AppsGrid`, `FeatureDemos` (+ `DemoRate`, `DemoInvoice`,
  `DemoTone`, `DemoCard`), `HowItWorks`, `WorkflowStory`, `AiFeatures`, `StatsBand`, `Trust`,
  `Pricing`, `Faq`, `Waitlist`/`WaitlistForm`, `FinalCta`, `SiteHeader`, `SiteFooter`,
  `LocaleToggle` — all under `src/components/landing/`.

### 2. Home / dashboard — module M0 (`/ar/dashboard`)
The logged-in home. First thing a returning user sees.
- **Entry:** `src/app/[locale]/dashboard/page.tsx`.
- **Widgets:** `src/components/dashboard/*` — `MonthlyIncomeWidget`, `RecentProposalsWidget`,
  `UpcomingDeadlinesWidget`, `QuickPricingWidget`, `ActiveClientsWidget`, `WidgetError`, plus the
  "pick up where you left off" lifecycle nudge.

### 3. The operating system — the app shell + all modules
How it *feels to run the business* day to day.
- **Shell:** `src/components/shell/` — `AppShell` / `AppShellClient`, `AppSidebar`, `AppTopBar`,
  `UserMenu`, `CommandPalette` (+ context), `AppsLauncher`, `NavProgress`, `ShellSkeleton`.
- **Modules** (routes under `src/app/[locale]/`): `proposals` (**M1 Proposal Studio — the
  wedge, make it the star**), `clients` (M2), `income` (M3), `catalog` + `rate-calculator`
  (M4/M10 pricing), `hadaf` (M5 goals), `invoices` (M6), methodology (M7), `onboarding` (M8),
  `calendar` (M9), `documents` (M12), `projects`, `settings` (incl. `settings/profile` — the KYC
  profile). The **golden path** is proposal → project → invoice → income → dashboard; walk it.
- **Design tokens / theme:** `src/app/globals.css` (Tailwind v4 — tokens live in CSS `@theme`).
  `next-themes` is installed, so **check whether dark mode is real or half-wired**.
- **Copy:** `messages/ar.json` + `messages/en.json` (next-intl). Keep them symmetric.

---

## What to look for (the evaluation lenses)

Use these as your audit checklist. Score each surface; cite the exact route + file for every
finding; rank findings **blocker / high / medium / low**.

**Landing**
- Does a visitor grasp "Saudi Freelancer OS" (not "pricing calculator") in under 5 seconds, in Arabic?
- Conversion path clarity: hero → CTA → signup. Count the friction. Is the primary action obvious?
- Instant value: do the demo widgets (`DemoRate`, `DemoInvoice`, `DemoTone`) *show* the product working?
- Trust signals: honesty, halal, Saudi-native credibility, social proof. Is skepticism answered?
- Above-the-fold on **mobile**. LCP/first-impression. Pricing/paywall framing.

**Dashboard (M0)**
- New-user empty state vs populated: does a first-timer know the next action? (Product rule: **≤3
  inputs to first value.**)
- Widget hierarchy: what deserves the top? Is "next action" (lifecycle nudge) unmistakable?
- Honesty surfaced *elegantly*: provenance/uncertainty and "AI-generated" labels present but not cluttering.
- Glanceability one-handed on mobile. Skeletons/shimmer while loading. Real-time feedback after actions.

**The OS (shell + modules)**
- Navigation model: sidebar vs command palette vs apps launcher — is moving between 12 modules
  **discoverable** and fast? Does it feel like *one coherent OS* or 12 stitched-together screens?
- Design-system coherence: spacing scale, cards, buttons, inputs, tables, chips, empty/error states —
  consistent across modules? Inventory the drift.
- **M1 Proposal Studio is the wedge** — is it the most polished, confidence-inspiring surface? The
  brief → AI proposal → project → invoice flow should feel like magic, honestly labeled.
- Forms: onboarding `Step*` editors, invoice builder, client/profile forms — input ergonomics,
  validation, autosave feedback, RTL keyboard flow.
- Data display: income/clients/catalog tables, charts (`TrendChart`, `BandMeter`) — readability,
  **tabular numerals** for money, RTL-correct.
- Motion: Framer Motion transitions — a coherent, purposeful system, never gratuitous.

**Cross-cutting (applies to all three)**
- **RTL correctness everywhere:** mirroring, directional icons, logical CSS properties (not
  hard-coded left/right), Arabic number/date formatting. This is the #1 place polished apps break.
- **Bilingual parity:** ar/en both complete, no untranslated leaks, no layout breakage when the
  language toggles (Arabic runs longer/shorter than English in places).
- **Accessibility:** contrast, focus order, visible focus, aria, keyboard operability, touch-target
  size. There is an axe suite in `e2e/cross-cutting/a11y.spec.ts` — keep it green.
- **Mobile-first reality check:** every flow usable one-handed at 375px. Not "desktop shrunk."

---

## Hard constraints (never break — these are not design decisions)

- **Tech stack is locked.** Next.js 16 App Router + TypeScript + **Tailwind CSS v4** + shadcn/ui
  (base-nova) + Base UI/radix + **Framer Motion** + next-intl. Style within this. **Do not add a
  new heavy dependency** (UI kit, icon set beyond `lucide-react`, animation lib) without founder
  approval — propose it in the audit instead.
- **Arabic-first + full RTL.** Arabic is the base; English is the toggle, not the other way around.
- **Mobile-first.** 70%+ mobile. Design mobile → up, never desktop → down.
- **Honesty layer.** Every number cites provenance or declares uncertainty; AI output stays
  labeled. You may redesign *how* this reads — never remove or fake it for aesthetics.
- **Halal by default.** No riba framing, no haram imagery, no marketplace-scraping patterns.
- **Green merge gate.** `pnpm typecheck` clean **and** `pnpm test` green before any commit. Keep
  the RTL/i18n/a11y e2e suites passing. Any copy change updates **both** `ar.json` and `en.json`.
- **Work on a branch, small atomic commits.** Never commit design experiments directly to `main`.

## Open — your call (full freedom)

Visual identity, palette, typography, logo, layout, spacing rhythm, motion language, component
styling, iconography usage, and per-module information architecture. If green/gold/cream and
Tajawal/Inter are right, keep them and justify it. If not, propose something better — with reasons.

---

## Deliverables

**Phase 1 — Audit + direction (no product edits yet)**
- `docs/design/audit.md`: findings per surface, each ranked (blocker/high/med/low) with route +
  file + why-it-hurts + proposed direction. Include a short "system-level" section (nav model,
  design-token drift, motion, dark mode, RTL) separate from screen-level nits.
- A **brand/visual-direction proposal**: 2–3 coherent options (mood, palette, type, a hero + a
  dashboard + one module mocked per option). Self-contained HTML/mockups are fine. State a
  recommendation and the trade-offs. This is where your "full freedom" lives — make it real enough
  to choose from.

**Phase 2 — Implement approved (after the founder picks)**
- Branch `design/<slug>`. Implement approved items only. Keep the merge gate green. Commit small,
  with clear messages. Open a PR per coherent chunk (e.g. `design: new landing hero`), not one mega-PR.

---

## Workflow & running it locally

- **Run:** `pnpm dev` → http://localhost:3000 (defaults to `/ar`). It's healthy right now.
  ⚠️ Don't leave the Turbopack dev server running for many hours — its `.next/dev` cache bloats and
  eventually wedges on "Compiling…" (it hit 7.3 GB once). If it gets slow: stop it, `rm -rf .next`,
  restart. Don't run `pnpm add` while `pnpm dev` is running — it corrupts the running server.
- **Get into the authed app:** just sign up (email confirmation is OFF → instant session), or reuse
  the disposable-user pattern in `e2e/fixtures/users.ts` / `e2e/README.md`.
- **Screenshots:** use the Playwright MCP to capture every surface at **375px and desktop**, in
  **both `/ar` and `/en`**, logged-out and logged-in. RTL bugs only show when you actually look.
- **Verify before you commit:** `pnpm typecheck` + `pnpm test` (+ `pnpm test:e2e` for the a11y/RTL
  suites if you touched shared shell/components).

---

## North star

Rizq should feel like a **calm, premium, Arabic-first operating system for one person running their
freelance business** — trustworthy because it's honest, effortless because it's mobile-first and
low-friction, and confident because the **Proposal Studio** makes them look world-class to clients.
Not a toy. Not an enterprise ERP. Optimize, in order: (1) landing conversion + instant value,
(2) dashboard glanceability + unmistakable next action, (3) one-coherent-OS consistency across
modules, (4) RTL + mobile + a11y correctness, (5) honesty surfaced with elegance.
