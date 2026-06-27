# Phase 1 — Contracts: navigation origin + new server actions

UI/navigation contract (this is an app, so the "interface" is the URL convention + the shared
component + two server actions). Implementation lives in `tasks.md` / the code.

## 1. URL navigation-origin convention

```
?from=project:{uuid}      # navigation origin (v1: only `project`)
?guided=1                 # active guided run (optional, independent of `from`)
```
- Both are additive query params. **Absent ⇒ standalone ⇒ unchanged behaviour.**
- Preserved across a guided transition; `from` survives reload/back/forward (it's in the URL).
- Editors MUST NOT require `from`; they read it only to adjust back/return/framing.

## 2. `src/lib/nav/origin.ts` (pure, unit-tested)

```ts
type NavigationOrigin = { type: "project"; id: string };

parseOrigin(sp: { from?: string }): NavigationOrigin | null   // null if missing/malformed/bad-uuid
serializeOrigin(o: NavigationOrigin): string                  // "project:{id}"
withOrigin(href: string, o?: NavigationOrigin|null, guided?: boolean): string
resolveBack(o: NavigationOrigin|null, fallbackHref: string, projectTitle?: string, opts?: {tab?:string; guided?:boolean})
  : { href: string; label: string }   // origin → project pane (+tab/guided); else fallback
```

**Test matrix**: valid `project:{uuid}` → parsed; missing → null; non-uuid id → null; unknown type
→ null; `resolveBack` with origin → project href + title label; without origin → fallback href +
default label; `withOrigin` appends correctly when href already has a query.

## 3. `<ContextualBackLink>` (shared component)

Props: `{ origin: NavigationOrigin|null; fallbackHref: string; fallbackLabel: string; projectTitle?: string; tab?: string; guided?: boolean }`.
Renders one back affordance using `resolveBack`. RTL-aware arrow; `focus-visible` ring; bilingual
fallback label. Replaces the hardcoded back `<Link>` in: invoices/[id], invoices/new, proposals/[id],
income/[id], income/new, clients/[id], clients/new, projects/[id].

## 4. `createBlankProject` (server action) — NEW

```
Input:  {}                                  // (optional future: { title?: string })
Output: { ok: true; project_id: string }
      | { ok: false; code: "unauthorized" | "error" }
```
- Owner-scoped insert into `projects` (default title per D6; status active). **No gig, no proposal.**
- No money-quota path (no gig created). Revalidate `/projects`.
- Caller routes to `/projects/{id}?guided=1` (return-to-pane begins immediately).

## 5. `listProposalsForAnchor` (server loader) — NEW

```
Output: { ok: true; items: AnchorProposal[] } | { ok: false; code: "unauthorized" | "error" }
AnchorProposal = { id; title; clientName: string|null; priceAnchor: number|null; status: string; createdAt: string }
```
- Owner-scoped: proposals where `project_id IS NULL`.
- Order: status priority (accepted › sent › viewed › draft › other) then `created_at` desc.
- Title derived the same way as `ProposalCard` (deliverable/brief). Searchable client-side.

## 6. Reused actions (no contract change)
- `createProjectFromProposal({ proposal_id })` → `{ project_id, gig_id }` — anchoring (branches 1 & 2).
- `createGig({ project_id, ... })` — "set up the value" on a blank project (D4).
- `createInvoiceFromGig` / `createInvoiceFromProposal` — unchanged; callers now thread `from`/`guided`
  onto the redirect so the invoice editor returns to the project pane.

## 7. Transition threading (where `from`/`guided` are attached)
- Project Start chooser → every branch target.
- `ProjectLifecycleCta` → `/invoices/{id}?from=project:{id}&guided=1`; `set_up_project` (gig-less) →
  open "Set up the value".
- `ProposalFlow` finalize (guided) → carry to the proposal, then to the project pane.
- Dashboard/projects resume links → already add `guided=1`; add `from=project:{id}`.
