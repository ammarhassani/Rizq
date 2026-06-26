# Rizq — End-to-End UX & Wiring Audit (2026-06-27)

Scope: the Project reframe surfaces (projects, wizard, income, proposals, invoices,
integrations, settings) and how a user moves between them. Goal: find sprawl,
dead-ends, duplication, and orphaned data after the rapid evolution.

Legend: 🔴 broken/inconsistent · 🟡 confusing · 🟢 fine · ✅ fixed this pass.

---

## 1. Navigation & destinations

| Route | Purpose | Nav entry? | Notes |
|---|---|---|---|
| `/projects` | **Projects home / resume** | ✅ added (Work) | was MISSING — root cause of the confusion |
| `/projects/[id]` | Project workspace (tabs) | via lists | canonical project view |
| `/projects/start` | Guided wizard (step ①) | "Start a project" | dashboard + projects home |
| `/income` | Income Ledger (money lens) | ✅ Money | lists the same gigs as Projects |
| `/income/[id]` | **Old gig detail** | via GigCard fallback | duplicate of `/projects/[id]` 🟡 |
| `/income/new` | Log a gig (standalone) | "Log a project" ×4 | creates an **orphan gig** 🔴 |
| `/proposals`, `/proposals/[id]`, `/proposals/new` | Proposal studio | ✅ Work | origin of projects |
| `/invoices`, `/invoices/[id]`, `/invoices/new` | Invoicing | ✅ Money | |

**Finding 1 (🟢 ✅ fixed):** No Projects home and no sidebar entry — projects were reachable
only via Income-Ledger cards or deep links. **Fixed:** added `/projects` (list + resume +
lifecycle stage) and a "Projects" nav item (first in *Work*, as the umbrella).

---

## 2. Project-creation entry points — inconsistent (🔴 the core sprawl)

There are **three** ways to create the money/engagement, and they don't converge:

| Entry | Action | Creates a Project? | Appears in `/projects`? |
|---|---|---|---|
| "Start a project" → `/projects/start` | proposal → `createProjectFromProposal` | ✅ yes | ✅ |
| Proposal detail → "Create project" | `createProjectFromProposal` | ✅ yes | ✅ |
| **"Log a project" / "Log Gig" → `/income/new`** | `createGig` | ❌ **no** (gig has no `project_id`) | ❌ **invisible** |

**Finding 2 (🔴):** A gig logged via `/income/new` (linked from QuickActions, MonthlyIncome
widget, Income list, Hadaf, Command Palette as "newGig") is an **orphan** — it shows in the
Income Ledger but never in the Projects home, and has no workspace (files/tasks/etc.). The
label even says "Log a **project**," but it creates a project-less gig. This is the biggest
wiring inconsistency.

**Recommendation (needs your call — touches the money path):**
- **Preferred:** make `createGig` (the `/income/new` path) also create a parent `projects`
  row (1:1), so *every* money record is a real project. Then "Log a project" is honest and
  everything shows in `/projects`. Backfill a project for existing orphan gigs (additive).
- Alternative: keep quick gigs project-less but have `/projects` also surface them (treat an
  orphan gig as a lightweight project) — messier, keeps two concepts.

---

## 3. Duplicate detail pages (🟡)

**Finding 3 (🟡):** A gig can open at **two** different detail pages:
- `/projects/[id]` — the new tabbed workspace (money + proposal + invoices + files + tasks + integrations).
- `/income/[id]` — the **old** gig detail (full edit form, status quick-edit, "generate invoice").

`GigCard` routes to `/projects/[id]` when the gig has a `project_id`, else to `/income/[id]`.
The Calendar gig deep-link still always goes to `/income/[id]`. So which page a user lands on
depends on how the gig was created. Two money UIs to maintain, inconsistent affordances.

**Recommendation:**
- Make `/projects/[id]` canonical. Either (a) fold the gig's edit/status/actions
  (`GigDetailActions`) into the project Overview tab, then **redirect `/income/[id]` →
  `/projects/[id]`**; or (b) keep `/income/[id]` strictly as a money-only quick view and link
  it *from* the project. Decide one; remove the ambiguity. Point the Calendar deep-link at the
  project too (once Finding 2 guarantees every gig has a project).

---

## 4. Income Ledger ↔ Projects overlap (🟡)

**Finding 4 (🟡):** `/income` and `/projects` list the *same* gigs through different lenses
(money vs engagement). That's defensible (per the Stage-2 decision: income = cross-project
portfolio money), but the two need clear, distinct framing so they don't feel redundant.
Currently both are "card lists of your gigs."

**Recommendation:** keep both, but sharpen copy/visuals: `/income` = *money over time*
(totals, paid/pending, projections, monthly grouping); `/projects` = *engagements to manage*
(status, lifecycle, resume). Cross-link them (a project's money tab → its income row, and an
income row → its project — already wired).

---

## 5. Guided-flow surfaces (🟡 minor)

**Finding 5 (🟡):** The guided overlay + stepper now appear on `/projects/start`,
`/projects/[id]` (any incomplete project), and `/proposals/new?for_project=…`. Showing it on
*every* incomplete project (not just an active guided run) may feel persistent. It's dismissible
per session.

**Recommendation:** optionally gate the overlay to an explicit guided run (a `?guided=1` flag
set by "Start a project" / "continue") instead of "any incomplete project," so power users
editing an old project don't see it. Low priority.

---

## 6. Smaller items

- 🟡 **Command Palette** still labels the income-create action "newGig"; rename to match
  "Log a project" / point at the project flow once Finding 2 lands.
- 🟢 **Integrations** split (connect in Settings, use in project) is intentional and clean.
- 🟢 **Proposal → project linking** (incl. backfilling a skipped origin) is now wired.
- 🟢 **Lifecycle** is derived (single source of truth) — no drift.

---

## Priority

1. ✅ **Done:** Projects home + nav (Finding 1).
2. 🔴 **Next (your call):** unify gig creation so every gig has a project (Finding 2) — removes
   orphans and makes `/projects` complete.
3. 🟡 Resolve the `/income/[id]` vs `/projects/[id]` duplication (Finding 3) + Calendar link.
4. 🟡 Sharpen Income vs Projects framing (Finding 4); rename "newGig"; optional guided gating.
