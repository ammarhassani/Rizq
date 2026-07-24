# Quickstart — Validate Gap Remediation & Growth

Prerequisites: `pnpm install`; local Supabase + DeepSeek env as per `e2e/README.md`. Merge
gate throughout: `pnpm typecheck` clean and `pnpm test` green.

## US1 — Error states (P1)

1. Temporarily force the primary read to fail on each page (e.g. point the query at a bad
   table name, or revoke select in a scratch branch) for M7 `methodology`, M9 `calendar`,
   M12 `documents`, Projects `projects`.
2. **Expect**: each renders the `WidgetError` "Couldn't load — retry" state, **not** the
   empty-state CTA. Tapping retry with the read restored renders real data.
3. With a genuinely empty (but successful) result, the empty-state CTA still shows.
   Regression: `pnpm test` (new error-vs-empty unit + Playwright forced-failure spec).

## US2 — Enum localization (P1)

1. Dashboard in locale `en` with proposals across statuses.
2. **Expect**: every status shows a localized label ("Viewed", "Declined"…), never a raw
   enum. In `ar`, Arabic labels unchanged. Regression: unit asserting no raw enum for `en`.

## US3 — Monetization enforcement (P2)

1. Set a test user's `users.pro_until` to a past timestamp (keep `role='pro'`).
2. **Expect**: `getMyTier()` returns `isPro: false`; a Pro-gated action applies the free limit.
3. Exhaust the tone-AI quota → next call refused with the standard upgrade response.
4. Run 5 pricing lookups as free → the 6th is refused (not the 4th).
   Regression: units for `isPro` expiry, tone quota, and the `FREE_MONTHLY_QUERIES = 5` guard.

## US5 — M4 AI-trend + M8 FL verification (P3)

1. Run a pricing lookup with sufficient data → an AI-trend line appears **labeled**
   (`تحليل رِزق —` / `Rizq Insight —`). Simulate DeepSeek timeout → the price still renders,
   trend line omitted (never blocked).
2. Onboarding: upload a valid FL document → `fl_verified` set, completeness reflects it;
   step-6 platform URLs and step-5 rate-reasonability insight are present.

## US4 — Tap payments (P3, FOUNDER-GATED — validate only when greenlit)

See [contracts/payments-tap.md](./contracts/payments-tap.md). Sandbox payment advances
`pro_until`; a replayed webhook does not double-grant; direct client write to `payments` /
`users.pro_until` is denied by RLS.
