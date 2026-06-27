# Guided-flow context audit — "the whole app should serve the guided flow" (2026-06-27)

> ✅ **SHIPPED** as feature `005-guided-project-mode` (US1 contextual back · US2 continuity /
> return-to-pane · US3 framing · US4 entry chooser + anchor + blank project). All verified live.

## Founder signal
> When I'm in guided flow (project initiation), the *whole app* should serve that flow.
> Today I create an invoice for a project and "back" returns me to the **invoice route**,
> not the **project pane**. Everything feels cloned and reused, not personalized to the
> event and the user's need.

This is correct, and it's not one bug — it's an **architectural gap**: components are
**context-blind**. Each screen assumes it was reached from its own list and hardcodes its
"back" there. Guided context (`?guided=1`) is read in exactly one place (the project page,
for the overlay) and is **never propagated into any editor**. So the instant you enter the
invoice/proposal editor during guided setup, the flow forgets the project.

## Evidence — every detail/editor "back" is hardcoded to its own list

| Screen | Current back | File |
|---|---|---|
| Invoice detail `/invoices/[id]` | → `/invoices` | `invoices/[id]/page.tsx:99` |
| Invoice new `/invoices/new` | → `/invoices` | `invoices/new/page.tsx:119` |
| Proposal detail `/proposals/[id]` | → `/proposals` | `proposals/[id]/page.tsx:147` |
| Income detail `/income/[id]` | → `/income` | `income/[id]/page.tsx:157` |
| Income new `/income/new` | → `/income` | `income/new/page.tsx:53` |
| Client detail/new | → `/clients` | `clients/[id]`,`clients/new` |
| **Project page `/projects/[id]`** | → `/income` (!) | `projects/[id]/page.tsx:121` |

The project page itself doesn't honor where you came from — it always sends you to the
Income Ledger. So even the umbrella screen is context-blind.

### The transition that drops context
`ProjectLifecycleCta` (the project's "Create invoice" button) does:
```ts
createInvoiceFromGig({ gig_id }) → router.push(`/invoices/${id}`)   // no project, no guided flag
```
It lands you on the standalone invoice editor with **no breadcrumb, no project, no return
path**. Same shape for proposal finalize and every other hop.

### What scaffolding already exists (inconsistent, not threaded)
- `ProposalFlow` has a `forProjectId` prop and `/proposals/new?for_project=` links the
  proposal back — **the only** transition that carries context, and only one-way.
- The GitHub OAuth uses a `return_to` cookie — a return-path idea, used nowhere else.
- `?guided=1` exists but is read only by the project page.

So the pieces of an idea are present; there is no **convention** that threads context through
the journey, and no screen *frames itself* for the event.

## Root cause
There is no first-class concept of **navigation origin / active flow context**. Screens are
pure reusable CRUD surfaces with a fixed "home." Reuse is good; **context-blindness** is the
bug. "Personalized to the event" requires each screen to know *why it was opened* and *where to
return*.

## Recommended architecture — make guided a real mode (without cloning screens)

Keep the screens shared; give them **context**. Three small primitives:

### 1. A navigation-origin convention (`from`)
Every transition made *inside* a flow appends an origin token to the URL, e.g.
`/invoices/{id}?from=project:{projectId}&guided=1`. URL-driven so it's refresh-safe,
deep-linkable, and back/forward-safe (no stale cookie/global state). `from` values:
`project:{id}` (and later `client:{id}`, etc.). Absent `from` ⇒ standalone ⇒ current behavior.

### 2. A shared `<ContextualBackLink>` (+ optional breadcrumb)
Replaces the 8 hardcoded back links. Resolves the destination from `from`:
- `from=project:{id}` → "← {Project title}" back to `/projects/{id}` (+ `?tab=` / `?guided=1`).
- no `from` → the page's default list (today's behavior).

One component, applied everywhere, fixes the systemic hardcoding **and** powers guided return.

### 3. Context-aware framing + return-to-origin on success
- **Framing:** when `from=project`, the editor renders a slim project breadcrumb/header
  ("Project X · Invoice") and may show the lifecycle stepper/overlay — the screen is now
  *personalized to the event*, not a bare clone.
- **Success returns to the pane:** after the guided action (invoice created/sent, proposal
  finalized), route back to `/projects/{id}?guided=1` — **the project pane**, not the list.
  Today success/back both dead-end on the standalone list.

### Threading points (where to append `from`/`guided`)
- Project Start chooser → all branches.
- `ProjectLifecycleCta` → invoice editor (`from=project:{id}&guided=1`).
- `createInvoiceFromGig` / `createInvoiceFromProposal` callers → keep `from` on the redirect.
- `ProposalFlow` finalize (guided) → carry `from`/`guided` to the proposal, then to the project.
- Resume/continue links (dashboard, projects index) already add `?guided=1`; add `from` too.

### Result
In guided mode: every screen knows it's serving Project X, shows a real breadcrumb, "back"
and "cancel" return to the project pane, and success advances the lifecycle there. In
standalone mode: nothing changes — the proposal/invoice lives on its own with its list back.
Same components, **personalized by context** — which is exactly the ask.

## This is the other half of the chooser work
`docs/guided-vs-standalone-brainstorm.md` fixes the **entry** (how a guided project starts);
this fixes the **continuity** (how guided context persists through every step). Together they
turn "10% of each journey" into two complete ones. Recommend speccing them as **one** feature
(extends 003): *Guided Project Mode — entry chooser + context threading + contextual back/return*.

## Phasing (incremental, each shippable)
1. `<ContextualBackLink>` + `from` convention; replace the 8 hardcoded backs. *(Fixes the
   reported invoice bug immediately; harmless in standalone.)*
2. Thread `from`/`guided` through the lifecycle transitions + return-to-project on success.
3. Context framing (breadcrumb/stepper) on editors when `from=project`.
4. The Project Start chooser + anchor picker + blank project (the brainstorm doc).
