# Security / Halal / PDPL Review — Provider Connections (OAuth)

**Feature**: 004 Project Workspace · Phase 5 (Integrations real OAuth) · Task T021 (the gate)
**Status**: ✅ APPROVED by founder 2026-06-26 (app-layer envelope encryption chosen). Phase 5 implemented on this basis.
**First provider**: GitHub, **read-only** scopes.

This document is the gate. It states how third-party provider connections will be handled so that secrets are never exposed, the feature stays PDPL- and halal-compliant, and the blast radius of a compromise is bounded.

## 1. What we store, and where

| Data | Store | Client-readable? | In PDPL export? |
|---|---|---|---|
| OAuth access/refresh tokens | `provider_connections` (new) | **No** — `revoke all from anon, authenticated`; touched only by server (SECURITY DEFINER / service role) | **No** — explicitly excluded |
| Token scope, status, expiry | `provider_connections` | No | Metadata only *may* be exported (no secret) — decision: export status/provider/created_at only, never tokens |
| Linked resource (repo/file URL, label) | `project_integrations` (existing, owner-readable) | Yes (non-secret) | Yes |
| Connection ↔ link join | `project_integrations.connection_id` | Yes (an opaque uuid) | Yes |

**Invariant**: a token value never leaves the server. The browser only ever sees non-secret link metadata and an opaque `connection_id`.

## 2. Token storage

- Tokens stored **encrypted at rest**. Two acceptable mechanisms (decide at build):
  1. **App-layer envelope encryption** — encrypt with a key from server env (`PROVIDER_TOKEN_KEY`, never `NEXT_PUBLIC_*`) before insert; DB stores ciphertext (`bytea`). Simplest; key rotation = re-encrypt.
  2. **Supabase Vault / pgsodium** — store via Vault; DB never holds plaintext.
- **RLS posture (the deliberate exception)**: `provider_connections` has **no grant to `anon` or `authenticated`** — unlike every other owner table, the client cannot even `select` its own row. All reads/writes go through server-only paths (service role in route handlers, or SECURITY DEFINER functions scoped to `auth.uid()`). Verified post-migration via `get_advisors` (the table must show no client SELECT).
- `on delete cascade` from `users` → connections purged on account deletion.

## 3. Scope minimization (halal + least privilege)

- **GitHub first, read-only**: request the narrowest scope that renders the feature (e.g. `repo:status` / `read:user` / public repo metadata) — never write/delete/admin scopes.
- No scraping, no bulk export of third-party data; we link and display metadata the user explicitly connects. (Constitution VI: no marketplace scraping.)
- Each added provider repeats this review row: which scope, why, read-only.

## 4. PDPL

- **Right of access**: the export includes the *fact* of a connection (provider, status, dates) but **never tokens**.
- **Right to erasure**: account delete cascades connections; an explicit "disconnect" revokes server-side and deletes the row.
- **Data minimization**: store only what's needed to call the provider read-only; no third-party personal data beyond the linked resource metadata the user chose.
- Rizq remains not-a-government-entity; no new third-party data sale.

## 5. Revocation & failure

- "Disconnect" → best-effort provider-side token revoke + delete the `provider_connections` row; dependent `project_integrations` show `disconnected` honestly (Constitution I — no fake "connected").
- Expired/failed tokens → status `expired`; UI shows a clear "reconnect" with no silent breakage.
- OAuth `state` parameter (CSRF) verified on callback; callback only accepts our own `state`.

## 6. Blast radius

- A leaked `connection_id` (client-visible) is useless without server key + service role.
- A DB read leak (without the app key, if app-layer encryption) yields ciphertext only.
- Tokens are read-only scope → a worst-case token misuse cannot mutate the user's provider data.

## 7. Approval checklist (founder)

- [ ] Token storage mechanism chosen (envelope vs Vault).
- [ ] First-provider scope confirmed read-only and minimal.
- [ ] `provider_connections` no-client-grant RLS posture approved.
- [ ] Export-exclusion of tokens approved.
- [ ] Revocation + account-delete behavior approved.

**On approval, Phase 5 (T022–T026) may proceed. Until then, the integrations stub (manual link paste) remains the only integration path.**
