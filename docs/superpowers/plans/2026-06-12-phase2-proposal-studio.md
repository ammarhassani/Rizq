# Phase 2 — Proposal Studio (M1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task (fresh implementer per task → spec-compliance review → code-quality review → fix loop). Steps use checkbox (`- [ ]`) syntax.

**Goal:** A freelancer pastes a client brief → Rizq extracts scope (DeepSeek), computes a data-grounded price (on Phase-1 `resolvePrice`), asks ≤3 follow-ups if confidence is low, and renders a Rizq-stamped bilingual proposal artifact they share via link / PDF / WhatsApp. The viral wedge.

**Architecture:** Server-first. Scope extraction = DeepSeek `generateObject` + Zod (`@/lib/ai`). Price = `resolvePrice` (M4) + within-band modifiers + personal weighting. The artifact is a **React/HTML page** (canonical share surface at `/[locale]/p/[token]`, perfect RTL/Tajawal/brand fidelity) with **print-optimized A4 CSS** for "Download PDF" (browser print) — no server PDF engine in Phase 2. Pluggable artifact sections + config-driven follow-up questions + config-driven tone prompts. All AI output labeled (model + prompt hash + confidence).

**Tech stack:** Next 16 App Router + server actions, Supabase (MCP-applied migrations), `ai` v6 + `@ai-sdk/deepseek` + Zod, next-intl RTL, the Phase-1 pricing core (`resolvePrice`, provenance/citation), Vitest.

---

## Decisions locked (founder, 2026-06-12)
- **PDF = HTML artifact + browser print-to-PDF** (print CSS). No Puppeteer/react-pdf in Phase 2. Server PDF is a clean fast-follow behind the same artifact component if an attachment is ever required.
- **Rizq seal = placeholder SVG** now (swap on commission, D6). **Few-shot examples = engineer-drafted** (5 Saudi-dialect briefs) for founder review.
- **Cross-phase FKs:** `proposals.client_id` / `gig_id` / `invoice_id` are nullable `uuid` columns **without FK constraints** in Phase 2 (the `clients`/`gigs`/`invoices` tables arrive in Phases 3–4; FKs added then). Client auto-fill (M2), onboarding-rate seeding (M8), and the "Create gig/invoice from accepted proposal" links are deferred to their phases. Phase-2 personal weighting grows from the user's own past proposals only (N-based, spec M1.7).
- **Quota:** M1 proposals are gated by the existing tier system (free = 2 proposals/month per spec §IV). Reuse the Phase-1 atomic-DB-trigger quota pattern (a `proposal_creations`-style count on `proposals`), not the `queries` counter.

## Exit gate (spec §VI Phase 2)
Founder + 3 freelancers each generate 3 proposals from real WhatsApp briefs; tone adjustment works; AI scope comparison appears when relevant; PDF renders without layout break on mobile. **(Human dogfooding gate — engineering delivers the working flow; founder arranges dogfooders.)**

---

## File Structure

**DB (MCP-applied migration, committed file):**
- `supabase/migrations/<ts>_create_proposals.sql` — enums, `proposals`, `proposal_templates`, `proposal_versions`, `proposal_share_events`, `follow_up_question_templates`, `tone_adjustment_prompts`; RLS; indexes; seed follow-up questions + tone prompts; per-user proposal quota trigger; `share_token` generation.

**Pricing extension (`src/lib/pricing/`):**
- `proposalPricing.ts` (+ `.test.ts`) — pure: within-band modifiers + personal weighting + rounding on top of a `resolvePrice` result.

**AI (`src/lib/ai/`):**
- `scope.ts` — `ScopeSchema` (Zod) + `extractScope(brief, ctx)` (DeepSeek `generateObject`) + `SCOPE_PROMPT` + 5 few-shots + prompt hash.
- `scope.test.ts` — schema-parse + modifier-mapping unit tests (no live calls).
- `tone.ts` — `adjustTone(sections, tone, ctx)` (config-driven prompts).
- `scopeCompare.ts` — `compareScope(current, pastN)`.
- `changeSummary.ts` — `summarizeChange(before, after)`.

**Domain logic (`src/lib/proposals/`):**
- `followUp.ts` (+ `.test.ts`) — pure: pick ≤3 follow-up questions from templates by field confidence.
- `artifact.ts` (+ `.test.ts`) — pure: assemble `ArtifactData` from proposal + profile defaults; section registry + ordering.
- `shareToken.ts` — token gen/validation helpers.

**Server actions (`src/app/actions/proposals/`):**
- `generateProposal.ts` — orchestrates extract → price → persist draft.
- `answerFollowUps.ts` — apply answers, re-tighten price.
- `finalizeProposal.ts`, `editProposal.ts` (versioning + change summary), `adjustToneAction.ts`, `setShare.ts`, `markStatus.ts`, `templates.ts` (save/load/list/setDefault), `logShareEvent.ts`.

**Routes / UI (`src/app/[locale]/`):**
- `proposals/new/page.tsx` + `ProposalFlow.tsx` (client) — textarea → processing → follow-ups → artifact review.
- `proposals/page.tsx` (list) + `proposals/[id]/page.tsx` (detail/edit/versions).
- `p/[token]/page.tsx` — public artifact (RTL/brand) + Download PDF (print) + Contact buttons + print CSS.
- `src/components/proposals/*` — `ProposalArtifact.tsx` (shared by review + share page), `ToneBar.tsx`, `FollowUpCards.tsx`, `ScopeInsight.tsx`, `ShareModal.tsx`, `ProposalCard.tsx`, `RizqSeal.tsx`, `ArtifactSkeleton.tsx`.
- `src/app/[locale]/p/[token]/print.css` (or scoped `@media print`).

**i18n:** `messages/{ar,en}.json` — `Proposals.*` namespace.

---

## Task P2.1 — Schema + RLS + quota (spec 2.1)

**Files:** Create `supabase/migrations/<ts>_create_proposals.sql` (apply via MCP `apply_migration`, then commit the file with the recorded version — Phase-1 convention).

- [ ] **Step 1: Author the migration** (full DDL). Key points:
  - Enums: `proposal_status('draft','final','sent','viewed','accepted','declined','expired')`, `brief_channel('paste','whatsapp_forward','email_forward')`, `brief_language('ar','en','mixed')`, `proposal_tone('formal','balanced','friendly','persuasive')`, `share_channel('link','whatsapp','email','pdf_download')`. Guard each with `do $$ ... exception when duplicate_object then null; end $$;`.
  - `proposals` table per spec M1.2 with these adjustments: `client_id uuid` (nullable, **no FK**), `gig_id uuid`/`invoice_id uuid` omitted for now (added in P3/P4); `specialty_id/city_id/experience_tier_id` reference the existing reference tables (real FKs); `dominant_provenance public.benchmark_provenance`; `share_token text unique`. Indexes per spec M1.2.
  - `proposal_templates`, `proposal_versions` (unique `(proposal_id, version)`), `proposal_share_events`, `follow_up_question_templates`, `tone_adjustment_prompts(tone, locale, prompt)` tables.
  - RLS: `proposals` — owner full CRUD (`auth.uid() = user_id`, both `using` + `with check` on UPDATE); **public SELECT only when `public_share = true AND status <> 'draft'`** (anon+authenticated). `proposal_templates`/`proposal_versions`/`proposal_share_events` — owner-scoped (versions/events via the parent proposal's `user_id`, or store `user_id` directly for a simple policy — prefer a `user_id` column on each for direct RLS). `follow_up_question_templates` + `tone_adjustment_prompts` — public read (active), admin write (match Phase-1 reference-table pattern).
  - Column-level: clients can't set `status`/`share_token`/pricing fields arbitrarily? Pricing is computed server-side via the action (the action uses the user's session; RLS allows owner update). Keep it simple: owner can update their own rows; the server action is the only writer.
  - **Quota trigger:** `BEFORE INSERT` on `proposals` → `private.enforce_proposal_quota()` mirroring `enforce_query_quota`: free = 2/Riyadh-month (+ any bonus), pro/admin = unlimited, errcode `53400` on exhaustion. (Anon cannot create proposals — auth required.)
  - `share_token`: generate in the finalize/share action (not at insert) — a urlsafe random token; unique index already present.
  - Seed `follow_up_question_templates` (revisions, urgency, ip_transfer, deliverable_count, client_type — bilingual, with `options_json`). Seed `tone_adjustment_prompts` for the 4 tones × {ar,en} (prompt templates from spec M1.11-B).
- [ ] **Step 2: Apply via MCP `apply_migration`; verify** tables + RLS + seed counts via `execute_sql`; run `get_advisors security` (ensure new SECURITY DEFINER quota fn is gated, no unexpected RLS gaps).
- [ ] **Step 3:** Write the committed migration file with the recorded version; `git commit`.

---

## Task P2.2 — Scope extraction (DeepSeek) (spec 2.2)

**Files:** `src/lib/ai/scope.ts`, `src/lib/ai/scope.test.ts`.

- [ ] **Step 1 (TDD):** `scope.test.ts` — unit-test the PURE helpers (no live calls): `ScopeSchema` parses a valid object; `aggregateConfidence(field_confidence)` returns mean 0..1; `scopeToPricingParams(scope, profile)` maps scope → `{ project_size?, modifiers }` deterministically. Mock-free.
- [ ] **Step 2:** `scope.ts`:
  - `ScopeSchema` (spec M1.3) — `specialty` constrained to the DB specialty slugs (passed in), `field_confidence` record, `extras` optional.
  - `SCOPE_PROMPT(ctx)` builder: includes specialty list, city list, tiers, and **5 hand-authored Saudi-dialect few-shot brief→scope examples** (engineer-drafted; founder reviews). Versioned; `promptHash` stored.
  - `extractScope(briefText, ctx): Promise<{ scope, model, promptHash, confidence, raw }>` via `generateObject({ model: deepseek(REASONING_MODEL), schema: ScopeSchema, prompt })`, try/catch → on failure return a low-confidence empty scope so the UI degrades to the manual form (spec M1.8 error state). Log errors.
- [ ] **Step 3:** run tests; typecheck. Commit.

> Few-shots: author 5 realistic WhatsApp-style Saudi briefs (logo, social-media package, web build, content writing, video edit) each with the expected `Scope` object. Keep in `scope.ts` as a versioned const; founder reviews extraction quality during dogfooding.

---

## Task P2.3 — Follow-up question engine (spec 2.3)

**Files:** `src/lib/proposals/followUp.ts` (+ `.test.ts`).

- [ ] **Step 1 (TDD):** `followUp.test.ts` — `selectFollowUps(scope, templates, max=3)` returns ≤3 questions, ordered by `priority`, only for fields whose `field_confidence < template.min_confidence`, skipping disabled; returns [] when all confident.
- [ ] **Step 2:** implement `selectFollowUps` (pure; templates fetched from DB by the caller). `applyAnswers(scope, answers)` merges quick-answer values back into the scope + bumps that field's confidence to 1.0.
- [ ] **Step 3:** tests + typecheck. Commit.

---

## Task P2.4 — Price computation (modifiers + personal weighting) (spec 2.4, 1.7)

**Files:** `src/lib/pricing/proposalPricing.ts` (+ `.test.ts`).

- [ ] **Step 1 (TDD):** `proposalPricing.test.ts` pins:
  - within-band modifiers: urgency rush ×1.15 / long-term ×0.90; client corporate ×1.10 / individual ×0.95; ip full_transfer ×1.20 / license ×0.95 (compose multiplicatively on the anchor).
  - personal weighting by N: N<3 → 0.1, 3–10 → 0.3, >10 → 0.5 (cap 0.5).
  - blend: `final_anchor = round50( market_anchor*(1-w) + personal_anchor*w )` then clamp into `[min, max]` (reuse the Phase-1 clamp invariant); min/max round to 10. Anchor never escapes the band.
- [ ] **Step 2:** implement `computeProposalPrice(resolveResult, scope, pastAnchors): { min, anchor, max, modifiers, personal_weight }`. Pure — takes the `ResolveResult` (from `resolvePrice`) + derived modifiers + the user's past proposal anchors.
- [ ] **Step 3:** tests + typecheck. Commit.

---

## Task P2.5 — Artifact assembly + sections (data layer) (spec 2.5)

**Files:** `src/lib/proposals/artifact.ts` (+ `.test.ts`), `src/components/proposals/RizqSeal.tsx`.

- [ ] **Step 1 (TDD):** `artifact.test.ts` — `buildArtifactData(proposal, profile)` returns the 9 sections in order with the right `editable`/`aiEditable` flags (spec M1.5 table); pricing section always carries the provenance citation + methodology anchor; missing brand fields fall back to Rizq defaults.
- [ ] **Step 2:** `artifact.ts` — `ArtifactSection` registry (id, order, editable, aiEditable) + `buildArtifactData`. `RizqSeal.tsx` — placeholder dignified SVG seal (green/gold), `aria-label`, swappable.
- [ ] **Step 3:** tests + typecheck. Commit.

---

## Task P2.6 — AI tone adjustment (spec 2.6)

**Files:** `src/lib/ai/tone.ts`, `src/app/actions/proposals/adjustToneAction.ts`.

- [ ] `adjustTone(editableSections, tone, ctx)` — DeepSeek rewrites ONLY `aiEditable` sections in the chosen tone; **prompt forbids changing numbers, names, dates** (spec M1.11-B); prompts loaded from `tone_adjustment_prompts`. Returns rewritten section text + records `{tone, applied_at, sections_modified}` into `proposals.tone_adjustments`. Labeled output. Action is owner-gated + quota-aware (free = 3 tone uses/month, spec §IV).
- [ ] Unit-test the prompt assembly + the "data preserved" guard (a post-check that prices/dates present in input remain in output; if violated, reject the rewrite). Commit.

---

## Task P2.7 — AI scope comparison (spec 2.7)

**Files:** `src/lib/ai/scopeCompare.ts`.

- [ ] `compareScope(currentScope, pastScopes[])` — only runs when the user has ≥3 past proposals; DeepSeek compares dimensions (anonymized — no client data) → a 1–2 sentence Arabic insight (+EN). Labeled "تحليل رِزق —". Returns null when <3 past. Stored in `proposals.scope_comparison_json`. Commit.

---

## Task P2.8 — Artifact output: HTML share page + print PDF + WhatsApp (spec 2.8)

**Files:** `src/components/proposals/ProposalArtifact.tsx`, `src/app/[locale]/p/[token]/page.tsx`, print CSS, `src/components/proposals/ShareModal.tsx`, `src/app/actions/proposals/setShare.ts` + `logShareEvent.ts`.

- [ ] **Step 1:** `ProposalArtifact.tsx` — renders the 9 sections, bilingual RTL/Tajawal + brand colors + Rizq palette, A4-friendly layout. Shared by the in-app review and the public share page.
- [ ] **Step 2:** `/[locale]/p/[token]/page.tsx` — server component: fetch proposal by `share_token` where `public_share=true AND status<>'draft'` (RLS-enforced); render `ProposalArtifact`; "Download PDF" button triggers `window.print()`; "Contact freelancer" (`wa.me`/`mailto:`); fire `logShareEvent('link')` + increment view count; OpenGraph meta. Print CSS: `@media print` → A4, hide nav/buttons, avoid section page-breaks (`break-inside: avoid`), legible at mobile width.
- [ ] **Step 3:** `setShare` (owner toggles `public_share`, generates `share_token` on first share, sets `status` → `sent`), `ShareModal` (Copy link / Download PDF / WhatsApp `wa.me` with formatted bilingual summary). `logShareEvent` writes `proposal_share_events`.
- [ ] **Step 4:** manual verify print-to-PDF on mobile width (no layout break). Commit.

---

## Task P2.9 — Generate flow + list + detail + versions (spec 2.9)

**Files:** actions `generateProposal.ts`, `answerFollowUps.ts`, `finalizeProposal.ts`, `editProposal.ts`, `markStatus.ts`; routes `proposals/new`, `proposals`, `proposals/[id]`; components `ProposalFlow.tsx`, `FollowUpCards.tsx`, `ScopeInsight.tsx`, `ProposalCard.tsx`, `ArtifactSkeleton.tsx`.

- [ ] **generateProposal**: validate (Zod) → quota gate → `extractScope` → `resolvePrice` → `computeProposalPrice` → persist `draft` (scope_json, extraction metadata, pricing, citation, artifact_json) → return draft + any follow-ups. Skeleton with step indicators (extract → price → analyze → render).
- [ ] **answerFollowUps**: apply answers → recompute price (tighten) → update draft.
- [ ] **finalizeProposal**: `draft → final`, lock, set `finalized_at` + `expires_at` (+30d).
- [ ] **editProposal**: on edit of a finalized proposal → bump `version`, write `proposal_versions` row with `summarizeChange` (P2.x AI change summary), update proposal.
- [ ] **markStatus**: accepted/declined/viewed transitions (M3/M6 hooks deferred — accepted just records).
- [ ] List + detail UIs with empty/loading/error states (mobile-first), inline-edit of editable sections, version history with AI change summaries, tone bar + scope insight wired. Commit per logical chunk.

---

## Task P2.10 — Template library (spec 2.10)

**Files:** `src/app/actions/proposals/templates.ts`, template UI in `proposals/new` + a templates manager.

- [ ] save template (from a proposal/scope), load (pre-fills the new-proposal flow), list, set default, `usage_count++` on use. Owner-scoped. Commit.

---

## Task P2.11 — Anonymous preview at /tool (spec 2.11)

**Files:** small addition to the existing `/[locale]/tool` result (Phase-1 `ResultCard`).

- [ ] On the `/tool` result, add a CTA "أنشئ عرضاً كاملاً / Create a full proposal" → routes anon users to signup then `proposals/new` (prefilled specialty/city/tier). The anonymous tool stays dropdown→band only (no artifact for anon). Commit.

---

## Task P2.12 — Tests (spec 2.12)

- [ ] Ensure unit coverage: scope schema parse (≥3 cases), `scopeToPricingParams`, `selectFollowUps`/`applyAnswers`, `computeProposalPrice` (5 scenarios incl. band-clamp + N-tiers), `buildArtifactData` ordering/flags, tone "data preserved" guard. `pnpm test` green; `pnpm typecheck` + `pnpm build` green.
- [ ] (Dogfooding exit gate is human — founder + 3 freelancers × 3 proposals from real briefs.)

---

## Self-Review (vs spec §VI Phase 2 tasks 2.1–2.12)
2.1 tables/RLS/indexes → P2.1 ✓ · 2.2 extraction → P2.2 ✓ · 2.3 follow-ups → P2.3 ✓ · 2.4 price compute → P2.4 ✓ · 2.5 artifact renderer → P2.5+P2.8 ✓ · 2.6 tone → P2.6 ✓ · 2.7 scope compare → P2.7 ✓ · 2.8 output (PDF/share/WhatsApp) → P2.8 (HTML+print) ✓ · 2.9 list/detail/edit/versions → P2.9 ✓ · 2.10 templates → P2.10 ✓ · 2.11 anon preview → P2.11 ✓ · 2.12 tests → P2.12 ✓.
**Deferred (cross-phase, by design):** client auto-fill (M2/P3), create-gig/invoice from accepted (P3/P4), onboarding-rate-seeded personal weighting (M8/P5), server-generated PDF attachment, commissioned seal.
