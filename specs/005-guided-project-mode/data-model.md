# Phase 1 — Data Model: Guided Project Mode

**No database migration.** This feature adds navigation/UX concepts and reuses existing tables.
Two of the entities below are *runtime/URL* concepts, not tables.

## Existing tables (reused, unchanged)

### `projects`
- Already owner-scoped (RLS `auth.uid() = user_id`), soft-archivable.
- **New supported state**: a project with **no origin proposal AND no gig** (a "blank" project).
  No column change — `origin_proposal_id` nullable already; the 1:1 gig is simply absent.
- Relationships: `origin_proposal_id → proposals.id` (nullable); `gigs.project_id → projects.id`
  (0..1 gig today; this feature allows 0).

### `proposals`
- `project_id` (nullable) marks the project it anchors as `origin`. **Anchor-eligibility**:
  `project_id IS NULL` (unanchored). Status drives the anchor-list ordering.

### `gigs`, `invoices`
- Unchanged. A blank project gains a gig later via `createGig({ project_id })` ("set up the
  value"), after which the existing invoice paths apply. `invoices.project_id` already exists.

## Runtime entities (not persisted)

### NavigationOrigin
- **Shape**: `{ type: "project"; id: string }` serialized as the URL param `from=project:{id}`.
- **Parse/serialize** (`src/lib/nav/origin.ts`, pure + tested):
  - `parseOrigin(searchParams): NavigationOrigin | null` — returns null on missing/malformed/
    unknown-type; validates `id` is a UUID.
  - `serializeOrigin(origin): string` — `"project:{id}"`.
  - `withOrigin(href, origin?, guided?): string` — append `from`/`guided` to a target href.
  - `resolveBack(origin, fallbackHref, projectTitle?): { href; label }` — origin → project pane
    (+ preserved `tab`/`guided`); else `{ fallbackHref, defaultLabel }`.
- **Validation rules**: unknown type → treat as absent; id not a UUID → absent; resolution to an
  inaccessible/archived project is handled at the page (RLS read fails → fall back to default list).

### GuidedRun
- **Shape**: boolean from `guided=1` in the URL. Scoped to the run; never global/persisted.
- **Semantics**: enables `GuidedFlowOverlay` + (with `from=project`) return-to-pane on success.

## State transitions (lifecycle, reused engine — no change)

| Project state | proposal | project | invoice | nextAction | Notes |
|---|---|---|---|---|---|
| Blank (no proposal, no gig) | skipped | **current** | next | `set_up_project` → "Set up the value" (create gig) | D3/D4 |
| Anchored (origin proposal, no gig yet) | done | current | next | `set_up_project` | from "use existing"/"create new" |
| With gig, no invoice | done/skipped | done | current | `create_invoice` | existing |
| Invoice sent | … | done | current | `mark_paid`/`send_invoice` | existing |
| Invoice paid | … | done | done | — (complete) | cascade pays gig → project completed |

## Validation & integrity
- **No double-anchor**: anchor picker excludes `project_id IS NOT NULL`; `createProjectFromProposal`
  remains the only anchoring path (already guards owner + existence).
- **Owner scope**: `createBlankProject` and `listProposalsForAnchor` are owner-scoped; RLS enforced.
- **Quota**: `createBlankProject` creates no gig ⇒ no money-quota consumption (quota applies when
  the gig is later created via `createGig`, exactly as today).
