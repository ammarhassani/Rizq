# Feature Specification: Power-User Pass 3 Remediation

**Feature Branch**: `011-power-user-pass-3`

**Created**: 2026-07-26

**Status**: Draft

**Input**: User description: "Power-user pass 3 remediation: fix the 18 defects found driving the app as a Saudi freelancer in Arabic."

## Context

Pass 3 drove the whole product the way a Saudi freelancer would: a fresh signup, the
eleven-step onboarding in **Arabic**, a client, an AI proposal from a real brief, a share
link opened as the client, an invoice, pricing lookups to the quota edge, and cross-user
access attempts. Every finding below was seen in the running product and confirmed against
the database.

The pass also confirmed that the pass-2 fixes held: onboarding writes the specialty, city
and experience-tier foreign keys; a client's lowball stated budget no longer drags the quote
down; a share link on a **draft** opens for the client; row-level security returns 404 on
another user's proposal, invoice and client.

Three of the new findings only appear in Arabic or only appear on the document the *client*
receives — the two places a reviewer working in English on the owner's screen never looks.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Numbers the freelancer can trust in Arabic (Priority: P1)

A freelancer running the pricing tool in Arabic sees how many records the range rests on.
Today that sentence reads **"بناءً على ليس رقمًا مستقلًا سعوديًا"** — "based on **NaN**
Saudi freelancer" — while the identical query in English reads "Based on 5 Saudi
freelancers". The same broken sentence reaches the public shared-result page, so a client
sees it too. Separately, the sentence itself misdescribes the data: the citation directly
beneath it says the five records are *published references*, not five freelancers.

**Why this priority**: Arabic is the base language and this is the product's flagship
number. A visible `NaN` on the money screen destroys the credibility Principle I exists to
protect, and it is on a page shared with clients.

**Independent Test**: Run the same lookup in `ar` and in `en`; both sentences state the same
real record count in locale-appropriate digits, with grammar that matches the count, and
neither claims the records are surveyed freelancers.

**Acceptance Scenarios**:

1. **Given** a lookup whose range rests on 5 records, **When** the freelancer views the
   result in Arabic, **Then** the sentence states five records with correct Arabic plural
   grammar and Arabic-Indic digits, and never the words "ليس رقمًا".
2. **Given** the same lookup, **When** it is viewed in English, **Then** the sentence states
   the same count.
3. **Given** a shared public result page, **When** anyone opens it in either language,
   **Then** the count sentence renders correctly there too.
4. **Given** a result whose records are published references, **When** the count sentence is
   shown, **Then** it describes records/references, not surveyed freelancers, and stays
   consistent with the provenance citation below it.

---

### User Story 2 - An invoice that cannot break Saudi tax law (Priority: P1)

A freelancer whose profile says they are **not** VAT-registered can today switch on a 15%
VAT line and issue an invoice that charges the client VAT while showing no VAT registration
number anywhere on the document.

**Why this priority**: Collecting VAT without registration is a legal violation, and a tax
invoice that omits the registration number is invalid. The app currently makes both
mistakes easy and silent. Compliance is a gate, not a cleanup pass (Principle VI).

**Independent Test**: With a profile that has no VAT registration, confirm VAT cannot be
added; then register with a VAT number and confirm VAT applies and the number appears on
the invoice.

**Acceptance Scenarios**:

1. **Given** a freelancer whose profile is not VAT-registered, **When** they build an
   invoice, **Then** the VAT control is unavailable and explains why, with a direct path to
   record VAT registration.
2. **Given** a freelancer who is VAT-registered and has recorded a VAT number, **When** they
   apply VAT, **Then** the invoice shows the VAT line **and** the registration number.
3. **Given** a freelancer marked VAT-registered but with no VAT number recorded, **When**
   they try to apply VAT, **Then** they are asked for the number before the invoice can
   carry a VAT line.
4. **Given** an existing invoice that already carries VAT, **When** it is viewed after this
   change, **Then** it still renders its stored totals unchanged.

---

### User Story 3 - Client documents reveal nothing private (Priority: P1)

The proposal a client opens today shows the freelancer's **price floor** ("الأدنى ٥٬٢٥٠")
next to the quoted 10,450, the sample size behind it, and a link to the pricing methodology.
It also prints the freelancer's **private signup email** — the address they log in with —
and, as the freelancer's own tagline, **Rizq's marketing tagline** ("سعّر بثقة. اقبض رزقك.").
The invoice repeats the email and the tagline.

**Why this priority**: The floor hands the buyer a negotiating lever against the freelancer
the product exists to serve. The email is a privacy leak of an authentication identifier.
The tagline makes the freelancer's document look like an ad for someone else.

**Independent Test**: Open a share link and an invoice as an outside visitor and confirm no
price floor/band, no sample size, no login email and no Rizq tagline appear; the same
documents on the owner's screen still show the band to the owner.

**Acceptance Scenarios**:

1. **Given** a shared proposal, **When** the client opens it, **Then** the quoted price is
   shown without the minimum, maximum, sample size or methodology link.
2. **Given** the same proposal, **When** the owner views it inside the app, **Then** the
   band, sample size and provenance remain visible to the owner.
3. **Given** a freelancer who has not set a contact email, **When** a proposal or invoice is
   produced, **Then** no login email appears on it, and the freelancer is prompted to add a
   contact email.
4. **Given** a freelancer who has not written a tagline, **When** a proposal or invoice is
   produced, **Then** no tagline is shown at all rather than Rizq's own tagline.

---

### User Story 4 - Errors that say what is actually wrong (Priority: P1)

Pasting one malformed platform URL in onboarding fails the whole step with "تعذّر الحفظ.
حاول مجددًا." ("couldn't save, try again") — a transient-error message for a permanent
validation failure, naming no field. The new-client form does the same with "حدث خطأ. حاول
مرة أخرى." for an invalid email or phone. Retrying can never succeed. A `javascript:` URL
takes the opposite path: the save reports success and the value is silently discarded.

**Why this priority**: The user is locked in a retry loop with no way to find the offending
field, or is told something saved that did not. Both are honesty failures on the most basic
interaction in the app.

**Independent Test**: Submit each form with one invalid field and confirm the message names
the field and the problem, the valid fields keep their values, and no save is reported for
data that was dropped.

**Acceptance Scenarios**:

1. **Given** an onboarding platform field holding a malformed URL, **When** the step is
   saved, **Then** the message identifies that field and states what is wrong, and the other
   fields keep what was typed.
2. **Given** a new-client form with an invalid email or phone, **When** it is submitted,
   **Then** the error appears on the offending field, not as a generic retry banner.
3. **Given** a value the system will not store (such as an unsupported URL scheme), **When**
   the user saves, **Then** they are told it was rejected rather than seeing a success with
   the value silently gone.
4. **Given** a genuine transient failure (network or server), **When** it happens, **Then**
   the retry wording is still used — retry advice stays reserved for retryable errors.

---

### User Story 5 - Onboarding tells the truth about what it read and saved (Priority: P2)

The live "your rate vs the market" verdict during onboarding reads only the minimum-project
figure: an hourly rate of 1,000,000 SAR alongside a 6,000 SAR minimum project still returns
"سعرك ضمن نطاق السوق" ("your rate is within the market range"), and an hourly rate alone
returns no verdict at all. Returning to onboarding resumes on the step already completed, so
the user re-does it every time. The income-goal wheel highlights a band that is never saved,
while a rate-confidence value the user never picked is saved.

**Why this priority**: Each one is a small claim the product makes about the user's own
numbers that is not true. They are the seams that make the flagship onboarding feel careless.

**Independent Test**: Enter each rate field alone and in combination and confirm the verdict
reflects what was entered; leave onboarding mid-way and return; complete onboarding without
touching the goal wheel or confidence control and inspect what was stored.

**Acceptance Scenarios**:

1. **Given** an hourly rate far above any market band, **When** the preview updates, **Then**
   the verdict reflects that hourly rate rather than reporting the freelancer is within range.
2. **Given** only an hourly rate and no minimum project, **When** the preview updates,
   **Then** a verdict is still given, based on the hourly rate.
3. **Given** a completed step, **When** the freelancer returns to onboarding later, **Then**
   they resume on the next unfinished step.
4. **Given** a freelancer who never chooses an income goal or a confidence level, **When**
   the step is saved, **Then** nothing is highlighted as chosen and nothing is stored as if
   they had chosen it.

---

### User Story 6 - The profile is actually used, and the quota is current (Priority: P2)

The pricing tool asks for specialty, city and experience even though onboarding just
captured all three. The remaining-queries badge stays frozen at its page-load value after a
lookup, so the count on screen contradicts the count enforced.

**Why this priority**: "Profile as the source of truth" is a promise the product already
made; re-typing the same three answers is friction on the shortest path to value. A stale
quota number is a small honesty failure about something the user is paying for.

**Independent Test**: Open the pricing tool with a complete profile and confirm the three
fields are pre-selected and still editable; run a lookup and confirm the badge changes
without a reload.

**Acceptance Scenarios**:

1. **Given** a profile with specialty, city and experience, **When** the pricing tool opens,
   **Then** those three fields are pre-selected from the profile and remain changeable.
2. **Given** an incomplete profile, **When** the pricing tool opens, **Then** only the known
   fields are pre-selected and the rest are empty.
3. **Given** a lookup that consumes an allowance, **When** the result appears, **Then** the
   remaining-queries badge shows the new count immediately.
4. **Given** a repeated identical lookup that does not consume an allowance, **When** the
   result appears, **Then** the badge is unchanged and the freelancer is not misled into
   thinking they were charged.

---

### User Story 7 - The proposal reflects the brief it was written from (Priority: P3)

The cover letter opens "نشكر عميل محترم" ("we thank a respected client") on a document whose
header already names the client. A brief that clearly states a three-month duration produces
a timeline reading "يُتفق عليه" ("to be agreed") on both dates.

**Why this priority**: Both make a document the client reads look auto-generated, undoing
the credibility the artifact is meant to create. Neither blocks the flow, so they rank below
the leaks and the legal issue.

**Independent Test**: Generate a proposal for a named client from a brief with a stated
duration and read the cover letter and timeline.

**Acceptance Scenarios**:

1. **Given** a proposal for a named client, **When** the cover letter is produced, **Then**
   it addresses that client by name.
2. **Given** a client with no usable name, **When** the cover letter is produced, **Then** it
   uses a neutral salutation without looking like a failed substitution.
3. **Given** a brief stating a duration, **When** the artifact timeline is produced, **Then**
   the duration is reflected rather than both dates reading "to be agreed".

---

### User Story 8 - Money and numerals read consistently (Priority: P3)

A unit price accepts three decimals, so an invoice line shows 10,450.56 × 3 = 31,351.67
while the client's own arithmetic on the printed unit price gives 31,351.68. Quantities
render in Latin digits inside Arabic-Indic tables, star ratings are announced as "1 من ٥
نجوم", and the not-found page renders an older marketing navigation instead of the app shell.

**Why this priority**: Cosmetic, but on a client-facing money document a one-halala
disagreement invites a question the freelancer has to answer.

**Independent Test**: Enter a three-decimal unit price and confirm it is constrained to
halalas; view an invoice and a rating control in Arabic; open an unknown URL while signed in.

**Acceptance Scenarios**:

1. **Given** a unit price typed with three decimals, **When** it is accepted, **Then** it is
   constrained to two decimals so the printed line and the client's arithmetic agree.
2. **Given** an Arabic invoice, **When** it is viewed, **Then** quantities, prices and totals
   all use the same numeral system.
3. **Given** a signed-in freelancer, **When** they open an unknown URL, **Then** the
   not-found page appears inside the normal application shell.

### Edge Cases

- A record count of exactly one, two, and eleven — Arabic plural categories differ for each;
  the sentence must be grammatical for all of them, in both numeral systems.
- A freelancer who marks themselves VAT-registered, applies VAT, then unmarks it — already
  issued invoices must not change retroactively.
- A proposal shared before this change that still holds a stored artifact containing the band
  or the login email — the client-facing view must not show them even for stored artifacts.
- A brief with a duration expressed loosely ("about two months", "قبل رمضان") — the timeline
  must degrade to "to be agreed" rather than inventing a date.
- Onboarding resume when the last completed step is the final one — the freelancer should land
  on review, not past the end.
- A freelancer with no contact email who shares a proposal anyway — the client still needs a
  way to reply.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every user-facing sentence that includes a count MUST render that count as a
  number in the active locale's digits, with grammar matching the count, in both Arabic and
  English, on owner-facing and public pages alike. No user-visible string may ever contain a
  not-a-number rendering.
- **FR-002**: The sample-size sentence MUST describe what the records actually are
  (published references, submissions, government data, or reasoned estimates) and MUST agree
  with the provenance citation shown beside it.
- **FR-003**: The system MUST NOT allow a VAT line on an invoice unless the freelancer's
  profile records both VAT registration and a VAT registration number.
- **FR-004**: Any invoice carrying a VAT line MUST display the freelancer's VAT registration
  number on the document itself.
- **FR-005**: When VAT is unavailable, the system MUST explain why and offer a direct path to
  record VAT registration details.
- **FR-006**: Client-facing proposal documents MUST NOT disclose the price band minimum or
  maximum, the sample size, or the pricing-methodology link; the quoted price alone is shown.
- **FR-007**: The owner's in-app view of a proposal MUST continue to show the band, sample
  size and provenance.
- **FR-008**: No document delivered to a client may contain the freelancer's authentication
  email. Only a contact address the freelancer deliberately provided may appear.
- **FR-009**: A freelancer who has not written a tagline MUST have no tagline on their
  documents; Rizq's own brand tagline MUST NOT stand in for it.
- **FR-010**: A save that fails validation MUST identify the offending field and state what is
  wrong, MUST NOT present itself as a transient failure, and MUST preserve the user's other
  input.
- **FR-011**: The system MUST NOT report a successful save for a value it discarded; rejected
  values must be reported as rejected.
- **FR-012**: Retry wording MUST be reserved for genuinely retryable failures.
- **FR-013**: The onboarding rate preview MUST evaluate every rate the freelancer entered —
  including an hourly rate on its own — and MUST NOT state a verdict about a figure it did
  not read.
- **FR-014**: Returning to onboarding MUST resume on the first unfinished step.
- **FR-015**: A control MUST NOT display a value as chosen unless it was chosen, and the
  system MUST NOT store a preference the user never selected.
- **FR-016**: The pricing tool MUST pre-select specialty, city and experience from the
  profile when present, leaving each editable for the current lookup.
- **FR-017**: The remaining-queries indicator MUST reflect the enforced allowance immediately
  after a lookup, without a page reload, including when a repeated lookup consumes nothing.
- **FR-018**: A proposal cover letter MUST address the named client, falling back to a
  neutral salutation only when no usable name exists.
- **FR-019**: A duration stated in the brief MUST be reflected in the artifact timeline;
  absent or vague durations remain "to be agreed".
- **FR-020**: Monetary amounts entered by the user MUST be constrained to two decimal places
  so printed lines and their arithmetic agree.
- **FR-021**: Within one view, all numerals MUST use a single numeral system appropriate to
  the active locale, including inside accessible names.
- **FR-022**: The not-found page MUST render inside the standard application shell for
  signed-in users.

### Key Entities

- **Freelancer profile**: already holds VAT registration status and number, contact email,
  tagline, specialty, city, experience tier, stated rates, income goal and rate confidence.
  This feature changes which of those fields gate behaviour and which are allowed to be
  written implicitly — it introduces no new profile data.
- **Proposal artifact**: the stored, rendered proposal. Gains a distinction between what the
  owner sees and what a client sees; the stored figures themselves are unchanged.
- **Invoice**: gains a VAT eligibility rule and the display of the VAT registration number.
- **Pricing result**: unchanged in substance; its count sentence and provenance wording become
  locale-correct and honest.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero user-visible not-a-number renderings across the product in Arabic and
  English, verified on the pricing result, the public result page, and every count sentence.
- **SC-002**: A freelancer without VAT registration cannot produce an invoice carrying VAT,
  and every VAT-carrying invoice shows a registration number — 100% of cases.
- **SC-003**: Nothing on a client-facing proposal or invoice discloses the price floor,
  sample size, methodology link, login email, or Rizq's tagline — verified by opening a share
  link as an outside visitor.
- **SC-004**: Every validation failure in onboarding and client creation names the offending
  field; no permanent validation failure is presented as "try again".
- **SC-005**: The onboarding rate verdict changes when only the hourly rate changes.
- **SC-006**: A freelancer with a complete profile reaches a pricing result without re-entering
  specialty, city or experience.
- **SC-007**: The remaining-queries figure on screen matches the enforced allowance after
  every lookup, with no reload.
- **SC-008**: A proposal generated for a named client from a brief with a stated duration
  names that client in its opening and states the duration in its timeline.
- **SC-009**: `pnpm typecheck` is clean and `pnpm test` is green, with regression tests
  covering the Arabic count sentence, the VAT eligibility rule, the client-facing redaction,
  and money rounding.

## Assumptions

- Pass-3 findings are the entire scope; nothing else about pricing, proposals or invoicing
  changes. In particular, the quoted price itself and the pricing engine's arithmetic are
  out of scope.
- No database migration is needed: VAT registration status and number, contact email and
  tagline already exist on the profile.
- Existing stored artifacts stay as they are; the client-facing view redacts at render time
  rather than rewriting stored proposals.
- The client-facing proposal keeps the freelancer's provenance-backed price and the
  Rizq attribution footer; only the internal decision-support figures are withheld.
- Where the freelancer has provided no contact email, prompting them is enough; sharing is
  not blocked.
- Repeated identical pricing lookups continuing to be free (served from cache) is intended
  behaviour and is preserved; only the on-screen count is corrected.
- Arabic plural grammar follows the standard categories (one, two, few, many, other) already
  present in the message catalogue.
