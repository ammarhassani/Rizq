# Phase 0 — Research & Decisions: Guided Project Mode

All "unknowns" were either locked by the founder or resolvable by reading the code. No open
`NEEDS CLARIFICATION` remain.

## D1 — Navigation-origin grammar
**Decision**: A typed, URL-borne token `from=<type>:<id>`; v1 supports `from=project:{uuid}`.
Optional companion `guided=1` marks an active guided run. Both live only in the query string.
**Rationale**: URL-driven ⇒ refresh/back/forward/deep-link safe, no server or global state to
desync (mirrors the project's "derive, don't store" lifecycle philosophy). Typed prefix leaves
room for `client:{id}` later without reworking callers.
**Alternatives rejected**: (a) opaque return-path param — flexible but unvalidated/open-redirect-
prone and can't drive framing/labels; (b) cookie/React-context "active flow" — invisible in the
URL, breaks on refresh/share, risks staleness.

## D2 — Contextual back/return
**Decision**: One shared `<ContextualBackLink>` replaces all 8 hardcoded back links. Resolution:
`from=project:{id}` → label "← {project title}", target `/projects/{id}` (preserve `tab`/`guided`
where relevant); no/invalid `from` → the screen's existing default list (today's behaviour).
Invalid/inaccessible origin → silent fallback to default list (never error).
**Rationale**: Fixes the systemic hardcoding in one place; standalone unchanged; powers guided
return for free. **Alternatives rejected**: per-page bespoke back logic (duplication, drift).

## D3 — Blank-project lifecycle (VERIFIED in code, no resolver change)
**Finding**: `resolveLifecycle({proposal:null, hasProject:true, projectHasOriginProposal:false,
gig:null, invoices:[]})` already yields **proposal = skipped** (`lifecycle.ts:46`
`proposalSkipped = hasProject && !projectHasOriginProposal`) and **project = current** (`:53`
`projectDone = hasProject && !!gig` ⇒ false ⇒ pending ⇒ current). No change to the engine.
**Implication**: A money-free project correctly sits at stage ② "current" until a gig exists.

## D4 — Blank-project money path (the real Phase-4 design point)
**Finding**: For a gig-less project, `nextAction = "set_up_project"`, which `ProjectLifecycleCta`
currently treats as a no-op (`router.refresh()`), and **invoicing requires a parent**
(`createInvoiceFromGig` needs a gig; `createInvoiceFromProposal` needs a proposal). So a blank
project has no working "advance" action today.
**Decision**: Keep the money child (gig) as the single money model. On a gig-less project, the
stage-② action becomes **"Set up the value"** — a lightweight form (reuse `ProjectMoneyDetails`'s
fields) that creates the gig via the existing `createGig` action with `project_id` set. Once the
gig exists, the lifecycle advances to ③ and the existing "create invoice" path works unchanged.
**Rationale**: Preserves "project done = gig exists" semantics and the founder's "money-free until
they invoice or log income" rule, without inventing gig-less invoicing. **Alternative rejected**:
project-scoped invoices with `gig_id = null` — the schema allows it, but it forks the money model
and breaks the gig-centric paid→gig→project cascade.

## D5 — Context framing (P3)
**Decision**: When `from=project`, editors render a slim `<ContextBreadcrumb>` (project name →
current screen) plus a **compact** progress indicator (e.g. "Step 3 of 3"), not the full
lifecycle stepper. **Rationale**: Enough orientation without crowding a focused editor on mobile.

## D6 — Blank-project title
**Decision**: "Set up directly" creates the project with a sensible default title (e.g. "مشروع
جديد" / "New project") editable later; no blocking title prompt. **Rationale**: Keeps the path
fast (≤3 inputs / ≤1 screen to value, Principle III). Revisit if users want naming up front.

## D7 — No migration
**Decision**: No schema change. `projects` exists; a blank project is an `INSERT` with no gig.
`invoices.project_id` already exists. **Rationale**: Additive-only; nothing to alter.

## D8 — Reuse, don't clone
**Decision**: Reuse `createProjectFromProposal({proposal_id})` for anchoring (unchanged),
`createGig` for "set up the value," `resolveLifecycle`/`getLifecycle` for state, `GuidedFlowOverlay`
(already `?guided=1`-gated), and the existing editor screens (add context, no new editors).

## D9 — Anchor list query
**Decision**: `listProposalsForAnchor` = owner's proposals where `project_id IS NULL`, ordered by
status priority (accepted › sent › viewed › draft › others) then `created_at` desc; searchable
client-side on title/client. **Rationale**: Founder-locked; can't double-anchor; most-likely-to-
become-a-project first.
