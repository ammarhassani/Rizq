import type { BenchmarkProvenance } from "./provenance";

/**
 * Which body of evidence a row belongs to.
 *
 * The cell score accumulates evidence rather than averaging it — two sources agreeing should
 * raise confidence, not dilute it. But accumulation only holds for INDEPENDENT evidence, and
 * most of this corpus is not independent: a Stack Overflow salary and a Robert Half salary
 * both cross the same employment→freelance bridge and then the same PPP conversion, using the
 * same PROJECT_HOURS assumption. Their errors move together. Treating them as two independent
 * confirmations would manufacture confidence out of one shared set of assumptions.
 *
 * So rows are grouped into families that share a derivation. Within a family the strongest row
 * stands for the family — the others corroborate nothing it does not already say. Across
 * families the evidence accumulates, because a freelancer's own invoice and a UK day-rate
 * survey really can fail in different directions.
 *
 * PURE.
 */
export type EvidenceFamily =
  | "first_party"
  | "freelance_rate"
  | "salary_bridged"
  | "open_data"
  | "editorial";

/**
 * Sources whose figures are salaries put through the employment→freelance bridge before the
 * PPP conversion. Matched on citation because that is where the derivation is recorded; the
 * refresh skill keeps these strings current.
 */
const SALARY_BRIDGED = ["Stack Overflow", "Robert Half"];

/** The unverifiable seed: editorial judgement wearing a published-reference label. */
const EDITORIAL_REFS = ["Saudi-adjusted global freelance reference", "Rizq founder editorial seed"];

export function evidenceFamily(
  provenance: BenchmarkProvenance,
  sourceRef: string | null | undefined
): EvidenceFamily {
  // A freelancer's own transaction is the only genuinely independent evidence here: it is not
  // derived from anybody else's survey and does not pass through the PPP bridge.
  if (provenance === "submitted") return "first_party";

  // Editorial and model-reasoned rows are judgement, not observation, whatever label they
  // carry. The seed is filed here despite being stored as `published_ref` because it is a
  // single undated document with no stated sample — grouping it with real rate reports would
  // let it corroborate them.
  if (provenance === "founder" || provenance === "reasoned") return "editorial";
  const ref = sourceRef ?? "";
  if (EDITORIAL_REFS.some((r) => ref.startsWith(r))) return "editorial";

  if (provenance === "ingested") return "open_data";
  if (SALARY_BRIDGED.some((r) => ref.startsWith(r))) return "salary_bridged";

  // Published freelance/contractor rates: quoted rates rather than salaries, so they skip the
  // employment bridge even though they still cross PPP.
  return "freelance_rate";
}
