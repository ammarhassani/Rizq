# Rizq — Business-Logic Conformance Audit

_Static spec-vs-code audit. Generated from a completed multi-agent review._

## Overview

This is a **static, spec-vs-code audit** of the Rizq codebase measured against
`docs/spec-v2-flrp.md` (the master FLRP spec) and `.specify/memory/constitution.md`
(the engineering charter). No code was executed; every finding is grounded in a
`file:line` evidence reference and a concrete failure scenario. The audit ran in three
phases: (a) **per-module conformance** agents (one per module M0–M12 plus Auth, the
Projects stack, and Monetization), each returning a verdict + findings; (b) **cross-cutting
lens** agents (money-math, honesty/provenance, security/RLS, i18n/RTL); and (c) a **Verify
phase** that took every blocker/high finding and gave it an adversarial verdict
(`real`, `confidence`, `correctedSeverity`, `reasoning`). The headline result: **no
blocker survived verification** (the one blocker candidate — the `admin_grant_pro` paywall
bypass — was refuted with three independent barriers), **8 severe findings were verified
real** (4 stayed high, 4 downgraded to medium), and the security posture is fundamentally
sound. Almost every module is `partial`: the core happy path conforms and is unit-tested,
but each drops one or more spec sub-requirements — most commonly swallowing a DB error into
a false "you have nothing" empty state, and dropping provenance from a displayed price.

---

## 1. Per-module verdict table

Finding counts are `blocker / high / med / low` (informational items noted separately).
Severities are the **as-reported** module-agent severities; the Verify phase re-graded the
high findings (see §2).

| Module | Verdict | Findings (b/h/m/l) | One-line summary |
|---|---|---|---|
| M0 Dashboard | partial | 0/2/1/1 (+1 info) | All 7 widgets + AI hero shipped; Quick Pricing price is uncited and 5 server widgets turn DB errors into false empty states. |
| M1 Proposal Studio | partial | 0/1/1/1 | Pricing math + AI stack conform and are tested; an undocumented deliverable-count "complexity" lever inflates the whole market band above what the citation vouches for. |
| M2 Client Book | partial | 0/1/1/3 (+1 info) | Data model, rollup trigger, and AI features conform; WhatsApp deep link is malformed for local-format numbers, duplicate-phone warning absent. |
| M3 Income Ledger | **conforms** | 0/0/0/3 (+1 info) | Data model, triggers, views, AI thresholds, and honesty prefixes all match; only low-severity polish/staleness nuances remain. |
| M4 Pricing Lookup | partial | 0/0/4/1 | Provenance-weighted resolver conforms and is tested; the entire AI-trend layer is unbuilt, fallback ordering diverges, reasoned-prior-only cells return insufficient_data. |
| M5 HADAF | partial | 0/1/3/2 | Config-driven engine tested and correct; qualifying streak of 1–2 months mis-renders as "not qualifying," and the M0/M9 integrations are absent. |
| M6 Simple Invoicing | partial | 0/0/1/2 | Numbering, VAT/total triggers, share RPCs, and AI features conform and are tested; overdue summary only counts the current calendar month. |
| M7 Methodology Hub | partial | 0/0/1/1 | Content DB-driven, RLS correct, honest FAQ refusal verbatim; the credibility page silently swallows a DB read error, and the M1 deep-link is bare. |
| M8 Onboarding | partial | 0/0/4/2 | Solid resumable wizard; drops Step-6 platform URLs, the Step-5 rate-reasonability insight, FL-document verification (`fl_verified`), and a spec-matching completeness formula. |
| M9 Calendar | partial | 0/0/1/3 | View + preferences + UI conform and date logic is tested; events query swallows errors, "AI" insight is a rule card, `client_followup`/`client` key mismatch. |
| M10 Rate Calculator | partial | 0/1/1/1 (+1 info) | Reverse-pricing math conforms and is tested; the headline `is_realistic` reality-check flag can never be false, and market figures drop provenance. |
| M12 Document Vault | partial | 0/0/3/3 | Schema, owner RLS, private bucket, token RPC, quota trigger, and AI all conform; expiry badge hardcoded Arabic, list error=empty, AI provenance not persisted. |
| Auth (Part II) | partial | 0/0/2/1 | Server-first, Zod-validated, PII-safe, tested; in-memory rate limiter is ineffective on serverless, and two unvalidated redirect sinks allow open redirect. |
| Projects (002/003/004/005) | partial | 0/1/0/1 | Lifecycle derived, secrets server-only, nav URL-borne; proposal→project path has no idempotency guard → duplicate project + duplicate money gig. |
| Monetization / Tiers | partial | 0/1/2/2 | Most tier quotas match §IV.1; pricing-lookup limit enforced at 3 while spec+UI promise 5, tone-AI quota unenforced, `pro_until` expiry never enforced. |
| Money-math (lens) | conforms | 0/0/0/0 | Returned no findings (agent summary was a stub — "Test."); treat as non-substantive, not as positive assurance. |
| Honesty / Provenance (lens) | conforms | 0/0/0/1 (+1 info) | Honesty layer consistently implemented across every price + AI surface; only per-line-prefix nuance and defensive citation guards. |
| Security / RLS (lens) | conforms | 0/0/0/2 (+4 info) | No blocker/high survived: paywall-bypass refuted, secrets deny-all + ciphertext RPCs, share tokens 144-bit; residuals are inert `fx_rates` + leaked-password toggle. |
| i18n / RTL (lens) | partial | 0/0/2/3 | Catalog has perfect key parity and native Arabic; but 735 inline ternaries bypass next-intl, and one widget leaks raw DB enums to English users. |

---

## 2. Verified severe findings

Every blocker/high finding was put through the adversarial Verify phase. **All 8 were
judged `real: true` (high confidence).** Four kept `high`; four were downgraded to
`medium`. None were refuted. Listed by corrected severity.

### HIGH (confirmed)

**[HIGH] M1 Proposal Studio — deliverable-count "complexity" lever scales the entire market band, fabricating figures above what the provenance citation vouches for.**
- **Spec clause:** M1.7 step 1 — within-band modifiers "move the anchor, never fabricate a band"; Constitution Principle I (no invented figures beyond what the data supports); M1.5 §4 cites min-max band + provenance.
- **Evidence:** `src/lib/pricing/proposalPricing.ts:53-56` (complexityMod) and `:90-91` (`min = round10(market.min * m.complexity); max = round10(market.max * m.complexity)`); citation built from sample_size only at `src/lib/pricing/citation.ts:31-32`. Scaled `priceMin/priceMax` rendered beside the unmodified citation at `src/app/actions/proposals/generateProposal.ts:380-383` (stored `:419-421`).
- **Failure scenario:** Band {min 670, anchor 1000, max 1340} with citation "based on 8 records through 2026"; a 5-deliverable brief → complexity 1.4 → band rendered {940, ~1340, 1880}. The artifact prints 1880 SAR beside a citation asserting 8 records support it, though no record reaches 1880.
- **Verify verdict:** `real: true`, high confidence, `correctedSeverity: high`. "Complexity is the only factor that pushes the band boundaries (urgency/client/IP are clamp()'d into [min,max]). The citation is band-blind. Refutations fail: scope is already handled by size-specific benchmark routing, so complexity double-counts scope AND fabricates edges. Kept high for an honesty-first product; magnitude capped at 1.6× keeps it below blocker."

**[HIGH] M0 Dashboard — Quick Pricing widget displays a market-median price with zero provenance, sample size, or date range, discarding citation data the resolver already returns.**
- **Spec clause:** Constitution Principle I (Honesty, NON-NEGOTIABLE): "Price/market data declares its dominant provenance, sample size, and date range"; M0.5 M4→M0 integration.
- **Evidence:** `src/app/[locale]/dashboard/page.tsx:202-206` keeps only `res.anchor` from a `ResolveResult` that also carries `dominant_provenance`, `sample_size`, `date_range`, `provenance_citation_ar/en` (`src/lib/pricing/resolve.ts:26-35`); passed to widget at `:279-283`. `QuickPricingWidget.tsx:30-37` renders only "Market median: {specialty}".
- **Failure scenario:** A user sees "Market median: Graphic Design — 3,000 SAR" with no indication it came from e.g. 4 reasoned records over a date range — the single most credibility-sensitive number in the app, uncited.
- **Verify verdict:** `real: true`, high confidence, `correctedSeverity: high`. "Citation data is available and dropped one line away. The two links to /tool are a deferral, not the inline declaration Principle I requires; the 'Market median' label is itself an unqualified data claim. Constitution marks this NON-NEGOTIABLE. Teaser-links keep it below blocker but it is a live Principle-I violation."

**[HIGH] M10 Rate Calculator — the `is_realistic` reality-check flag can never be false, so unrealistic targets are always reported as achievable.**
- **Spec clause:** M10.2 line 2202 (`is_realistic: marketPercentile <= 90` — "flag if target requires top 10% rates"); M10 purpose line 2156 ("serves as a reality check").
- **Evidence:** `src/lib/rate/calculate.ts:108-110` sets pct=90 for any value > max; `estimatePercentile` returns `Math.min(99, Math.max(1, ...))` at `:112` but no branch exceeds 90; `is_realistic = market_percentile <= 90` (`:233-234`) is therefore always true. `>90` branches at `:131`, `:150`, `:157`, `:176` are dead code. Test file documents the dead branch at `calculate.test.ts:203-213`.
- **Failure scenario:** monthly_target 50,000 / 1 project (per_project 50,000) against a band max 10,000 → market_percentile 90 → `is_realistic: true`, green "realistic" banner + "top 25% of the market" context. A 5×-above-market target is called achievable.
- **Verify verdict:** `real: true`, high confidence, `correctedSeverity: high`. "All branches verified; percentile can never exceed 90, so the named core purpose of the module is silently nullified and it emits actively misleading 'realistic'/'top-25%' guidance. Advisory (no data/money corruption) borders medium, but complete defeat of the feature keeps it high."

**[HIGH] Projects — the "Create project from this proposal" path has no idempotency guard, creating a duplicate project AND a duplicate money gig on re-entry (double-counts income).**
- **Spec clause:** 003 FR-007 & SC-003 (re-entering a completed stage MUST NOT create a duplicate project); 003 US2 acceptance #4; 005 FR-014 (prevent anchoring a proposal already anchored); 002 SC-002 (income/client totals identical before and after).
- **Evidence:** `src/components/proposals/ProposalDetailActions.tsx:195` gates the CTA purely on status and never receives whether a project already exists; `src/app/actions/projects/createProjectFromProposal.ts:68` inserts unconditionally; `src/app/actions/gigs/createGigFromProposal.ts:98` inserts unconditionally; `migration 20260626120000_create_projects.sql:37` indexes `origin_proposal_id` with NO unique constraint; `proposals.project_id` (`20260626120100:19`) also non-unique.
- **Failure scenario:** Accept proposal → tap "Create project" → P1 + gig G1. Tap browser back (status still accepted) → tap again → P2 + G2 for the same proposal. Income Ledger double-counts, client rollup double-counts, proposal anchored to two projects.
- **Verify verdict:** `real: true`, high confidence, `correctedSeverity: high`. "All four evidence points verified. Adversarial check for a blocking unique on gigs.proposal_id refuted the escape hatch — the only unique(proposal_id, version) is on the unrelated proposal_versions table, so the second gig insert succeeds. Money-data-integrity defect on a visible, easily-retriggered path; not a blocker because it needs a deliberate re-tap and yields user-visible duplicates rather than silent corruption."

### MEDIUM (confirmed — downgraded from high by Verify)

**[MEDIUM] M0 Dashboard — five server-fetched widgets convert DB query failures into empty arrays, rendering a false "you have nothing" empty state instead of the spec-required widget-level error+retry.**
- **Spec clause:** M0.3 UX ("If the proposals query fails, that widget shows 'Couldn't load proposals — tap to retry'"); Constitution Principle V (error states) + Principle I (no false claims).
- **Evidence:** `src/app/[locale]/dashboard/page.tsx:100-101` (proposals → `data ?? []`), `:106-108` (invoices try/catch → []), `:119-127` (clients → []), `:142-177` (income catch → zero). Widgets branch on `length===0` to show empty CTA (`RecentProposalsWidget.tsx:57-69`). Only InsightsWidget (client island) has a real error+retry.
- **Failure scenario:** Proposals query fails transiently for a user with 12 proposals → "No proposals yet. Create your first proposal →", with no retry.
- **Verify verdict:** `real: true`, high confidence, `correctedSeverity: medium`. "An error.tsx boundary cannot help because the catches suppress the errors before they bubble; the inline 'widget shows error state' comments are aspirational. Real spec+constitution violation across all five widgets, but only manifests on transient DB errors, self-heals on refresh, no data/money/security impact."

**[MEDIUM] M2 Client Book — the client WhatsApp button builds an invalid `wa.me` URL from a raw local Saudi number, so "tap to open chat" fails for local-format entries.**
- **Spec clause:** M2.3 Contact section ("WhatsApp (tap to open chat) … using native … wa.me links") / M2.5 WhatsApp integration.
- **Evidence:** `src/components/clients/ClientContactLinks.tsx:23-27` builds `https://wa.me/${phone.replace(/\D/g,"")}` with no country-code normalization; `ClientForm.tsx:64-65,217-222` captures free-text with no prefix enforcement; `clients.ts:81,93-94` stores verbatim. Contrast onboarding `StepBrand.tsx:91` which stores E.164 `+966…`.
- **Failure scenario:** Client saved as "0512345678" → link becomes `https://wa.me/0512345678` → WhatsApp rejects it (valid target is 966512345678).
- **Verify verdict:** `real: true`, high confidence, `correctedSeverity: medium`. "Confirmed reproducible and silent. Caveat: the field placeholder is '+966 5X XXX XXXX', which after replace(/\D/g) yields a VALID target — so clients entered per the guided placeholder work; only bare 05… habit breaks. Impact is conditional on data-entry habit, not universal ('every client' is inaccurate). Missing-normalization robustness gap, not data loss; medium."

**[MEDIUM] M5 HADAF — a qualifying streak of 1 or 2 months renders in the "not-qualifying" branch: an X icon, no estimated-subsidy line, and a "generate plan" button that errors.**
- **Spec clause:** M5.3 state 1 "Qualifying streak (1–3 months)" (lines 1344-1348) requires the "الدعم المتوقع: [X] ر.س شهرياً" line for streaks of 1, 2 AND 3; M5.6 (line 1413) restricts the action-plan card to `current_month_status = 'not_qualifying'`.
- **Evidence:** `src/app/[locale]/hadaf/page.tsx:122` branches to the qualifying UI only when `current_streak >= consecutive_months_required` (≥3); estimated_subsidy block lives inside that branch (`:158-173`). Streaks 1–2 fall to the else branch (`:175-260`) which uses XCircle (`:179`) and always renders `<HadafActionPlanClient>` (`:253-258`). `estimated_subsidy` is non-null for streak>0 (`calculate.ts:158-169`) but never displayed. Clicking the plan button hits `generateHadafActionPlanAction` → returns `not_applicable` because cache status !== 'not_qualifying' (`actionPlan.ts:51-53`).
- **Failure scenario:** Log 900 SAR month 1, 0 prior → streak 1, status 'qualifying'. Page shows an X "on track: month 1 of 3" with no subsidy figure plus a button that errors on a month the user is actually on track.
- **Verify verdict:** `real: true`, high confidence, `correctedSeverity: medium`. "All evidence verified; fires for every qualifying user in months 1–2. Spec-compliance/UX-correctness defect (misleading icon, missing figure, one dead button that fails gracefully) rather than data-loss/money/security. Fix is a one-condition change: branch on current_month_status, not streak >= required."

**[MEDIUM] Monetization — pricing-lookup free tier is enforced at 3 lookups/month while §IV.1 and the upgrade page both advertise 5/month.**
- **Spec clause:** §IV.1 line 2362 ("Pricing Lookup (M4) | 5 lookups/month"); Constitution Principle I (never overstate what the product supports).
- **Evidence:** `src/lib/pricing/quota.ts:26` (`FREE_MONTHLY_QUERIES = 3`, used at `:70`) and DB trigger `supabase/migrations/20260514105416_enforce_query_quota_at_db_level.sql:48/56` (`v_limit := 3 + bonus`) both enforce 3, while `messages/en.json:1697` / `messages/ar.json:1697` advertise "5 / month" rendered via `UpgradePlans.tsx:50`. Code cites the retired "PRD §4.4".
- **Failure scenario:** A free user runs 3 lookups; the 4th raises errcode 53400 and `calculate.ts:62` returns quota_exhausted with cta 'upgrade' — even though the page just promised 5.
- **Verify verdict:** `real: true`, high confidence, `correctedSeverity: medium`. "Confirmed in two enforcement sites vs advertised copy + spec. Genuine honesty/transparency violation, but impact limited to a 2-lookup copy-vs-enforcement mismatch — no data-loss, money-math, or security consequence."

### Refuted / not-confirmed

**[REFUTED — was BLOCKER candidate] `admin_grant_pro` anon-executable paywall bypass / privilege escalation.**
The pre-identified blocker was **refuted by the security/RLS lens agent** (marked info,
"REFUTED"). It is defense-in-depth gated three independent times: (1) the function body
selects the caller's role via `auth.uid()` and raises `forbidden` (42501) for non-admins —
`supabase/migrations/20260614005714_admin_grant_pro_rpc.sql:13-16`; (2) the server action
independently returns `forbidden` unless `ctx.role==='admin'` — `src/app/actions/billing/upgrade.ts:137`;
(3) `role`/`pro_until` are excluded from the authenticated column-UPDATE grant —
`20260513113211_create_users_table.sql:73-75` + `20260624090000_grant_users_profile_update.sql:19-48`.
The advisor lints (0028/0029) flag only that anon/authenticated hold EXECUTE on the
SECURITY DEFINER function; they do not inspect the body guard. A non-admin POST to
`/rest/v1/rpc/admin_grant_pro` raises `forbidden` before any UPDATE. **No self-grant path.**

---

## 3. Cross-cutting lenses

These four lenses are the highest-signal read on the codebase's non-negotiables.

### Money-math — conforms (no substantive output)
The money-math lens agent returned `verdict: conforms` with **zero findings and a stub
summary ("Test.")**. Treat this as **non-substantive** — it is not positive assurance that
money math is fully audited. (The per-module agents did test the substantive money paths:
M1 pricing modifiers, M6 VAT/total triggers, M10 reverse-pricing, and M5 HADAF thresholds
are all reported unit-tested per Principle IV.)

### Honesty / Provenance — conforms
The honesty layer (Constitution Principle I) is consistently implemented. Every price
surface cites provenance + sample size + date range via `buildCitation`/`PROVENANCE_LABEL`
(ResultCard, ProposalArtifact, OnboardingPricePreview, income forecast, rate calc), and
every AI surface is labeled with the reserved "تحليل رِزق —" / "Rizq Insight —" prefix or a
labeled card header/footer. No fabricated sample sizes. Only two minor findings:
- **[LOW]** Dashboard business-insight lines are not per-line prefixed; AI status is only on
  the card header + footer. `src/components/dashboard/InsightsWidget.tsx:343` (each insight
  with no prefix), header `:298`, footer `:394-400`; contrast `clientInsights.ts:43-44`,
  `incomeForecast.ts:72-73`, `scopeCompare.ts:39-40` which do prefix in-lib. A screenshot of
  a single line loses AI attribution.
- **[INFO]** Provenance citations render behind truthy guards (`citation && …`) at
  `ResultCard.tsx:195`, `ProposalArtifact.tsx:618`, `OnboardingPricePreview.tsx:74`. Today
  `buildCitation` (`citation.ts:31-33`) always returns non-empty, so the guards are always
  true — but a future resolver returning an ok price with a blank citation would silently
  show unattributed numbers.

> Note the honesty theme recurs as a *high* finding in two modules (§2): M0 Quick Pricing
> and M1 complexity-band scaling both display numbers the citation does not support. The
> lens certifies the honesty *infrastructure*; those two modules bypass it at the render/
> compute site.

### Security / RLS — conforms (no blocker/high survived)
The strongest section of the audit. Beyond the refuted `admin_grant_pro` blocker (§2):
- **[LOW] CONFIRMED — `public.fx_rates` has an INSERT policy `WITH CHECK (true)`** for
  authenticated; any signed-in user can insert arbitrary FX rows.
  `supabase/migrations/20260629120000_multi_currency.sql:40-42`; live advisor lint
  `rls_policy_always_true` confirms it. **Inert today** — feature 007 (multi-currency) was
  dropped and nothing reads `fx_rates`. If multi-currency were ever re-activated, a user
  could poison cited conversion figures. Fix: drop the table (CLAUDE.md already plans this)
  or restrict INSERT to a service/admin path.
- **[LOW] CONFIRMED — Auth leaked-password protection (HaveIBeenPwned) is disabled.**
  Live advisor lint `auth_leaked_password_protection = WARN` on project rizq
  (qjtisvfjhqizvtqrixut). Not code — a one-toggle dashboard setting (Auth > Policies). Users
  can register/reset with a known-breached password (credential-stuffing risk).
- **[INFO] SAFE — `provider_connections` secrets never reach the client.** RLS enabled with
  no policy (deny-all) at `20260626160000_provider_connections.sql:38-40`; secrets exposed
  only via `auth.uid()`-scoped SECURITY DEFINER RPCs returning ciphertext bytea (`:78-84`);
  decrypt key is server-env only (`githubRepos.ts:39-49`, `github/callback/route.ts:56-63`).
- **[INFO] SAFE — anon share/log RPCs are token-scoped and leak no private columns.**
  `get_shared_proposal` returns only publish-intended fields for non-draft `public_share=true`
  rows (`20260613190242:23-28,38-39`); `log_proposal_view`/`log_invoice_view` no-op on
  invalid/private/draft tokens; share tokens are 144-bit from `crypto.getRandomValues`
  (`shareActions.ts:66-72`), unique-indexed — enumeration infeasible.
- **[INFO] CONFIRMED — spot-checked server actions enforce owner scoping.** `markInvoiceStatus`
  (`:109-121,147-151`), `getProject` (`:35-97`), `editProposal` (`:65-75,247-257`) all filter
  by `user_id`; admin actions verify `role='admin'`. Caveat: ~5 of ~75 action files sampled;
  none in the sample omitted the predicate.

### i18n / RTL — partial
Catalog is in excellent shape: `messages/en.json` and `messages/ar.json` have **perfect key
parity (1913 keys each)**, array parity, native high-quality Arabic (no MT filler), and RTL
is correctly wired at the root (`src/app/[locale]/layout.tsx`). But the catalog governs only
part of the UI:
- **[MEDIUM]** 735 user-facing strings across 144 files are hardcoded inline `isAr ? ar : en`
  ternaries bypassing next-intl (e.g. `MonthlyIncomeWidget.tsx:55`,
  `RecentProposalsWidget.tsx:49-67`, `UpcomingDeadlinesWidget.tsx:38-56`, plus clients/income/
  invoices/projects/shell). The parity audit certifies only a fraction of the app's strings;
  the two approaches drift.
- **[MEDIUM]** `RecentProposalsWidget` renders **raw DB enum status values to English users**
  — `src/components/dashboard/RecentProposalsWidget.tsx:28` defines `statusLabelsAr` only, and
  `:93` renders `isAr ? (statusLabelsAr[p.status] ?? p.status) : p.status`. English users see
  "draft, final, sent, viewed, accepted, declined, expired". Proper labels exist unused at
  `Proposals.list.status.*` in en.json.
- **[LOW]** Bilingual leaks: `messages/en.json:992` `Edit / تعديل` (should be "Edit");
  `messages/ar.json:862` `ابدأ من قالب / Start from a template` (should be Arabic only).
- **[LOW]** `src/app/global-error.tsx:21` is hardcoded Arabic-only (`lang="ar" dir="rtl"`,
  text at `:46/49/52`) — mitigated: intentionally i18n-free since it renders when the i18n
  subsystem itself may have failed, and Arabic-first is the product default.

---

## Appendix — recurring cross-module gaps

Two patterns appear in ≥3 modules and are worth a single systemic fix each:

1. **Swallowed DB error → false empty state** (Constitution V + Principle I). Present in M0
   (`dashboard/page.tsx:100-177`), M7 (`methodology/page.tsx:115-123`), M9
   (`calendar/page.tsx:116-125`), M12 (`documents/page.tsx:54-60`), and Projects
   (`projects/page.tsx:51-68`). Each destructures only `{ data }`, ignores `error`, and
   renders the "you have nothing" empty state on failure.

2. **Displayed price/market figure drops provenance** (Principle I). M0 Quick Pricing (high),
   M10 rate calc market band (`computeRate.ts:63-68`), and the M4 public shared-result page
   (`r/[id]/page.tsx:188-195`) all cite sample-size-only or nothing, though `resolvePrice`
   returns full citation data.
