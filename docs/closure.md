# Rizq — Project Closure Memo

| Field | Value |
|---|---|
| To | CTO |
| From | Engineering lead |
| Date | 2026-05-18 |
| Decision | **Project closed by founder.** |
| Repo state | Clean. All decisions committed. Nothing left half-built. |

---

## Decision

Rizq is closed. Not paused, not pivoted-in-place — closed, with the reasoning recorded honestly so it can be picked up later if the blocking condition changes.

## Why — in one sentence

A pricing authority with no legal source of real pricing data is not a pricing authority, and we proved there is no legal, abundant source of real Saudi freelance pricing data.

## The blocker, precisely

It is a data trilemma, not an engineering problem:

1. **Right-shaped data is legally off-limits.** Mostaql/Khamsat/Bahr hold real Saudi freelance prices. They expose no APIs, their ToS prohibit automated access, and — decisively — Saudi PDPL has **no publicly-available-data exemption**. A named freelancer's listed price is personal data; scraping it carries PDPL exposure (SDAIA actively enforcing) plus Anti-Cyber Crime Law exposure. Researched 2026-05-18, not assumed.
2. **Legal data is wrong-shaped.** The Saudi Open Data License cleanly permits commercial reuse, but the only relevant dataset (Etimad/government procurement) is B2G tenders — not freelance gig rates. Clean ≠ useful.
3. **Crowd data is zero and undependable.** Zero users at launch; founder-seeding is not a business. Correctly demoted to "luxury, never essential" — which leaves nothing essential producing real data.

Net: day-zero price = coarse published ranges (3–6× spreads, no city granularity) + LLM interpolation. Honest, but thin.

## Honest scoring (recorded 2026-05-18)

| Axis | Score |
|---|---|
| Honesty of sourcing (does it tell the truth about its data?) | 9 / 10 |
| Data quality / truthfulness day zero (is the number actually good?) | 3.5 / 10 |

The system was built to be honest about being weak — the right failure mode, but still weak. The founder closed on the substance score, correctly. There was no point engineering further on a 3.5 that has no inflow path to climb.

## What was actually sound (not wasted)

- **The reframe** — "Rizq is the proposal; price is the spine of it." Product thinking is correct and reusable.
- **The honesty architecture** (`spec.md` §2.7) — provenance-tagged data, citations that match reality, no fabricated sample sizes, auto-upgrading claims. This is genuinely good design and portable to any data product.
- **The shipped v0.1 app** — bilingual RTL Next.js, Supabase, auth, onboarding, quota, submissions, admin, error boundaries, methodology + legal pages. Hardened. It runs.
- **The spec** — `docs/spec.md` is a complete, legally-grounded, honestly-scoped technical spec. If the blocker lifts, build starts from there, not from scratch.

## What killed it (so it isn't relitigated)

Not engineering capability, not the moat idea, not honesty, not the LLM stack. Purely: **no legal abundant real-pricing source exists in this market today.** Every other layer was solvable. This one is exogenous.

## Conditions that would justify reviving it

Revive only if **one** of these becomes true:

1. A consented **data-license/partnership** with a Saudi freelance platform (right-shaped + legal). This is a BD outcome, not an engineering task.
2. A change in Saudi PDPL introducing a publicly-available-data basis (unlikely near-term; SDAIA trend is stricter, not looser).
3. The founder accepts a **reduced claim**: ship explicitly as an "LLM pricing *estimate* tool," dropping the authority/stamp positioning entirely. Viable, but a different, smaller product — and a deliberate decision, not a default.

Absent one of those, do not reopen.

## Handoff

- Full reasoning is in git history and `docs/` (`prd.md`, `engine.md`, `engine-research.md`, `spec.md`, this memo). The decision trail is the deliverable.
- v0.1 remains deployed and functional as-is; no teardown required unless the founder wants it.
- No code was written against the v0.2 spec — closure happened at spec approval, before implementation. Nothing to unwind.

---

**Closed honestly, on the data, before sinking build effort into an unwinnable position. That is the correct outcome, not a failure of execution.**
