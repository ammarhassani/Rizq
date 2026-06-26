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

- **Project** — _not a table (yet)._ Today the **gig is the project**. See "Direction" below — Project is becoming the umbrella.
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

1. **Reframe in place** — relabel "gig" → "Project" across UI copy and entry points
   (e.g. "Create project from proposal"), keeping the `gigs` table as the project hub for now.
   The income screen is presented as the project's money view. Near-zero migration risk.
2. **Promote to a real hub** — when the first integration lands and a project needs to own more
   than money (files, external links, multiple invoices), introduce a `projects` table as the
   parent and re-point `gigs`/`invoices`/integration tables at `project_id`.
3. **Integration tables** — each integration is its own pluggable table keyed by `project_id`
   (e.g. `project_integrations` with a `provider` discriminator), mirroring the existing
   registry/config pattern (collectors, tone prompts, HADAF rules) so providers are added
   without schema churn to the core.

The mission frames the trade-offs: this is built to **benefit freelancers broadly**, so favor
clarity and extensibility over shortcuts — the model should stay legible as integrations grow.
