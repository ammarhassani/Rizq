# Implementation Plan: Guided Project Mode

**Branch**: `main` (commit + sync; no feature branch) | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-guided-project-mode/spec.md`

## Summary

Make the whole app honor **guided project context** without cloning screens, and give project
creation a **3-way entry chooser**. The mechanism is a small, URL-borne **navigation-origin**
convention (`from=project:{id}`) plus a shared **contextual back/return** affordance and
**context-aware framing**. Same components, personalized by context; identical to today when no
context is present. The lifecycle engine and the anchor-from-proposal action already exist and
are reused unchanged. Delivered in four shippable phases (P1 navigation origin → P2 continuity →
P3 framing → P4 chooser/anchor/blank), where P1 alone fixes the reported invoice→project bug.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16 App Router (RSC + server actions)

**Primary Dependencies**: next-intl (AR-primary, RTL), Tailwind v4 + shadcn/ui (base-nova),
Framer Motion (reduced-motion safe), Supabase (Postgres + Auth, RLS), Vitest. No new deps.

**Storage**: Supabase Postgres. **No schema change / no migration** — `projects` already exists;
a blank project is an `INSERT` with no child gig (`gigs.project_id` simply has no row yet).

**Testing**: Vitest, pure-logic unit tests in `src/lib/` (lifecycle resolution for a gig-less,
proposal-less project; anchor-list filter + status ordering; `from`-token parse/serialize +
back-link resolution; chooser branch routing).

**Target Platform**: Web, mobile-first, RTL by default (Arabic primary).

**Project Type**: Web application (single Next.js app).

**Performance Goals**: Back/return is instant (URL-resolved, no extra fetch on the navigating
screen); anchor picker lists the user's proposals (tens, not thousands) — no virtualization needed.

**Constraints**: Standalone behaviour MUST be byte-for-byte unchanged when no `from`/`guided` is
present; origin lives only in the URL (refresh/back/forward-safe, no server/global state); owner-
scoped RLS on every read/write; `createBlankProject` creates no gig → no money-quota impact.

**Scale/Scope**: Existing single-user-per-account scope; ~4 new/changed surfaces + 8 back-link
swaps + 2 small server functions.

## Constitution Check

*GATE: must pass before Phase 0. Re-checked after Phase 1.*

| Principle | Assessment |
|---|---|
| I. Honesty is the moat | No fabricated data. The picker shows real proposal statuses/dates; no new AI. **PASS** |
| II. Arabic-first, RTL | All new copy (chooser, picker, back labels, breadcrumb, empty states) bilingual via next-intl, RTL-first; Latin/number mixing handled. **PASS** |
| III. Mobile-first | Chooser, picker, contextual back, breadcrumb designed + verified at 390px; ≤3 inputs to value; no modal interruptions. **PASS** |
| IV. Test money & rules | Unit tests for lifecycle(blank project), anchor-list filter/order, `from` resolution, chooser routing. `createBlankProject` adds no gig → no quota path touched. **PASS** |
| V. Every module stands on its own | Enhances the Projects module; reuses existing screens/actions (adds context, no clones); picker has loading/empty/error states. **PASS** |
| VI. Halal & PDPL | No new personal data; owner RLS; no scraping; no riba. **PASS** |
| VII. AI as multiplier | No new AI. **PASS** |
| Workflow gates | Additive, no destructive migration; small atomic commits; `pnpm typecheck` + `pnpm test` merge gate. **PASS** |

**Result**: No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/005-guided-project-mode/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions (from-grammar, framing, blank title, reuse)
├── data-model.md        # Phase 1 — entities + the navigation-origin model
├── contracts/           # Phase 1 — nav-origin contract + new action contracts
│   └── nav-and-actions.md
├── quickstart.md        # Phase 1 — end-to-end validation scenarios
└── tasks.md             # Phase 2 — /speckit-tasks (NOT created here)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── nav/
│   │   └── origin.ts            # NEW: parse/serialize `from` token; resolve back target (+test)
│   └── projects/
│       └── lifecycle.ts         # REUSE: confirm blank-project resolution (proposal=skipped)
├── components/
│   ├── nav/
│   │   ├── ContextualBackLink.tsx   # NEW: shared back affordance (origin → project | default list)
│   │   └── ContextBreadcrumb.tsx    # NEW (P3): project breadcrumb + compact progress
│   ├── projects/
│   │   ├── ProjectStartChooser.tsx  # NEW (P4): 3-way chooser
│   │   ├── ProposalAnchorPicker.tsx # NEW (P4): searchable unanchored-proposal picker
│   │   ├── ProjectLifecycleCta.tsx  # EDIT (P2): carry from/guided on transitions
│   │   └── GuidedFlowOverlay.tsx    # REUSE: already gated to ?guided=1
│   └── proposals/
│       └── ProposalFlow.tsx         # EDIT (P2): carry from/guided on finalize
├── app/
│   ├── [locale]/
│   │   ├── projects/start/page.tsx          # EDIT (P4): render chooser instead of forced studio
│   │   ├── projects/[id]/page.tsx           # EDIT: contextual back; (P3) framing read
│   │   ├── invoices/[id]/page.tsx           # EDIT (P1): ContextualBackLink
│   │   ├── invoices/new/page.tsx            # EDIT (P1)
│   │   ├── proposals/[id]/page.tsx          # EDIT (P1)
│   │   ├── income/[id]/page.tsx             # EDIT (P1)
│   │   ├── income/new/page.tsx              # EDIT (P1)
│   │   └── clients/[id]/page.tsx,new        # EDIT (P1)
│   └── actions/projects/
│       ├── createBlankProject.ts            # NEW (P4)
│       └── listProposalsForAnchor.ts        # NEW (P4)
messages/{ar,en}.json                        # EDIT: chooser/picker/back/breadcrumb copy
```

**Structure Decision**: Existing single Next.js app. New code is one small lib util
(`src/lib/nav/origin.ts`), two shared nav components, two project components, two server actions,
and edits to the 8 back-links + the lifecycle transition points. No new top-level structure.

## Phasing → user stories

- **Phase 1 (US1)**: `src/lib/nav/origin.ts` + `<ContextualBackLink>`; swap the 8 hardcoded backs.
- **Phase 2 (US2)**: thread `from`/`guided` through `ProjectLifecycleCta`, `createInvoiceFromGig`/
  `createInvoiceFromProposal` caller redirects, `ProposalFlow` finalize; return-to-project on success.
- **Phase 3 (US3)**: `<ContextBreadcrumb>` rendered on editors when `from=project`.
- **Phase 4 (US4)**: `ProjectStartChooser` + `ProposalAnchorPicker` + `createBlankProject` +
  `listProposalsForAnchor`; reframe the standalone proposal "graduate" CTA as optional.

## Complexity Tracking

No constitution violations — section intentionally empty.
