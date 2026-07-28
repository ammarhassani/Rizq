# Specification Quality Checklist: Weight each source by the sample size it published

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

**Validation pass 1 — three issues found and fixed before this checklist was marked:**

1. *Success criteria carried implementation detail.* An earlier draft phrased SC-002 as
   "`row.confidence` averages ≥ 0.7 across `published_ref` rows" — a column name and a
   provenance enum. Rewritten as an observable outcome: average evidence strength rises by
   at least 30%.
2. *A guard was missing, not just unstated.* Raising confidence could push every cell into
   the top display band, at which point the band conveys nothing. Added FR-008 and SC-005 so
   the change is only correct if the display still discriminates.
3. *The "no price change" invariant was implicit.* This feature touches an input to the
   aggregation formula, and a reader could reasonably fear the bands move. Made explicit as
   FR-006 and SC-003.

**Deliberately left as an assumption rather than a clarification**: the band thresholds are
editorial judgement, not statistical derivation. Recorded as such in Assumptions. Asking the
founder to justify 50,000 vs 40,000 would produce a number no better founded than this one,
and the spec says so plainly instead of implying rigour it does not have.

**Constitution check**: Principle I (Honesty) is the driver here, not a constraint — FR-003
(absence of evidence is not evidence) and FR-009 (traceable to the publisher's own statement)
are the honesty requirements. Principle IV (test the money and the rules) is covered by
FR-007. No Arabic/RTL or mobile surface changes, so Principles II and III do not apply.
