# Implementation Plan: Power-User Pass 3 Remediation

**Branch**: `main` (small independent slices; no long-lived branch) | **Date**: 2026-07-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-power-user-pass-3/spec.md`

## Summary

Eighteen defects found by driving the product in Arabic as a freelancer. Every one is a
localised change to existing code — no new module, no migration, no dependency. The work
splits into eight independent slices matching the spec's user stories, ordered so the two
legal/credibility failures (NaN in Arabic, VAT without registration) and the three
client-facing leaks land first.

Technical approach in one line per slice:

1. **Counts in Arabic** — stop pre-formatting numbers before handing them to ICU plural
   arguments; the repo already documents this exact trap at
   [income/page.tsx:185](../../src/app/[locale]/income/page.tsx#L185), so the fix is to apply
   the same rule at the three remaining sites and reword the sentence to name records rather
   than freelancers.
2. **VAT eligibility** — gate the invoice VAT control on `users.vat_registered` **and**
   `users.vat_number`, and render the VAT number in the invoice artifact whenever a VAT line
   exists.
3. **Client-facing redaction** — extend the existing `forClientAudience()` seam in
   [artifact.ts:345](../../src/lib/proposals/artifact.ts#L345) to strip the band, sample size
   and methodology link; stop `contact.email` falling back to the auth email in
   [brand.ts:182](../../src/lib/proposals/brand.ts#L182); drop the Rizq tagline default in
   both artifact builders.
4. **Actionable errors** — widen the server-action result to carry a field key and a reason,
   and render it on the offending field in the onboarding platforms step and the client form.
5. **Onboarding honesty** — make the rate verdict say which figure it judged and prompt when
   it cannot judge; resume on the next unfinished step; stop pre-selecting and
   auto-persisting unchosen values.
6. **Profile prefill + live quota** — seed the pricing tool from the profile snapshot and
   return the post-lookup allowance from the action so the badge updates without a reload.
7. **Artifact fidelity** — pass `clientName` into the cover-letter section; add a nullable
   duration to scope extraction and surface it in the timeline.
8. **Money and numerals** — constrain money inputs to two decimals, unify numerals inside a
   view, and render the not-found page in the app shell.

## Technical Context

**Language/Version**: TypeScript 5 / React 19 / Next.js 16 App Router (Turbopack)

**Primary Dependencies**: `next-intl` (ICU messages, Arabic primary), Supabase JS + SSR,
Vercel AI SDK with DeepSeek, Tailwind v4 + shadcn/ui, Framer Motion, Zod

**Storage**: Supabase Postgres. **No migration** — `vat_registered`, `vat_number`,
`contact_email`, `tagline_ar`, `onboarding_step`, `income_goal_monthly_sar` and
`rate_confidence` all already exist on `public.users`.

**Testing**: Vitest (`pnpm test`, node environment, `src/**/*.{test,spec}.{ts,tsx}`) plus the
committed Playwright harness in `e2e/`. React components are not rendered in unit tests
(no testing-library in the project); logic is tested through extracted pure functions or by
inspecting returned React element trees, as in
[error-states.test.ts](../../src/app/__tests__/error-states.test.ts).

**Target Platform**: Web, mobile-first, RTL by default; verified at 390px

**Project Type**: Single Next.js application (`src/app`, `src/components`, `src/lib`)

**Performance Goals**: No regression. The only new server work is one profile read already
performed on the pricing page and one extra field returned by the pricing action.

**Constraints**: Arabic renders correctly before English is considered done; existing stored
artifacts must keep rendering; already-issued invoices must not change retroactively;
`pnpm typecheck` clean and `pnpm test` green is the merge gate.

**Scale/Scope**: ~20 files across 8 slices, no schema change, no new dependency.

## Constitution Check

*GATE: passed before Phase 0, re-checked after Phase 1 design.*

| Principle | Verdict | Note |
|---|---|---|
| I — Honesty is the moat | **Drives this feature** | Six of eight slices exist because the product asserted something untrue: a NaN count, a provenance claim about freelancers that were references, a market verdict on a number never read, a success message for a discarded value, a stale allowance, and a highlighted choice nobody made. |
| II — Arabic-first, RTL | **Drives this feature** | The flagship defect is visible only in Arabic. Slice 1 fixes it and slice 8 removes mixed numerals. Every string touched ships in both `ar` and `en`. |
| III — Mobile-first | Pass | No layout change beyond the not-found shell; 390px re-verified in quickstart. |
| IV — Test the money and the rules | **Gate for slices 1, 2, 8** | The Arabic count, the VAT eligibility rule and money rounding are unit-tested before the UI changes. |
| V — Every module stands on its own feet | Pass | Error/empty/loading states are being *improved*; no module is thinned. |
| VI — Halal and Saudi-compliant | **Gate for slice 2** | Charging VAT unregistered and issuing a VAT invoice without a registration number are compliance failures; this slice closes both. |
| VII — AI as multiplier | Pass | Slice 7 adds one nullable field to the extraction schema and keeps "to be agreed" when the model does not find a duration — it never invents a date. |

Locked-stack constraint: nothing here swaps a dependency or adds one.

**Post-design re-check**: unchanged — the design adds no abstraction, no new module and no
migration. The one new shared helper (a locale-aware count formatter) replaces duplicated
mistakes at three call sites and is justified by Principle I.

## Project Structure

### Documentation (this feature)

```text
specs/011-power-user-pass-3/
├── plan.md              # This file
├── research.md          # Phase 0 — root causes confirmed in the running product
├── data-model.md        # Phase 1 — fields this feature reads/gates on (no migration)
├── quickstart.md        # Phase 1 — how to verify each slice
├── contracts/
│   ├── client-facing-artifact.md   # what a client may and may not see
│   ├── validation-errors.md        # server-action failure shape
│   └── vat-eligibility.md          # when an invoice may carry VAT
├── checklists/
│   └── requirements.md  # spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── [locale]/
│   │   ├── not-found.tsx                  # slice 8 — render inside AppShell
│   │   ├── r/[token]/… , p/[token]/page.tsx # slices 1, 3 — public pages
│   │   └── tool/page.tsx                  # slice 6 — profile prefill + quota
│   └── actions/
│       ├── onboarding/saveOnboardingStep.ts   # slices 4, 5
│       ├── clients/clients.ts                 # slice 4
│       ├── proposals/generateProposal.ts      # slices 3, 7
│       ├── invoices/_artifact.ts              # slices 2, 3
│       └── pricing/…                          # slice 6 (quota in action result)
├── components/
│   ├── tool/{ResultCard,ToolFlow,QuotaBadge}.tsx      # slices 1, 6
│   ├── proposals/ProposalArtifact.tsx                 # slices 3, 7
│   ├── invoices/{InvoiceForm,InvoiceArtifact}.tsx     # slices 2, 8
│   ├── onboarding/{OnboardingPricePreview,StepRates,StepPlatforms,StepRates}.tsx  # slices 4, 5
│   └── clients/…                                      # slice 4
├── lib/
│   ├── proposals/{artifact,brand}.ts        # slice 3, 7
│   ├── invoices/artifact.ts                 # slices 2, 3
│   ├── ai/scope.ts                          # slice 7
│   └── format/…                             # slice 1 — shared count helper
└── messages/{ar,en}.json                    # slices 1–8 copy
e2e/                                          # existing harness; quickstart references it
```

**Structure Decision**: the existing single-app layout is kept. No new top-level directory.
The only new file expected is one small formatting helper plus its test; everything else is
an edit to a file that already owns the behaviour.

## Phase 0 — Research

See [research.md](./research.md). All eighteen findings were reproduced in the running
product against real Supabase and DeepSeek, and each root cause was confirmed by reading the
code path rather than inferred. No NEEDS CLARIFICATION remained after the pass.

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md) — the profile, proposal and invoice fields this feature
  reads, gates on, or stops writing. No migration.
- [contracts/client-facing-artifact.md](./contracts/client-facing-artifact.md) — the
  owner/client split for proposal and invoice documents.
- [contracts/vat-eligibility.md](./contracts/vat-eligibility.md) — when VAT may be applied
  and what must then appear on the document.
- [contracts/validation-errors.md](./contracts/validation-errors.md) — the server-action
  failure shape that lets a form point at the offending field.
- [quickstart.md](./quickstart.md) — per-slice verification, Arabic first.

## Slice Order and Independence

| # | Slice | Story | Depends on | Ships alone? |
|---|---|---|---|---|
| 1 | Counts in Arabic + honest provenance wording | US1 (P1) | — | Yes |
| 2 | VAT eligibility + registration number on the document | US2 (P1) | — | Yes |
| 3 | Client-facing redaction (band, login email, tagline) | US3 (P1) | — | Yes |
| 4 | Field-level validation errors | US4 (P1) | — | Yes |
| 5 | Onboarding truthfulness (verdict, resume, defaults) | US5 (P2) | 4 for the error shape on the platforms step | Yes |
| 6 | Profile prefill + live quota badge | US6 (P2) | — | Yes |
| 7 | Cover letter names the client; duration reaches the timeline | US7 (P3) | — | Yes |
| 8 | Money precision, numerals, not-found shell | US8 (P3) | — | Yes |

Slices 1–4 are the MVP: they close the two compliance/credibility failures and the two
leaks. Nothing in 5–8 blocks them.

## Complexity Tracking

No constitution violations. No table required.
