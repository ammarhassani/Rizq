# Quickstart — Validating the Proposal Studio Revision

End-to-end checks that prove each user story works. Run on the feature branch.

## Prerequisites
- `pnpm install` done; `pnpm dev` running → http://localhost:3000 (redirects to `/ar`).
- Both new migrations applied to the Supabase project (grants + share-state RPC).
- `DEEPSEEK_API_KEY` set for the AI scenarios (US3, US4). Without it, AI degrades gracefully (US3 falls back to template questions; US4 chat shows a disabled state) — that fallback is itself a check.
- Signed in as a freelancer with a profile (phone, years of experience, projects, ≥1 notable client) and ≥1 client.

## Gate
`pnpm typecheck` clean · `pnpm test` green (new pure-logic tests included).

## Scenarios

### US1 · Profile & onboarding save (P1)
1. `/ar/proposals/profile` → change brand, bio, years, projects, notable clients → Save.
2. **Expect:** success confirmation; reload → all values persist; no "Something went wrong".
3. Re-run an onboarding step → continue → saves without error.
→ Contract: profile-save-and-rendering.md (⑧). SC-001.

### US2 · Create gig from proposal (P1)
1. Open a proposal → "Create gig from this proposal".
2. **Expect:** lands on `/{locale}/income/{gigId}` (single locale segment) showing the new gig, prefilled — not a 404.
→ Contract: profile-save-and-rendering.md (⑤). SC-002.

### US3 · AI clarifying questions (P2)
1. `/ar/proposals/new` → submit a sparse brief ("logo for a coffee shop").
2. **Expect:** 1–3 questions specific to that brief; each skippable; categorical ones show choices, open ones show a text box.
3. Submit a detailed brief → **expect** few/no questions.
4. Temporarily unset the AI key → **expect** generation still completes (template fallback).
→ Contract: ai-clarifying-questions.md. SC-003.

### US4 · Conversational editing (P2)
1. Open a draft (gym management system) → open the hovering chat → "the client wants this to also be a mobile app with a control panel".
2. **Expect:** relevant prose sections (understanding/approach/scope description) update with animation; **price, dates, terms unchanged**.
3. **Expect:** the new "control panel" deliverable surfaces a confirmation card; on confirm, price re-resolves from the market band and asks for a final OK.
4. Open version history → prior version recoverable.
5. Ask it to "drop the price to 5000" → **expect** refusal (price is protected).
→ Contract: proposal-chat.md. SC-004.

### US5 · Share-link states (P2)
1. Enable sharing → copy link → open in a private window → **expect** the proposal.
2. Disable sharing → reopen the same link → **expect** a bilingual "publisher disabled this link" page (not 404).
3. Open a random `/p/<garbage>` → **expect** not-found.
→ Contract: share-link-state.md. SC-005.

### US6 · Contact & credibility on the artifact (P3)
1. Generate a proposal with phone/years/projects set → **expect** phone (tappable), years, and projects appear on-screen and in the Word export.
2. Clear the phone → regenerate → **expect** no empty phone line.
→ Contract: profile-save-and-rendering.md (③/⑥). SC-006.

### US7 · Notable clients as entries (P3)
1. `/ar/proposals/profile` → add three notable clients as chips (one containing a comma) → remove one → Save → reload.
2. **Expect:** exactly the two intended entries, intact (the comma entry preserved).
→ Contract: profile-save-and-rendering.md (⑦). SC-007.

### Full journey (SC-008)
Generate (relevant questions) → refine via chat → see complete contact/credibility → save profile → share correctly → convert to gig — with no errors.
