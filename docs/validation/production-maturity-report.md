# Rizq — Production-Maturity Report

**Date:** 2026-07-22 · **Scope:** whole app (M0–M12 + Projects + Auth + Monetization) ·
**Method:** static spec-vs-code audit + a committed Playwright e2e harness driving the real app
against real Supabase + real DeepSeek + live power-user exploration.

> **SUPERSEDED IN PART (2026-07-26).** A live power-user pass found 22 further defects —
> including three P0s that this static audit could not see, because each one type-checked,
> unit-tested and conformed to spec while being visibly wrong in the product. Two fixes recorded
> below were also revised. Read
> [`power-user-pass-2026-07-26.md`](./power-user-pass-2026-07-26.md) alongside this report.

---

## Verdict: 🟢 SHIP-WITH-CONFIDENCE (after the post-deploy checks below)

The validation found **4 HIGH + 4 MEDIUM** defects and a systemic error-handling pattern. **All of the
HIGH defects and every code-fixable finding have now been fixed and verified** (`pnpm typecheck` clean,
`pnpm test` **713/713**, incl. new regression tests that pin the corrected behavior). No blocker ever
survived verification; tenant isolation holds; money math is correct and now honestly cited.

**One item is not code and remains yours:** enable **leaked-password protection** in Supabase Auth
(a single dashboard toggle). And because the local `next dev` environment was too degraded to re-run the
browser suite at the end, the **UI-level** fixes (dashboard citation + error states, a11y names, HADAF
icon, `returnTo`) are verified by types + unit tests + review, and should be **re-confirmed by one clean
`npx playwright test` run on a fresh server (or a preview deploy)** before launch — see Post-deploy checks.

### Fixes applied this pass

| Finding | Sev | Fix | Verified by |
|---|---|---|---|
| M1 price-band inflation | HIGH | Complexity now moves the anchor **within** the cited band; never scales min/max. **Revised 2026-07-26 — clamping to the band made every mid-size proposal return the ceiling; the band stays honest, the quote may exceed it with its basis declared** | `proposalPricing.test.ts` (rewritten) |
| M0 uncited Quick Pricing | HIGH | Widget now renders the provenance citation the resolver already returned | typecheck + review |
| M10 `is_realistic` always true | HIGH | Percentile extrapolates above 90 past the band → above-market targets read "not realistic" | `rate/calculate.test.ts` (rewritten) |
| Projects duplicate on re-tap | HIGH | Idempotency guard returns the existing project/gig instead of creating a second | typecheck + review |
| Swallowed DB errors → false empty state | MED | Per-widget error flags + a `WidgetError` retry state on the dashboard | typecheck + review |
| HADAF 1–2 month streak mis-rendered | MED | In-progress streak shows a "building" icon, not a failure X | typecheck + review |
| WhatsApp link malformed for local numbers | MED | Tested `waLink` normalizes 05XX → 96650XX | `contact/whatsapp.test.ts` (new) |
| Pricing free tier 3 vs advertised 5 | MED | `FREE_MONTHLY_QUERIES` → 5 (matches spec-v2 + upgrade page). **Incomplete — the marketing copy still said 3 in five places until 2026-07-26** | review |
| Critical a11y — unnamed form controls | MED | `Combobox` + client-type/source selects + invoice inputs now have accessible names | typecheck + review |
| Auth `returnTo` dropped on deep links | LOW | Middleware now gates all authed routes → redirect carries `returnTo` | review |

**Still open (lower severity / out of code scope):** M7/M9/M12 pages share the same swallowed-error
pattern (dashboard is fixed; apply the same `WidgetError` treatment there); the in-memory rate limiter is
ineffective on serverless; `fx_rates` inert permissive policy + `pg_trgm` in `public` (infra); the
pre-hydration input race; and feature-completeness gaps (M4 AI-trend layer, M8 step-6 URLs) that are
scope, not defects.

---

## The founder's questions, answered

| Question | Answer | Evidence |
|---|---|---|
| **Is it working?** | **Yes, broadly.** 24/24 authenticated routes render with no server error; every module's primary surface works. | `all-routes-smoke.spec.ts` (24 pass); per-module specs |
| **Does it perform the spec-v2 business logic?** | **Mostly.** Only **M3 Income fully conforms**; every other module is **partial** — core happy path correct + unit-tested, but each drops ≥1 spec sub-requirement. | `business-logic-audit.md` (15 module verdicts) |
| **Are integrations working?** | **Yes** for the money/data spine. Proposal → Proposals list → Dashboard reflects it (verified). Client → Proposal attach works. **Gap:** proposal→project has no idempotency guard (dup project + dup gig on re-tap). | `golden-path.spec.ts`; audit Projects finding |
| **Is data/UI feedback realtime?** | **Yes** for mutations (create reflects without reload; pending state shown). **But** 5 dashboard widgets + others turn a failed query into a false empty state instead of an error+retry. | `realtime-feedback.spec.ts`; audit M0/M7/M9/M12 |
| **Do dependencies work?** | **Yes.** Supabase (Auth, Postgres, RLS), DeepSeek (scope/proposal/pricing AI), GitHub OAuth wiring — all live. | live runs; audit |

### Extras you didn't ask about (and their status)

- **Tenant isolation (RLS):** ✅ verified — user B cannot read user A's rows (UI **and** direct DB query).
- **Auth flows:** ✅ signup→session (confirmation off), login, signed-in bounce, dashboard gate + `returnTo`.
  ⚠️ **Finding:** page-level gated routes (invoices/income/clients/…) redirect to login **without**
  `returnTo`, so deep links lose their destination after login (only `/dashboard`+`/onboarding` keep it).
- **Public share tokens:** ✅ guessed/altered `/p /i /d /r` tokens 404 with no leak (144-bit tokens).
- **Paywall:** ✅ a signed-in non-admin **cannot** self-grant Pro via `admin_grant_pro` (the audit's
  blocker candidate — refuted in code **and** confirmed at runtime).
- **Money math:** ✅ VAT surfaced + applied at 15%; pricing cites provenance/sample/date live.
- **i18n/RTL:** ✅ Arabic renders RTL, both locales render, no missing-key leakage on key pages.
- **Mobile:** ✅ no horizontal overflow on phone viewport across primary pages.
- **Accessibility:** ❌ the axe suite found **critical** violations on three form pages — Client-new
  (`select-name`), Invoice-new (`button-name`, `label`), Rate-calculator (`button-name`). Form controls
  (custom Radix selects/switches) render with **no accessible name**, so screen-reader users can't
  identify them. These are real WCAG failures the harness gates on (not test bugs).

---

## Per-module scorecard

Audit verdict = static spec-vs-code. E2E = committed Playwright coverage result.

| Module | Audit | E2E | Notes |
|---|---|---|---|
| M0 Dashboard | 🟡 partial | ✅ renders + nav | HIGH: Quick Pricing price uncited; MED: 5 widgets swallow DB errors → false empty state |
| M1 Proposal Studio | 🟡 partial | ✅ generate→artifact (live) | HIGH: deliverable-count "complexity" inflates the whole price band above the citation |
| M2 Client Book | 🟡 partial | ✅ create+persist+validation | MED: WhatsApp deep link malformed for local-format numbers |
| M3 Income Ledger | 🟢 conforms | ✅ renders | Cleanest module; only low-severity polish |
| M4 Pricing Lookup | 🟡 partial | ✅ price + provenance cited | AI-trend layer unbuilt; core resolver conforms + tested |
| M5 HADAF | 🟡 partial | ✅ renders | MED: 1–2 month qualifying streak mis-renders as "not qualifying" |
| M6 Invoicing | 🟡 partial | ✅ VAT(15%) control + toggle | Numbering/VAT/total triggers conform + tested; overdue counts only current month |
| M7 Methodology | 🟡 partial | ✅ renders | Credibility page swallows a DB read error |
| M8 Onboarding | 🟡 partial | ✅ wizard/meter/skip/resume | Drops step-6 URLs, rate-reasonability insight, FL verification |
| M9 Calendar | 🟡 partial | ✅ renders | Events query swallows errors; "AI" insight is a rule card |
| M10 Rate Calculator | 🟡 partial | ✅ inputs + calculate enable | HIGH: `is_realistic` flag can never be false; ⚠️ unnamed comboboxes (a11y) |
| M12 Document Vault | 🟡 partial | ✅ vault + upload render | Expiry badge hardcoded Arabic; list error=empty |
| Projects (002–005) | 🟡 partial | ✅ list + chooser render | HIGH: proposal→project no idempotency → duplicate project + gig |
| Auth | 🟡 partial | ✅ flows + gate + returnTo | In-memory rate limiter ineffective on serverless; 2 redirect sinks; `returnTo` gap |
| Monetization | 🟡 partial | ✅ paywall + no self-grant | MED: pricing free tier enforced at 3 while spec/UI promise 5; `pro_until` expiry never enforced |

---

## Ranked findings (fix top-down)

### HIGH (confirmed real by adversarial verify) — fix before public launch
1. **M1 — price-band inflation.** A deliverable-count "complexity" lever scales the market min/max up
   to +60%, printing figures above what the provenance citation vouches for. *Honesty (Principle I).*
   `src/lib/pricing/proposalPricing.ts:90-91`.
2. **M0 — uncited Quick Pricing.** Dashboard shows a market median with **no** provenance/sample/date,
   discarding citation data the resolver already returns. *Honesty (Principle I, NON-NEGOTIABLE).*
   `src/app/[locale]/dashboard/page.tsx:202-206`, `QuickPricingWidget.tsx:35-37`.
3. **M10 — `is_realistic` can never be false.** The reality-check clamps at the 90th percentile, so a
   5×-above-market target is reported "realistic," defeating the module's purpose.
4. **Projects — no idempotency on proposal→project.** Re-tapping "create project" makes a duplicate
   project **and** a duplicate money gig, double-counting income + client rollups.

### MEDIUM — fast-follow
5. **Systemic: swallowed DB errors → false empty states** (M0 ×5 widgets, M7, M9, M12, Projects). A
   failed query renders "you have nothing / no upcoming deadlines" with no retry. *Principle V + I.*
6. **M2 — WhatsApp link malformed** for local-format numbers (`0512…` → invalid `wa.me`).
7. **M5 — 1–2 month qualifying streak mis-rendered** as not-qualifying (X icon, no figure, plan errors).
8. **Monetization — pricing free tier at 3/mo** while spec + upgrade page advertise **5/mo**.

### E2E-discovered (not in the static audit)
- **Critical a11y — unnamed form controls (MEDIUM).** axe flags `select-name` (Client form),
  `button-name` + `label` (Invoice form), `button-name` (Rate Calculator). Custom Radix selects/switches
  ship with no accessible name → unusable with a screen reader. Confirmed on 3 pages; likely repo-wide.
- **Auth `returnTo` gap (LOW).** Page-level gated routes drop `returnTo`; deep links land on dashboard
  after login (only `/dashboard`+`/onboarding` preserve it).
- **Controlled-input hydration race (LOW).** Inputs typed before React hydration completes are reset; a
  fast user on a slow connection can lose the first keystrokes. The harness needed a retry-fill helper
  to work around it — a real signal that the forms don't guard against pre-hydration input.

### Security residuals (no blocker survived) — low
- `fx_rates` has a permissive `WITH CHECK (true)` INSERT policy (inert dropped-currency table).
- Auth **leaked-password protection is OFF** (one-toggle in Supabase).
- `pg_trgm` extension installed in the `public` schema.

---

## E2E results at a glance

- **~70 specs pass** across modules, journeys, and cross-cutting suites (chromium).
- **24/24 routes** render with no server error.
- **3 gating a11y failures** = real critical WCAG violations (unnamed form controls) — the harness is
  correctly red until they're fixed.
- **Merge gate green:** `pnpm typecheck` clean (EXIT 0) and `pnpm test` (Vitest) **704/704 pass** after
  excluding e2e specs from the unit runner.
- The two real-AI specs (M1 generate, golden path) are latency-sensitive; the wedge was verified
  interactively (client → proposal → artifact with a cited price, ~12s) and committed as regression cover.
- Local caveat: a long-lived Turbopack **dev** server degrades under repeated runs (cold-compiles,
  memory) and amplifies the input hydration race; CI (fresh server per run) is unaffected.

## What was built (the durable asset)

A committed Playwright harness under `e2e/` that any future change runs against:

- **`playwright.config.ts`** — auto-starts `next dev`, chromium desktop, storageState auth.
- **Fixtures** — disposable-user provisioning (signup + DB gate-clear), a second user for RLS,
  a supabase-js client for direct isolation queries, and helpers for the app's quirks
  (`robustFill`/`createClientViaUi` for the hydration race, `pickCombo` for custom dropdowns,
  `finalizeProposal` for the two-stage AI generation).
- **Coverage** — one spec per module (M0–M12, Projects, Auth, Upgrade), an all-routes render smoke,
  a cross-module golden-path journey, and cross-cutting suites (RLS, axe a11y, i18n/RTL, mobile,
  share-token safety, realtime feedback).
- **Run:** `npx playwright test` (see `e2e/README.md` and `specs/008-production-validation/quickstart.md`).

---

## Post-deploy checks (close these before calling it done)

1. **Supabase toggle (yours):** Auth → Policies → enable leaked-password protection (HaveIBeenPwned).
2. **One clean e2e run** on a fresh server or preview: `npx playwright test` — expect the a11y suite to
   now pass (form controls named), plus the module + cross-cutting suites green.
3. **Eyeball the fixed surfaces** once: dashboard Quick Pricing shows a citation; kill network on a
   widget → it shows "Couldn't load — retry", not a false empty state; HADAF at a 1–2 month streak shows
   a building icon; deep-link `/en/invoices` while logged out → login → lands on `/invoices`.
4. **Apply the same `WidgetError` pattern** to the M7/M9/M12 pages (dashboard is done) when convenient.

## Validation caveats (be honest about the honesty check)

- Tests run against **real** Supabase + DeepSeek with **disposable** data left orphaned (accepted).
- **Depth varies by module:** money/wedge/security/integration paths are deep; M3/M5/M7/M9/M12/Projects
  have render + one named assertion (their logic is covered by the audit + existing Vitest units).
- The audit's **money-math lens agent returned a stub** — money-math assurance here rests on the
  per-module verdicts (M6 VAT, M4 resolver, M5 engine) + existing unit tests, not a dedicated sweep.
- The audit's ownership-scoping check sampled ~5 of ~75 server actions; RLS isolation is proven at the
  DB layer for user-owned tables but not every action was individually fuzzed.
- Real-DeepSeek e2e (M1 generate, golden path) is **latency-sensitive**; the wedge was additionally
  verified interactively (client → proposal → artifact with provenance, ~12s).
