# Phase 1 Data Model: Proposal Studio Revision Round

**Headline: this feature adds no new tables and no new columns.** All required fields
already exist; the database work is two migrations — a column-grant correction and a
read-only state RPC. Everything else reuses the current model.

---

## Existing entities (reused as-is)

### `public.users` (freelancer profile)
Relevant existing columns (all present): `full_name_ar/en`, `brand_name_ar/en`,
`tagline_ar/en`, `bio_ar/en`, `logo_url`, `years_experience` (int), `total_projects_completed`
(int), `notable_clients` (`text[]`), `portfolio_samples` (jsonb), `contact_email`,
`contact_phone`, `contact_whatsapp`, `experience_tier_id` (fk), plus onboarding bookkeeping
`onboarding_step`, `profile_completeness_pct`, `profile_last_updated`.

- **Identity/RLS**: row is the authenticated user (`auth.uid() = id`), policy `users_update_own`. Unchanged.
- **Validation**: `years_experience`, `total_projects_completed` are non-negative ints; `notable_clients` is a list of non-empty trimmed strings; phone is free-form text (Saudi formats accepted).

### `proposals`
- `scope_json` (jsonb) — extracted scope incl. `deliverables[]`, `field_confidence{}`.
- `artifact_json` (jsonb) — the rendered document: `{ sections: ArtifactSection[] }`. Sections carry `aiEditable` / protected flags. The 5 AI-editable prose sections: `cover_letter`, `understanding`, `approach`, `scope_of_work`, `assumptions`. Protected: `cover`, `timeline`, `pricing`, `milestones`, `about`, `terms`, `next_steps`, `verification`.
- `public_share` (bool), `share_token` (text, unique, **preserved when sharing is disabled**).
- Pricing fields (min/anchor/max + citation) — written only by the deterministic resolver.
- **State**: `draft → final → sent`; all three are editable (chat available in all per clarification).

### `proposal_versions`
- Append-only snapshots; reused for chat-edit history (`bumpAndPersist`). No change.

### `follow_up_question_templates`
- Retained as the **deterministic fallback** when AI is unconfigured. No change.

---

## Transient (not persisted) structures

These live only for the duration of a flow; no tables needed.

### ClarifyingQuestion (generated)
Shape mirrors `FollowUpTemplate`: `{ field_name, question_ar, question_en, options_json?: [{value,label_ar,label_en}], allow_skip }`. Returned from `generateProposal`, held in `ProposalFlow` client state, answers posted to `answerFollowUps` (which merges by `field_name`). Free-text questions omit `options_json`.

### ChatIntent (router output)
`{ target_section_ids: SectionId[] (subset of the 5 editable), instruction_per_section, scope_change?: { kind: 'add'|'remove', deliverable: string } }`. Transient; drives the streaming edit and (if `scope_change`) the confirmation card.

---

## Migration 1 — extend `users` UPDATE grants (fixes bug ⑧, unblocks onboarding)

`supabase/migrations/<timestamp>_grant_users_profile_update.sql`

Extend the column-level grant so `authenticated` may update the writable profile/onboarding
columns it already passes:

```
grant update (
  name, preferred_language, city, last_active,
  full_name_ar, full_name_en, brand_name_ar, brand_name,
  tagline_ar, tagline_en, bio_ar, bio_en, logo_url,
  years_experience, total_projects_completed, notable_clients, portfolio_samples,
  contact_email, contact_phone, contact_whatsapp, experience_tier_id,
  onboarding_step, profile_completeness_pct, profile_last_updated
) on public.users to authenticated;
```

**Deliberately excluded** (no privilege escalation): `role`, `pro_until`, quota columns,
`fl_verified*`. RLS (`users_update_own`) continues to scope rows; this changes only which
columns may be written, not which rows.

---

## Migration 2 — `get_shared_proposal_state` RPC (fixes bug ④)

`supabase/migrations/<timestamp>_share_state_rpc.sql`

A `SECURITY DEFINER`, read-only function that returns only a state string and leaks no
proposal content:

```
get_shared_proposal_state(p_token text) returns text  -- 'active' | 'disabled' | 'missing'
  active   := exists row where share_token = p_token and public_share = true
  disabled := exists row where share_token = p_token and public_share = false
  missing  := no row with share_token = p_token
```

`grant execute` to `anon` + `authenticated`. No table grants to anon (the existing
revoke stays). PDPL-safe: discloses only whether a token is active/disabled/absent.

---

## Honesty & integrity invariants (enforced by tests)

- AI paths (question generator, chat intent router, prose stream) never write `pricing`, `timeline`, `milestones`, or `terms` content.
- Any deliverable add/remove re-prices through `resolvePrice` + `computeProposalPrice` (deterministic, provenance-tagged) — never an LLM-authored number.
- The share-state RPC returns no proposal fields.
- New grant excludes role/billing/verification columns.
