# Guided flow vs standalone components — brainstorm & audit (2026-06-27)

> ✅ **SHIPPED** as feature `005-guided-project-mode` — the 3-way Project Start chooser (use
> existing proposal · create new · set up directly = money-free blank) + guided context
> threading. See `specs/005-guided-project-mode/` and `docs/guided-context-audit.md`.

## The problem (founder)
> The app should do **both**: standalone components (make a proposal to win a quick
> settlement — maybe never a project) **and** a guided project that threads all the
> components for one cause. When the user starts a brand-new project, the app should
> ask: *"Do you already have a proposal for this, or want a new one?"* — let them
> **pick an existing proposal as the anchor**, then the rest flows.
> Right now I get ~10% of each journey — a partial shell.

## Audit — why it's "10% of each"

The lifecycle engine is excellent and not the problem. `resolveLifecycle()` is a pure,
derived projection of the real rows (proposal → project → invoice), so progress can't
desync. The gaps are at the **entry points**, not the engine.

**Capability that already exists (but isn't exposed):**
- `createProjectFromProposal({ proposal_id })` — takes *only* a proposal id. **Anchoring a
  project to an existing proposal is already fully supported server-side.** The only thing
  missing is the UI to *choose* which proposal.

**The guided journey is hard-wired to one branch.**
- [`/projects/start`](../src/app/[locale]/projects/start/page.tsx) unconditionally mounts the
  Proposal Studio (`ProposalFlow`) seeded `proposal: null` → it **always makes a NEW proposal.**
- There is **no chooser** at the front door — no "use an existing proposal," no "skip the
  proposal." So the freelancer who already won the settlement with a proposal can't point a
  new project at it; they'd have to duplicate it.

**There is no "project from scratch" path.**
- Every project today is born from a proposal (`createProjectFromProposal`) or as a side-effect
  of logging income (`createGig`). There is **no `createBlankProject` action** — so "start the
  project now, deal with the proposal later" isn't first-class.

**Standalone works, but doesn't know it's standalone.**
- A proposal can live alone (`/proposals/new`), income/invoices too — good. But nothing frames
  the *relationship*: a standalone proposal's "Create project" CTA is the only bridge, and it
  reads as the end of a funnel, not an **optional graduation**.

Net: the guided door opens onto exactly one of three rooms, and the standalone doors don't tell
you the rooms connect. Hence 10% of each.

## Mental model we're aligning on

Two truths must coexist:
1. **Components are standalone-first.** A proposal / invoice / income entry each delivers value
   alone. (The settlement proposal that may never become a project.)
2. **A Project is an *optional umbrella*** that threads components together "for one cause." It's
   a lens/container, **not a prerequisite**. Guided mode is a *mode you opt into*, not a cage.

Research backs this: wizards excel for complex multi-stage setup but **feel slow when forced on
users who already know what they want** — so the guided flow must be a *branching choice* with
*skippable* stages (progressive disclosure), never the only door. (Sources below.)

## Proposed design

### A. The Project Start chooser (the missing seam)
"Start a project" → one fast screen (Arabic-first, ≤3 options) that asks the founder's exact
question:

```
        ابدأ مشروعاً جديداً  /  Start a new project
        هل لديك عرض لهذا المشروع؟ / Do you have a proposal for this?

  ┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
  │  📄 لديّ عرض جاهز         │ │  ✨ أنشئ عرضاً جديداً     │ │  ⚡ ابدأ مباشرة بدون عرض  │
  │  Use an existing proposal│ │  Create a new proposal   │ │  Set up directly         │
  │  → pick from your        │ │  → the Proposal Studio    │ │  → blank project, add a  │
  │    proposals (anchor)    │ │    (today's path)         │ │    proposal/invoice later│
  └─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘
```

- **Use existing →** a **proposal picker** (searchable; client + price + status; prioritize
  accepted › sent › viewed › draft; hide already-anchored ones). Select → `createProjectFromProposal`
  → project anchored, lifecycle jumps to stage ② current, flows on. *(Server already supports this.)*
- **Create new →** today's `ProposalFlow`, then auto-anchor (unchanged).
- **Set up directly →** new `createBlankProject` action; lifecycle shows proposal = **skipped**,
  project = current. Backfill a proposal later via the existing `/proposals/new?for_project=` path.

### B. Standalone stays first-class + offers *optional* graduation
- Every "+ New" makes the component standalone (already true); the guided overlay never appears
  outside an explicit guided run (already fixed).
- After a meaningful artifact exists, offer a gentle, dismissible **"graduate to a project"**:
  - Accepted/sent proposal → "Won it? Start the project →" (reframe the existing CTA as optional).
  - Standalone income → the project exists under the hood; surface "Open as project" without nagging.

### C. Progressive disclosure through the stages
Every subsequent stage stays skippable (derived lifecycle already does this). Guided overlay =
the project-setup run only.

## What to build (concrete)
1. **Project Start chooser** — replace the forced `ProposalFlow` at `/projects/start` with the
   3-way chooser; "create new" branch keeps `ProposalFlow`.
2. **Proposal picker** — component + loader (`listProposalsForAnchor`): user's proposals, filtered
   (exclude already-anchored), prioritized, searchable. Feeds `createProjectFromProposal`.
3. **`createBlankProject`** action — project with no proposal (proposal stage = skipped). Decide its
   money behavior (see Q2).
4. **Reframe standalone graduation CTAs** as optional.

## Locked decisions (founder, 2026-06-27)
1. **Three-branch chooser**: Use existing proposal · Create new · Set up directly (blank).
2. **Blank project is money-free** until later — no gig/amount at creation; proposal stage =
   skipped, project = current; money arrives when they invoice or log it. (A project can be
   just files/tasks at first → confirms a project does **not** require a gig.)
3. **Anchor picker = all *unanchored* proposals**, sorted accepted › sent › viewed › draft,
   searchable. Can't double-anchor.

## Implementation plan
1. **`createBlankProject` action** — insert a `projects` row, no gig, no proposal. Returns
   `project_id`. Lifecycle must tolerate a gig-less, proposal-less project (proposal = skipped,
   project = current). *(Verify `getProject`/`resolveLifecycle`/project page already handle
   `gig: null` — the start page already passes `gig: null`, so largely yes; confirm render.)*
2. **`listProposalsForAnchor` loader** — owner-scoped proposals where `project_id is null`,
   ordered by status priority then recency; fields: id, derived title, client_name, price_anchor,
   status, created_at.
3. **Proposal picker component** — searchable list (reuse the card visual language), select →
   `createProjectFromProposal(proposal_id)` → `/projects/{id}?guided=1`. Empty state → "no
   proposals yet → create new" (branch 2).
4. **Project Start chooser** — replace the forced `ProposalFlow` at `/projects/start` with the
   3-way chooser. Branch 1 → picker; branch 2 → `ProposalFlow` (unchanged, auto-anchors);
   branch 3 → `createBlankProject` → `/projects/{id}?guided=1`. i18n AR+EN.
5. **Reframe standalone graduation** — proposal "Create project" CTA reads as optional
   ("Won it? Start the project"); keep standalone unobstructed.
6. Tests: lifecycle handling of a blank (gig-less, proposal-less) project; anchor-list filter/
   ordering; chooser routing. Gate: typecheck + tests; verify live (chooser → each branch).

This extends feature **003 (Project Lifecycle Wizard)** — recommend formalizing via the Spec Kit
flow (`/speckit.specify` → plan → tasks → implement) per the working agreement, or building
directly since the surface is small and the decisions are locked.

## Sources
- [Wizard UI pattern — when to use / pitfalls (Eleken)](https://www.eleken.co/blog-posts/wizard-ui-pattern-explained)
- [Progressive disclosure in SaaS UX (Lollypop)](https://lollypop.design/blog/2025/may/progressive-disclosure/)
- [Progressive disclosure definition & best practices (UXPin)](https://www.uxpin.com/studio/blog/what-is-progressive-disclosure/)
- [User-flow branching / entry points (Userpilot)](https://userpilot.com/blog/user-flow-examples/)
