# Phase 1 Data Model — Gap Remediation & Growth

US1, US2, US3, and US5-M8 introduce **no schema changes**. Only US4 (founder-gated) adds a
table. This document records the entities the feature reads/writes.

## Existing entities (no change)

### `users` (tier fields)
- `role` — `free | pro | admin`.
- `pro_until` — `timestamptz | null`. **Behavior change only (US3):** effective tier now
  reads `pro_until` — `role === 'pro'` grants Pro **iff** `pro_until > now`. Admins ignore it.
  No column/migration change; enforcement moves into the shared `isPro` helper.
- `fl_verified`, `fl_verified_at`, `fl_document_url` — set by US5-M8 on FL-document upload.
  Columns already exist (writable-columns grant includes them per `grants.test.ts`).

### Proposal status (enum, read-only here)
- `draft | final | sent | viewed | accepted | declined | expired`. US2 maps each to a
  localized label via `Proposals.list.status.*`; a missing key humanizes rather than leaks.

### Pricing-lookup quota (no change)
- `FREE_MONTHLY_QUERIES = 5` (regression-guarded by US3/FR-007) enforced app-side + DB trigger.

## New entity — US4 only (FOUNDER-GATED, not built until greenlit)

### `payments`
| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | RLS: owner-only read; no client write. |
| `provider` | text | `'tap'`. |
| `provider_charge_id` | text UNIQUE | Tap charge id — **idempotency key**; a replayed webhook on the same id is a no-op. |
| `amount_sar` | numeric | Charged amount (tabular, SAR). |
| `status` | text | `initiated | paid | failed | refunded`. |
| `grants_pro_until` | timestamptz null | The `pro_until` this payment set on success. |
| `created_at` / `updated_at` | timestamptz | |

- **RLS**: `SELECT` owner-only (`user_id = auth.uid()`); `INSERT/UPDATE` denied to
  `authenticated` — only the server webhook (service role) writes, so a user cannot self-grant.
- **State transitions**: `initiated → paid` (webhook, sets `grants_pro_until`, extends
  `users.pro_until`) → optionally `refunded`; `initiated → failed`. The `paid` transition is
  idempotent on `provider_charge_id`.
- **Validation**: `amount_sar > 0`; `grants_pro_until` set only when `status = 'paid'`.
