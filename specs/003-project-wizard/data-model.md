# Phase 1 Data Model: Project Lifecycle Wizard

## No new persistent storage

This feature adds **no tables, no columns, no migrations**. The lifecycle is a *computed view* over existing rows. This is a deliberate consequence of D1/D3 (derive, don't store) in [research.md](./research.md).

## Derived entity: `Lifecycle` (in-memory only)

Computed by the pure resolver `src/lib/projects/lifecycle.ts` from inputs already owned by the user (RLS on the underlying tables provides isolation — nothing new to secure).

### Inputs (read from existing tables)

| Source | Fields read | Used for |
|---|---|---|
| `proposals` | `id`, `status`, `project_id` | stage ① done-signal; draft-only lifecycle detection |
| `projects` | `id`, `origin_proposal_id`, `is_active`, `status` | stage ① skipped (no origin); stage ② presence |
| `gigs` (money child) | `id`, `amount_sar`, `status` | stage ② done-signal (money record exists) |
| `invoices` | `id`, `status` (per project) | stage ③ progress/done (`sent`/`viewed`/`paid`) |

### Output shape

```text
Lifecycle {
  stages: [
    { key: 'proposal', state: 'done'|'current'|'next'|'skipped' },
    { key: 'project',  state: ... },
    { key: 'invoice',  state: ... },
  ],
  currentStageKey: 'proposal' | 'project' | 'invoice' | null,  // null = complete
  complete: boolean,
  nextAction: 'finalize_proposal' | 'set_up_project' | 'create_invoice'
            | 'send_invoice' | 'mark_paid' | null,
  anchor: { kind: 'proposal'|'project', id: string },  // what to resume against
}
```

### Derivation rules (encoded + tested in `lifecycle.test.ts`)

- **Stage ① (proposal)**
  - `done` if an origin proposal exists with status ∈ {`final`,`sent`,`viewed`,`accepted`}.
  - `skipped` if a project exists with **no** `origin_proposal_id`.
  - `current` if a draft/extraction proposal exists but is not yet finalized and no project yet.
  - `done` (not re-openable) once a project exists, even if the proposal was later `declined`/`expired` (the project outlives the quote — see research D-watch).
- **Stage ② (project)**
  - `done` if the project + its money child (gig with `amount_sar`) exist.
  - `current` if stage ① is done/skipped and no project yet (CTA: set up the project).
- **Stage ③ (invoice)**
  - `current` once stage ② is done and no invoice is sent/paid yet (CTA: create invoice → then send).
  - in-progress (`current`) while an invoice is `draft`/`sent`/`viewed`.
  - `done` / `complete` once an invoice on the project is `paid`.
- **currentStage** = first stage not `done` and not `skipped`; `complete=true` when none remain.

### Dashboard "continue" set (owner-scoped query, no new table)

```
in-progress lifecycles =
  (projects where is_active and not fully-paid)
  ∪ (proposals where status in (draft, final, sent, viewed) and project_id is null
       and status not in (declined, expired))
order by recency, bounded.
```

## Why this is safe

- Underlying tables already have owner-scoped RLS (feature 002 + earlier). The resolver only reads rows the user can already read → no new policy needed (FR-015, SC-008).
- No money math, no quota, no view, no migration touched → zero regression surface in the data layer.
