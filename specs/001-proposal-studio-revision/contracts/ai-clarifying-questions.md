# Contract — AI Clarifying Questions (Feature ①)

Replaces the fixed `follow_up_question_templates` selection with brief-specific,
AI-generated questions. Keeps the existing answer/merge/pricing path untouched.

## Generator (new) — `lib/ai/followups.ts`

```
generateFollowUps(input: {
  brief_text: string
  scope: Scope            // from extractScope, incl. field_confidence
}): Promise<ClarifyingQuestion[]>   // length 0–3
```

**Output schema (Zod, validated):**
```
ClarifyingQuestion = {
  field_name: string          // SHOULD match a Scope key when the answer must affect price
  question_ar: string
  question_en: string
  options_json?: Array<{ value: string|number, label_ar: string, label_en: string }>  // present ⇒ quick-select; absent ⇒ free-text
  allow_skip: boolean         // default true
}
```

**Behavior**
- Targets only fields that are genuinely missing/ambiguous (low `field_confidence`) and that change scope or price. Max 3.
- Categorical → emit `options_json`; open-ended → omit it (free-text). (Clarification: mixed format.)
- **Fallback:** when `isAIConfigured()` is false or the call errors/times out, return the deterministic table selection (`selectFollowUps`) so generation always proceeds (FR-009).
- AI-labeled per FR-010.

## Integration points (unchanged shapes)
- `generateProposal(...)` returns `follow_ups: ClarifyingQuestion[]` from `generateFollowUps(...)` instead of the table query. Same return field name → `ProposalFlow` unaffected.
- `answerFollowUps({ proposal_id, answers })` is **unchanged**: `applyAnswers` merges `answers[field_name] → scope[field_name]`, bumps confidence to 1.0, re-prices, rebuilds the artifact.
- `FollowUpCards.tsx`: **add a free-text input branch** for questions without `options_json` (today it only renders quick-select buttons). Answer collection still keyed by `field_name`.

## Acceptance mapping
FR-006, FR-007, FR-008, FR-009, FR-010 · SC-003. Edge: AI down → table fallback; complete brief → 0 questions.
