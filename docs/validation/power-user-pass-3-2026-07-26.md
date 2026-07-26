# Power-User Pass 3 — remediation record (2026-07-26)

Feature [`specs/011-power-user-pass-3/`](../../specs/011-power-user-pass-3/). Eighteen defects
found by driving the product in Arabic as a freelancer, fixed across eight independent slices.
No migration, no new dependency.

**Merge gate at completion**: `pnpm typecheck` clean · `pnpm test` 72 files / 858 tests green
(baseline before the pass: 64 files / 768 tests) · `pnpm lint` unchanged at 38 errors /
40 warnings, all pre-existing · `pnpm build` succeeds.

---

## What was verified in the running product

Driven in Arabic against real Supabase, dev server on `localhost:3000`, logged in as a
disposable account. Evidence below is what the browser actually rendered, not what the code
says it should.

| Check | Result |
|---|---|
| `/ar/tool` count sentence | `بناءً على ٥ سجلات من السوق السعودي` — no `ليس رقمًا`, Arabic-Indic digits |
| …agrees with the citation beneath it | `تقدير رِزق بناءً على ٥ سجلات (مراجع منشورة) حتى عام ٢٠٢٦.` — same number, same numerals |
| Pricing tool prefill | specialty/city/experience pre-selected from the profile (`web-dev`, `jeddah`, `mid`), still editable |
| Quota badge after a lookup | `متبقي ٥ من ٥` → `متبقي ٤ من ٥` with no reload; an identical repeat left it at ٤ |
| Invoice, `vat_registered=true`, `vat_number=null` | VAT switch `disabled`, reason names the missing number, links to `/ar/settings/profile` |
| Invoice, `vat_registered=false` | VAT switch `disabled`, reason names the missing registration |
| Anonymous share page (stored artifact from before the change) | no band min/max, no methodology link, no Rizq tagline, no auth email, no `mailto:` — citation still present |
| Owner's view of the same proposal | band, sample size and methodology link all still visible |
| Onboarding/Settings rate verdict | `أقل سعر مشروع تقبله (٤٬٠٠٠ ريال) أقل من نطاق مشاريع السوق — قد يكون هناك مجال لرفعه.` |
| Income-goal wheel with `income_goal_monthly_sar = null` | no option carries `aria-selected="true"` |
| `/ar/proposals/<unknown-uuid>` while signed in | 404 inside the app shell (sidebar present, no public login/signup nav) |
| 390px: share page and pricing result | no horizontal scroll (`scrollWidth` 380 at a 390 viewport) |

The two VAT states were produced by temporarily editing the disposable account's
`vat_registered` / `vat_number` and restoring both afterwards.

---

## A defect the plan did not predict, found by driving it

The pass-3 plan assumed passing a raw number to an ICU plural was the whole fix. It was not.

**CLDR resolves plain `ar` to Latin digits.** `Intl.NumberFormat("ar")` returns `5`;
`Intl.NumberFormat("ar-SA")` returns `٥`. next-intl formats messages with the routing locale
`ar`, while every other number in this app is formatted `ar-SA`. So ICU's own `#` rendered
`بناءً على 5 سجلات` directly above `بناءً على ٥ سجلات` in the citation — two numeral systems in
one sentence pair (FR-021), which no unit test caught and which the fixed NaN had been masking.

**Rule now enforced**: an ICU plural argument stays a raw number so the category is chosen
correctly, and the digits come from a separate `{count}` the call site formatted with the
app's `ar-SA` formatter. `#` never appears in a plural message.

`src/lib/format/count.test.ts` guards all three failure modes statically, across both
catalogues and every call site in `src/`:

1. no call site passes a formatted value as a plural argument,
2. no plural message contains `#`,
3. every plural message is exercised by at least one call site.

`src/app/__tests__/error-states.test.ts` also needed a raised per-test timeout: it dynamically
imports whole Next server pages, and under the now-larger suite that transform exceeded the 5s
default. A loading cost, not a behaviour change.

---

## Claims this pass falsified

- **`forClientAudience()` "redacts the client copy"** — it cleared AI badges and nothing else.
  The price band, sample size and methodology link reached every client. Now an allow-list per
  redacted section: a field added to `pricing` or `verification` is withheld until someone
  decides it may be shown.
- **"`contact.email` is the freelancer's contact address"** — it fell back to `users.email` and
  then to the auth email, so the sign-in address was printed on every client document. It is
  now `contact_email` only. Artifacts stored before this carry a marker-less contact block and
  have their email withheld from clients at render.
- **"VAT is a fixed 15% toggle"** — it was available to anyone, and `createInvoiceFromGig`
  defaulted VAT on from `vat_registered` alone. Both paths now route through
  `resolveVatEligibility` (registered **and** a recorded number).
- **"`rate_confidence` is captured at onboarding"** — it was written as `approximate` whether or
  not the freelancer picked anything. It is now sent only when chosen.

---

## Deliberately not done

- **`consumed` flag on the pricing action result** (tasks T047). The returned `remaining`
  already distinguishes a lookup that consumed a slot from a deduped repeat, and the badge
  renders from it. A second field carrying the same fact was not added.
- **Retroactive rewrite of stored artifacts.** Redaction happens at render, so old proposals
  stop leaking without a migration — but a freelancer who had set a real `contact_email` before
  this change will see it withheld from the client copy until the proposal is regenerated. The
  conservative direction is deliberate (contract rule 2: withheld until allow-listed).
- **Live re-verification of the onboarding resume rule and the hourly-only rate prompt.** Both
  need a fresh, mid-onboarding account; the disposable account used here has completed
  onboarding and Settings → Profile autosaves on edit. Covered by
  `src/lib/onboarding/resume.test.ts` and by reading the branch, not by a browser run.
- **A root `app/not-found.tsx`.** An unmatched URL like `/ar/does-not-exist` never reaches
  `[locale]/not-found.tsx` — Next serves its own built-in 404. That is pre-existing and out of
  this feature's scope; the segment not-found (what `notFound()` renders) now uses the app
  shell for signed-in users.

---

## Pass-2 regressions re-checked

- Onboarding writes `primary_specialty_id` / `city_id` / `experience_tier_id` — confirmed in
  the row and visible as the tool's prefill.
- Cross-user proposal URLs 404 under RLS — confirmed in the browser.
- A draft share link opens anonymously — the share page still serves `200` without a session.
- The free pricing allowance reads and enforces 5 — badge showed `٥ من ٥`.
