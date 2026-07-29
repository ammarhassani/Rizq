# Contract: the family mixture estimator

Internal library contract. Pure TypeScript, no I/O, no dependency. Consumers: `aggregate.ts`
(every price the product shows) and the unit tests. No HTTP surface, no client bundle.

## `familyBias.ts`

```ts
export type FamilyPrior = {
  /** Mean log-offset: how far this derivation is believed to sit from a true Saudi freelance price. */
  mu: number;
  /** Prior sd on that offset. Wide = we are guessing. */
  tau: number;
  /** Why this number. Printed in the methodology page, not just the code. */
  rationale: string;
  source_ref: string | null;
  as_of: string;
};

export const FAMILY_PRIORS: Record<EvidenceFamily, FamilyPrior>;

/** λ ∈ [0,1]: 0 = purchasing power (1.85), 1 = the currency peg (3.75). Default 0.5. */
export const TRADABILITY_DEFAULT = 0.5;
export function currencyBridge(lambda: number): number;   // exp(lerp(ln 1.85, ln 3.75, λ))
```

**Guarantees**

| | |
|---|---|
| `currencyBridge(0)` | `1.85` |
| `currencyBridge(1)` | `3.75` |
| `currencyBridge(0.5)` | `√(1.85 × 3.75) ≈ 2.634` — geometric, because bridges compose multiplicatively |
| monotonic | λ↑ ⇒ bridge↑ |
| out-of-range λ | clamped to [0,1], never throws |

Interpolation is in **log space**. A currency bridge is a multiplier; the midpoint between two
multipliers is their geometric mean, not their arithmetic one. Arithmetic interpolation would put
the default at 2.80 and quietly favour the peg.

## `latentTruth.ts`

```ts
export type FamilySummary = {
  family: EvidenceFamily;
  /** Weighted median of ln(price) within the family. */
  logMedian: number;
  /** Dispersion within the family, in log space. */
  logSpread: number;
  sourceCount: number;
  rowCount: number;
  /** Largest published sample behind any source in this family; drives component precision. */
  publishedSample: number | null;
};

export type Band = {
  min: number; anchor: number; max: number;
  kind: 'agreed' | 'disagreement' | 'insufficient';
  families: Array<{ family: EvidenceFamily; adjusted: number; sourceCount: number }>;
  /** max(adjusted) / min(adjusted) across families; 1 when a single family. */
  spread: number;
};

export function summariseFamilies(rows: WeightedRow[]): FamilySummary[];
export function combine(summaries: FamilySummary[], priors: typeof FAMILY_PRIORS): Band;
```

### Behaviour

1. **Bias-adjust.** Each family's `logMedian` shifts by `−prior.mu`. The adjustment is toward the
   others, never away.
2. **Weight by precision.** Component precision rises with published sample and falls with
   `logSpread` and `prior.tau`. A 100,000-respondent survey outweighs a 38-respondent one; a
   family we barely trust (`tau` large) contributes width, not location.
3. **Mix.** The band is p10 / p50 / p90 of the precision-weighted log-normal mixture, found by
   bisection on its CDF. **Every component is present in the result** — this is the property that
   kills the lurch, because no reweighting can evict a cluster from a mixture the way it can flip
   a median.
4. **Classify.**
   - `spread ≤ 1.5` → `agreed`
   - `1.5 < spread ≤ 5` → `disagreement`; the band widens to the envelope of the family
     interquartile ranges, and the card shows the readings named
   - `spread > 5` → `insufficient`; the honest output is that the evidence does not support a
     single price. The card refuses rather than emitting an 8× range nobody can quote.
5. **Editorial never anchors.** Where any cited family exists, `editorial` contributes to the
   outer range only and is excluded from the anchor (FR-007).

### Invariants (asserted in tests)

| Invariant | Why it exists |
|---|---|
| `min ≤ anchor ≤ max` | Existing `Aggregate` contract |
| Perturbing any one source's weight ±20% moves `anchor` <5% | **SC-001** — replays the measured 199-of-700 lurch |
| When `kind = 'disagreement'`, `[min, max]` contains every family's adjusted median | **SC-002** — the band must not sit inside one cluster |
| Single family ⇒ `spread === 1`, `kind !== 'disagreement'` | One body of evidence cannot contradict itself |
| Adding a row to an existing family never moves `anchor` more than adding a new family does | Corroboration must not outweigh independent evidence |
| Empty input ⇒ `null` | Existing `aggregate()` contract |
| All-editorial ⇒ `kind` reflects unverifiable basis | FR-007 |

## `bridges.ts`

```ts
export type StoredRow = {
  price_original: number;
  original_unit: 'sar_project' | 'sar_month' | 'usd_hour' | 'usd_year' | 'gbp_day';
  specialty_slug: string;
  project_size: ProjectSize;
};

export function applyBridges(row: StoredRow, cal: Calibration): {
  price_sar: number;
  transforms: string[];   // human-readable, printed in the citation
};
```

**Obligations**

- Transforms apply at computation, never at ingestion. `price_original` and `original_unit` are
  immutable once written.
- The employment bridge is **one composite** (≈2.7×). Its decomposition (1250 h × 1.25 × 1.30) is
  documentation and MUST NOT be calibrated component-wise — only the product is identifiable
  (FR-018).
- `transforms` returns the exact chain applied, so the citation can state it.
- Pure. Takes calibration as a parameter; never reads a table.

## Non-obligations

- No module here knows what a `source_ref` string means. Family classification stays in
  `evidenceFamily.ts`.
- No module here reads the database. `resolve.ts` fetches; these transform.
- Nothing here decides display. `band_kind` and `families[]` are data; the card decides wording.
