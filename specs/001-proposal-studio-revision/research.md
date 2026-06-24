# Phase 0 Research & Decisions: Proposal Studio Revision Round

All decisions below are grounded in a read-only investigation of the current codebase.
No `NEEDS CLARIFICATION` markers remain.

---

## D1 — AI clarifying questions: dedicated generator with table fallback

**Decision**: Add a `lib/ai/followups.ts` generator that, after scope extraction, calls DeepSeek `generateObject` to produce 1–3 brief-specific questions, each shaped like the existing `FollowUpTemplate` (`field_name`, `question_ar/en`, optional `options_json`, `allow_skip`). `generateProposal` returns these instead of the table-selected set; the `follow_up_question_templates` table is kept as the deterministic fallback when AI is unconfigured (`isAIConfigured()` false).

**Rationale**: Answers already merge by `field_name` into `scope_json` via `applyAnswers`, and pricing reacts to `urgency`/`client_type`/`ip_transfer`/size. Emitting the existing template shape means `FollowUpCards`, `answerFollowUps`, and `applyAnswers` need no change beyond a free-text input branch. The mixed choice/free-text format (clarified) maps directly: the model emits `options_json` for categorical questions and omits it for open ones.

**Alternatives considered**: (a) Extend `extractScope`'s schema to emit questions in one round-trip — cheaper but couples extraction and questioning and makes the fallback path awkward. (b) Drop the table entirely — loses graceful degradation (violates Principle VII).

**Touch**: `lib/ai/followups.ts` (new), `generateProposal.ts` (swap selection), `FollowUpCards.tsx` (free-text branch), `ProposalFlow.tsx` (unchanged data flow).

---

## D2 — Conversational editing: intent router + focused streaming apply

**Decision**: New `POST /api/proposals/[id]/chat` route. Step 1 runs an **intent router** (`lib/ai/chatIntent.ts`, `generateObject`) that maps the free-text message → `{ target_section_ids[], per-section instruction, scope_change? }` constrained to the 5 AI-editable prose sections. Step 2 `streamObject`s `ProseSchema` focused on those sections and persists via the existing `mergeProseIntoArtifact` `onFinish` pattern, snapshotting the prior version (`bumpAndPersist`). A new client `ProposalChatDock.tsx` drives it with `experimental_useObject` (as `DraftingView` already does) and animates reveals via `StreamingProse`.

**Rationale**: ~80% reuse of the proven prose pipeline (`proseDraft.ts` merge + `pickProseField` routing, `draft/route.ts` scaffolding). The only new primitives are the intent schema/prompt and the dock UI. Mounting the dock on the detail page (not inside the server-rendered `ProposalArtifact`) keeps the render tree clean.

**Alternatives considered**: Reusing `regenerateSection` per target — works but is non-streaming and single-section; the streaming route gives the requested animated, multi-section experience.

**Touch**: `api/proposals/[id]/chat/route.ts` (new), `lib/ai/chatIntent.ts` (new), `ProposalChatDock.tsx` (new), `[id]/page.tsx` (mount), `proseDraft.ts` (reuse; extend pick to multiple fields).

---

## D3 — Scope/price changes from chat: propose → confirm → market re-price

**Decision** (clarified): When the intent router flags a `scope_change` (e.g., add "control panel" deliverable), the dock shows a confirmation card rather than applying silently. On confirm: the deliverable is added to `scope_json.deliverables`, the price **re-resolves through the existing `resolvePrice` + `computeProposalPrice`** market path, and the new band is shown for a final OK before persisting. The LLM never writes the number.

**Rationale**: Honors Principle I (honesty) and the clarified "freelancer stays in control." Deliverables are deliberately structural (not AI-owned); routing the add through the deterministic pricing core keeps provenance intact.

**Alternatives considered**: Let the chat edit deliverables + price directly — rejected (violates honesty + the structural/AI boundary). Keep price fixed on scope change — rejected by clarification (price would silently drift from scope).

**Touch**: `chatIntent.ts` (emit `scope_change`), `ProposalChatDock.tsx` (confirm card), reuse `editProposal`/pricing path for the structural apply + re-price.

---

## D4 — Studio profile save: extend column-level UPDATE grants (root cause of bug ⑧)

**Decision**: New migration extending `grant update (...) on public.users to authenticated` to cover the writable profile/onboarding columns (`full_name_ar/en`, `brand_name_ar/en`, `tagline_ar/en`, `bio_ar/en`, `logo_url`, `years_experience`, `total_projects_completed`, `notable_clients`, `portfolio_samples`, `contact_email/phone/whatsapp`, `experience_tier_id`, `onboarding_step`, `profile_completeness_pct`, `profile_last_updated`). Deliberately continue to exclude `role`, `pro_until`, quota, and `fl_verified*`.

**Rationale**: The current grant only allows `name, preferred_language, city, last_active`; every profile/onboarding write touches ungranted columns, so Postgres rejects the update → the generic "Something went wrong" toast. RLS (`auth.uid() = id`) already scopes rows correctly, so only the column grant is missing. This also silently breaks onboarding steps — fixing the grant fixes both.

**Alternatives considered**: A `SECURITY DEFINER` save RPC — heavier and broadens the trusted surface; unnecessary since RLS already constrains rows.

**Touch**: `supabase/migrations/<ts>_grant_users_profile_update.sql` (new). No app code change required for the fix itself.

---

## D5 — Share-link states: read-only state RPC + page branch (bug ④)

**Decision**: Add a `SECURITY DEFINER` RPC `get_shared_proposal_state(p_token) → 'active' | 'disabled' | 'missing'` that exposes **no** artifact fields. In `p/[token]/page.tsx`, when the existing content fetch returns null, probe the state: render a bilingual "publisher disabled this link" view for `disabled`, and only `notFound()` for `missing`. Mirror in `generateMetadata`.

**Rationale**: Disabling sharing sets `public_share = false` but preserves `share_token` (non-destructive), so the row still distinguishes "disabled" from "never existed" — the current RPC just filters disabled rows out, collapsing both to 404. The state probe restores the distinction without leaking content (PDPL/Principle I).

**Alternatives considered**: Re-grant anon `select` on `proposals` — rejected (that grant was deliberately revoked; would leak fields).

**Touch**: `supabase/migrations/<ts>_share_state_rpc.sql` (new), `p/[token]/page.tsx` (branch + metadata), `messages/*.json` (copy).

---

## D6 — Doubled-locale redirect on "create gig" (bug ⑤)

**Decision**: In `ProposalDetailActions.tsx`, change the post-create navigation from `router.push(\`/${locale}/income/${gigId}\`)` to `router.push(\`/income/${gigId}\`)` and drop the type cast. Fix the same latent pattern in `CalendarClient.tsx`.

**Rationale**: The router is next-intl's localized router (`localePrefix: "always"`), which prepends the active locale; hardcoding `/${locale}` produces `/en/en/...` → 404. The invoice handler in the same file already does it correctly.

**Touch**: `ProposalDetailActions.tsx`, `CalendarClient.tsx`.

---

## D7 — Phone on the artifact (bug ③)

**Decision**: Render `contact.phone` in the web artifact's contact area (`NextStepsSection`, alongside email/WhatsApp, as a `tel:` link) and optionally the cover header. Only render when present (no empty line).

**Rationale**: `contact_phone` is already captured, loaded into `artifact.contact.phone`, and rendered in the `.docx` export — the web renderer simply omits it. This brings the on-screen/PDF artifact in line with the export. Label already exists (`contactLabel`).

**Touch**: `ProposalArtifact.tsx` (render), `proposalStrings.ts` (reuse labels).

---

## D8 — Notable clients as separate entries (⑦)

**Decision**: New shared `ui/ChipInput.tsx` (type + Enter/comma → removable pill) backed by `string[]`. Use it in `StudioProfileForm.tsx` and onboarding `StepPortfolio.tsx`, replacing the comma-joined text field. No DB change (`notable_clients` is already `text[]`).

**Rationale**: Storage is already correct; only the editor is fragile (a client name with a comma breaks it; onboarding and the studio form use inconsistent delimiters). Chips match how the artifact already renders notable clients (pills).

**Touch**: `ui/ChipInput.tsx` (new), `StudioProfileForm.tsx`, `StepPortfolio.tsx`.

---

## D9 — Experience & projects inheritance (⑥)

**Decision**: No new work required for inheritance — `years_experience` and `total_projects_completed` already exist, are captured in onboarding and the studio form, and already render in the proposal "About" section. Confirm via tests/quickstart; elevating them to the cover header is optional and out of scope unless requested.

**Rationale**: Investigation confirmed both columns flow end-to-end (profile → `loadUserBrandDefaults` → `generateProposal` → artifact About). The spec's "create if missing" condition does not apply.

**Touch**: none (verification only).

---

## Cross-cutting

- **Graceful AI degradation**: question generation and chat both fall back cleanly when `isAIConfigured()` is false (questions → table fallback; chat → disabled with a clear message). (Principle VII)
- **Versioning**: every chat-applied edit snapshots into `proposal_versions` (reuse `bumpAndPersist`). (FR-016)
- **Testing**: new pure cores get Vitest coverage; pricing re-resolve path is covered to enforce honesty (no LLM-authored numbers). (Principle IV)
