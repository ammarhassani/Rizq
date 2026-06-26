# Quickstart / Validation Guide: Project Lifecycle Wizard

References [contracts/lifecycle-and-orchestration.md](./contracts/lifecycle-and-orchestration.md) and [data-model.md](./data-model.md). No migration — validation is UI + the pure resolver's unit tests.

## Prerequisites

- `pnpm install`; able to run `pnpm typecheck` and `pnpm test`.
- A signed-in test user. Feature 002 migrations already applied (projects exist).

## Validation scenarios

### V1 — Resolver unit tests (the rule)
`pnpm test src/lib/projects/lifecycle.test.ts` is green: every stage × {done, current, next, skipped}, the declined-proposal-after-project case → stage ① stays done, the direct-bill case (project without origin) → stage ① skipped, and the all-paid case → complete.

### V2 — Full happy path (SC-001, SC-002)
From the dashboard: **Start a project** → paste a brief → AI drafts a proposal (labeled "تحليل رِزق —") → finalize (stage ① done) → **Set up the project** creates the project, set deposit %/delivery/payment (stage ② done) → **Create invoice**, review, **Send** (stage ③ in-progress) → mark **Paid** → stepper shows ①②③ complete and the project money reads paid. At every step exactly one clear "next" CTA is shown.

### V3 — Resume (SC-003)
Leave after finalizing the proposal (before creating the project); return via the dashboard "continue" list → land on the ①→② step with the proposal intact; advancing does **not** create a second proposal. Leave after creating the project; return → land at "Create invoice"; advancing does **not** create a second project.

### V4 — Derived truth (SC-004, SC-007)
Open a project created **before** this feature (feature-002 backfill) → its stepper shows the correct stage from real data (e.g., money done, invoice not yet). Delete that project's only invoice from the invoices screen → reopen → stage ③ reverts to "current" (no stale "done").

### V5 — Skip / direct bill (SC-006)
Create a project without a proposal (power-user path) → open it → stage ① renders **skipped** (not done); the lifecycle can still complete through ②③.

### V6 — Quotas, no bypass / no orphan (SC-005)
As a free-tier user at the monthly project limit, advance ①→② → blocked with the existing upgrade prompt; stage ① remains done; no empty project is created. Same for the invoice limit at ②→③ (stage ② stays done).

### V7 — Ownership isolation (SC-008)
`getLifecycle`/`listInProgressLifecycles` as user B never return user A's proposals/projects/invoices (RLS).

### V8 — i18n / RTL / mobile
Stepper, Start button, and continue list render correctly in Arabic (primary, RTL) and English; usable at mobile width; no pre-paywall modal interruptions.

## Merge gate

- `pnpm typecheck` clean.
- `pnpm test` green incl. `lifecycle.test.ts`.
- Manual V2–V8 walkthrough recorded.
