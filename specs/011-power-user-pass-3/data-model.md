# Data Model — Power-User Pass 3

**No migration.** Every column this feature reads or gates on already exists. What changes is
which fields *gate* behaviour, which stop being written implicitly, and which stop reaching a
client-facing document.

## public.users — fields this feature depends on

| Field | Type | Today | After |
|---|---|---|---|
| `vat_registered` | boolean | Written at onboarding; read by nothing that matters | **Gates** whether an invoice may carry VAT |
| `vat_number` | text | Captured, never required | **Gates** VAT alongside `vat_registered`; printed on any VAT-carrying invoice |
| `contact_email` | text | Falls back to `users.email` → auth email when null | Used alone; no fallback to an authentication address |
| `email` | text | Leaks onto client documents through the contact fallback | Stays internal (sign-in, notifications) |
| `tagline_ar` | text | Falls back to Rizq's marketing tagline when null | When null, no tagline is rendered |
| `onboarding_step` | int | Stores the step just saved; wizard resumes *on* it | Same column, same meaning; the wizard resolves the next unfinished step from it |
| `income_goal_monthly_sar` | numeric | Stays null while the wheel highlights a band | Nothing is highlighted unless chosen; still null when unchosen |
| `rate_confidence` | enum | Written as `approximate` without being chosen | Written only when the freelancer picks a value |
| `primary_specialty_id`, `city_id`, `experience_tier_id` | uuid | Correctly written (pass-2 fix holds) | Additionally **read** to prefill the pricing tool |
| `current_hourly_rate_sar`, `current_project_rate_range` | numeric / jsonb | Both stored; only the project floor feeds the onboarding verdict | The verdict names which figure it judged; the hourly rate is never silently judged |

## Proposal artifact (`proposals.artifact_json`)

Stored shape is unchanged — this feature does not rewrite existing rows.

| Section | Change |
|---|---|
| `cover_letter` | Gains `clientName` in its content so the letter addresses the named client (the renderer already reads it) |
| `timeline` | Renders a duration stated in the brief when extraction found one; otherwise unchanged ("to be agreed") |
| `pricing` | Unchanged in storage. **Withheld at render** for a client audience: `min`, `max`, sample size and the methodology link |
| branding / contact | `tagline` absent rather than defaulted to Rizq's; `contact.email` present only when the freelancer set a contact address |

**Redaction happens at render**, through the existing `forClientAudience()` seam, so proposals
stored before this change stop leaking the moment it ships.

## Invoice (`invoices`)

| Field | Change |
|---|---|
| `vat_pct`, `vat_sar` | Unchanged in storage and arithmetic. A non-zero value may only be *set* by an eligible freelancer |
| artifact branding | VAT registration number displayed whenever the invoice carries VAT; Rizq tagline no longer substituted; login email no longer printed |
| line `unit_price_sar` | Constrained to two decimals at entry so the printed unit price and the line total agree |

Already-issued invoices keep their stored totals and render exactly as issued.

## Scope extraction (`proposals.scope_json`)

| Field | Change |
|---|---|
| *(new)* duration stated by the client | Nullable. Carries the duration **as stated in the brief**, not a computed delivery date. Null when the brief says nothing or is vague |
| `urgency`, `budget_mentioned`, everything else | Unchanged |

Adding a nullable field is backward compatible: proposals extracted before this change simply
have no duration and keep "to be agreed".

## Pricing result / quota

No stored change. The pricing action's success result additionally carries the remaining
allowance after the lookup so the on-screen badge can match what is enforced — including the
case where a repeated identical lookup consumes nothing.

## Validation failure shape (server actions)

Not persisted; part of the action contract. See
[contracts/validation-errors.md](./contracts/validation-errors.md).
