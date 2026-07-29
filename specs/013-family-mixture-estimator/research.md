# Phase 0 Research: family mixture estimator

Phase 0 was executed as an eleven-agent expert council over
[`docs/pricing-problem-statement.md`](../../docs/pricing-problem-statement.md): five disciplinary
lenses (Bayesian statistician, Gulf labour economist, uncertainty-UX designer, data-flywheel
strategist, red-team skeptic), each adversarially critiqued by a hostile reviewer, then
synthesized. The full verdict is [`docs/pricing-council-verdict.md`](../../docs/pricing-council-verdict.md);
this file records the decisions that bind implementation and the alternatives that died.

## Decision 1 — the disagreement is mostly one currency assumption

**Decision**: Model the currency bridge as a position λ between the two independently defensible
conversions rather than a choice of one. λ = 0 is purchasing power (1.85), λ = 1 is the currency
peg (3.75), default 0.5, declared and cited as an assumption.

**Rationale**: `3.75 ÷ 1.85 = 2.03`. The measured Saudi-priced ÷ PPP-converted ratios are 1.88×,
2.05×, 2.33×, 2.68× and 2.76× — they bracket 2.03. The two "regimes" are therefore not describing
two markets; they are largely disagreeing about one conversion. Digital freelance work is partly
tradable (sold abroad) and partly non-tradable (sold to Saudi clients), which is exactly the
condition under which neither pure conversion is right.

This is the only Q1 mechanism that survived its critique intact, it is closed-form, and it
degrades honestly: with no evidence about λ the position stays at the midpoint and the band is
wide. It also repairs the majority of the grid — for the 14 specialties with no Saudi-priced
source, every family crosses the same PPP bridge, so their errors co-move and the current engine
leaves a known understatement in every headline. λ lifts those cells by a declared amount.

**Alternatives rejected**:
- *Anchor on the least-transformed family.* Regime-picking wearing a principle. It crowns
  Robert Walters — a single source crossing the uncalibrated employment bridge — as truth.
- *Geometric mean of family medians.* Self-refuting: averages in, at full weight, a pool the same
  analysis declared 1.5–2× biased.
- *DerSimonian–Laird random effects.* τ² estimated from k = 2 families is one degree of freedom.
  Statistical authority without statistical content.

## Decision 2 — evidence groups estimate, rows do not

**Decision**: The estimation unit is the evidence family. Each family yields a weighted log-median
and a spread; families are bias-adjusted, then combined as a precision-weighted log-normal
mixture; the band is the mixture's p10/p50/p90 found by bisection.

**Rationale**: Rows within a family share a derivation and therefore share an error — three rows
from one document are not three witnesses. Pooling rows across regimes is the root defect: a
weighted median over a bimodal set lands in whichever cluster carries more weight and jumps when
weights change (measured: 199 of 700 bands moved, −85.9% to +44.4%). A mixture cannot jump, because
every component is present in the result; when components disagree the mixture's tails widen.

**Alternatives rejected**:
- *Keep pooled percentiles and fix the weights.* No weighting makes a bimodal pool unimodal.
- *Report only the strongest family.* Discards corroboration and reintroduces regime-picking.

## Decision 3 — three mechanisms shipped this week are indefensible

**Decision**: Delete the noisy-or accumulation, the agreement multiplier and the standalone
sample factor. Keep the 1.5× spread comparison purely as a display trigger.

**Rationale**: `1 − Π(1 − w)` treats provenance weights as probabilities of independent events.
They are not probabilities of anything, so the output is a heuristic monotone in family count
dressed as a credence — no critique defended it. The agreement multiplier shrinks a number the
user never sees; disagreement should instead **widen the visible band** and surface the readings,
which is structure the freelancer can act on. Sample size belongs inside a family's component
variance (bigger sample → tighter component → more mixture weight), not as a separate global
multiplier applied after the fact.

**Consequence**: `evidenceStrength`'s limited/moderate/good tiers die with the score they read.
Composition replaces them — which families fed this, and how many sources stood behind each.

## Decision 4 — city is not a pricing axis

**Decision**: National bands. City retained on contributions; a city regains its own figures at
≥ 3 distinct contributors for that (city, specialty, tier), reusing the existing k-anonymity gate.

**Rationale**: 0 of 492 rows from cited publications carry a city. All city differentiation comes
from the unverifiable editorial seed. This was the council's strongest consensus and the
document's own "lie of interface". Collapsing the axis also concentrates the grid ~7× (700 cells →
~100), which is the difference between contributed data reaching the 3-contributor gate in months
versus never.

**Engineering trap, caught in critique**: do **not** simply NULL `city_id` on the fanned seed rows.
`resolve.ts` treats a NULL city as *supports every city*, so nulling converts ~7 duplicate rows per
(specialty, tier) into 7 wildcards — inflating apparent evidence sevenfold while preserving the
fabricated city deltas as fake spread. The migration must **dedupe to one national triple** per
(specialty, tier, size) and deactivate the copies. Keeping the min/median/max triple (not a single
row) preserves `MIN_SAMPLE = 3` for editorial-only cells.

**Alternatives rejected**:
- *GaStat regional wage multiplier.* The critique could not confirm a citable region-level series
  exists. A load-bearing multiplier may not rest on data whose citable existence is unverified.
- *Cost-of-living index (Numbeo etc.).* A consumption-basket ratio applied to service prices is
  precisely the invented-bridge class this feature exists to retire, and the available sources
  contradict each other.

## Decision 5 — calibrating on paid prices measures our own persuasiveness

**Decision**: Record the band at proposal creation plus whether the freelancer saw it before
pricing. Calibrate on the **deviation** between suggestion and charge, never on the charge alone.
Elicit the onboarding stated rate before any estimate is displayed.

**Rationale**: Rizq shows a band, the freelancer quotes near it, the client pays near the quote —
so `ln(paid / anchor) ≈ 0` regardless of what the market would have borne. The posterior converges
to Rizq's own prior. Three of five hostile reviewers found this independently; none of the five
experts did. Only deviations carry information the anchor did not already contain, and the stated
rate captured pre-anchor is the single clean observation available per user.

This instrumentation must ship **before** any calibration code consumes a transaction. Every
proposal created without it is permanently uninformative.

**Also decided**: calibration reads only k-anonymous cells, winsorizes at ±ln 3, and is inert at
n = 0 — producing byte-identical bands until real data exists, so it ships at zero risk.

## Decision 6 — only the product of the three constants is identifiable

**Decision**: Treat 1250 billable hours × 1.25 overhead × 1.30 premium as **one** composite
employment bridge (≈ 2.7× the employment hourly wage), documented as a decomposition with its
citations. Never calibrate the three separately. Hours move to a provenance-carrying table fed by
stated and measured values.

**Rationale**: The three enter every price only as a product; regressing observations against them
recovers nothing but that product. Four of five analyses reached this independently and every
critique endorsed it. The composite sits at the aggressive edge of the practitioner literature's
2–2.5× range, so it is a defensible prior with wide uncertainty rather than a value to re-tune.

**Banned, and it matters**: inferring hours from `paid ÷ hourly anchor` is circular — the user
quoted the anchor, so the "measurement" returns the constant it was built to test. Three separate
critiques caught three separate experts proposing it.

## Decision 7 — transforms move to computation time

**Decision**: Store `price_original` and `original_unit`; apply currency, employment and hours
transforms in `applyBridges()` at aggregation.

**Rationale**: Every transform is currently baked in at ingestion, so revising any assumption means
re-importing 2,112 rows. Since the whole point of λ and the calibration path is that assumptions
change, transforms applied at read time are a precondition for the rest of the feature. Also lets
the citation print the exact transform applied to the exact published figure.

## Open items carried into implementation

None blocking. The **location** of λ is genuinely open by design — it is the number first-party
data exists to settle, and the estimator is built so that settling it requires no structural change.
