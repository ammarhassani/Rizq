# Implementation Plan: Proposal Studio Revision Round

**Branch**: `001-proposal-studio-revision` | **Date**: 2026-06-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-proposal-studio-revision/spec.md`

## Summary

A revision round for the Proposal Studio (M1) bundling two AI enhancements, one UX
improvement, profile inheritance, and four bug fixes. The work reuses the existing
proposal pipeline (jsonb `artifact_json` document, non-destructive prose merge, Vercel
AI SDK streaming) and the market price resolver. New surfaces: an AI clarifying-question
generator, a hovering conversational chat that routes a free-text instruction to the
responsible section(s) and edits them in place, and a public share-state page. The bug
fixes are small and well-isolated (a DB grant, a one-line redirect, a read-only RPC, a
render gap, a chip input). The honesty architecture is the binding constraint: AI never
writes prices/dates/legal, and re-pricing on confirmed scope changes goes through the
deterministic market resolver — never the LLM.

## Technical Context

**Language/Version**: TypeScript 5, Node 24 LTS, React 19

**Primary Dependencies**: Next.js 16 (App Router, Turbopack) · Vercel AI SDK (`ai`, `@ai-sdk/deepseek`, `@ai-sdk/react`) · Supabase (`@supabase/ssr`, `supabase-js`) · next-intl · Tailwind v4 + shadcn/ui · Framer Motion · Zod · docx · sonner

**Storage**: Supabase Postgres with RLS on every table. Proposal content is a single `jsonb` column (`proposals.artifact_json`); scope is `scope_json`; version snapshots in `proposal_versions`. No new tables or columns are required by this feature.

**Testing**: Vitest (`pnpm test`, currently 579 passing). Pure logic (pricing, scope, prose merge, section routing) is unit-tested; new pure cores (question generation post-processing, intent routing, share-state mapping, notable-clients parsing) follow the same pattern.

**Target Platform**: Mobile-first responsive web, Arabic-first RTL, deployed on Vercel serverless. AI server actions/routes set `maxDuration = 60`.

**Project Type**: Web application (Next.js full-stack: server components, server actions, API routes, React client components).

**Performance Goals**: AI surfaces stream (first token typically < 2s); proposal generation stays within the 60s function budget; chat edits reveal progressively via streaming. No blocking spinners — shimmer skeletons and streamed reveals.

**Constraints**: Honesty architecture — AI MUST NOT author or alter price, dates, milestones, or legal/terms; AI output is labeled; AI degrades gracefully (the flow completes when the model is unconfigured/unavailable). PDPL — the public share-state probe leaks no proposal content. Arabic + English for all new copy. RLS preserved; no privilege escalation in new grants.

**Scale/Scope**: Per-freelancer scale (tens of proposals/clients each). Scope is confined to M1 (Proposal Studio) plus the shared `users` profile-save path (which also unblocks M8 Onboarding) and the public share landing route.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How this feature complies |
|-----------|--------|---------------------------|
| I. Honesty is the moat | ✅ PASS | AI never writes price/dates/legal (FR-014); re-pricing on confirmed scope change uses the deterministic market resolver, not the LLM; AI questions and chat edits stay labeled (FR-010, FR-017); share-state probe exposes no content. |
| II. Arabic-first, RTL | ✅ PASS | All new copy is AR (primary) + EN (FR-028); new UI is RTL-native. |
| III. Mobile-first | ✅ PASS | Chat dock, chip input, and share-state page designed mobile-first with loading/empty/error states (FR-029). |
| IV. Test the money and the rules | ✅ PASS | Re-price-on-scope-change, question post-processing, intent routing, share-state mapping, and the grant fix all get tests; `pnpm test` stays green as the merge gate. |
| V. Every module stands on its own feet | ✅ PASS | Enhances M1 within its existing data model/UX; the profile-save fix is a grant correction to the shared `users` table (no new ownership of foreign concerns). |
| VI. Halal & Saudi-compliant | ✅ PASS | No riba/haram; PDPL-safe share probe; new grants deliberately exclude `role`/`pro_until`/quota/`fl_verified*`. |
| VII. AI as capability multiplier | ✅ PASS | Concrete AI: brief-specific question generation and an intent-router-driven section editor — each with a specific prompt, schema, and user benefit, plus graceful fallback. |

**Result: PASS — no violations. Complexity Tracking is empty.**

## Project Structure

### Documentation (this feature)

```text
specs/001-proposal-studio-revision/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions & rationale
├── data-model.md        # Phase 1 — entities + DB migrations
├── quickstart.md        # Phase 1 — end-to-end validation scenarios
├── contracts/           # Phase 1 — interface contracts
│   ├── README.md
│   ├── ai-clarifying-questions.md
│   ├── proposal-chat.md
│   ├── share-link-state.md
│   └── profile-save-and-rendering.md
└── tasks.md             # Phase 2 — created by /speckit-tasks (NOT here)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── [locale]/proposals/[id]/page.tsx          # mount the chat dock (when editable)
│   ├── [locale]/proposals/profile/page.tsx       # Studio profile
│   ├── [locale]/p/[token]/page.tsx               # share landing — add disabled state
│   ├── api/proposals/[id]/
│   │   ├── draft/route.ts                         # existing prose stream (reference)
│   │   └── chat/route.ts                          # NEW — intent-router + streaming apply
│   └── actions/
│       ├── proposals/{generateProposal,answerFollowUps,updateSection,shareActions}.ts
│       ├── onboarding/saveOnboardingStep.ts       # unblocked by the grant fix
│       └── gigs/createGigFromProposal.ts          # (server side already correct)
├── components/
│   ├── proposals/
│   │   ├── ProposalChatDock.tsx                   # NEW — hovering chat (client)
│   │   ├── ProposalArtifact.tsx                   # render contact.phone (web)
│   │   ├── ProposalDetailActions.tsx             # fix doubled-locale redirect
│   │   ├── FollowUpCards.tsx                      # add free-text branch
│   │   └── ProposalFlow.tsx                       # wire AI-generated questions
│   ├── settings/StudioProfileForm.tsx            # notable-clients chip input
│   ├── onboarding/StepPortfolio.tsx              # same chip input
│   └── ui/ChipInput.tsx                           # NEW — shared chip/tag input
├── lib/
│   ├── ai/
│   │   ├── followups.ts                           # NEW — question generator (schema+prompt+merge)
│   │   ├── chatIntent.ts                          # NEW — intent router (schema+prompt)
│   │   ├── proseDraft.ts                          # reuse merge/pick primitives
│   │   ├── scope.ts · client.ts                   # reuse
│   └── proposals/{artifact,brand,followUp,docx,proposalStrings}.ts
├── messages/{ar,en}.json                          # bilingual copy
└── supabase/migrations/
    ├── <ts>_grant_users_profile_update.sql        # NEW — bug ⑧
    └── <ts>_share_state_rpc.sql                    # NEW — bug ④
```

**Structure Decision**: Single Next.js app (Option 2 "web application" collapsed into one App-Router project — frontend and backend co-located via server actions + API routes, the established pattern in this repo). New code slots into existing directories; the only genuinely new building blocks are two AI libs (`followups.ts`, `chatIntent.ts`), one streaming route (`chat/route.ts`), one client component (`ProposalChatDock.tsx`), one shared UI primitive (`ChipInput.tsx`), and two SQL migrations.

## Complexity Tracking

> No constitution violations — this section is intentionally empty.
