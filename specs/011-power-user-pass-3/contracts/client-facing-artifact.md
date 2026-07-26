# Contract — What a client may see

Applies to every surface a non-owner can reach: the public proposal share page
(`/[locale]/p/[token]`), the public pricing-result page (`/[locale]/r/[id]`), the invoice
share page, the DOCX export handed to a client, and the print/PDF view.

The owner's in-app view is unaffected — everything withheld below stays visible to the person
who wrote the proposal.

## Proposal, client audience

| Element | Client sees | Reason |
|---|---|---|
| Quoted price | **Yes** | It is the offer |
| Deposit split, milestones, terms, validity | **Yes** | Part of the offer |
| Price band minimum / maximum | **No** | Discloses the freelancer's floor to the buyer |
| Sample size behind the band | **No** | Only meaningful next to the band |
| "How we calculate this price" methodology link | **No** | Internal decision support; invites a negotiation about the tool rather than the work |
| Provenance citation for the quoted price | **Yes** | The quote must still be able to justify itself (Principle I) |
| AI-generated badges | **No** (already stripped today) | Internal authoring metadata |
| Freelancer's name, brand name, logo, brand colours | **Yes** | It is their document |
| Freelancer's tagline | **Yes if they wrote one**, otherwise nothing | Rizq's tagline is not the freelancer's |
| Contact email | **Only** `contact_email` the freelancer deliberately set | An authentication address is not a contact address |
| Contact phone / WhatsApp | **Yes** when set | Deliberately provided |
| Rizq attribution footer + proposal reference | **Yes** | Provenance of the document itself, and the client's quoting handle |

## Invoice, client audience

Same rules for branding, tagline and contact. Additionally:

| Element | Client sees | Reason |
|---|---|---|
| VAT line | Only when the freelancer is VAT-eligible (see [vat-eligibility.md](./vat-eligibility.md)) | Legality |
| VAT registration number | **Yes, required** whenever a VAT line is present | A tax invoice is invalid without it |
| Pricing methodology link | **No** | An invoice is a bill, not an estimate |

## Rules

1. Redaction happens **at render**, not at generation. Artifacts stored before this contract
   existed must obey it the moment the code ships.
2. Withholding is by allow-list per section: a new field added to a section is withheld from
   clients until someone decides it may be shown.
3. The owner's view is the superset. No element is visible to a client and hidden from the
   owner.
4. An absent value renders as absent. Nothing is substituted from Rizq's own brand or from an
   internal identifier.

## Verification

Open a share link in a browser with no session and assert the withheld elements are not
present in the served HTML — not merely hidden with CSS.
