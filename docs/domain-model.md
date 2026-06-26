# Rizq Domain Model — Proposal · Project · Gig · Invoice · Income Ledger

_Settles what each core object is, how they connect, and where we're taking the model._

> If this conflicts with `docs/spec-v2-flrp.md`, the spec wins on product scope; this
> doc wins on "what the objects actually are and how they link in code."

---

## TL;DR

Today there are **three real database entities** (plus `clients` underneath):

| Object | Table | Plain meaning | Lifecycle stage |
|---|---|---|---|
| **Proposal** | `proposals` | The **quote** you send to win the work. | Before the deal |
| **Gig** | `gigs` | The **engagement** + its money (amount, deposit, paid/pending, dates). | During / after |
| **Invoice** | `invoices` | The **bill** for that work. | When you collect |

Two terms that feel like objects but are **not separate things**:

- **Project** — _now a real table (`projects`), as of Stage 2 / feature 002._ It is the umbrella parent; the **gig is its money child** (1:1 today). See "Direction" below.
- **Income Ledger** — _not a table._ It's the `/income` screen rendering **views over your gigs** (`monthly_income`, `income_rolling_avg`, `income_projections`). Every gig is one ledger line. Logging a gig **is** adding to the ledger.

The gig table does double duty — it's both "the job" and "the income row." That overload is the historical source of confusion, and the reason for the Project reframe.

---

## The lifecycle

```
  PROPOSAL ──accepted──▶ GIG ──delivered──▶ INVOICE ──paid──▶ 💰
   (quote)              (work + ledger)      (the bill)        │
      │                      ▲                                 │
      │                      └──── paid invoice marks ─────────┘
      │                            its gig paid (NEW)
      └──────────── can bill directly, skipping the gig ───────▶ INVOICE
```

All conversions are **explicit one-tap server actions** — nothing auto-fires on its own:

| From → To | Action | What it pre-fills |
|---|---|---|
| Proposal → Gig | `actions/gigs/createGigFromProposal.ts` | title, `amount_sar = price_anchor`, client, `proposal_id` back-link |
| Gig → Invoice | `actions/invoices/createInvoiceFromGig.ts` | description, amount, due = delivery + 15d; sets `gigs.invoice_id` |
| Proposal → Invoice (direct) | `actions/invoices/createInvoiceFromProposal.ts` | amount from `price_anchor`; no gig created |

Every status change also writes a row to **`client_timeline`** (Client Book), so a client's
record shows the whole history: proposal sent/viewed/accepted/declined, gig created/completed,
invoice sent/paid.

---

## Foreign-key map (current)

```
users 1─∞ proposals, gigs, invoices, clients   (everything is owner-scoped via RLS)

proposals.client_id   → clients.id      (nullable)
gigs.client_id        → clients.id
gigs.proposal_id      → proposals.id    (the quote this gig came from)
gigs.invoice_id       → invoices.id     (back-link, set when invoiced)
invoices.client_id    → clients.id
invoices.gig_id       → gigs.id         (the gig being billed)
invoices.proposal_id  → proposals.id

Income Ledger = views over gigs:
  monthly_income, income_rolling_avg, income_projections
```

---

## The closed loop (fixed 2026-06-26)

Previously, marking an **invoice** paid did **not** mark its linked **gig** paid — you had to
mark "paid" twice, in two screens, and the Income Ledger lagged reality.

Now `markInvoiceStatus.ts`, on `→ paid`, cascades to the linked gig (`invoices.gig_id`):
sets the gig to `paid`, stamps `final_paid_at`, fills `completed_date` if empty. It is:

- **Forward-only** — reversing/undoing an invoice does **not** un-pay the gig (a gig can be
  settled independently; we don't want to clobber that).
- **Idempotent** — a gig already `paid` or `cancelled` is left untouched.
- **Best-effort** — a failure here never blocks the invoice update.

The gig update fires the existing `gigs_rollup_after` trigger, so client totals and the
Income Ledger views update automatically.

---

## Direction: Project as the umbrella

The product thesis is a **Freelancer OS / sandbox**, not a pricing tool. The organizing unit
should be the **Project** — a general container that a freelancer thinks in terms of. A project
*has* facets:

```
                         ┌────────────── PROJECT ──────────────┐
                         │  (the engagement you think in)       │
   proposal ──accept──▶  │  • origin proposal (the quote)       │
                         │  • money / gig (deposit, payments)   │  ──▶ invoices
                         │  • files & deliverables              │
                         │  • integrations ↓                    │
                         └──────────────────────────────────────┘
                            Figma · GitHub · Behance · Adobe · Drive …
```

Why this framing wins:
- "Create a **project** from this proposal" reads naturally; "create a gig" does not.
- The Income Ledger becomes an honest **view of your projects' money**, not a sibling concept.
- Integrations have an obvious home: they attach to a **project**, keyed by `project_id`.

### Staged path (low risk first)

1. **Reframe in place** ✅ *done (Stage 1)* — relabeled "gig" → "Project" across UI copy and
   entry points; income screen presented as the project's money view. UI/i18n only.
2. **Promote to a real hub** ✅ *done (Stage 2 — feature 002)* — `projects` is now the parent
   table. `gigs` is kept as the **1:1 money child** of a project (`gigs.project_id`), so the
   money engine (deposit/rollup/quota triggers, `monthly_income`/`income_rolling_avg`/
   `income_projections` views, the invoice-paid → gig-paid loop) is unchanged. Additive,
   idempotent backfill created one project per gig; `invoices`/`proposals`/`client_timeline`
   gained a `project_id` link (existing `gig_id`/`proposal_id` retained, nothing dropped).
   Proposals gained a `proposal_role` discriminator (`origin` | `change_order` | `sub_scope`);
   only `origin` is populated today. The project page (`/projects/[id]`) shows money + origin
   proposal + invoices + an integrations slot; `/income` stays the cross-project portfolio view.
   Deleting a project with money/invoices **soft-archives** it (never drops financial history).
3. **Integration tables** ✅ *schema done (Stage 2)* — `project_integrations` is a pluggable
   registry keyed by `project_id` with a `provider` discriminator (figma | github | behance |
   adobe | drive | other) + `config jsonb`, mirroring the `collector_registry` pattern. NO
   credentials are stored (OAuth deferred to a future connection table); the UI is a labeled
   "coming soon" stub. Real provider OAuth is the next stage.

### Stage 3 — the Project Lifecycle Wizard (feature 003)

A guided **"Start a project"** front door (dashboard → `/projects/start`) walks the
freelancer **brief → AI proposal → project → invoice** in three stages. It is a pure
**orchestration layer** — no new tables. The lifecycle stage is **derived** from real data
by `resolveLifecycle` (`src/lib/projects/lifecycle.ts`): ① proposal status, ② project + its
money child, ③ invoice status. Each project page shows a `LifecycleStepper` (done / current /
next / **skipped**) with one "continue" CTA that reuses the existing conversion actions; the
dashboard surfaces in-progress lifecycles (incl. draft-only proposals) to resume. Billing
directly (no proposal) shows ① as *skipped*, derived from the absence of an origin proposal.

### Stage 4 — the Project Workspace (feature 004)

The project page (`/projects/[id]`) is now a **tabbed workspace**: Overview · Files ·
Deliverables · Tasks (· Integrations, gated). All additive; the money engine is untouched.

- **Files** — the Document Vault (`documents`) scoped to a project via `documents.project_id`
  + a `project_doc_kind` (`input` | `deliverable`). Reuses the vault's storage/RLS/quota
  (free 10 / pro 50)/soft-delete; non-project documents are unchanged.
- **Deliverables** — a *curated view* (no new store): deliverable-kind documents ∪ the
  project's integration links, each carrying a `handover_state` (`draft → ready → sent`,
  forward-only, `sent` terminal). `handover_state` lives on `documents` and `project_integrations`.
- **Tasks & milestones** — `project_tasks` (status `todo|doing|done`, optional `milestone_id`,
  `sort_order`) + `project_milestones` (name, target_date). Owner-scoped RLS. **Money-free**;
  a milestone is schema-ready to carry its own amount/gig link later (not built).
- **Integrations (real OAuth)** — *planned, security-gated (Phase 5)*. A future
  `provider_connections` table will hold encrypted tokens with **no client grant at all**
  (server-only via SECURITY DEFINER / service role), referenced by `project_integrations.connection_id`.
  Secrets are **never** client-readable and **never** in the PDPL export. GitHub read-only first.
  Does not begin until a written halal/PDPL/security review passes.

All workspace data (documents+kind, tasks, milestones) is included in the PDPL export and the
account-delete cascade; provider-connection secrets will be excluded from the export by design.

#### FK map additions (Stage 2)

```
projects.user_id            → users.id        (owner; on delete cascade)
projects.client_id          → clients.id      (nullable)
projects.origin_proposal_id → proposals.id    (the canonical origin quote)
gigs.project_id             → projects.id     (the money child; on delete cascade)
invoices.project_id         → projects.id     (nullable; gig_id retained)
proposals.project_id        → projects.id     (nullable) + proposals.proposal_role
client_timeline.project_id  → projects.id     (nullable, best-effort backfill)
project_integrations.project_id → projects.id (pluggable registry; on delete cascade)
```

The mission frames the trade-offs: this is built to **benefit freelancers broadly**, so favor
clarity and extensibility over shortcuts — the model should stay legible as integrations grow.
