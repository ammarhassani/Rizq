/**
 * Profile strength (feature 006) — a weighted 0..100 score over the profile,
 * surfaced in onboarding. Value-driving fields (specialty, experience, city,
 * rate, brand) weigh most; nice-to-haves least. Pure. Weights are tunable.
 */

export type CompletenessInput = {
  hasSpecialty?: boolean;
  hasExperience?: boolean; // tier or years
  hasCity?: boolean;
  hasRate?: boolean; // any of project-range / hourly / daily
  hasBrand?: boolean; // name (+ ideally logo)
  hasDefaults?: boolean; // payment/deposit defaults
  hasVat?: boolean;
  hasBio?: boolean;
  hasGoals?: boolean;
  hasPortfolio?: boolean; // platforms / samples
};

const WEIGHTS: Record<keyof CompletenessInput, number> = {
  hasSpecialty: 15,
  hasExperience: 15,
  hasCity: 10,
  hasRate: 15,
  hasBrand: 15,
  hasDefaults: 10,
  hasVat: 5,
  hasBio: 5,
  hasGoals: 5,
  hasPortfolio: 5,
};

export function profileCompleteness(input: CompletenessInput): number {
  let score = 0;
  for (const key of Object.keys(WEIGHTS) as (keyof CompletenessInput)[]) {
    if (input[key]) score += WEIGHTS[key];
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}
