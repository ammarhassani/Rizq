# Contract — Share-Link State (Bug ④)

Distinguish an intentionally **disabled** public link from a **missing** one, without
leaking content.

## RPC (new) — `get_shared_proposal_state(p_token text) → text`
- Returns exactly one of: `'active'`, `'disabled'`, `'missing'`.
- `SECURITY DEFINER`, read-only; discloses **no** proposal fields.
- Mapping: `active` = row with `share_token = p_token AND public_share = true`; `disabled` = row with that token but `public_share = false`; `missing` = no row.
- `grant execute` to `anon` + `authenticated`. The existing revoke of anon `select` on `proposals` stays.

## Page behavior — `[locale]/p/[token]/page.tsx`
- Existing content fetch (RPC `get_shared_proposal`) returns the artifact only when active.
- When it returns null, call `get_shared_proposal_state`:
  - `disabled` → render a **bilingual "the publisher has disabled this link" view** (access-denied, not `notFound()`).
  - `missing` → `notFound()`.
- `generateMetadata` mirrors the same three states (no content in the disabled/missing metadata).

## Copy (new, AR + EN)
Under the existing `Proposals.share` message namespace: a disabled-link title + body.

## Acceptance mapping
FR-018, FR-019, FR-020, FR-021 · SC-005 · User Story 5. Edges: proposal deleted entirely → `missing`; re-enabling sharing → `active` again with the same token.
