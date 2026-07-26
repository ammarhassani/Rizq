# Quickstart — Validating Power-User Pass 3

**Arabic first.** Every check below is done in `ar` before `en` is considered. Three of the
eighteen defects were invisible in English.

## Prerequisites

```bash
pnpm install
pnpm dev                 # http://localhost:3000
pnpm typecheck && pnpm test   # merge gate, must be clean/green throughout
```

Needs `.env.local` with real Supabase + DeepSeek keys, as `e2e/README.md` describes. A
disposable account is enough; the Playwright harness can provision one
(`npx playwright test e2e/modules/…`), or sign up manually at `/ar/signup`.

## Slice 1 — Counts in Arabic

1. `/ar/tool` → run a lookup with a specialty/city/experience that has data.
2. **Expect**: the count sentence names the real number of records in Arabic-Indic digits with
   grammar matching the count. The words "ليس رقمًا" must not appear anywhere.
3. Switch to `/en/tool`, same lookup → same count in Latin digits.
4. Open a shared result page (`/ar/r/{id}`) → the same sentence renders correctly.
5. **Expect**: the sentence describes records/references and does not claim N freelancers were
   surveyed; it agrees with the provenance citation beneath it.
6. Regression: `pnpm test` covers counts of 1, 2, 3 and 11 in `ar` (the plural categories that
   differ) and asserts no output contains a not-a-number rendering.

## Slice 2 — VAT eligibility

1. Profile with `vat_registered = false` → `/ar/invoices/new`.
   **Expect**: VAT unavailable with a one-line explanation and a link to record VAT details.
2. Set `vat_registered = true` with no `vat_number` → **expect** VAT still unavailable, the
   explanation asking for the number.
3. Record a VAT number → **expect** VAT applies, and the created invoice shows both the VAT
   line and the registration number.
4. Open an invoice created before this change → **expect** its stored totals render unchanged.
5. Regression: unit tests for the eligibility rule and for the number appearing whenever
   `vat_pct > 0`.

## Slice 3 — Client-facing redaction

1. Open a proposal as the owner → **expect** the band, sample size and provenance still shown.
2. Enable sharing, copy the link, open it in a **private window with no session**.
3. **Expect**: quoted price and its provenance citation present; no minimum, no maximum, no
   sample size, no methodology link.
4. **Expect**: no `@` address that is the login email; either the contact address the
   freelancer set, or none.
5. **Expect**: no "سعّر بثقة. اقبض رزقك." unless the freelancer wrote that tagline themselves.
6. Repeat 2–5 for a shared invoice and for the DOCX export.
7. Do this with a proposal generated **before** the change — redaction is at render, so it must
   apply to stored artifacts too.

## Slice 4 — Field-level validation errors

1. `/ar/onboarding` platforms step: fill several valid URLs and one malformed one, save.
   **Expect**: the message names the offending field and what is wrong; the valid fields keep
   their values; no "حاول مجددًا".
2. Same step with a `javascript:` URL → **expect** it is reported as rejected, not saved
   silently with the value dropped.
3. `/ar/clients/new` with an invalid email and phone → **expect** errors on those fields.
4. Stop the dev server mid-submit → **expect** the retry wording, and a successful save once it
   is back.

## Slice 5 — Onboarding truthfulness

1. Rates step: enter a minimum project inside the band → **expect** a verdict that names what
   it judged (the minimum project price).
2. Clear the minimum project, enter only an hourly rate → **expect** a prompt for the minimum
   project rather than silence, and **no** claim about being within range.
3. Enter an absurd hourly rate with a normal minimum project → **expect** no statement implying
   the hourly rate was checked.
4. Complete a step, leave onboarding, return → **expect** to land on the next unfinished step.
5. Complete the rates step without touching the income-goal wheel or the confidence control →
   **expect** nothing highlighted as chosen, and both columns still null in the database.

## Slice 6 — Profile prefill and live quota

1. With a complete profile, open `/ar/tool` → **expect** specialty, city and experience
   pre-selected, still changeable.
2. With an incomplete profile → **expect** only known fields pre-selected.
3. Run a lookup → **expect** the remaining-queries badge changes immediately, no reload.
4. Repeat the identical lookup → **expect** the badge does not decrement (repeats are free) and
   nothing implies a charge.

## Slice 7 — Artifact fidelity

1. Generate a proposal for a named client from a brief that states a duration ("المدة المطلوبة
   ٣ أشهر").
2. **Expect**: the cover letter addresses the client by name.
3. **Expect**: the timeline reflects the stated duration instead of both dates reading
   "يُتفق عليه".
4. Generate from a brief with no duration → **expect** "to be agreed", no invented date.

## Slice 8 — Money, numerals, not-found

1. Add an invoice line and type a unit price with three decimals → **expect** it is constrained
   to two, and the printed unit price × quantity equals the line total.
2. View an Arabic invoice → **expect** quantity, unit price and totals in one numeral system.
3. Check a star-rating control's accessible name in Arabic → **expect** consistent numerals.
4. Signed in, open `/ar/does-not-exist` → **expect** the not-found page inside the app shell.

## Cross-cutting

- Repeat slices 1, 3 and 8 at 390px width (Principle III).
- `pnpm typecheck` clean, `pnpm test` green, and the existing `e2e/` suite no worse than before.
- Re-verify the pass-2 fixes still hold: onboarding writes the three foreign keys; a lowball
  client budget does not drag the quote down; a draft share link opens anonymously; cross-user
  URLs 404.
