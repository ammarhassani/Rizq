# Rizq — Power-User Validation, Pass 2

**Date:** 2026-07-26 · **Scope:** whole app, driven as a real freelancer would use it ·
**Method:** live browser session (Playwright MCP) against real Supabase + real DeepSeek —
signup → 11-step onboarding → pricing tool → rate calculator → client → AI proposal → share →
DOCX → project workspace → invoice → paid → income → HADAF → vault → catalog → calendar →
contribution → settings/PDPL export → paywall. Findings confirmed against the database, then
fixed and re-verified in the browser on a second fresh account.

> **Read this after** [`production-maturity-report.md`](./production-maturity-report.md)
> (pass 1, 2026-07-22). Two of pass 1's conclusions are **superseded** here — see
> [Corrections to pass 1](#corrections-to-pass-1).

---

## Verdict

Pass 1 audited the app against the spec and found it sound. This pass *used* the app, and the
gap between "conforms to spec" and "works for the freelancer" is where all three P0s lived:
every one of them passed type checks, unit tests, and a static audit while being visibly wrong
to a person holding the product.

**22 findings, all fixed.** `pnpm typecheck` clean · `pnpm test` **751/751** · lint at parity
with the pre-existing baseline (37 errors / 34 warnings, none introduced) · the golden path
re-driven end to end in the browser.

---

## P0 — broke the core promise

### 1. Onboarding never wrote the three FK columns the engine reads

`StepLocation` sent `city_id: null` behind a "deferred to a future refactor" comment;
`StepProfessional` sent `specialties: [slug]` and never `primary_specialty_id` or
`experience_tier_id`. After completing all 11 steps the database held:

```
city: 'riyadh'  specialties: ['ui-ux-design']  years_experience: 7
primary_specialty_id: NULL   city_id: NULL   experience_tier_id: NULL
profile_completeness_pct: 100
```

Every "profile as source of truth" reader — the live price preview, the pricing engine's
specialty prior, the tier derivation — silently fell back to defaults. Settings → Profile
rendered "your profile is 100% complete" directly above "complete your specialty, city and
experience to see your market rate", on one screen.

**Fix:** slug → uuid resolution moved into `saveOnboardingStep`, the single choke point both
the wizard and Settings → Profile already route through, rather than into each step editor.
The lookup was never missing — `rate_calculator_defaults` had been storing all three uuids
correctly the whole time.

**Verified:** fresh signup now stores `specialty=web-dev, city=jeddah, tier=mid` (tier derived
from 4 years) and the live price band renders.

### 2. Every proposal priced at the ceiling; the client's stated budget was ignored

Two very different briefs returned the **identical** price:

| Brief | Client budget | Quoted (before) |
|---|---|---|
| 18 mobile screens + design system + Figma + user testing, 2 months | 40,000 | **17,850** |
| 12 web screens, clinic booking, 6 weeks | 25,000 | **17,850** |

`computeProposalPrice` multiplied the anchor by the scope modifiers and then clamped to the
band max. With a narrow band (n=5 records) saturation is the *normal* case, so mid-size
proposals all collapse onto the ceiling. Separately, `budget_mentioned` was already extracted
from the brief at high confidence — and never passed to the pricing function at all.

**Fix:** the cited band is unchanged and still bounds `anchor`; a new `quote` may exceed it
when scope size or a client-stated budget justifies it, and `quote_basis`
(`market` | `scope` | `client_budget`) drives an honest provenance line. A stated budget only
ever lifts — quoting *down* to a lowball is the freelancer's call, not ours.

**Verified:** client stated 45,000 → quoted **45,000** (previously 10,950 for that band —
34,050 SAR left on the table), cited as "based on the budget the client stated", with the
market band still shown as reference.

### 3. A share link generated on a draft was dead, and blamed the freelancer

`get_shared_proposal` filters `public_share = true AND status <> 'draft'`, but enabling share
only bumped `final → sent`. Sharing a draft produced a link plus a WhatsApp button; the
recipient saw **"the owner disabled this link"** while `public_share` was `true` in the
database.

**Fix:** enabling share bumps `draft → sent` too, matching what invoices already did.

### 4. "AI-drafted, review before sending" printed on the client's copy

That badge is an instruction *to the freelancer*, rendered on every section of the public
`/p/[token]` page the client reads.

**Fix:** a pure `forClientAudience()` clears the `ai_generated` flags for the public view. (The
first attempt set a module-level flag during render; ESLint's `react-hooks/globals` was right
to reject it.)

### 5. Invoice marked "sent" when the email failed

Enabling share to mint the link bumped `draft → sent` + `sent_at`; a delivery failure returned
an error and left that state, faking a delivery that never happened and starting the overdue
clock. **Fix:** roll the bump back when send fails.

---

## P1

| # | Finding | Fix |
|---|---|---|
| 6 | Finishing onboarding stranded the user on the success screen (`push` raced `refresh`) | `router.replace("/dashboard")` |
| 7 | Review step showed 100% beside four "incomplete" chips — it read the pre-onboarding snapshot | re-reads the live snapshot (`getProfileSnapshot`) |
| 8 | Dashboard said "create your first proposal" for an hour after you'd created two | stop caching the empty-insights state; treat a cached empty as a miss |
| 9 | Income ledger tiles read 0 beside a month header reading 57,000 | client uses the same `coalesce(delivery_date, completed_date, final_paid_at, created_at)` as the `monthly_income` view |
| 10 | Enter did nothing in the add-task/milestone fields (no `<form>`) | explicit submit-on-Enter |
| 11 | Project, gig and invoice all named after the *first deliverable* ("Home page") | new `artifactTitle()` reads `sections[cover].content.projectTitle` — there is no top-level `title` key, which is the trap |
| 12 | Invoice billed 100% while the project showed a 50/50 deposit plan | `portion: "full" \| "deposit" \| "balance"`; the project CTA bills the deposit first |
| 13 | **VAT was unreachable** — read by the invoice builder, accepted by the save action, no input anywhere | VAT toggle + 15-digit number in the identity step; invoices now state the position either way |
| 14 | Free tier stated as 3 in marketing, 5 in the product | copy aligned to the real limit (5) |
| 15 | Paywall dead-end ("upgrade" → "payments aren't live"); upsell sold a free feature | copy points at the beta channel; benefit list corrected |
| 16 | Client-facing proposal unreadable in dark mode (fixed light card, token-driven text) | `bg-[var(--raised)]`; print/PDF pinned to light paper |
| 17 | Onboarding said document upload was "coming soon" — the vault has accepted uploads for weeks | links to the vault |

## P2 — polish, i18n, a11y

Arabic counted-noun agreement and Arabic-Indic digits throughout (`٥ سجلات` not `5 سجلاً`,
`مشروعين` not `من 1 مشاريع`, `مراجعتان` not `2 مراجعات`, `شهرين إضافيين` not `2 شهر إضافي`) ·
English leaking into the Arabic UI (`Chat edit: scope_of_work`, `1 stars`, `useful`, the
document footer) · unlabeled share toggles and the manual-price input · star ratings that
announced 5 stars for a 4-star client · raw UUID shown to clients as the proposal number
(now `RZQ-089A3AF8`) · "Valid until: 30 days" (now a date) · DOCX ASCII filename collapsing to
`TO-Proposal-2026-07-25.docx` · a manually-overridden price still citing the benchmark as its
source · the HADAF plan button refusing with "only available when not eligible" on a screen
saying you need 2 more months · the greeting rendering a full plus-tagged email as a name.

---

## Corrections to pass 1

Pass 1's fix table contains two entries this pass supersedes. Both were correct fixes to the
problem as stated; both had a consequence only visible from the product side.

1. **"M1 price-band inflation → complexity now moves the anchor within the cited band."**
   Right about honesty, wrong about outcome: clamping to the band is exactly what made every
   proposal return the ceiling (P0-2). The honesty constraint is preserved differently now —
   the *band* is never widened, but the *quote* may exceed it with its basis declared.

2. **"Pricing free tier 3 vs advertised 5 → `FREE_MONTHLY_QUERIES` = 5."** The constant was
   changed; the marketing copy still said 3 in five places. Fixed here.

Also worth recording: `docs/profile-source-of-truth.md` asserted that `primary_specialty_id`
"is captured at onboarding". It never was. A document stating a fact the code did not implement
is how P0-1 survived four features that all depended on it — the doc has been corrected.

## Still open

- **Not code:** enable leaked-password protection in Supabase Auth (carried from pass 1).
- `pro_until` expiry is still not enforced at the `isPro` helper (spec 010, US2).
- The in-memory rate limiter is ineffective on serverless.
- Email requires a verified Resend domain — sandbox mode rejects any non-owner recipient.
- **Not defects, absent capabilities:** ZATCA e-invoicing (QR + simplified tax invoice),
  partial/recurring invoices beyond deposit/balance, expenses, time tracking, proposal read
  receipts (`share_viewed_at` is stored and never surfaced), notifications of any kind, and a
  public freelancer profile page (every input for one is already collected).
- **The benchmark is the product and it is nearly empty** — n=5, confidence 12% backs every
  price. The contribution loop (+2 queries per approved submission) works but is buried under
  a result card with no visible progress.
