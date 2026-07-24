# Contract — Tap Checkout & Webhook (US4, FOUNDER-GATED)

> **DO NOT IMPLEMENT** until the founder greenlights the monetization phase (Constitution:
> Tap is a deferred dependency; no scope inflation without founder approval). Authored now so
> the slice is plan-ready the instant it unblocks. All copy/terms must be riba-free + PDPL
> (Principle VI).

## 1. Start checkout — `startUpgrade({ plan })` (server action, replaces the `coming_soon` stub)

**Input**: `{ plan: 'monthly' | 'annual' }` (Zod-validated, existing schema).

**Behavior**: authenticated user → create a Tap charge (amount from plan) → insert a
`payments` row `status='initiated'` with the returned `provider_charge_id` → return the Tap
redirect URL.

**Output**:
```ts
| { ok: true; status: 'redirect'; url: string }
| { ok: false; code: 'unauthorized' | 'error' }
```
(Replaces today's `status: 'coming_soon'` at `upgrade.ts`.)

## 2. Webhook — `POST /api/billing/tap/webhook`

**Auth**: verify Tap signature (server secret, never client-exposed). Reject unsigned.

**Idempotency**: key on `provider_charge_id`. If a `payments` row for that id is already
`paid`, return `200` and **do nothing** (no second `pro_until` extension).

**On `paid`**:
1. `UPDATE payments SET status='paid', grants_pro_until = <period end> WHERE provider_charge_id = $id AND status <> 'paid'` (guarded so a replay updates 0 rows).
2. If 1 row updated → `UPDATE users SET pro_until = GREATEST(coalesce(pro_until, now()), <period end>)` for the owner (extend, never shorten).
3. Service role only (RLS denies authenticated writes).

**On `failed` / `refunded`**: update `payments.status`; do not touch `users.pro_until` on
failure; on refund, optionally revoke (out of scope for MVP — record only).

**Responses**: `200` on handled (incl. idempotent replay), `400` bad signature/payload,
`404` unknown charge.

## 3. Invariants (test these when built)

- A duplicate/replayed `paid` webhook extends `pro_until` **exactly once** (idempotency).
- `pro_until` only ever moves forward (`GREATEST`).
- A user cannot write `payments` or `users.pro_until` directly (RLS + revoked column grant).
- Out-of-order arrival (webhook before redirect return) still converges to one correct grant.
- Copy/terms riba-free + PDPL (consent, data handling).
