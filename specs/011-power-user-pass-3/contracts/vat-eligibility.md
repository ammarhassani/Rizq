# Contract — When an invoice may carry VAT

## Eligibility

A freelancer is **VAT-eligible** when both hold:

1. `users.vat_registered` is true, and
2. `users.vat_number` is a non-empty registration number.

Either alone is not enough. A registered freelancer who has not recorded the number cannot
issue a VAT invoice, because the document would be invalid without it.

## Rules

| Situation | Behaviour |
|---|---|
| Not eligible | The VAT control is unavailable, states why in one line, and links to where VAT registration is recorded. The invoice carries no VAT line and `vat_pct` is 0 |
| Registered, no number recorded | Same as not eligible, but the explanation asks for the number specifically |
| Eligible, VAT applied | The invoice shows the VAT line **and** the registration number on the document |
| Eligible, VAT deliberately not applied | Allowed — a zero-rated or out-of-scope supply is the freelancer's call. No VAT line, no number required |
| Invoice issued before this contract | Renders exactly as issued, from its stored totals. Never recomputed |
| Freelancer stops being registered | Past invoices are untouched; new invoices follow the current eligibility |

## Arithmetic (unchanged)

VAT is 15% applied to line items **and** fees. Totals are computed on unrounded values and
presented rounded to two decimals. This contract does not change any calculation — only who
may switch it on and what must then appear on the document.

## Verification

1. Profile with `vat_registered=false` → VAT unavailable, explanation shown, created invoice
   has `vat_pct = 0`.
2. `vat_registered=true`, `vat_number=null` → VAT still unavailable, explanation names the
   missing number.
3. `vat_registered=true` with a number → VAT applies; the artifact renders both the VAT line
   and the number.
4. An invoice created in case 3, viewed after the profile is set back to unregistered → still
   shows its VAT line and number.
