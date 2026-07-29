# Feature Specification: Price the disagreement, not around it

**Feature Branch**: `013-family-mixture-estimator`

**Created**: 2026-07-29

**Status**: Draft

**Input**: Rebuild the pricing estimator per [`docs/pricing-council-verdict.md`](../../docs/pricing-council-verdict.md) — bias-adjusted mixture over evidence families, national bands, reflexivity instrumentation, composite bridge, honest cold-start display.

## Context

Rizq's benchmark holds 2,112 rows from 14 sources. They do not agree. Sources that price
Saudi work directly say roughly **twice** what foreign sources converted at purchasing power
say, while the unverifiable editorial seed says roughly **a quarter** of that again — a spread
of about 8× end to end, with no ground truth to rank them.

The current engine pools every row into one weighted percentile. A median over a set with two
clusters does not land between them; it lands in whichever cluster carries more weight and
**jumps** when the weights change. That was measured: a single adjustment to source confidence
moved 199 of 700 bands, with extremes of −85.9% and +44.4%. The freelancer sees a confident
three-number band with a quiet evidence label and no indication that the sources behind it
contradict each other 2-to-1.

An eleven-agent expert council reviewed the problem. Its central finding reframes the conflict:
**the peg-to-PPP ratio is 3.75 ÷ 1.85 = 2.03, and the measured disagreement between
Saudi-priced and converted sources (1.88× to 2.76×) brackets exactly that figure.** The regimes
are not describing different markets. They are mostly disagreeing about one currency
assumption — and since digital freelance work is partly sold abroad and partly sold locally,
the honest answer sits between the two conversions rather than at either end.

This feature rebuilds the estimator around that finding, retires the parts of the current
scoring machinery the council found indefensible, and stops the product claiming a precision
and a geography it cannot support.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A price whose sources disagree is presented as disagreeing (Priority: P1)

A freelancer looks up a specialty where a Saudi-priced source and a foreign converted source
differ by more than half again. Instead of one confident figure that silently favours whichever
source carries more weight, they see a band wide enough to contain both readings, and beneath
it the two readings named by where they came from — so they can pick the comparator that
matches their client.

**Why this priority**: This is the feature. Everything else supports it. It is also the only
part a freelancer experiences directly, and it is what makes the honesty claim true rather than
decorative.

**Independent Test**: Look up a specialty with a known 2× split between source groups. Confirm
the band spans both readings, both are named with their derivation, and the headline figure no
longer sits inside only one cluster.

**Acceptance Scenarios**:

1. **Given** a lookup whose evidence groups disagree by more than half again, **When** the
   freelancer views the result, **Then** the published range contains both groups' central
   figures, and each is shown separately, named by how it was derived.
2. **Given** a lookup whose evidence groups agree closely, **When** the freelancer views the
   result, **Then** a single band is shown with no separate readings — the disclosure appears
   only when there is disagreement to disclose.
3. **Given** any lookup, **When** the weight given to a source is changed by a fifth in either
   direction, **Then** the headline figure moves by less than 5% — the band must stop lurching
   between regimes.
4. **Given** a lookup with disagreeing sources, **When** the freelancer shares the resulting
   proposal or invoice with a client, **Then** neither the separate readings, the range, nor
   the evidence composition appear on the client's copy.

---

### User Story 2 — The product stops claiming to know about cities (Priority: P1)

A freelancer in Jeddah and one in Riyadh currently receive different prices. No published source
Rizq cites distinguishes Saudi cities — every one of the 492 rows from real publications is
national, and the only city-level differentiation in the product comes from unverifiable
editorial data. The product should say prices are national until a city genuinely earns its own
figures from local contributions.

**Why this priority**: Equal to Story 1. Asking someone to choose a city that changes the answer
on no evidence is the clearest honesty failure in the product, and collapsing the axis
concentrates the grid roughly sevenfold, which is what makes contributed data reach the
disclosure threshold in a plausible timeframe rather than never.

**Independent Test**: Run the same lookup for two different cities and confirm identical bands
plus a visible statement that pricing is currently national.

**Acceptance Scenarios**:

1. **Given** two lookups identical except for city, **When** both are run, **Then** they return
   the same band, and the result states that pricing is national because no published source
   distinguishes Saudi cities.
2. **Given** a city that has accumulated contributions from at least 3 distinct freelancers for
   a specialty and experience level, **When** a lookup is run for that city, **Then** that
   city's own figures are used and the result says so.
3. **Given** the retirement of city-level editorial rows, **When** any lookup runs, **Then** the
   number of records reported behind it does not increase — collapsing the axis must not inflate
   the apparent evidence.

---

### User Story 3 — What the freelancer was told is recorded before they price (Priority: P1)

When a freelancer creates a proposal, the figure Rizq showed them is recorded alongside whether
they saw it before choosing their own price. Without this, every future attempt to learn from
real transactions measures how persuasive Rizq's suggestion was rather than what the market
actually pays.

**Why this priority**: P1 despite being invisible. It is cheap now and impossible to
reconstruct later — every transaction that happens before it ships is permanently uninformative
for calibration. Three of the council's five reviewers identified this independently; none of
the five experts did.

**Independent Test**: Create a proposal, then confirm a record exists holding the band shown,
the anchor, the evidence composition, and whether the band was displayed before the price was
entered.

**Acceptance Scenarios**:

1. **Given** a freelancer creates a proposal, **When** it is saved, **Then** the band shown at
   that moment and whether they had seen it before pricing are both recorded.
2. **Given** onboarding asks for the freelancer's usual rate, **When** the step runs, **Then**
   the rate is captured before any Rizq price estimate is displayed to them.

---

### User Story 4 — A price that rests only on foreign estimates says so first (Priority: P2)

For the 14 specialties with no Saudi-priced source, the result leads with what the evidence
actually is, shows an approximate figure rounded to a coarse step rather than a precise-looking
one, and frames it as a negotiation floor. A freelancer quoting a client learns whether they are
holding a measurement or an estimate before they read the number.

**Why this priority**: The failure today is presentation, not data — visual hierarchy is itself
a claim, and the current hierarchy says "certain" while a footnote whispers "derived". Ranks
below the estimator work because it depends on the composition data that work produces.

**Independent Test**: Look up a foreign-only specialty and a Saudi-backed one; confirm the two
cards differ in emphasis, precision and wording.

**Acceptance Scenarios**:

1. **Given** a specialty with no Saudi-priced source, **When** the result renders, **Then** the
   evidence statement appears before the figure, the figure is marked approximate and rounded to
   a coarse step, and it is framed as a starting point rather than a market price.
2. **Given** any result, **When** the evidence is labelled, **Then** the label names how the
   figure was derived and does not rank one derivation above another.
3. **Given** a specialty short of the contribution threshold, **When** the result renders,
   **Then** it shows progress toward that threshold and invites the freelancer to contribute.

---

### User Story 5 — Assumptions become data that can be corrected (Priority: P3)

The constants that convert a foreign or salaried figure into a Saudi freelance project price are
recorded as cited, revisable assumptions rather than embedded in the numbers at ingestion. When
a better value is learned, prices update without re-importing anything.

**Why this priority**: Enables everything later and blocks nothing now. Ranked last because no
freelancer sees it and no calibration can happen until Stories 1–3 exist.

**Independent Test**: Change an assumption and confirm every affected price updates, with the
citation naming the assumption applied and its basis.

**Acceptance Scenarios**:

1. **Given** a stored figure from a foreign source, **When** an assumption behind its conversion
   changes, **Then** the resulting price changes without the source being re-imported.
2. **Given** any converted price, **When** its provenance is inspected, **Then** the original
   published figure, its unit, and each assumption applied are all recoverable.
3. **Given** hours-per-project figures gathered from freelancers, **When** at least 5 exist for a
   specialty and size, **Then** they replace the assumed figure and the provenance says which
   basis was used.

---

### Edge Cases

- **A cell holds only one evidence group.** No disagreement can exist, so no separate readings
  are shown; the band reflects that group's own spread and the result is not presented as
  corroborated.
- **Every group in a cell is editorial.** Editorial evidence may not anchor a price where any
  cited source exists, and where none exists the result must be marked as resting on
  unverifiable evidence.
- **Groups disagree so far apart the band becomes uselessly wide.** A band spanning 8× is not a
  usable answer; the result must say the evidence does not support a single price rather than
  emit a range nobody can quote.
- **Collapsing the city axis leaves duplicate national rows.** The same figure repeated seven
  times is one observation, not seven, and must not inflate the reported evidence.
- **A freelancer prices without ever seeing a Rizq estimate.** This is the most valuable
  observation the system can collect and must be recorded as such, not treated as missing data.
- **A contributed price is wildly out of range.** Extreme values must not swing an assumption;
  their influence is bounded.
- **Contributions arrive for a cell below the disclosure threshold.** They are stored but do not
  surface and do not calibrate until the threshold is met.

## Requirements *(mandatory)*

### Functional Requirements

**The estimator**

- **FR-001**: The system MUST group evidence by how it was derived, and MUST treat each group
  rather than each individual record as the unit from which a price is estimated.
- **FR-002**: Each group MUST carry a declared, cited adjustment representing how far that
  derivation is believed to sit from a true Saudi freelance price, and that adjustment MUST be
  inspectable and revisable without changing stored source figures.
- **FR-003**: The published range MUST be derived so that disagreement between groups **widens**
  it. Where groups disagree beyond the disclosure threshold, the range MUST contain each group's
  central figure.
- **FR-004**: Changing the weight assigned to any single source by a fifth MUST move a headline
  figure by less than 5%.
- **FR-005**: The system MUST record, for each result, which groups contributed and how many
  distinct sources stood behind each.
- **FR-006**: The current accumulation score, the disagreement multiplier and the standalone
  sample multiplier MUST be removed. The disagreement threshold survives only as the trigger
  that decides whether separate readings are displayed.
- **FR-007**: Where any cited source exists for a cell, unverifiable editorial evidence MUST NOT
  determine the headline figure; it may inform the outer range only.

**Geography**

- **FR-008**: Prices MUST be national by default, and every result MUST state that no published
  source distinguishes Saudi cities.
- **FR-009**: Retiring city-level editorial rows MUST NOT increase the evidence reported behind
  any result. Duplicated national figures MUST be consolidated, not merely relabelled.
- **FR-010**: A city MUST regain its own figures once at least 3 distinct freelancers have
  contributed for that city, specialty and experience level — the privacy threshold and the
  geography threshold are the same threshold.
- **FR-011**: Contributions MUST continue to record the freelancer's real city even while
  prices are national.

**Learning from reality**

- **FR-012**: At proposal creation the system MUST record the band shown, the headline figure,
  the evidence composition, and whether the freelancer saw the estimate before entering their
  own price.
- **FR-013**: Onboarding MUST capture the freelancer's stated rate **before** displaying any
  Rizq estimate to them.
- **FR-014**: Calibration MUST use the difference between what Rizq suggested and what the
  freelancer charged, never the charged price alone.
- **FR-015**: Calibration MUST draw only on cells meeting the 3-contributor threshold, MUST
  bound the influence of extreme values, and MUST be inert with no observations — producing
  results identical to today until real data arrives.
- **FR-016**: Recorded prices MUST NOT be described as verified in any language. No payment
  verification exists.

**Assumptions as data**

- **FR-017**: Conversions MUST be applied when a price is computed, not baked in at import. The
  originally published figure and its unit MUST be retained.
- **FR-018**: The constants converting a salary to a freelance rate MUST be treated as a single
  composite assumption, since only their product affects any price. They MUST NOT be calibrated
  separately.
- **FR-019**: Hours per project size MUST become recorded data carrying its own provenance
  (assumed, stated by freelancers, or measured), and MUST NOT be inferred from paid amounts
  divided by a Rizq-suggested rate.
- **FR-020**: Every price MUST be able to state which assumptions produced it and on what basis.

**Presentation**

- **FR-021**: Results resting only on foreign-derived evidence MUST lead with the evidence
  statement, mark the figure approximate, round it to a coarse step, and frame it as a starting
  point.
- **FR-022**: Evidence labels MUST name the derivation and MUST NOT rank derivations against one
  another.
- **FR-023**: Separate readings, evidence composition, the range and contribution progress MUST
  all be excluded from anything a client sees.
- **FR-024**: All new user-facing text MUST ship in Arabic and English and follow the
  established numeral and counted-noun conventions.

### Key Entities

- **Evidence group** — a set of records sharing a derivation, and therefore sharing an error.
  The unit the estimator works in. Carries a central figure, a spread, a declared adjustment and
  the sources behind it.
- **Adjustment** — a cited, revisable belief about how far a group's derivation sits from the
  truth. Includes the currency assumption, expressed as a position between the two defensible
  conversions rather than a choice of one.
- **Band snapshot** — what a freelancer was shown at the moment they priced, plus whether they
  saw it first. The instrument that makes later learning meaningful.
- **Hours record** — assumed, stated or measured effort for a specialty and project size,
  carrying its provenance and count.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Perturbing any single source's weight by ±20% moves headline figures by less than
  5%, against a measured baseline where an equivalent change moved 199 of 700 results with
  extremes beyond ±44%.
- **SC-002**: For every result whose evidence groups disagree beyond the threshold, the published
  range contains both groups' central figures.
- **SC-003**: Two lookups differing only by city return identical results, and every result
  states that pricing is national.
- **SC-004**: The evidence reported behind any result after the city consolidation is no greater
  than before it.
- **SC-005**: With no contributed observations, every published price is unchanged by the
  calibration mechanism.
- **SC-006**: Every proposal created after release has a record of what was shown and whether it
  was seen before pricing.
- **SC-007**: No client-facing document contains a range, a group breakdown, an evidence label or
  contribution progress.
- **SC-008**: Any price can be traced to its originally published figure, its unit, and each
  assumption applied, without consulting application code.
- **SC-009**: Results for specialties with no Saudi-priced source are visibly distinguishable
  from those with one, in wording and in stated precision.

## Assumptions

- The disclosure threshold for disagreement stays at the ratio already computed in the engine
  (one and a half times between group central figures). It was chosen as an editorial judgement
  and remains one.
- The currency assumption is expressed as a position between two independently defensible
  conversions — purchasing power and the currency peg — with a starting position at the midpoint.
  The midpoint is an assumption, cited as such; the council's finding is that the truth lies
  between them, not where between.
- The privacy threshold of 3 distinct contributors is reused unchanged as the geography
  threshold. This is deliberate reuse, not coincidence.
- Coarse rounding for derived-only figures is to the nearest 500 SAR.
- No new runtime dependency is introduced. Every calculation has a closed form; no sampling or
  iterative fitting is required at request time.
- Editorial evidence is retained rather than deleted. It was retired once during investigation
  and restored when removing it lowered rather than raised the quality of the result.
- The existing privacy, redaction and consent machinery is reused unchanged. This feature adds
  no new personal data and no new sharing surface.
