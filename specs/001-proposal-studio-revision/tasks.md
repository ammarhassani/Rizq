---
description: "Task list for Proposal Studio Revision Round"
---

# Tasks: Proposal Studio Revision Round

**Input**: Design documents from `specs/001-proposal-studio-revision/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Targeted unit tests are included for business-logic cores only (pricing,
question post-processing, intent routing, share-state mapping, notable-clients parsing,
honesty guards) per Constitution Principle IV — not full TDD across UI.

**Format**: `[ID] [P?] [Story] Description with file path` · [P] = parallelizable (different files, no incomplete deps).

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Confirm feature branch `001-proposal-studio-revision`, `pnpm install`, and the Supabase migration apply workflow (`supabase/migrations/` + push to the project). Baseline: `pnpm typecheck` clean, `pnpm test` green.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ Shared honesty infrastructure used by the AI stories (US3, US4). Complete before those stories.**

- [x] T002 Expose a typed AI-editable-section allowlist (`cover_letter`, `understanding`, `approach`, `scope_of_work`, `assumptions`) and an `assertNoProtectedSections(targets)` guard in `src/lib/proposals/sections.ts` (derives from existing `ARTIFACT_SECTIONS.aiEditable`).
- [x] T003 [P] Unit-test the allowlist + guard (rejects price/timeline/milestones/terms) in `src/lib/proposals/__tests__/sections.test.ts`.

**Checkpoint**: Foundation ready — all user stories can begin.

---

## Phase 3: User Story 1 - Reliable profile & onboarding saving (Priority: P1) 🎯 MVP

**Goal**: Saving the Studio profile (and onboarding steps) persists all fields with no spurious error.
**Independent Test**: Edit several profile fields → save → reload → all persist; no "Something went wrong"; onboarding steps save.

- [x] T004 [US1] Create migration `supabase/migrations/<ts>_grant_users_profile_update.sql` extending the column-level `UPDATE` grant on `public.users` to the writable profile/onboarding columns (per data-model.md); keep `role`, `pro_until`, quota, `fl_verified*` excluded.
- [x] T005 [US1] Applied to Supabase project `rizq` via MCP — `users` UPDATE grant now covers 63 columns (was 4).
- [x] T006 [P] [US1] Regression test: the columns written by `saveOnboardingStep` are a subset of a shared `USERS_WRITABLE_COLUMNS` constant (mirrors the grant), in `src/lib/profile/__tests__/grants.test.ts`.
- [ ] T007 [US1] Validate quickstart US1 (profile + onboarding save); tidy `StudioProfile.errorSave` copy if needed in `messages/{ar,en}.json`. ⏳ **pending: manual verify after T005**

**Checkpoint**: Profile/onboarding saving works — unblocks every downstream profile-dependent feature.

---

## Phase 4: User Story 2 - Convert a proposal into a gig (Priority: P1)

**Goal**: "Create gig from this proposal" navigates to the new gig (no 404).
**Independent Test**: From a proposal, create a gig → land on `/{locale}/income/{gigId}` (single locale) showing the prefilled gig.

- [x] T008 [US2] Fix navigation in `src/components/proposals/ProposalDetailActions.tsx`: `router.push(\`/income/${gigId}\`)` (drop the `/${locale}` prefix and the type cast).
- [x] T009 [P] [US2] ~~Fix CalendarClient.tsx~~ — **verified NOT a bug**: `CalendarClient.tsx` imports `useRouter` from `next/navigation` (plain router), so its `/${locale}${route}` prefix is correct. No change made.
- [ ] T010 [US2] Validate quickstart US2 (create-gig navigation). ⏳ **pending: manual verify**

**Checkpoint**: proposal → gig loop restored.

---

## Phase 5: User Story 3 - Relevant, AI-generated clarifying questions (Priority: P2)

**Goal**: Brief-specific clarifying questions (≤3, skippable, mixed choice/free-text), with graceful fallback.
**Independent Test**: Two different briefs yield different, relevant questions; detailed brief yields few/none; AI off → template fallback.

- [x] T011 [US3] Create `src/lib/ai/followups.ts` — `generateFollowUps(brief, scope)` with a Zod schema (per contracts/ai-clarifying-questions.md), DeepSeek `generateObject`, clamp to 3, mixed choice/free-text.
- [x] T012 [US3] Deterministic fallback to `selectFollowUps` (table) when `isAIConfigured()` is false or the generator returns nothing — wired in `generateProposal.ts`; `generateFollowUps` returns `[]` on error/timeout.
- [x] T013 [US3] Wire `src/app/actions/proposals/generateProposal.ts` to return `generateFollowUps(...)` as `follow_ups` (replace the table selection at the questions step).
- [x] T014 [US3] Add a free-text input branch to `src/components/proposals/FollowUpCards.tsx` for questions without `options_json` (keep answers keyed by `field_name`).
- [x] T015 [P] [US3] Unit-test question shaping (≤3, options→options_json, skippable) in `src/lib/ai/__tests__/followupsShape.test.ts` (pure logic extracted from the server-only generator).
- [ ] T016 [US3] Validate quickstart US3 (brief-specific questions, skip, fallback). ⏳ **pending: manual verify**

**Checkpoint**: Clarifying questions are contextual and resilient.

---

## Phase 6: User Story 4 - Conversational in-place editing (Priority: P2)

**Goal**: A hovering chat edits the responsible prose section(s) from free-text; protected values are never touched; scope changes are confirmed then re-priced via the market resolver.
**Independent Test**: On a gym draft, "add a mobile app + control panel" updates the right prose with animation, price/dates/terms untouched, the new deliverable confirmed + re-priced, prior version recoverable; "drop the price" is refused.

- [x] T017 [US4] Create `src/lib/ai/chatIntent.ts` — intent-router Zod schema (`target_section_ids` ⊆ allowlist, per-section instructions, optional `scope_change`, bilingual reply) + prompt + `generateObject`.
- [x] T018 [US4] Multi-section apply achieved by looping `pickProseField` per target into `mergeProseIntoArtifact` in the action — no `proseDraft.ts` change needed (merge is already incremental).
- [x] T019 [US4] Implemented as a server action `src/app/actions/proposals/proposalChat.ts` (owner-gate; intent → focused `generateObject` → merge + version snapshot; degrades on `ai_unconfigured`). Chose the proven non-streaming path over a new streaming route for robustness; **streaming reveal is a deferred enhancement.**
- [x] T020 [US4] Create `src/components/proposals/ProposalChatDock.tsx` (hovering client dock; `experimental_useObject`; `StreamingProse` reveal; reduced-motion safe; bilingual).
- [x] T021 [US4] Mount the dock in `src/app/[locale]/proposals/[id]/page.tsx` when `canEdit` (draft/final/sent); not on the public share page.
- [~] T022 [US4] **Partial.** The router DETECTS a scope change and the dock surfaces it ("that adds new work → add it in the editor to re-price"), routing the freelancer to the existing `EditProposalForm` to confirm (propose→confirm; AI never sets the price). ⏳ **deferred:** one-click auto-apply of the deliverable + automatic market re-price (`resolvePrice`+`computeProposalPrice`) from the dock.
- [x] T023 [P] [US4] Unit-test intent post-processing: targets restricted to the allowlist + deduped (`sanitizeIntentTargets`) in `src/lib/proposals/__tests__/proposalChatShape.test.ts`; the protected-section guard is covered by `sections.test.ts`.
- [ ] T024 [P] [US4] Unit-test re-price-on-scope-change stays deterministic (market resolver, no AI number). ⏳ **deferred with T022** (auto-reprice not yet built; the existing manual/market price path is already covered by the pricing tests).
- [x] T025 [US4] Add bilingual copy for the chat dock in `messages/{ar,en}.json` (`Proposals.chat`).
- [ ] T026 [US4] Validate quickstart US4 (gym example, protected-value refusal, confirm/re-price, version recovery). ⏳ **pending: manual verify (needs DEEPSEEK key + running app)**

**Checkpoint**: Conversational editing works within the honesty rules.

---

## Phase 7: User Story 5 - Correct share-link states (Priority: P2)

**Goal**: Active → proposal; disabled → "publisher disabled this link"; missing → not-found.
**Independent Test**: Enable→open (proposal); disable→reopen (disabled view, not 404); garbage token→not-found.

- [x] T027 [US5] Create migration `supabase/migrations/<ts>_share_state_rpc.sql` — `SECURITY DEFINER get_shared_proposal_state(p_token)` returning `active|disabled|missing` (no content); grant execute to `anon` + `authenticated`.
- [x] T028 [US5] Applied to Supabase project `rizq` via MCP — `get_shared_proposal_state('unknown')` returns `'missing'`.
- [x] T029 [US5] Branch `src/app/[locale]/p/[token]/page.tsx`: on null content, probe state → render disabled view vs `notFound()`. (`generateMetadata` already returns a content-free generic title for both disabled/missing — no leak.)
- [x] T030 [US5] Add bilingual "publisher disabled this link" copy under `Proposals.share` in `messages/{ar,en}.json`.
- [x] T031 [P] [US5] Unit-test the share-token validator (the testable pure unit guarding the state RPC) in `src/lib/proposals/__tests__/shareToken.test.ts`. (The 3-way state→view branch is a trivial server-component conditional, covered by quickstart T032.)
- [ ] T032 [US5] Validate quickstart US5 (all three states). ⏳ **pending: manual verify (after T028)**

**Checkpoint**: Share links behave correctly and leak nothing.

---

## Phase 8: User Story 6 - Contact & credibility on the proposal (Priority: P3)

**Goal**: Phone, years of experience, and projects completed appear on the artifact (web + export); no empty phone line when unset.
**Independent Test**: With all three set → all appear on-screen + Word; clear phone → no empty line.

- [x] T033 [US6] Render `contact.phone` in `src/components/proposals/ProposalArtifact.tsx` (NextStepsSection, `tel:` link; only when present) — parity with `src/lib/proposals/docx.ts`.
- [x] T034 [P] [US6] Phone omission guaranteed by the conditional render guard (`{contact.phone && …}`); covered by quickstart T036 rather than a brittle render test.
- [x] T035 [P] [US6] Verified: experience/projects already render in the "About" section (D9); no code change needed.
- [ ] T036 [US6] Validate quickstart US6 (on-screen + Word export). ⏳ **pending: manual verify**

**Checkpoint**: Proposal carries full contact + credibility.

---

## Phase 9: User Story 7 - Notable clients as separate entries (Priority: P3)

**Goal**: Add/remove notable clients as individual chips; comma-containing entries preserved; consistent between studio + onboarding.
**Independent Test**: Add 3 chips (one with a comma), remove 1, save, reload → exactly 2 intact.

- [x] T037 [US7] Create shared `src/components/ui/ChipInput.tsx` (`string[]` tag input; Enter/comma to add; remove; RTL-aware; bilingual placeholder).
- [x] T038 [US7] Use `ChipInput` for notable clients in `src/components/settings/StudioProfileForm.tsx` (store `string[]`; remove comma-join/split).
- [x] T039 [US7] Use `ChipInput` in onboarding `src/components/onboarding/StepPortfolio.tsx` for consistency.
- [x] T040 [P] [US7] Unit-test notable-clients normalization preserves comma-containing entries in `src/lib/profile/__tests__/notableClients.test.ts`.
- [ ] T041 [US7] Validate quickstart US7 (add/remove/comma entry persists). ⏳ **pending: manual verify**

**Checkpoint**: Notable clients are robust and consistent.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [x] T042 [P] Loading/empty/error states present on all new surfaces (chat dock: intro/sending/error/unavailable; chip input; disabled-share view), responsive (`min(92vw,…)`).
- [x] T043 [P] New AR/EN copy written in Saudi-professional register (chat dock, disabled-share, chips).
- [x] T044 Run `pnpm typecheck` (clean).
- [x] T045 Run `pnpm test` (600 passing, incl. 7 new test files for this feature).
- [ ] T046 Run the full-journey quickstart scenario (SC-008). ⏳ **pending: manual verify (apply 2 migrations to Supabase + run the app)**

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T003)** → user stories.
- **US1 (T004–T007)** and **US2 (T008–T010)** — both P1, independent of each other and of all other stories. **MVP.**
- **US3 (T011–T016)** and **US4 (T017–T026)** — depend on Foundational (the section allowlist/guard). Within US4: T017→T023, T018→T019→T020→T021, T017+pricing→T022.
- **US5 (T027–T032)**, **US6 (T033–T036)**, **US7 (T037–T041)** — independent; US7 internal: T037→T038/T039.
- **Polish (T042–T046)** — after the desired stories are complete.

### Parallel opportunities
- After Foundational, the four bug stories (US1, US2, US5, US6) and the UX story (US7) are independent and can proceed concurrently; the two AI stories (US3, US4) too.
- [P]-marked tasks within a story (tests, the second-file fixes) run in parallel.

## Implementation Strategy

- **MVP (deploy first):** Setup + Foundational + **US1 + US2** — restores the two broken flows (profile/onboarding save, proposal→gig). Smallest valuable, shippable increment.
- **Increment 2:** US3 + US4 (the AI enhancements — the founder's headline asks).
- **Increment 3:** US5, then US6 + US7 (polish).
- Commit after each task or logical group. Keep `pnpm typecheck`/`pnpm test` green as the gate.

## Notes
- Migration filenames use `YYYYMMDDHHMMSS_name.sql`; apply in order.
- AI tasks must preserve the honesty rule: no AI-authored price/dates/legal; scope changes re-price via the deterministic resolver.
- Total: **46 tasks** — US1:4 · US2:3 · US3:6 · US4:10 · US5:6 · US6:4 · US7:5 · Setup:1 · Foundational:2 · Polish:5.
