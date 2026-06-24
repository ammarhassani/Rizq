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
- [ ] T005 [US1] Apply the migration to the Supabase project; confirm a studio-profile save and one onboarding step both succeed. ⏳ **pending: needs Supabase apply (no service creds locally)**
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

- [ ] T011 [US3] Create `src/lib/ai/followups.ts` — `generateFollowUps(brief, scope)` with a Zod schema (per contracts/ai-clarifying-questions.md), DeepSeek `generateObject`, clamp to 3, mixed choice/free-text.
- [ ] T012 [US3] Add deterministic fallback to `selectFollowUps` (table) when `isAIConfigured()` is false or on error/timeout, inside `followups.ts`.
- [ ] T013 [US3] Wire `src/app/actions/proposals/generateProposal.ts` to return `generateFollowUps(...)` as `follow_ups` (replace the table selection at the questions step).
- [ ] T014 [US3] Add a free-text input branch to `src/components/proposals/FollowUpCards.tsx` for questions without `options_json` (keep answers keyed by `field_name`).
- [ ] T015 [P] [US3] Unit-test post-processing (≤3, valid shape, fallback path) in `src/lib/ai/__tests__/followups.test.ts`.
- [ ] T016 [US3] Validate quickstart US3 (brief-specific questions, skip, fallback).

**Checkpoint**: Clarifying questions are contextual and resilient.

---

## Phase 6: User Story 4 - Conversational in-place editing (Priority: P2)

**Goal**: A hovering chat edits the responsible prose section(s) from free-text; protected values are never touched; scope changes are confirmed then re-priced via the market resolver.
**Independent Test**: On a gym draft, "add a mobile app + control panel" updates the right prose with animation, price/dates/terms untouched, the new deliverable confirmed + re-priced, prior version recoverable; "drop the price" is refused.

- [ ] T017 [US4] Create `src/lib/ai/chatIntent.ts` — intent-router Zod schema (`target_section_ids` ⊆ allowlist, per-section instructions, optional `scope_change`, bilingual reply) + prompt + `generateObject`.
- [ ] T018 [US4] Extend `src/lib/ai/proseDraft.ts` to pick/merge multiple focused sections in one pass (multi-field `pickProseField`).
- [ ] T019 [US4] Create streaming route `src/app/api/proposals/[id]/chat/route.ts` (owner-gate; intent → focused `streamObject` → `onFinish` merge + `bumpAndPersist` version snapshot; degrade to `{code:"ai_unconfigured"}`).
- [ ] T020 [US4] Create `src/components/proposals/ProposalChatDock.tsx` (hovering client dock; `experimental_useObject`; `StreamingProse` reveal; reduced-motion safe; bilingual).
- [ ] T021 [US4] Mount the dock in `src/app/[locale]/proposals/[id]/page.tsx` when `canEdit` (draft/final/sent); not on the public share page.
- [ ] T022 [US4] Implement the scope-change confirm flow: confirmation card in the dock + an owner-gated action that adds/removes the deliverable in `scope_json`, re-prices via `resolvePrice` + `computeProposalPrice` (no LLM number), returns the new band for a final OK, snapshots the version.
- [ ] T023 [P] [US4] Unit-test intent post-processing: targets restricted to the allowlist, `assertNoProtectedSections` enforced, `scope_change` parsed, in `src/lib/ai/__tests__/chatIntent.test.ts`.
- [ ] T024 [P] [US4] Unit-test re-price-on-scope-change stays deterministic (market resolver, no AI number) in `src/lib/proposals/__tests__/reprice.test.ts`.
- [ ] T025 [US4] Add bilingual copy for the chat dock + confirm card in `messages/{ar,en}.json`.
- [ ] T026 [US4] Validate quickstart US4 (gym example, protected-value refusal, confirm/re-price, version recovery).

**Checkpoint**: Conversational editing works within the honesty rules.

---

## Phase 7: User Story 5 - Correct share-link states (Priority: P2)

**Goal**: Active → proposal; disabled → "publisher disabled this link"; missing → not-found.
**Independent Test**: Enable→open (proposal); disable→reopen (disabled view, not 404); garbage token→not-found.

- [ ] T027 [US5] Create migration `supabase/migrations/<ts>_share_state_rpc.sql` — `SECURITY DEFINER get_shared_proposal_state(p_token)` returning `active|disabled|missing` (no content); grant execute to `anon` + `authenticated`.
- [ ] T028 [US5] Apply the migration; confirm the RPC returns each state correctly.
- [ ] T029 [US5] Branch `src/app/[locale]/p/[token]/page.tsx`: on null content, probe state → render disabled view vs `notFound()`; mirror states in `generateMetadata`.
- [ ] T030 [US5] Add bilingual "publisher disabled this link" copy under `Proposals.share` in `messages/{ar,en}.json`.
- [ ] T031 [P] [US5] Unit-test the state→view mapping (active/disabled/missing) in `src/lib/proposals/__tests__/shareState.test.ts`.
- [ ] T032 [US5] Validate quickstart US5 (all three states).

**Checkpoint**: Share links behave correctly and leak nothing.

---

## Phase 8: User Story 6 - Contact & credibility on the proposal (Priority: P3)

**Goal**: Phone, years of experience, and projects completed appear on the artifact (web + export); no empty phone line when unset.
**Independent Test**: With all three set → all appear on-screen + Word; clear phone → no empty line.

- [ ] T033 [US6] Render `contact.phone` in `src/components/proposals/ProposalArtifact.tsx` (NextStepsSection, `tel:` link; only when present) — parity with `src/lib/proposals/docx.ts`.
- [ ] T034 [P] [US6] Unit-test that contact render-data omits phone when absent in `src/lib/proposals/__tests__/artifactContact.test.ts`.
- [ ] T035 [P] [US6] Regression check: experience/projects still render in "About" (verification of D9).
- [ ] T036 [US6] Validate quickstart US6 (on-screen + Word export).

**Checkpoint**: Proposal carries full contact + credibility.

---

## Phase 9: User Story 7 - Notable clients as separate entries (Priority: P3)

**Goal**: Add/remove notable clients as individual chips; comma-containing entries preserved; consistent between studio + onboarding.
**Independent Test**: Add 3 chips (one with a comma), remove 1, save, reload → exactly 2 intact.

- [ ] T037 [US7] Create shared `src/components/ui/ChipInput.tsx` (`string[]` tag input; Enter/comma to add; remove; RTL-aware; bilingual placeholder).
- [ ] T038 [US7] Use `ChipInput` for notable clients in `src/components/settings/StudioProfileForm.tsx` (store `string[]`; remove comma-join/split).
- [ ] T039 [US7] Use `ChipInput` in onboarding `src/components/onboarding/StepPortfolio.tsx` for consistency.
- [ ] T040 [P] [US7] Unit-test notable-clients serialize/parse preserves comma-containing entries in `src/lib/profile/__tests__/notableClients.test.ts`.
- [ ] T041 [US7] Validate quickstart US7 (add/remove/comma entry persists).

**Checkpoint**: Notable clients are robust and consistent.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T042 [P] Ensure loading/empty/error states on mobile for all new surfaces (chat dock, chip input, disabled-share view).
- [ ] T043 [P] Saudi-polite phrasing review of all new AR/EN copy in `messages/{ar,en}.json`.
- [ ] T044 Run `pnpm typecheck` (clean).
- [ ] T045 Run `pnpm test` (all green, incl. new tests).
- [ ] T046 Run the full-journey quickstart scenario (SC-008).

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
