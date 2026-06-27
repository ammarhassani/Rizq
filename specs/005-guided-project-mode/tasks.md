# Tasks: Guided Project Mode

**Feature**: `specs/005-guided-project-mode/` · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

Tech: Next.js 16 App Router (RSC + server actions), TypeScript, next-intl (AR-primary/RTL),
Tailwind v4 + shadcn/ui, Supabase (RLS), Vitest. **No migration.** Reuse-first (add context,
don't clone). Tests are included for pure logic per the spec + Constitution IV.

**Merge gate (every phase):** `pnpm typecheck` clean + `pnpm test` green; verify live (AR+EN,
desktop + 390px). Commit small + atomic; sync to `main` (no PR).

---

## Phase 1: Setup

- [X] T001 Add a `Nav` i18n namespace skeleton (back-link default labels, breadcrumb separators) to `messages/ar.json` and `messages/en.json` (keys: `Nav.back`, `Nav.backTo`, plus per-list defaults `Nav.invoices`/`proposals`/`income`/`clients`/`projects`).

## Phase 2: Foundational (blocks US1–US3)

**The navigation-origin convention — everything in US1/US2/US3 depends on it.**

- [X] T002 [P] Create the pure origin util in `src/lib/nav/origin.ts`: `NavigationOrigin` type, `parseOrigin(sp)`, `serializeOrigin(o)`, `withOrigin(href, o?, guided?)`, `resolveBack(o, fallbackHref, projectTitle?, opts?)` per `contracts/nav-and-actions.md` (UUID-validate id; unknown type/malformed → null; append params safely when href already has a query).
- [X] T003 [P] Unit tests in `src/lib/nav/origin.test.ts`: valid `project:{uuid}` parses; missing/non-uuid/unknown-type → null; `resolveBack` with origin → project href (+tab/guided) & title label; without origin → fallback href & default label; `withOrigin` appends correctly with/without existing query.

**Checkpoint**: origin util + tests green → US1/2/3 can proceed.

---

## Phase 3: User Story 1 — contextual back/return (Priority: P1) 🎯 MVP

**Goal**: every detail/editor "back" honors where you came from (project pane when in-context,
default list otherwise). Fixes the reported invoice→project bug.

**Independent test**: invoice created from a project → back reads "← {project}" → returns to the
project; invoice opened from the list → back → `/invoices`.

- [X] T004 [US1] Create `src/components/nav/ContextualBackLink.tsx` (server-friendly) — props per contract; renders one back affordance via `resolveBack`; RTL-aware arrow; `focus-visible` ring; bilingual fallback label from the `Nav` namespace.
- [X] T005 [P] [US1] Replace the hardcoded back link in `src/app/[locale]/invoices/[id]/page.tsx` with `<ContextualBackLink>` (read `from` via `parseOrigin(searchParams)`; fallback `/invoices`).
- [X] T006 [P] [US1] Same swap in `src/app/[locale]/invoices/new/page.tsx`.
- [X] T007 [P] [US1] Same swap in `src/app/[locale]/proposals/[id]/page.tsx` (fallback `/proposals`).
- [X] T008 [P] [US1] Same swap in `src/app/[locale]/income/[id]/page.tsx` (fallback `/income`).
- [X] T009 [P] [US1] Same swap in `src/app/[locale]/income/new/page.tsx`.
- [X] T010 [P] [US1] Same swap in `src/app/[locale]/clients/[id]/page.tsx` and `src/app/[locale]/clients/new/page.tsx` (fallback `/clients`).
- [X] T011 [P] [US1] Same swap in `src/app/[locale]/projects/[id]/page.tsx` (fallback `/projects` — replaces today's `/income` back; preserve `?tab`/`?guided`).
- [X] T012 [US1] Verify live (AR+EN, mobile): from a project create an invoice → back returns to the project; from the Invoices list open an invoice → back → `/invoices`; refresh the in-context editor → origin survives. `pnpm typecheck` + `pnpm test`.

**Checkpoint**: US1 shippable on its own — the reported bug is fixed, standalone unaffected.

---

## Phase 4: User Story 2 — guided continuity (Priority: P2)

**Goal**: guided transitions carry the project context, and success returns to the project pane.

**Independent test**: complete an invoice from a guided project → land back on the project pane
with the lifecycle advanced; the same action standalone stays in the invoices area.

- [X] T013 [US2] In `src/components/projects/ProjectLifecycleCta.tsx`, append `from=project:{projectId}&guided=1` (via `withOrigin`) to the invoice-editor pushes (`create_invoice`, `send_invoice`, `mark_paid`).
- [X] T014 [US2] Thread context onto the redirects of `createInvoiceFromGig`/`createInvoiceFromProposal` callers (the lifecycle CTA + proposal detail "create invoice") so the invoice editor receives `from`/`guided`.
- [X] T015 [US2] In `src/components/proposals/ProposalFlow.tsx`, when in a guided run (`forProjectId` / `guided`), carry `from`/`guided` through finalize so the resulting proposal/project keeps context.
- [X] T016 [US2] Add return-to-pane on guided success: after an in-context invoice action completes, route to `/projects/{id}?guided=1` (use origin) instead of staying on the invoice. Implement in the invoice detail actions (`src/components/invoices/InvoiceDetailActions.tsx`) reading `from`.
- [X] T017 [P] [US2] Update resume/continue links to also carry `from=project:{id}`: `src/components/wizard/ContinueLifecycleList.tsx` and the Projects index card link in `src/app/[locale]/projects/page.tsx` (they already add `guided=1`).
- [X] T018 [US2] Verify live: guided invoice round-trip returns to the project pane, lifecycle advanced; standalone invoice flow unchanged. Gate green.

**Checkpoint**: US2 builds on US1; guided runs no longer strand the user on a list.

---

## Phase 5: User Story 3 — context framing (Priority: P3)

**Goal**: in-context editors frame themselves for the project (breadcrumb + compact progress).

**Independent test**: open an editor with `from=project` → project breadcrumb + "Step N of 3";
open it standalone → no framing.

- [X] T019 [US3] Create `src/components/nav/ContextBreadcrumb.tsx` — "{project title} → {screen}" crumb + compact progress (reuse the lifecycle position; not the full stepper); RTL; links back to the project.
- [X] T020 [P] [US3] Render `<ContextBreadcrumb>` when `from=project` on `src/app/[locale]/invoices/[id]/page.tsx` and `src/app/[locale]/proposals/[id]/page.tsx` (needs the project title + lifecycle position; fetch minimal project context only when `from` is present).
- [X] T021 [P] [US3] Add `Nav.breadcrumb*` i18n keys (AR+EN) for the crumb + progress label.
- [X] T022 [US3] Verify live (AR+EN, mobile): framing shows in-context, absent standalone. Gate green.

---

## Phase 6: User Story 4 — Project Start chooser, anchor & blank (Priority: P4)

**Goal**: starting a project asks "do you have a proposal for this?" → use existing / create new /
set up directly; money-free blank project; standalone proposal offers optional graduation.

**Independent test**: `/projects/start` → 3 choices; each branch creates the right project in the
right lifecycle stage; chosen proposal leaves the picker (no double-anchor); blank project is
money-free with a working "Set up the value".

- [X] T023 [P] [US4] Unit tests `src/lib/projects/lifecycle.test.ts` (extend): blank project (`hasProject:true, projectHasOriginProposal:false, proposal:null, gig:null, invoices:[]`) → proposal=skipped, project=current, nextAction=`set_up_project`.
- [X] T024 [P] [US4] Create `src/app/actions/projects/createBlankProject.ts` — owner-scoped insert into `projects` (default title per D6, status active; no gig, no proposal); returns `{ project_id }`; revalidate `/projects`.
- [X] T025 [P] [US4] Create `src/app/actions/projects/listProposalsForAnchor.ts` — owner proposals where `project_id IS NULL`, ordered accepted›sent›viewed›draft then `created_at` desc; returns `AnchorProposal[]` (id, derived title, clientName, priceAnchor, status, createdAt).
- [X] T026 [P] [US4] Unit tests `src/app/actions/projects/listProposalsForAnchor` ordering/filter as pure helper in `src/lib/projects/anchorSort.ts` (+ `anchorSort.test.ts`): unanchored-only; status-priority then recency. (Keep the orderable logic pure + tested.)
- [X] T027 [US4] Create `src/components/projects/ProposalAnchorPicker.tsx` — searchable list (reuse card visual language: client primary, deliverable secondary, status pill, price); select → `createProjectFromProposal(proposal_id)` → route `/projects/{id}?guided=1`; loading/empty/error states; empty → CTA to "create new".
- [X] T028 [US4] Create `src/components/projects/ProjectStartChooser.tsx` — 3 options (AR-first, ≤1 screen): use existing → picker; create new → `ProposalFlow`; set up directly → `createBlankProject` → `/projects/{id}?guided=1`. Mobile-first, `focus-visible`, reduced-motion.
- [X] T029 [US4] Wire `src/app/[locale]/projects/start/page.tsx` to render `ProjectStartChooser` (replace the forced `ProposalFlow`); preserve the new-proposal branch via the chooser.
- [X] T030 [US4] Blank-project "Set up the value" (D4): on a gig-less project, make the project-page stage-② action create the gig via existing `createGig({ project_id, ... })` (reuse `ProjectMoneyDetails` fields) instead of the current `set_up_project` no-op in `ProjectLifecycleCta` / `src/app/[locale]/projects/[id]/page.tsx`.
- [X] T031 [P] [US4] Reframe the standalone proposal "Create project" CTA in `src/components/proposals/ProposalDetailActions.tsx` as an OPTIONAL "Won it? Start the project" (copy only; never forced).
- [X] T032 [P] [US4] Add all US4 i18n (AR+EN): chooser options + question, picker labels/empty state, "Set up the value", optional-graduate CTA copy.
- [X] T033 [US4] Verify live (AR+EN, mobile): each of the three branches; anchor a real existing proposal; confirm no double-anchor; blank project money-free then "Set up the value" → invoice unlocks. Gate green.

---

## Phase 7: Polish & cross-cutting

- [X] T034 [P] Run `node scripts/a11y-audit.mjs` across touched surfaces (chooser, picker, back links, breadcrumb) — all new controls named/labeled; axe clean.
- [X] T035 [P] Standalone regression sweep: with no `from`/`guided`, every touched screen behaves exactly as before (back → own list; no framing; no overlay).
- [X] T036 Update `docs/guided-vs-standalone-brainstorm.md` + `docs/guided-context-audit.md` status notes to "shipped"; final `pnpm typecheck` + `pnpm test` + quickstart walkthrough.

---

## Dependencies & order

- **Setup (T001)** → **Foundational (T002–T003)** → everything.
- **US1 (P1, T004–T012)** depends only on Foundational. **MVP — ship first; fixes the bug.**
- **US2 (P2, T013–T018)** depends on US1 (uses the origin + back affordance).
- **US3 (P3, T019–T022)** depends on US1 (origin) and reuses US2's lifecycle context.
- **US4 (P4, T023–T033)** depends on Foundational (uses `withOrigin`/`guided`) and US2's
  return-to-pane for a clean experience; otherwise independent (new actions/components).
- **Polish (T034–T036)** last.

## Parallel execution examples

- Foundational: T002 ∥ T003.
- US1: after T004, the page swaps T005 ∥ T006 ∥ T007 ∥ T008 ∥ T009 ∥ T010 ∥ T011 (different files).
- US4: T023 ∥ T024 ∥ T025 ∥ T026 (logic/actions/tests), then T027/T028 (components), then wiring.

## Implementation strategy

- **MVP = Phase 1 + 2 + US1.** Shippable alone; resolves the reported invoice→project bug and the
  systemic hardcoded-back issue, with zero standalone regression.
- Then US2 (continuity) → US3 (framing) → US4 (chooser/anchor/blank), each independently shippable
  and gate-checked. Verify live in Arabic/RTL first, then English, desktop + mobile.
