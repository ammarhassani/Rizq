# Phase 1 Contracts: Lifecycle resolver, loaders, orchestration

## Pure resolver — `src/lib/projects/lifecycle.ts`

```text
type StageKey   = 'proposal' | 'project' | 'invoice'
type StageState = 'done' | 'current' | 'next' | 'skipped'
type NextAction = 'finalize_proposal' | 'set_up_project' | 'create_invoice'
                | 'send_invoice' | 'mark_paid' | null

type LifecycleInput = {
  proposal?: { status: string } | null      // origin proposal (or the draft anchor)
  hasProject: boolean
  projectHasOriginProposal: boolean
  gig?: { amount_sar: number; status: string } | null
  invoices: { status: string }[]            // invoices on the project
}

resolveLifecycle(input: LifecycleInput): {
  stages: { key: StageKey; state: StageState }[]
  currentStageKey: StageKey | null
  complete: boolean
  nextAction: NextAction
}
```

**Contract**: pure, deterministic, no I/O. Total over all inputs (never throws; unknown statuses fall through to safe defaults). Unit-tested across the permutation matrix in [data-model.md](../data-model.md): each stage × {done, current, next, skipped}, the declined-after-project case, the skipped-proposal (direct-bill) case, and the complete case.

## Loader — `getLifecycle.ts` (server action / RSC helper)

- **Input**: `{ project_id: uuid }` **or** `{ proposal_id: uuid }` (draft-only, pre-project).
- **Behavior**: owner-scoped fetch of the relevant proposal/project/gig/invoices, then `resolveLifecycle`. Returns the resolved lifecycle plus the IDs needed by CTAs.
- **Returns**: `{ ok: true; lifecycle; project_id?; proposal_id?; gig_id? } | { ok:false; code: 'unauthorized'|'not_found'|'error' }`.
- **Access**: RLS on the underlying tables; someone else's id → `not_found`.

## Loader — `listInProgressLifecycles.ts` (dashboard)

- **Input**: none (current user) — optional `{ limit?: number }` (default small, e.g. 5).
- **Behavior**: owner-scoped query of the "continue" set from data-model.md (unpaid active projects + draft-only proposals without a project, excluding declined/expired), each resolved to its current stage + next action, ordered by recency.
- **Returns**: `{ ok:true; items: { anchor; title; currentStageKey; nextAction; href }[] } | { ok:false; code }`.

## Orchestration CTAs (reuse existing actions — no new conversion logic)

| Boundary | Action called | Result handling |
|---|---|---|
| ①→② "Set up the project" | `createProjectFromProposal({proposal_id})` | on `quota_exhausted` → existing upgrade prompt, stage ① stays done, no orphan; on ok → route `/projects/[id]` |
| ② money details | existing gig update (in `actions/gigs/gigs.ts`) | deposit/remaining recompute via existing trigger |
| ②→③ "Create invoice" | `createInvoiceFromGig({gig_id})` | on `quota_exhausted` → upgrade prompt, stage ② stays done; on ok → invoice editor/share |
| ③ send / paid | existing `markInvoiceStatus` | paid-loop already flips project money paid |

The wizard adds **no** new server action that creates a proposal/project/invoice — it only calls the above. The two new server functions (`getLifecycle`, `listInProgressLifecycles`) are **read-only**.

## UI contracts

- **`LifecycleStepper`**: props `{ locale; lifecycle; ids }`. Renders 3 stages with state badges (done ✓ / current ● / next ○ / skipped ⤼) and exactly one primary "continue" CTA mapped from `nextAction`. Bilingual, RTL, mobile-first. Pure presentational (no fetching).
- **`StartProjectButton`**: routes to `/projects/start` (stage ① via ProposalFlow). Primary on dashboard.
- **`ContinueLifecycleList`**: renders `listInProgressLifecycles` items, each linking to its resume `href`.
- **`/projects/start`**: hosts stage ① — the existing `ProposalFlow` wrapped in stepper chrome; on finalize, surfaces the ①→② CTA.
- **`/projects/[id]`** (modified): mounts `LifecycleStepper` at the top as the resumable home base.
