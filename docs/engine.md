# Rizq Pricing Engine — Strategic Plan (CTO Handoff)

| Field | Value |
|---|---|
| Document version | v0.1 |
| Author | Ammar Al-Hassani (founder) + Claude Code (engineering lead) |
| Date | 2026-05-14 |
| Status | **Vision spec — not for v0.1 build. CTO to convert to implementation plan when ready.** |
| Related docs | `prd.md`, `brd.md`, `architecture.md` |

---

## 0. Read this first

The current Rizq tool (`/[locale]/tool`) is a **statistical lookup**: specialty × city × tier × size → SQL aggregation → quartile statistics. That ships v0.1. It is not the long-term engine.

This document describes the **long-term engine** — a closed-loop pricing system designed to be:
1. **Defensible** (patent-shaped novelty in the active-elicitation loop)
2. **Calibrated** (refuses to commit when uncertain — never embarrasses the freelancer)
3. **Compounding** (every gig priced through Rizq sharpens the engine)
4. **Unbypassable** (proposal artifact is the lock-in surface)
5. **Mainstream** (built for both seller-side win first, buyer-side neutrality later)

The audience for v0.1 is seller-side: **Saudi freelancers pricing inbound work**. Buyer-side comes later, once seller adoption makes Rizq the de-facto reference.

---

## 1. Problem statement

A Saudi freelancer receives an inquiry — typically a messy WhatsApp message in dialect, sometimes a voice note, occasionally a formal RFP. They need to:

1. **Understand the scope** (deliverables, complexity, urgency, client expectations).
2. **Decide a price** they can defend, that wins the work without leaving money on the table.
3. **Produce a proposal** the client takes seriously.
4. **Negotiate and close.**

Today they do all four manually, often poorly. Existing benchmarks (Rizq v0.1 included) give a generic number for a specialty × city — they do not understand the *specific* inquiry, do not produce the *specific* proposal, and do not learn from the *specific* outcome.

**The engine is the system that does all four** — and gets better every time it is used.

---

## 2. The full workflow (vision)

The engine wraps the freelancer's quoting workflow end-to-end. Eight steps, each generating proprietary data and each a place where the LLM (DeepSeek) earns its keep.

```
[0. Inquiry capture]
        ↓ ingest (DeepSeek + Whisper for voice)
[1. Scope extraction]
        ↓ enrich
[2. Client KYC (silent, public registries)]
        ↓ retrieve
[3. Comp retrieval (multi-source evidence base)]
        ↓ price
[4. Bayesian posterior (calibrated price + CI)]
        ↓ if CI too wide
[5. Active elicitation (engine asks the highest-information-gain question)]
        ↓ once tight enough
[6. Proposal artifact generation (bilingual, branded, halal milestones)]
        ↓ send + track
[7. Outcome capture (won/lost/final price/negotiation transcript)]
        ↓
[8. Feedback loop (per-freelancer model + global model retrain)]
```

### Step-by-step

**Step 0 · Inquiry capture.** The freelancer forwards the client's message into Rizq.
- **Channels**: WhatsApp Business API webhook, Gmail/Outlook add-in, browser extension (LinkedIn DM, Twitter DM, webmail), iOS share-sheet, paste box, voice-note upload.
- **Voice notes**: Whisper (or equivalent Arabic-tuned STT) → transcript. Saudi dialect must work.
- **Output**: normalized inquiry text + channel metadata + attachments.

**Step 1 · Scope extraction.** DeepSeek parses the inquiry into a structured **scope object**:
```jsonc
{
  "specialty": "logo_design",
  "deliverables": ["primary_mark", "wordmark", "favicon", "brand_book"],
  "deliverable_count": 4,
  "revisions": null,                 // unknown → candidate for elicitation
  "urgency": "rush_2_weeks",
  "complexity_signals": ["bilingual_arabic_english", "rebrand_existing_company"],
  "client_type": null,               // unknown → candidate for KYC
  "client_size_hint": "startup_seed_stage",
  "exclusivity": null,
  "ip_transfer": null,
  "geography": "ksa_riyadh",
  "budget_signals": "no_budget_mentioned",
  "language_preference": "ar"
}
```
The scope object is the universal currency of the engine — every downstream layer consumes it.

**Step 2 · Client KYC (silent).** Engine looks up the client across public Saudi registries — no freelancer input required:
- **Wathiq** (commercial registry) — is the entity registered? what sector? what size?
- **Maroof** — consumer trust score, public complaint history.
- **ZATCA VAT registry** — VAT-registered? (revenue scale proxy)
- **Etimad** — if a government entity, what is their tender history?
- **LinkedIn company page** — headcount band, sector, recent funding.
- **Internal Rizq history** — has any other Rizq freelancer logged a job for this client? At what prices? Did they pay on time?

**Output**: a `client_credit` score + `apparent_budget_band` + flags (e.g. "client previously underpaid 3 freelancers" → priced higher with shorter deposit terms).

**Step 3 · Comp retrieval.** Embed the scope object (sentence-transformer or DeepSeek embeddings). k-NN search against the **multi-source evidence base**:

| Source | Provenance weight | Notes |
|---|---|---|
| Rizq verified submissions | 1.0 (highest) | Proof-backed, freelancer-confirmed |
| This freelancer's own past proposals | 1.5 (personal boost) | Their style is more predictive for them than the market |
| Etimad public tender awards | 0.7 | Government B2G — sometimes published winning bids |
| Mostaql / Khamsat / Bahr historical jobs | 0.4–0.6 | Legal status varies; partner where possible |
| Public agency rate cards | 0.5 | Cached + dated; decay over time |
| Saudi MoCI labor price indices | 0.6 | Macro anchor |
| Twitter/X opt-in price-discussion threads | 0.2 | Noisy; cross-validate |
| Buyer-side surveys at project completion | 0.8 | Highest-signal but rare |

Provenance weight × freshness decay × specialty-fit = effective comp weight.

**Step 4 · Bayesian posterior.** Hierarchical Bayesian model:
- **Prior**: specialty × city × tier baseline (today's v0.1 statistical core, kept as a fallback).
- **Update 1**: scope features (urgency, deliverable count, complexity).
- **Update 2**: personal-history posterior for this freelancer (high weight if they have ≥5 priors).
- **Update 3**: client adjustment (`client_credit` shifts the band).

**Output**: `{ p10, p50, p90 }` price band + sample-size + provenance breakdown + win-rate-vs-price curve (once outcome data exists).

**Step 5 · Active elicitation (the patent core).** Engine computes, for each unknown scope field, the **expected reduction in posterior variance** if it were known (information gain). It ranks unknowns and generates 1–3 bilingual questions targeted at the highest-gain unknowns.

Two delivery modes:
- **Internal**: question the freelancer answers immediately (e.g. "Is this a one-time launch or ongoing retainer?").
- **External**: question the engine generates in clean Saudi-polite Arabic for the freelancer to send to the client — one tap forwards via WhatsApp.

Client answers → DeepSeek parses → scope object updated → posterior tightened → loop until **calibrated-confidence threshold** is met or the engine refuses.

**Calibrated refusal**: if `p90/p10 ratio > 2.5` AND no more useful unknowns remain to elicit, engine **refuses to commit to a single number** and surfaces "the data isn't there yet — here's what's missing". This is the "never wrong" mechanism.

**Step 6 · Proposal artifact.** This is where Rizq becomes physically unbypassable.

Engine generates a **bilingual proposal document**:
- Freelancer's branding (logo, colors, name — set once during onboarding).
- Scope breakdown (structured scope object → human-readable list).
- Price (one anchored recommendation + optional tiered options).
- **Halal payment milestones** (default: 50% deposit / 50% on delivery; no interest, no late fees, no riba-coded language).
- Citing: *"based on N comparable Saudi projects in the last 12 months — methodology link"*.
- Timeline + revisions + IP-transfer terms (Saudi-law compliant).
- Three output channels:
  - Shareable Rizq link (read-receipts, version history, comments).
  - Downloadable PDF (offline send).
  - WhatsApp-ready text summary (one tap to forward).

The freelancer writes zero words. Bypassing Rizq means redoing this manually for every gig. That is the lock-in.

**Step 7 · Outcome capture.** Client engages the proposal:
- Did they open it? When?
- Did they counter-offer? At what price? With what reason?
- Did they accept / reject / ghost / negotiate?
- Final agreed price (if won) + scope delta (if any).

**Step 8 · Feedback loop.** Outcome becomes labeled training data:
- Per-freelancer model: updates their personal price-style posterior.
- Global model: updates the specialty × city × scope-cluster posterior.
- Active-elicitation policy: refined by which questions actually closed CI gaps in practice.
- Client model: anonymized client price-sensitivity profile updated.

After ~10 outcomes for a freelancer, the engine is pricing **for them specifically** — not for the average Saudi freelancer in their specialty. That is the personal-model moat: literally not available anywhere else.

---

## 3. Patent shape

A patent generally protects **one novel mechanism**, defined as a *system claim* — the combination of components that together solve a previously unsolved problem in a non-obvious way.

The patent-shaped invention here is:

> A computer-implemented method and system for generating a calibrated price recommendation for a freelance service engagement, comprising:
> 1. ingesting an unstructured client inquiry from one of a plurality of communication channels;
> 2. extracting, via a large language model, a structured scope object representing the engagement;
> 3. silently enriching the scope object with buyer-identity signals retrieved from public business registries;
> 4. retrieving a set of comparable historical engagements from a provenance-weighted multi-source evidence base via vector similarity over scope embeddings;
> 5. computing a posterior price distribution via hierarchical Bayesian inference over the retrieved comparables;
> 6. **computing, for each unknown scope feature, an expected information gain with respect to the posterior, and generating a natural-language clarifying question for the unknown feature with the highest expected information gain;**
> 7. iteratively refining the posterior by re-ingesting answers to said clarifying questions until a calibrated-confidence threshold is met or no further information gain is available;
> 8. when the calibrated-confidence threshold is met, generating a proposal artifact embedding the recommended price, scope, and provenance; or when it is not met, refusing to commit to a single price and surfacing the missing-information state;
> 9. capturing outcome data from the proposal artifact and feeding said data back as labeled training data to refine the system's pricing and elicitation policies for future engagements.

Each individual element is weakly novel. The **combination** — particularly the active-elicitation loop in step 6 coupled with calibrated refusal in step 8 and the feedback-closure in step 9 — is what's defensible.

**Filing strategy** (out of scope for this doc, for legal counsel):
- Provisional patent (Saudi + US) once the v0.2 prototype works end-to-end on at least one specialty.
- Trade-secret protection for the specific weighting functions + question-generation prompts in the meantime.
- Do **not** publish the active-elicitation algorithm or evidence-weighting math publicly until the provisional is filed.

---

## 4. Architecture

### 4.1 High-level

```
                      ┌─────────────────────────────────────┐
                      │  Capture Surfaces                   │
                      │  WhatsApp · Email · Browser ext.    │
                      │  iOS share-sheet · Voice            │
                      └────────────────┬────────────────────┘
                                       │
                              ┌────────▼────────┐
                              │ Inquiry Ingest  │  DeepSeek + Whisper
                              │  (Normalize)    │
                              └────────┬────────┘
                                       │
                              ┌────────▼────────┐
                              │ Scope Extractor │  DeepSeek (structured output)
                              └────────┬────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
     ┌────────▼─────────┐    ┌─────────▼────────┐     ┌─────────▼────────┐
     │ Client KYC       │    │ Comp Retrieval   │     │ Personal History │
     │ Wathiq · Maroof  │    │ k-NN over scope  │     │ (this freelancer)│
     │ Etimad · ZATCA   │    │ embeddings       │     │                  │
     └────────┬─────────┘    └─────────┬────────┘     └─────────┬────────┘
              │                        │                        │
              └────────────────────────┼────────────────────────┘
                                       │
                            ┌──────────▼──────────┐
                            │ Bayesian Posterior  │  PyMC / Stan / hand-rolled
                            └──────────┬──────────┘
                                       │
                       ┌───────────────┴───────────────┐
                       │                               │
            CI tight enough?                  CI too wide?
                       │                               │
                       │                  ┌────────────▼──────────────┐
                       │                  │ Active-Elicit Engine      │
                       │                  │ (info-gain ranking +      │
                       │                  │  question generation)     │
                       │                  └────────────┬──────────────┘
                       │                               │
                       │                       Ask → answer → loop
                       │                               │
                       │              (or refuse if no useful gain available)
                       │                               │
                       └───────────────┬───────────────┘
                                       │
                            ┌──────────▼──────────┐
                            │ Proposal Generator  │  Bilingual PDF + share link
                            └──────────┬──────────┘
                                       │
                            ┌──────────▼──────────┐
                            │ Outcome Tracker     │  Read-receipts, replies
                            └──────────┬──────────┘
                                       │
                            ┌──────────▼──────────┐
                            │ Feedback Pipeline   │  Retrain personal + global
                            └─────────────────────┘
```

### 4.2 Storage layout

Augment the existing Supabase schema (do not replace it):

| Table | Purpose |
|---|---|
| `inquiries` | Raw captured inquiries (text + attachments + channel metadata) |
| `scope_objects` | Structured scope extracted from each inquiry |
| `client_profiles` | Anonymized KYC enrichment per unique client identity (hashed) |
| `comps` | Unified evidence-base record: source, scope-embedding, price, freshness, provenance weight |
| `comp_sources` | Catalog of evidence sources + weighting functions + freshness curves |
| `proposals` | Generated proposal artifacts (versioned) |
| `proposal_events` | Read-receipts, counter-offers, accept/reject/ghost |
| `outcomes` | Closed-loop labeled data (won/lost + final price + reasons) |
| `freelancer_models` | Per-freelancer posterior parameters (private to that user via RLS) |
| `elicitation_log` | Which questions were asked, which answered, how much CI shrank |

Vector storage: `pgvector` (Supabase already supports it). One index per scope embedding column.

Object storage: continue using the `submission-proofs` bucket pattern. Add `inquiry-attachments` and `proposal-artifacts` buckets, both private with signed-URL access.

### 4.3 Compute layout

- **Inference path** (intake → price → propose): Vercel serverless functions. Latency target: <4s end-to-end excluding active-elicit roundtrips.
- **Embedding generation**: batch nightly job (cron) for new comps; on-demand for incoming scope objects.
- **Bayesian update**: keep it as a pure-Python function or TS port. Hierarchical models are tractable at this scale — no GPU needed.
- **Feedback retrain**: nightly batch; freelancer personal models update incrementally as outcomes land.
- **LLM**: DeepSeek for extraction + question generation + proposal copy. Fall back to a second provider (e.g. Anthropic) for redundancy if cost permits later.
- **Storage**: Supabase Postgres (with `pgvector`). Supabase Storage for blobs.

### 4.4 Cost shape (rough)

At 1k proposals/month:
- DeepSeek tokens: ~5M input + 1M output per month ≈ $20–40
- Embeddings: negligible (<$5)
- Supabase: existing tier
- Whisper/STT: ~$0.006/min × 1k voice notes × 2min ≈ $12
- Public registry API calls: free/cheap (Wathiq, Maroof public endpoints)
- Total marginal cost per proposal: <$0.10. Pro tier at SAR 49/mo = SAR 49 revenue per active user — gross margin >95% on the engine itself.

---

## 5. Data acquisition — the moat

The engine is only as good as the comps it sees. Data sources, in priority order:

| # | Source | Method | Legal status | Priority |
|---|---|---|---|---|
| 1 | First-party Rizq submissions | Existing user flow (proof-required) | ✅ Clear | P0 |
| 2 | Proposal outcomes through Rizq | Closed-loop tracking | ✅ Clear (consented at signup) | P0 |
| 3 | Etimad gov tender awards | Official public API + manual scrape | ✅ Clear (public record) | P1 |
| 4 | Wathiq commercial registry | Official API (likely paid tier) | ✅ Clear | P1 |
| 5 | Maroof | Official lookup | ✅ Clear | P1 |
| 6 | Saudi MoCI labor price indices | Official publication | ✅ Clear | P1 |
| 7 | Public agency rate cards | Crawl freelancer/agency websites (robots.txt respected) | ✅ Generally clear if robots permits | P2 |
| 8 | Mostaql / Khamsat / Bahr historical jobs | **Partner first; scrape only if ToS permits** | ⚠️ Gray — ToS varies | P2 (partnerships preferred) |
| 9 | LinkedIn job posts / company rate cards | Manual capture + browser-extension assist | ⚠️ ToS prohibits scraping; one-shot user-initiated capture is fine | P3 |
| 10 | Twitter/X price-discussion threads | API + opt-in inclusion | ✅ Clear via API | P3 |
| 11 | Buyer-side end-of-project surveys | Sent via Rizq after project closes | ✅ Consented | P2 |

**Partnerships are the data play.** Cold-email Mostaql/Khamsat/Bahr offering co-branded benchmark feature in exchange for access to historical (non-PII) job data. This is faster and safer than scraping.

**The strategic insight**: every inquiry parsed through Rizq — even those that don't end in a submission or paid proposal — is data. The question itself ("what's the rate for an Arabic UX writer in Dammam?") signals demand. Aggregate these and we have a real-time demand index for Saudi freelance work. That's a product in itself.

---

## 6. Lock-in mechanisms (why bypassing fails)

The engine is "unbypassable" not because we technically prevent it — but because bypassing means losing real value:

1. **Inquiry parsing**: the freelancer no longer manually decodes messy WhatsApp briefs. To bypass = to do this themselves.
2. **Client KYC**: silent lookups they'd otherwise skip ("nahhh, they look legit") and regret.
3. **Question generation**: the engine drafts the bilingual questions to ask the client. Bypassing = drafting yourself in Saudi-polite Arabic.
4. **Proposal artifact**: the freelancer writes zero words. The branded PDF / share link is what the client receives. Bypassing = writing the proposal themselves.
5. **Personal pricing model**: every gig priced through Rizq makes the next one sharper *for that specific freelancer*. Bypassing = throwing away the compounding edge.
6. **Outcome tracking + win-rate calibration**: the engine eventually tells them "price at SAR X for 70% win probability". Bypassing = flying blind on win rate.

The freelancer doesn't refuse to bypass because we lock them in — they don't bypass because using Rizq is genuinely cheaper, faster, and better for every gig. The lock-in is *earned by utility*, not enforced by contract.

---

## 7. Mainstream path

Sequence to becoming the default Saudi freelance pricing reference:

1. **v0.1 (today's build, mostly shipped)**: statistical benchmark + crowd submissions. Earn early trust + seed data.
2. **v0.2 (engine wedge)**: scope extraction + comp retrieval + Bayesian pricing + active elicitation. Skip KYC, skip outcome tracking. Ship to existing freelancer users as "smart mode" alongside the current tool. **This is where the patent is provable.**
3. **v0.3 (proposal artifact)**: bilingual PDF generator + share links + read-receipts. This is the lock-in surface coming online.
4. **v0.4 (outcome capture)**: track open/reply/accept on shared proposals. Begin the feedback loop. Personal models start compounding.
5. **v0.5 (KYC + capture surfaces)**: WhatsApp Business integration + Wathiq/Maroof lookups. Now the engine is consuming inquiries end-to-end.
6. **v0.6 (buyer-side mode)**: launch a buyer-facing surface that uses the same engine to tell *companies* what they should pay. Two-sided. This is where the market-maker positioning takes hold.
7. **v1.0 (mainstream)**: integrations with WhatsApp Business, Gmail, LinkedIn, Mostaql/Khamsat. PR push around "Rizq is the price." Public methodology + transparency report. Become the cited benchmark in Saudi freelance media.

Patent provisional filed between v0.2 and v0.3 — once the active-elicitation loop is demonstrably working.

---

## 8. v0.2 wedge (the next slice to ship)

The minimum slice that proves the patent novelty:

- **Intake**: existing paste-the-brief textbox + DeepSeek scope extraction.
- **Retrieval**: k-NN over existing Rizq submissions only (no scraping yet). Use scope embeddings.
- **Pricing**: Bayesian posterior over the retrieved comps, with the existing statistical core as the prior.
- **Active elicitation**: information-gain ranking + question generation. **This is the patent core — do not skip.**
- **Calibrated refusal**: built in from day one. The engine sometimes says no.
- **Output**: still a price card (not yet a proposal PDF). Adds a "questions to ask the client" section.

What's **deliberately out** of v0.2:
- Client KYC (defer to v0.5)
- Proposal artifact (defer to v0.3)
- Outcome tracking (defer to v0.4)
- Multi-source scraping (defer to v0.5)
- WhatsApp/email capture surfaces (defer to v0.5)
- Per-freelancer personal models (defer to v0.4 — needs outcome data)

This wedge can ship in **8–12 engineering-weeks** for a small team (1 ML/backend + 1 fullstack + 0.5 design). It is enough to file a provisional patent, enough to demonstrate the "smart mode" to existing users, and enough to start collecting the inquiry → scope → outcome data that powers v0.3+.

---

## 9. Risks and open questions

**Technical risks**
- DeepSeek extraction quality on Saudi dialect Arabic. Mitigation: prompt engineering + few-shot examples + Arabic-tuned fallback (Anthropic, Gemini).
- Cold-start: ≤500 comps is thin for k-NN. Mitigation: keep the v0.1 statistical core as the Bayesian prior — never rely on neighbors alone.
- Calibration drift over time. Mitigation: monthly calibration check (does the engine's claimed 90% CI actually contain the realized price 90% of the time?).
- Cost spikes if a user pastes huge briefs / spammy content. Mitigation: hard token cap per call + per-user rate limit (already in place for the v0.1 tool).

**Legal risks**
- Scraping ToS violations. Mitigation: partnerships > scraping; document robots.txt compliance for any crawled source.
- PDPL compliance on inquiry text (often contains PII). Mitigation: PII detection + redaction at ingestion; configurable retention windows; per-user data export.
- Patent prior-art surprise. Mitigation: prior-art search before drafting; legal counsel review before public talk-tracks describe the algorithm.

**Strategic risks**
- A platform partner (Mostaql, Bahr) launches their own pricing tool first. Mitigation: speed-to-market on the engine + own the "neutral third-party" positioning that platforms can't credibly own.
- Government regulation of AI pricing tools. Mitigation: build in transparent methodology + audit log from day one; position as decision-support, not auto-pricing.

**Open product questions**
- Pricing for the engine tier — bundled with Pro or a separate tier?
- Do we ever expose the engine as an API for other tools to consume? (Big strategic question: API = mainstream, but also commoditizes us.)
- How much of the active-elicitation logic do we surface to the user vs. keep as a black box? (Transparency = trust; opacity = defensibility.)

---

## 10. What this document is not

- Not an implementation plan. The CTO converts this into a phased plan with concrete tickets when the team is ready to start v0.2.
- Not a final architecture. Major decisions (which embedding model, which Bayesian library, exact data schema) are deferred until v0.2 kickoff.
- Not a commitment for v0.1. **The current v0.1 PRD ships the statistical tool. This engine is the v0.2+ roadmap.**

---

## 11. Suggested next steps (for the CTO)

1. **Read this doc + the existing PRD + Architecture doc.** Reconcile differences.
2. **Run a prior-art search** before writing a single line of engine code. The patent novelty hinges on no one having published the active-elicitation-for-pricing combination.
3. **Pilot scope extraction** with DeepSeek on 50 real Saudi freelance inquiries. Measure precision/recall on the scope schema. This is the cheapest way to de-risk the LLM dependency.
4. **Convert this doc into a v0.2 implementation plan** (probably using `superpowers:writing-plans` skill or your team's equivalent). Plan should cover: data model migration, embedding pipeline, retrieval API, Bayesian module, elicitation engine, calibrated-refusal threshold tuning, evaluation harness.
5. **Decide on the patent timeline.** Provisional filing target: end of v0.2 build. Engage Saudi + US patent counsel early.
6. **Build the evaluation harness before the engine.** A held-out set of real inquiries + ground-truth prices is the only way to know if any of this is actually working.

---

**End of v0.1 engine plan. Revisit after v0.1 launches and seed data crosses ~500 records.**
