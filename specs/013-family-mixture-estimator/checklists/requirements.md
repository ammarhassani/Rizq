# Specification Quality Checklist: Price the disagreement, not around it

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-29
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

**Validation pass 1 — four rewrites before this checklist was marked:**

1. *The whole spec was written in implementation vocabulary.* The first draft named log-normal
   mixtures, noisy-or, `applyBridges`, `band_snapshots`, λ and file paths throughout — readable
   to the engineer who just ran the council, opaque to anyone else, and untestable as stated.
   Every requirement was rewritten to describe observable behaviour. The mechanism survives in
   [plan.md](../plan.md), where it belongs. FR-006 is the one place a current mechanism is named,
   because "remove the thing that exists today" cannot be expressed without naming it.

2. *Success criteria quoted internals.* An earlier SC read "family medians bracket the anchor".
   Now SC-002 states the published range contains both groups' central figures — checkable by
   reading a result, not by reading a data structure.

3. *SC-001 needed its baseline or it was unfalsifiable.* "Stable under reweighting" means nothing
   without the measured 199-of-700 / −85.9% / +44.4% it is replacing. Added.

4. *Two edge cases were missing and both are real.* A band so wide it is unquotable (the honest
   answer is to decline a single price, not to emit an 8× range), and duplicate national rows
   after the city collapse inflating apparent evidence — a trap the council caught in review and
   the first draft had not carried across.

**Deliberately left as assumptions rather than clarifications**: the 1.5× disclosure threshold,
the currency midpoint, and the 500 SAR rounding step are all editorial judgements. Asking the
founder to justify 1.5 over 1.6 would produce a number no better founded. The spec says so
plainly in Assumptions instead of implying rigour it does not have.

**Constitution check**: Principle I (Honesty) is the driver, not a constraint — FR-003, FR-007,
FR-016, FR-021 and FR-022 are all honesty requirements, and FR-016 exists specifically because no
payment verification exists to justify the word. Principle IV (test the money and the rules) is
covered by SC-001 and SC-005, both of which are regression assertions over pricing. Principle II
(Arabic-first) is FR-024. Principle VI (PDPL) is untouched by design — FR-010 reuses the existing
3-contributor threshold rather than introducing a new disclosure rule.
