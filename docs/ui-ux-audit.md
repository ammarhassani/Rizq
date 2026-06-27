# Rizq — Full UI/UX Audit (2026-06-27)

Method: drove the **running app** (Playwright) as the demo user across 22 screens —
Arabic (primary, RTL) + English, desktop (1366×900) + mobile (390×844). Surfaces:
dashboard, projects home, project workspace (overview/files/deliverables/tasks/
integrations), income, proposals, invoices, clients, calendar, settings, HADAF.
Findings are grounded in what rendered, not the code.

Severity: **P0** blocks/embarrasses · **P1** hurts core flow · **P2** friction · **P3** polish.

---

## Verdict

The product already *looks* like a real, considered product: coherent brand, true
RTL, Arabic-first numerals, consistent page architecture, and genuinely nice touches
(Hijri calendar toggle, animated income charts, lifecycle stepper, AI-insight banners).
The problems are **not** "it's ugly" — they're **(a) one overlay that covers content,
(b) two top-level destinations that are visually indistinguishable, and (c) density**
on the project Overview and dashboard. Fix those three and the suite tightens a lot.

---

## What's working (keep)

- 🟢 **Brand discipline.** Deep-green / gold / cream / ink applied consistently; tabular
  + Eastern-Arabic numerals (٤٥٬٠٠٠) in AR. Feels like one product end to end.
- 🟢 **RTL is real**, not flipped-LTR. Sidebar right in AR, left in EN; numerals, chips,
  and icons mirror correctly.
- 🟢 **Consistent page grammar**: eyebrow → large AR headline → subtitle → filter tabs →
  card list. Low cognitive load within a page.
- 🟢 **Calendar** (month grid, Hijri toggle, colored event legend) and **Income chart**
  are standout, polished surfaces.
- 🟢 **Resume affordance** ("Pick up where you left off" on dashboard; lifecycle chips on
  project cards) directly serves the "resume cleanly" goal.

---

## Findings

### P1 — Guided overlay covers content on every incomplete project
**Screens:** `03 overview`, `04 tasks`, `05 files`, `06 integrations`, `07 deliverables`,
`32 mobile overview`.
The "إعداد موجّه / Guided setup — Step N of 3" card is pinned top-corner on **every tab of
every incomplete project**, not just an active guided run. On desktop it floats over the
title; **on mobile it sits directly on top of the tab bar and the project title**, hiding
navigation. It also appears when you're just editing tasks/files — nothing to do with setup.
- **Fix:** (1) gate it to an explicit guided run (`?guided=1`, set by "Start a project" /
  resume) instead of "any incomplete project"; (2) only render it on the **Overview** tab;
  (3) on mobile, dock it as a slim bottom bar or inline banner so it never overlaps tabs.
  (This is the visual proof of wiring-audit Finding #5.)

### P1 — "Projects" and "Income Ledger" are indistinguishable
**Screens:** `02 projects-ar` vs `08 income-ar`. Confirmed in copy:
`Projects.indexTitle` and `Income.list.title` are **both** literally `"مشاريعك."` ("Your
projects"), over the **same** card-list layout. Two different nav items (المشاريع vs دفتر
الدخل) land on pages that read as the same page. This is the sprawl users feel.
- **Fix:** give Income its own identity — heading **"دخلك." / "Your income."**, lead with
  the money lens (totals, paid vs pending, this-month vs projection, monthly grouping) and
  de-emphasize the per-gig cards; keep Projects as the engagement lens. (Wiring-audit
  Finding #4, now visually confirmed.)

### P2 — Project Overview is an over-long vertical stack
**Screens:** `03 overview-ar`, `32 mobile`. Order today: stepper → status pill → money
panel → **full money-details form (always expanded)** → origin proposal → client → invoices
→ delete. On mobile this is a very long scroll, and the always-open edit form dominates a
page that's mostly for *reading* status.
- **Fix:** collapse money-details behind an "Edit" disclosure (read-only summary by default);
  group into 2 cards (Money | Links). Move Delete into a quiet "…"/danger menu, not a full-
  width red button in the flow.

### P2 — Dashboard density
**Screens:** `20 dashboard-en`, `30 mobile`. Greeting + Start + resume list + a long
multi-paragraph AI-insights block + 6 widgets. The insights text block is the heaviest
element on the highest-traffic screen and pushes the actionable widgets below the fold.
- **Fix:** cap insights to 2–3 lines with "show more"; prioritize the widget grid
  (money + deadlines first). Consider one hero metric (this-month income) above the fold.

### P2 — Inconsistent placement of the primary "＋ New" action
**Screens:** projects/proposals/clients use a **top button**; invoices uses a **floating
button bottom-start** (`10 invoices`). Same intent, three positions → users hunt for it.
- **Fix:** pick one pattern (recommend a consistent top-start primary button on desktop, a
  single FAB on mobile) and apply it across all list pages.

### P3 — Native file input not localized
**Screen:** `05 files-ar`. The upload control shows the browser-default **"No file chosen"**
(English, LTR) inside an otherwise Arabic RTL form.
- **Fix:** wrap the input with a styled label/button ("اختر ملفًا") and hide the native text.

### P3 — Proposal cards titled by first deliverable
**Screen:** `09 proposals-ar`. Cards read "Leave module", "Member registration", "Storefront"
— the first scope item, not a recognizable proposal name. Cryptic in a list.
- **Fix:** title proposals by client + brief summary (e.g., "Tamkeen — HR portal"), or let the
  user name them; show deliverable as secondary text.

### P3 — Mixed-script alignment / mobile nav consistency
- English titles inside AR RTL cards (`02`, `31`) align acceptably but watch truncation for
  long bilingual titles. (Partly a demo-data artifact — real titles will mix scripts.)
- Mobile header controls differ between the projects **list** (`31`: avatar/locale/grid/
  search) and the project **detail** (`32`: adds a hamburger). Make the mobile nav entry
  point identical on every screen so primary navigation is always one predictable tap.

### P3 — Accessibility (needs tooling to confirm)
Can't measure contrast from screenshots, but flag for a proper pass: muted text
(`ink-soft/60`) on cream and **gold on cream** are the likely WCAG-AA risks; verify visible
focus rings on the card links and the lifecycle-stepper steps; ensure the status dots aren't
the *only* signal (they pair with text labels today — good, keep that).

---

## Priority order & status

1. ✅ **P1 — Guided overlay**: gated to `?guided=1` + Overview-only; mobile docks to a bottom bar (safe-area), reduced-motion honored. *(Shipped, verified.)*
2. ✅ **P1 — Income identity**: re-headlined "دخلك."/"Your income." + "الدفعات"/"Payments" section; Projects stays the engagement lens. *(Shipped, verified.)*
3. ✅ **P2 — Overview density**: money-details collapse behind Edit; Delete demoted to a quiet trigger (keeps confirm). *(Shipped, verified.)*
4. ✅ **P2 — Dashboard**: insights capped to 3 with show-all. *(Shipped, verified.)*
5. ✅ **P3 — File-input label**: styled picker, no English leak; native input sr-only. *(Shipped, verified.)*
6. ✅ **P2 — Unify "＋ New" placement**: Income + Invoices moved from a bottom FAB to a top header button, matching Projects/Proposals/Clients. *(Shipped, verified.)*
7. ✅ **P3 — Proposal card titles**: lead with the client, deliverable as secondary. *(Shipped, verified.)*
8. ✅ **P3 — Mobile-nav consistency**: **verified a non-issue** — the hamburger is rendered unconditionally in `AppTopBar` on every page; all mobile pages show the same 5 header controls and the drawer opens consistently. Original finding was a screenshot misread (the title is `hidden sm:block`). No code change.
9. ✅ **P3 — Accessibility pass**: ran axe (WCAG 2a/2aa/21aa) across 7 surfaces via `scripts/a11y-audit.mjs`. Found + fixed 2 critical `select-name` violations (unlabeled sort dropdowns). **No color-contrast violations** — gold-on-cream passes AA. axe now clean.

Cross-cutting cleanups applied throughout (per Vercel Web Interface Guidelines, now
vendored as a project skill at `.claude/skills/web-interface-guidelines/`): replaced
`transition-all` with curated transitions, added `focus-visible` rings on card links/
controls, and `prefers-reduced-motion` guards.

**All 9 findings addressed.** Tooling wired: WIG audit skill, Playwright + shadcn MCP
(`.mcp.json`, activate next session), axe a11y harness (`scripts/a11y-audit.mjs`).
