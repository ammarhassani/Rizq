# Phase 4 — Simple Invoicing (M6) Implementation Plan

> Execute via subagent-driven dev (fresh implementer per task → spec + quality review → fix loop). Migrations applied by the controller via Supabase MCP, then committed as files (Phase 1/2/3 convention). No founder dogfood checkpoints — build to shippable (per `build-autonomously-until-ship`).

**Goal:** Generate professional **bilingual invoices** from completed gigs. Closes the proposal → gig → invoice loop. NOT ZATCA e-invoicing — just "I did the work, here's the bill." Reuses M1's artifact/PDF/share-link/WhatsApp pipeline. Another retention anchor; feeds M0 (overdue widget) and M9 (due dates) in Phase 5.

**Branch:** `phase-4-invoicing` off `phase-3-client-income` (stacked; nothing merges to main).

**Architecture:** Same stack. `invoices` is an owner-scoped table (RLS), per-user sequence numbering via a `private` trigger. Public share is an **RPC-only surface** (no broad anon SELECT — the P2.8 lesson). PDF = print-to-PDF via the existing `PrintButton`. AI (DeepSeek) for invoice line-item description + overdue payment-reminder drafting — both labeled, both free (generative copy, not analytics). Cross-module: M3 gig → one-tap invoice; M1 accepted proposal → invoice; client detail shows invoice history.

---

## Decisions (locked from spec)
- **Quota (spec §IV line 2361):** free = **3** invoices/Riyadh-month, pro = **30**/month, admin = unlimited. Atomic BEFORE-INSERT trigger in `private`, errcode 53400 (mirror `enforce_gig_quota`). NB: Pro is *capped* at 30 here (unlike proposals/clients which are unlimited) — the trigger must enforce both tiers.
- **Reuse existing enums:** `public.payment_method` (bank_transfer/stc_pay/cash/other) already exists from P3 — reuse, don't recreate. New enum: `invoice_status` (draft/sent/viewed/paid/overdue/cancelled).
- **`client_timeline` events:** `invoice_sent` + `invoice_paid` already exist in the `client_timeline_event` enum (P3) — wire them, don't alter the enum.
- **Numbering:** `invoice_sequence` per-user, computed in a `private.invoice_assign_number()` BEFORE-INSERT trigger: `pg_advisory_xact_lock(hashtext('inv:'||user_id))` to serialize per user, `seq = coalesce(max(invoice_sequence),0)+1 where user_id=...`, `invoice_number = 'INV-'||to_char(now() at time zone 'Asia/Riyadh','YYYY')||'-'||lpad(seq::text,4,'0')`. `UNIQUE(user_id, invoice_sequence)` is the backstop.
- **Computed money:** `private.invoice_compute_before()` BEFORE write — `vat_sar = round(subtotal_sar*vat_pct/100,2)`, `total_sar = subtotal_sar + vat_sar`. Default `vat_pct=0` (most freelancers below SAR 375K).
- **`due_date` default:** caller passes `delivery_date + 15 days` (gig) or `today + 15` (manual). Not a DB default (needs source date).
- **Public share = RPC only:** `get_shared_invoice(p_token)` (SECURITY DEFINER, returns ONLY safe render fields: invoice_number, status, items, subtotal/vat/total, payment_method/details, due_date, dates, + branding fields needed to render — NO user_id/client raw rows beyond client display name embedded in artifact). `log_invoice_view(p_token,p_channel,p_agent)` mirrors `log_proposal_view`. Revoke anon SELECT on `invoices`; owner-only RLS for the table. Reuse `proposal_share_channel` enum for channels.
- **FKs:** `invoices.client_id→clients`, `invoices.gig_id→gigs`, `invoices.proposal_id→proposals`; add the deferred `gigs.invoice_id→invoices(id) on delete set null` now.
- **AI gating:** invoice description + payment reminder available to **all authenticated** (free) — generative copy helpers, consistent with spec line 2383 (follow-up drafting is free). Reminder only meaningful when overdue (≥7d past due).
- **PDF watermark:** free tier renders a "Created with Rizq Free / صُنع بـ رِزق المجاني" watermark on the invoice artifact; pro/admin = clean branded (spec line 2372). Gate on `users.role`.
- **Overdue:** derived, not cron'd — an invoice is overdue when `status in ('sent','viewed') AND due_date < today`. Provide a helper + surface in queries/UI; do NOT mutate stored status on a schedule (no scheduler). `markInvoiceStatus` may set `overdue`/`paid` explicitly.

---

## Tasks

### P4.1 — Schema [controller/MCP]
One migration `create_invoices`: `invoice_status` enum; `invoices` table (full M6.1 columns, `items jsonb`, `share_token` unique, view-count fields, `pdf_url`, `ai_reminder_*`, lifecycle ts, `UNIQUE(user_id, invoice_sequence)`); indexes (`user_id,status`, `user_id,created_at desc`, `client_id`, `gig_id`, partial unique on `share_token`); RLS owner CRUD (mirror proposals_owner_all) + revoke anon SELECT; FKs (client/gig/proposal + add `gigs.invoice_id`); `private.invoice_compute_before` (vat/total) + `private.invoice_assign_number` (seq+number, advisory lock) BEFORE INSERT/UPDATE; `private.enforce_invoice_quota` (3 free / 30 pro / ∞ admin) BEFORE INSERT; `public.get_shared_invoice` + `public.log_invoice_view` SECURITY DEFINER RPCs (anon+authenticated execute). Apply via MCP, verify (table/RLS/triggers/RPCs + get_advisors), commit the file matching the recorded version.

### P4.2 — Invoice artifact + pure helpers
`src/lib/invoices/artifact.ts` — pure `buildInvoiceArtifact(input)` → ordered sections (branding, invoice_meta [number/dates/status], bill_to [client], line_items, totals [subtotal/vat/total], payment_details, footer [watermark flag + methodology/jurisdiction]). Mirror `proposals/artifact.ts` style (pure, serialisable, Rizq brand fallback). `src/lib/invoices/number.ts` (format helper, mirror trigger for display) + `src/lib/invoices/overdue.ts` (`isOverdue(status,due_date,today)`, `daysOverdue(...)`) — both **unit-tested**. `src/lib/invoices/items.ts` — `computeTotals(items, vat_pct)` pure + tested (matches the DB trigger math exactly).

### P4.3 — Invoice CRUD + generation actions
`src/app/actions/invoices/`:
- `createInvoiceFromGig.ts` — owner-verify gig, pre-fill client_id/gig_id/proposal_id/subtotal(=amount_sar)/description/payment_method/payment_details/due_date(delivery+15); insert; set `gigs.invoice_id`; build+store `artifact_json`. (M3→M6)
- `createInvoiceFromProposal.ts` — from an accepted proposal (M1→M6).
- `createInvoice.ts` (manual form), `updateInvoice.ts` (edit items/payment/due before sent; rebuild artifact), `markInvoiceStatus.ts` (draft→sent→viewed→paid/overdue/cancelled; set sent_at/paid_at; on sent/paid → `client_timeline` invoice_sent/invoice_paid best-effort), `deleteInvoice.ts`.
- Owner-scoped + invoice quota (DB trigger enforces; surface friendly upgrade copy on 53400).

### P4.4 — Invoice UI
`/[locale]/invoices` (list: current-month header [issued/paid/overdue totals], status filter chips, invoice cards w/ status badge + overdue flag, empty state w/ CTA, fast-create), `/[locale]/invoices/new` (manual + ?gig= / ?proposal= prefill), `/[locale]/invoices/[id]` (artifact preview via shared `InvoiceArtifact`, status actions, share modal, PrintButton, mark-paid/overdue, AI description + AI reminder buttons). `InvoiceArtifact` component (mirror `ProposalArtifact`, RTL, tabular numerals, watermark when free). Mobile-first 375px.

### P4.5 — Public share + PDF + WhatsApp
`/[locale]/i/[token]` public page (mirror `/[locale]/p/[token]`: fetch via `get_shared_invoice` RPC, render `InvoiceArtifact`, PrintButton PDF, WhatsApp contact, `LogInvoiceView` island). Share actions: `setInvoiceShare` (toggle public_share + token gen + status final-ish bump + client_timeline invoice_sent), `logInvoiceView`/`logShareChannel`, `buildWhatsappInvoiceText`. `ShareInvoiceModal` (mirror proposals ShareModal).

### P4.6 — AI (description + reminder)
`src/lib/ai/invoiceDescription.ts` (bilingual professional line-item description from gig title/description/amount + client — returns {ar,en}, labeled "تحليل رِزق —" where surfaced) + `src/lib/ai/paymentReminder.ts` (Saudi-polite overdue reminder, 2–3 sentences, references number/amount/due/days-overdue + payment details, copy-paste WhatsApp, labeled, never auto-send). Pure prompt builders unit-tested; live calls spot-verified. Actions: `generateInvoiceDescriptionAction`, `generatePaymentReminderAction` (only if overdue ≥7d; stores `ai_reminder_text_ar` + `ai_reminder_drafted_at`). Both free.

### P4.7 — Cross-module wiring
- M3→M6: "Generate invoice" CTA on `GigDetailActions` for delivered/paid gigs (→ createInvoiceFromGig or /invoices/new?gig=). Gig detail shows linked invoice (gigs.invoice_id) w/ status.
- M1→M6: "Generate invoice" CTA on accepted proposals (→ createInvoiceFromProposal).
- M2→M6: client detail shows invoice history (list + statuses) alongside gig history.
- M0/M9 (Phase 5): expose the data only — a reusable `getOverdueInvoiceCount`/overdue-list helper + invoice due-date query — so Phase-5 dashboard/calendar can consume. Do NOT build widgets/calendar here (those modules don't exist yet); note the deferral.

### P4.8 — Tests + capstone
Unit: overdue logic, totals/vat math (matches trigger), number format, artifact section shape, quota boundary reasoning. Verify sweep (typecheck/test/build) + `get_advisors` + final whole-branch review (`git diff phase-3-client-income..HEAD`) + fixes. Check: RLS owner-only + RPC-only public surface (no anon SELECT leak), sequence-numbering concurrency correctness, Pro=30 cap actually enforced, AI labeled, watermark gating, secret-leak grep.

---

## Exit gate (spec §VI Phase 4)
Generate invoice from gig. Invoice PDF renders correctly. AI payment reminder is Saudi-polite and accurate. (Human dogfood deferred to ship; engineering delivers the working flow build-verified.)
