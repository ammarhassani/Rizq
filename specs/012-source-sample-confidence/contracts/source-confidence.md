# Contract: source sample size → confidence

Internal library contract. Two consumers: the collectors (write path) and the backfill
migration (one-off). No HTTP surface, no client bundle.

## `sourceConfidence(publishedSample)`

```ts
// src/lib/pricing/sourceConfidence.ts
export const SAMPLE_CONFIDENCE_BANDS: ReadonlyArray<{ min: number; confidence: number }>;
export const UNSTATED_SAMPLE_CONFIDENCE = 0.5;

export function sourceConfidence(publishedSample: number | null | undefined): number;
```

### Behaviour

| Input | Output | Note |
|---|---|---|
| `182000` | `0.9` | ≥ 50,000 |
| `50000` | `0.9` | boundary, inclusive |
| `49999` | `0.8` | boundary, exclusive above |
| `23928` | `0.8` | |
| `5000` | `0.8` | boundary, inclusive |
| `4999` | `0.7` | |
| `500` | `0.7` | boundary, inclusive |
| `499` | `0.6` | |
| `50` | `0.6` | boundary, inclusive |
| `49` | `0.5` | |
| `38` | `0.5` | below the smallest band |
| `null` / `undefined` | `0.5` | publisher stated no sample |
| `0` / `-1` | `0.5` | implausible → treated as unstated |
| `NaN` / `Infinity` | `0.5` | non-finite → treated as unstated |
| `1500.7` | `0.7` | non-integer accepted; band is a range test, not an equality |

### Guarantees

1. **Total** — returns a number for every input, never throws. A bad upstream figure must
   degrade to caution, not break an ingest.
2. **Monotonic non-decreasing** — a larger stated sample never yields lower confidence.
3. **Never exceeds 0.9** — the top band is the ceiling; there is no input that returns 1.0.
4. **Unstated is never rewarded** — every non-positive, non-finite and missing input returns
   exactly `UNSTATED_SAMPLE_CONFIDENCE`, which is also the value of the lowest stated band.
   Absence of evidence lands where the weakest evidence lands, and no lower — the column is a
   claim about sample size, not a penalty.

## Ingestion contract

`BenchmarkRow` (in `src/lib/pricing/collectors/types.ts`) gains:

```ts
/** Observations the publisher states stand behind THIS figure. null = none stated. */
published_sample?: number | null;
```

Collector obligations:

- A collector for a published source MUST set `published_sample` from the publisher's own
  statement, and MUST set `confidence` to `sourceConfidence(published_sample)`.
- A collector MUST NOT hardcode `confidence`. `publishedRef` (0.6) and `openData` (0.4) do
  today; both are changed.
- Where a source states a per-discipline sample, the collector MUST pass the **discipline**
  figure, not the headline total.
- Where a source states a range or approximation, the collector MUST pass the conservative
  end ("over 1,100" → `1100`; "nearly 2,000" → `1900`, never `2000`).

`run_ingestion` persists `published_sample` alongside the existing fields. Rows that omit it
insert NULL and therefore read as unstated — the safe default.

## Non-obligations

- The function does not read the database and does not know what a `source_ref` is.
- It does not apply to `founder`, `reasoned` or `submitted` rows. That scoping lives at the
  call sites and in the backfill's `WHERE`, deliberately: a pure mapping should not carry a
  provenance taxonomy it would then have to be kept in sync with.
