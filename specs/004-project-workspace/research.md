# Phase 0 Research: Project Workspace

## D1 — Files = extend Document Vault, don't build new

**Decision**: Add `project_id` (nullable FK → projects, on delete set null) and `project_doc_kind` enum (`input` | `deliverable`, nullable — meaningful only when project_id set) to the existing `documents` table. Reuse storage bucket, upload UI, owner RLS, the free=10/pro=50 quota, soft-delete, and PDPL export/delete.

**Rationale**: `documents` already has `client_id`, `category`, `tags`, RLS, quota, soft-delete. Adding a project link + a kind is purely additive and inherits all of it. Non-project documents are unaffected (both columns null). Cheapest path, zero regression.

**Alternatives**: a separate `project_files` table — rejected (duplicates storage/RLS/quota/export already solved by Document Vault).

## D2 — Deliverables = curated view + one new state, not a new store

**Decision**: The Deliverables list = `documents` where `project_id` set and `project_doc_kind='deliverable'` ∪ `project_integrations` where `project_id` set. Add a nullable `handover_state` enum (`draft`|`ready`|`sent`) to **both** `documents` and `project_integrations`. The view unions the two with their state.

**Rationale**: Spec says "not a new store; only per-item state is new." A handover_state column on each underlying row is additive and avoids a polymorphic join table. The deliverable disappears automatically when its file/link is removed (no dangling — satisfies FR-009).

**Alternatives**: a `project_deliverables` table with polymorphic (source_type, source_id) — rejected (polymorphic FK, dangling-row risk, more code).

## D3 — Deliverable state machine

**Decision** (founder): exactly `draft → ready → sent`, forward-only, adjacent steps, `sent` terminal. Rework = update/re-add an item starting again at `draft`. Pure resolver + tested.

## D4 — Tasks & milestones

**Decision**: New `project_tasks` (user_id, project_id, milestone_id?, title, status `todo|doing|done`, due_date?, sort_order, timestamps) and `project_milestones` (user_id, project_id, name, target_date?, sort_order, timestamps). Owner-scoped RLS. **Money-free**; designed so a milestone can later gain an amount/gig link without restructuring (a future `milestone_id` on `gigs`, or amount columns on `project_milestones`).

**Rationale**: Self-contained PMO facet; the deferred milestone-money path reuses the 1-project→many-gigs schema from feature 002. Status is a tiny enum with a pure transition rule (any→any is allowed for a kanban, but we test the canonical todo→doing→done and guard unknowns).

**Decision** (founder): milestone money strictly later — not this release.

## D5 — Quota posture

**Decision** (founder): files reuse the existing document quota (free 10 / pro 50) — no new file quota. Tasks and deliverable items are unlimited (lightweight metadata). No new quota machinery, no double-count.

**Rationale**: Avoids new enforcement surface; the document quota already gates the only heavyweight artifact (uploaded files).

## D6 — Real integrations: GitHub read-only first, secrets server-only

**Decision** (founder): first provider GitHub, read-only scopes. New `provider_connections` table holds OAuth tokens **encrypted at rest**, with **no client grant at all** (`revoke all from anon, authenticated`; accessed only via SECURITY DEFINER functions / server-side service role). `project_integrations` gains a nullable `connection_id`. Tokens are **excluded from the PDPL export** and purged on account delete (cascade).

**Rationale**: GitHub OAuth is clean and low-risk read-only; isolating secrets in a no-select table is the safest pattern and respects the constitution's compliance gate. The manual-link path remains for everything not yet connected.

**Gate**: a written halal/PDPL/security review (token storage, scope minimization, revocation, export exclusion) MUST pass before implementing this phase (FR-017/SC-009).

## D7 — Tab shell

**Decision**: Project page renders a tab control (Overview default). Tabs are URL-addressable (e.g. `?tab=files`) so they're shareable/resumable and SSR-friendly; each tab fetches its own data server-side. Mobile: horizontally scrollable/segmented control, RTL-aware.

## Open risks / watch-items (for tasks)

- `handover_state` on two tables means the Deliverables view must coalesce consistently; test the union + state rendering.
- Document soft-delete (`deleted_at`) must exclude deleted files from the Files tab and Deliverables view.
- The export change for documents is just adding `project_id`/`project_doc_kind` to the existing select; tasks/milestones are new export sections.
- `provider_connections` must be verified by `get_advisors` to have **no** authenticated SELECT (the opposite of normal owner tables) — a deliberate exception to the usual owner-select pattern.
