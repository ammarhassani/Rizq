import { z } from "zod";
import { roundHalala } from "./halala";

/**
 * A SAR amount accepted from a user, constrained to halalas at the trust boundary.
 *
 * The form clamps as you type, but the server is where the rule has to hold: an amount of
 * 12345.678 reached the income ledger, the dashboard total and the HADAF eligibility view,
 * where it can never be paid or displayed exactly. Rounding here keeps ONE true value
 * everywhere instead of a display-vs-storage divergence.
 *
 * Positive only — "no income" is the absence of a row, not a zero or a negative one.
 */
export const moneySarSchema = z.number().positive().transform(roundHalala);
