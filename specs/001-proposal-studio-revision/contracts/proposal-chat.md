# Contract — Proposal Chat (Feature ②)

A hovering conversational editor that routes a free-text instruction to the responsible
prose section(s) and edits them in place, with a confirm gate for scope/price changes.

## Route (new) — `POST /api/proposals/[id]/chat`

- **Auth:** owner-gated; available when the proposal is editable (draft/final/sent).
- **Request:** `{ message: string }`.
- **Step 1 — intent router** (`lib/ai/chatIntent.ts`, `generateObject`):
  ```
  ChatIntent = {
    target_section_ids: Array<'cover_letter'|'understanding'|'approach'|'scope_of_work'|'assumptions'>  // 1..n
    instructions: Array<{ section_id, instruction }>     // per-section guidance
    scope_change?: { kind: 'add'|'remove', deliverable_ar: string, deliverable_en: string }
    reply_ar: string; reply_en: string                  // short chat acknowledgement
  }
  ```
  The schema **enumerates only the 5 AI-editable sections** — the router structurally cannot target price/timeline/milestones/terms.
- **Step 2 — focused stream:** `streamObject({ schema: ProseSchema })` limited to the resolved sections; client renders progressively (`experimental_useObject`). `onFinish` merges via `mergeProseIntoArtifact` and snapshots the prior version (`bumpAndPersist`).
- **Degrade:** HTTP 200 `{ code: "ai_unconfigured" }` when no key; dock shows a clear disabled state.

## Scope/price change flow (clarified: propose → confirm → auto re-price)
When `scope_change` is present, the route returns the proposal (no silent apply). The dock
renders a **confirmation card**. On confirm, a separate owner-gated action:
1. adds/removes the deliverable in `scope_json.deliverables`,
2. re-prices via `resolvePrice` + `computeProposalPrice` (deterministic — **no LLM number**),
3. returns the new band for a final OK before persisting (snapshotted).

## Client — `ProposalChatDock.tsx` (new)
- Mounted by `[id]/page.tsx` when `canEdit`; fixed/hovering, Framer Motion; reveals via `StreamingProse`. Reduced-motion safe. Bilingual.
- Never rendered on the public share page (read-only).

## Honesty guardrails
- AI edits prose only (FR-014). Edited sections keep the AI-assisted label (FR-017).
- Every applied edit is recoverable via version history (FR-016).

## Acceptance mapping
FR-011…FR-017 · SC-004 · User Story 4. Edges: ambiguous target → router picks best match + states what changed; price/legal request → refused; multi-section message (mobile app + control panel) → multiple targets + scope_change.
