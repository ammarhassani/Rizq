# Contract — Profile Save, Gig Redirect & Artifact Rendering (Bugs ⑧/⑤/③ + ⑥/⑦)

Grouped low-risk fixes plus the notable-clients UX.

## Bug ⑧ — Studio profile save (and onboarding) must succeed
- **Root cause:** column-level UPDATE grant on `public.users` only covers `name, preferred_language, city, last_active`; profile/onboarding writes touch ungranted columns → rejected → generic error.
- **Contract:** after Migration 1 (see data-model.md), `saveOnboardingStep(step, payload)` and the Studio profile save persist all listed columns and return `{ ok: true }`; the generic "Something went wrong" no longer occurs for valid input. No action-signature change.
- **Guarantee:** `role`, `pro_until`, quota, `fl_verified*` remain non-writable by `authenticated`.
- Acceptance: FR-001, FR-002, FR-003 · SC-001.

## Bug ⑤ — Create gig from proposal navigates correctly
- **Contract:** `ProposalDetailActions.tsx` navigates with `router.push(\`/income/${gigId}\`)` — **unprefixed**, because next-intl's router prepends the locale (`localePrefix: "always"`). No `/${locale}` and no type cast. (Server action `createGigFromProposal` already returns `gig_id` correctly.) Same fix applied in `CalendarClient.tsx`.
- Acceptance: FR-004, FR-005 · SC-002.

## Bug ③ — Phone on the artifact
- **Contract:** the web artifact renders `contact.phone` when present (in `NextStepsSection` as a `tel:` link, parity with the existing `.docx` export); renders nothing when absent. Reuses existing `contactLabel` strings.
- Acceptance: FR-022, FR-023 · SC-006.

## ⑥ — Experience & projects (verification only)
- **Contract:** `years_experience` and `total_projects_completed` continue to render in the artifact "About" section, inherited from the profile. No new field needed (both already exist and flow end-to-end). Optional header elevation is out of scope.
- Acceptance: FR-024 · SC-006.

## ⑦ — Notable clients as separate entries
- **Contract:** a shared `ui/ChipInput.tsx` edits `notable_clients` as `string[]` (type + Enter/comma → removable pill); used by both `StudioProfileForm.tsx` and onboarding `StepPortfolio.tsx`. An entry containing a comma is preserved intact. No DB change (`notable_clients` is already `text[]`).
- Acceptance: FR-025, FR-026, FR-027 · SC-007.
