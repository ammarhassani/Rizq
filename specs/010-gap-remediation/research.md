# Phase 0 Research — Gap Remediation & Growth

No open `NEEDS CLARIFICATION` remained after the spec; the gaps are already grounded in the
008 validation artifacts. Research here records the resolved decisions per slice.

## US1 — Error states

- **Decision**: Reuse `src/components/dashboard/WidgetError.tsx` verbatim; change each page's
  data fetch to destructure `{ data, error }` and branch to `WidgetError` on `error`, keeping
  the empty-state CTA only for a genuine zero-row success.
- **Rationale**: The component + pattern shipped in 008 for the dashboard and is
  mobile-verified. Cheapest correct fix; no new component (YAGNI).
- **Alternatives rejected**: An `error.tsx` route boundary — rejected because the pages
  *catch/swallow* the error before it bubbles, so a boundary never fires (audit §2 confirms).

## US2 — Enum localization

- **Decision**: Render proposal status through the existing `Proposals.list.status.*` catalog
  keys for both locales; keep a humanize() fallback for unknown enums.
- **Rationale**: Labels already exist unused; wiring them is a few lines and removes a
  Principle-II leak on a primary surface. The 735-ternary sweep is a separate incremental
  follow-up, not gated on this.
- **Alternatives rejected**: A DB-side enum label table — overkill; catalog already holds it.

## US3 — Monetization enforcement

- **Decision**: Add the `pro_until` expiry check inside the single `isPro` helper
  (`upgrade.ts:43`) — `isPro = role === 'admin' || (role === 'pro' && pro_until != null &&
  new Date(pro_until) > now)`; treat `<= now` as free. Wire the tone-AI quota through the same
  quota mechanism as pricing lookups. Regression-test that pricing free tier = 5.
- **Rationale**: One shared point means every caller inherits expiry (root-cause fix, not a
  per-caller patch). Matches the assumption verified in code.
- **Alternatives rejected**: A scheduled job to downgrade lapsed users — adds infra for what a
  read-time check does for free; the check is authoritative and self-healing.
- **Open**: Confirm `admin` is never subject to `pro_until` (it isn't — admins are unlimited);
  the branch above preserves that.

## US4 — Tap payments (FOUNDER-GATED)

- **Decision**: Do **not** implement until greenlit. Author the checkout + webhook contract
  now (`contracts/payments-tap.md`) with an idempotency key on the Tap charge id so a replayed
  webhook cannot double-extend `pro_until`.
- **Rationale**: Constitution declares Tap deferred; "no scope inflation without founder
  approval." Contract-first keeps it plan-ready with zero premature dependency install.
- **Alternatives rejected**: Building against Tap sandbox now — violates the founder gate and
  installs an external dep the charter defers.

## US5 — M4 AI-trend + M8 FL verification

- **Decision**: M4 — a non-blocking DeepSeek call producing a labeled (`تحليل رِزق —` /
  `Rizq Insight —`) trend annotation appended to the already-rendered resolver result; on
  timeout/unavailable the result renders without the line. M8 — FL-document upload sets
  `fl_verified` (column exists), restore step-6 URLs + step-5 rate-reasonability insight.
- **Rationale**: Principle VII (AI only where it beats static logic, labeled, graceful) and
  Principle I (labeled). `fl_verified` already exists (no migration).
- **Alternatives rejected**: Blocking the price on the AI call — rejected; never block a cited
  number on a slow model (edge case in spec).
