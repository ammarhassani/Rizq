# Quickstart — validating Guided Project Mode

Prereqs: dev server running; logged in as a user with a few proposals (some unanchored) and at
least one project with a gig. Tooling: `pnpm typecheck`, `pnpm test`, and the Playwright +
`scripts/a11y-audit.mjs` harness. Verify in **Arabic (RTL)** first, then English.

## Phase 1 — navigation origin (US1) — *fixes the reported bug*
1. Open a project with a gig → click the lifecycle "Create invoice" CTA → land on the invoice
   editor. **Expect**: the back control reads "← {project title}" and returns to `/projects/{id}`
   (NOT `/invoices`).
2. Open an invoice from the **Invoices list** (no project context). **Expect**: back → `/invoices`.
3. Refresh the in-context invoice editor URL (which carries `?from=project:{id}`). **Expect**: back
   still returns to the project (origin survived reload).
4. `pnpm test` — `src/lib/nav/origin.ts` unit tests green (parse/serialize/resolveBack/withOrigin).

## Phase 2 — continuity (US2)
5. From the project, create the invoice and complete it (send/mark). **Expect**: you are returned
   to the **project pane**, lifecycle advanced — not stranded on the invoice list.
6. Standalone control: create an invoice from `/invoices/new`. **Expect**: unchanged — success/back
   stay in the invoices area.

## Phase 3 — framing (US3)
7. Open the invoice/proposal editor in a project context. **Expect**: a breadcrumb naming the
   project + a compact progress indicator. Open the same editor standalone. **Expect**: no framing.

## Phase 4 — entry chooser (US4)
8. "Start a project" → **Expect** three choices.
9. **Use existing** → searchable list of *unanchored* proposals, accepted›sent›viewed›draft order;
   select one → a project is created anchored to it; lifecycle past the proposal stage. The chosen
   proposal no longer appears in the picker (no double-anchor).
10. **Create new** → the Proposal Studio (unchanged) → on finalize, a project anchored to it.
11. **Set up directly** → a blank project is created (no proposal, no money); lifecycle shows
    proposal = skipped, project = current; the project page offers "Set up the value" (creates the
    gig) which then unlocks "create invoice".
12. Empty case: a user with no unanchored proposals chooses "use existing" → empty state routes to
    "create new".

## Gate
- `pnpm typecheck` clean; `pnpm test` green (new: origin resolution, anchor-list filter/order,
  blank-project lifecycle, chooser routing).
- `node scripts/a11y-audit.mjs` clean across the touched surfaces (new controls named/labeled).
- Live: Phase-1 invoice→project back verified in AR + EN, desktop + 390px mobile.
