/**
 * VAT eligibility — who may put a VAT line on an invoice.
 *
 * KSA rule: collecting VAT while unregistered is a violation, and a tax invoice without the
 * seller's registration number is invalid. Both facts must hold before the form offers VAT.
 *
 * PURE: no React, no Supabase. Contract: specs/011-power-user-pass-3/contracts/vat-eligibility.md
 */

export type VatIneligibleReason = "not_registered" | "missing_number";

export type VatEligibility =
  | { eligible: true; vatNumber: string }
  | { eligible: false; reason: VatIneligibleReason };

/**
 * Eligible only when the profile says registered AND carries a non-empty registration number.
 * Either alone is not enough.
 */
export function resolveVatEligibility(
  vatRegistered: boolean | null | undefined,
  vatNumber: string | null | undefined,
): VatEligibility {
  if (vatRegistered !== true) return { eligible: false, reason: "not_registered" };

  const trimmed = (vatNumber ?? "").trim();
  if (trimmed.length === 0) return { eligible: false, reason: "missing_number" };

  return { eligible: true, vatNumber: trimmed };
}
