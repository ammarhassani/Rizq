# Rizq Engine — Strategic Plan

| Field | Value |
|---|---|
| Document version | v0.2 |
| Author | Ammar Al-Hassani (founder) + Claude Code (engineering lead) |
| Date | 2026-05-14 |
| Status | **Vision spec for v0.2+ — informs CTO when v0.2 work begins. Patent framing dropped per founder direction (it was metaphor for "real and defensible", not strategy).** |
| Related docs | `engine-research.md` (decision-grade recommendation), `prd.md`, `brd.md`, `architecture.md` |

---

## 0. Read this first — the product reframe

**Rizq is a proposal-authoring tool with pricing intelligence baked in.** Not a pricing tool, not a proposal tool — one product. One button. One output. The price is justified because it is embedded inside a methodology-grounded proposal artifact. The proposal is credible because the price is data-grounded. Neither has utility without the other.

The current Rizq v0.1 tool (`/[locale]/tool`) is **iteration 1** of this product: a stripped-down price-lookup that returns a band but no artifact. It ships, it is real, but it is on the wrong side of the Excel line — any practical Excel user can rebuild the math in 30 minutes. v0.2 crosses the Excel line decisively by replacing the lookup with the unified proposal flow.

The audience throughout is the seller side: **Saudi freelancers pricing inbound work**. The buyer side is the *consumer of the artifact*, not the user of the app. The artifact propagates virally through freelancer → buyer relationships and slowly establishes Rizq as the Saudi pricing authority. Buyer-facing surfaces are a v1.0+ possibility, not a v0.2 goal.

The engine is designed to be:
1. **Inseparable from the artifact** — there is no "get a price" without "get a proposal", and no "draft a proposal" without "ground it in pricing data". One flow, one output.
2. **Calibrated** — refuses to commit when scope is too ambiguous; widens the band rather than bluffing.
3. **Compounding** — every proposal generated through Rizq sharpens the freelancer's personal pricing model and adds to the global comp base.
4. **Credibility-bearing** — every artifact carries Rizq's verification stamp + methodology link. That stamp is the moat (see §3).
5. **Mainstream-shaped** — once Saudi buyers come to expect Rizq-stamped pricing as the standard, freelancers must use it. Toptal/Behance/Stripe used this exact playbook.

---

## 1. Problem statement

A Saudi freelancer receives an inquiry — typically a messy WhatsApp message in dialect, sometimes a voice note, occasionally a formal RFP. They need to:

1. **Understand the scope** (deliverables, complexity, urgency, client expectations).
2. **Decide a price** they can defend, that wins the work without leaving money on the table.
3. **Produce a proposal** the client takes seriously.
4. **Negotiate and close.**

Today they do all four manually, often poorly. The Saudi market confirms this — see [`engine-research.md` §3](./engine-research.md#3-the-saudi-freelancers-real-pricing-pain--cited-evidence) for cited evidence (Hsoub community, Qemma 2026 Saudi guide). Existing tools fail in two distinct ways:

- **Pricing tools** (including Rizq v0.1) give a generic number for a specialty × city — they do not understand the *specific* inquiry, do not produce the *specific* proposal, and do not learn from the *specific* outcome. The number alone is too thin to act on.
- **Proposal tools** (Bonsai, SoloTools, Bookipi, Taskade) are form-driven and English-first. They produce a document but the price is hand-typed by the freelancer with no market grounding. The proposal alone is too unsupported to win negotiations.

**The reframe**: ship the *one* tool the Saudi market does not have — a unified flow where the brief becomes a priced, branded, methodology-grounded proposal artifact in one continuous action. Price and proposal are one deliverable, not two features.

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

**Step 5 · Smart follow-up gap-filling.** Engine identifies which scope fields have low confidence AND high price-impact, and generates 1–3 bilingual questions to fill those gaps. Implementation in v0.2 is **rule-based templates per field** with LLM phrasing on top — honest and small. True information-gain ranking is a possible later consideration only if heuristics prove insufficient. **Never marketed as "AI picks the smartest question" — that's vaporware framing.**

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

## 3. Defensibility — the Rizq-stamp moat

The original version of this document framed defensibility around a patent claim. The founder explicitly dropped that framing — "patent worthy" was a metaphor for "real and not trivial", not literal IP strategy. The actual moat is **credibility, not algorithm**.

### 3.1 What the artifact does

Every proposal generated through Rizq carries:
- The freelancer's own branding (logo, name, contact — captured at onboarding)
- A scope block (extracted, structured)
- A price block (band + anchored recommendation + halal milestones)
- A **provenance citation**: *"بناءً على N مشاريع مشابهة في [city] خلال آخر 12 شهر — منهجية رِزق"* with a methodology link
- A **Rizq verification stamp** — small, dignified, visible
- Saudi-law-compliant terms (timeline, revisions, IP)
- A unique shareable link the buyer can verify on rizq.sa

### 3.2 Why this is the moat

The artifact does three jobs simultaneously:

1. **For the freelancer**: defends the price under negotiation pressure. The freelancer no longer says "I think it's worth this" — they say "Rizq says the Saudi market median for this scope is X." The negotiation shifts from "your number vs my number" to "verified market rate vs your offer".
2. **For the buyer**: gives them confidence the price is fair-market, not arbitrary. Buyers who currently lowball because they have no reference now have one. Even if they push back, they push back against Rizq, not against the freelancer.
3. **For Rizq**: every artifact shared is a brand impression on a new buyer-side audience, distributed by every freelancer who uses Rizq. The freelancer becomes Rizq's salesforce, unintentionally.

### 3.3 Why it compounds — and why it's hard to copy

Once buyers in Riyadh / Jeddah / Dammam see 5–10 Rizq-stamped proposals from different freelancers, they start expecting Rizq-stamped pricing as the standard. At that point:
- A freelancer pricing *without* a Rizq stamp looks unverified by comparison
- The freelancer's personal history with Rizq compounds their personal pricing accuracy
- The PDF + share-link workflow is faster than writing it themselves

This is the **mainstream path**: a workflow that propagates virally through the freelancer → buyer relationship and slowly becomes the default. It is the exact playbook used by:
- **Toptal** — "verified top talent" stamp
- **Behance** — "verified portfolio" stamp
- **Stripe** — "verified payment" stamp
- **Maroof** — Saudi-government consumer-trust stamp

None of them have engineering moats. All of them have credibility moats. The technology is replicable; the trust is not.

### 3.4 Why a competitor can't replicate this quickly

These are rough estimates of how long a well-funded competitor would need to clone each layer if they decided to. They are **not** our own timelines — they're a competitive-defense reference.

| Surface | Rough time for a competitor to clone |
|---|---|
| The statistical engine | days |
| The brief-extraction LLM pipeline | weeks |
| The bilingual proposal template | weeks |
| The Rizq dataset | many months (data network effect) |
| The Rizq verification-stamp brand authority | **years** |
| Buyer-side expectation that "Rizq-stamped = trusted" | **uncopyable without going back in time** |

Engineering is hours and days. Trust is years and reputation. The moat is the bottom three rows.

### 3.5 Implications for build strategy

- **Spend disproportionately on the artifact's visual + experiential quality**. The PDF, the share link, the verification stamp, the methodology link — these are the brand surfaces. Pretty matters here, more than anywhere else.
- **Methodology page is product, not marketing**. Every artifact links back to `/methodology`. That page must be impeccable.
- **The data and the brand are inseparable**. Bad data poisons the stamp. Submission review must stay rigorous; the bar for an entry into the public dataset stays high.
- **Public exposure of the algorithm doesn't hurt us**. If a competitor reverse-engineers our extraction prompts or our Bayesian formulas, the moat is unchanged. We can openly publish methodology — and *should*, because transparency reinforces the credibility moat.

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

## 6. Why freelancers stay (utility-earned, not contract-enforced)

The product is "unbypassable" not because we lock people in — but because bypassing means losing real value on every single gig. Six compounding reasons a freelancer keeps reaching for Rizq:

1. **The brief gets parsed for them.** Messy WhatsApp Arabic, dialect, voice notes — DeepSeek/Fanar normalizes it into structured scope. Bypassing = decoding manually each time.
2. **The proposal writes itself.** Branded bilingual artifact, halal milestones, Saudi-polite phrasing, Rizq stamp. Bypassing = writing in Word for every client.
3. **The price defends itself.** "Rizq says the Saudi market median is X" beats "I think it's worth Y." Bypassing = no third-party authority in negotiation.
4. **The personal model compounds.** Every proposal trains Rizq for *this freelancer's* style — their typical clients, their typical scopes, their win-rate at price points. Bypassing = throwing away the personal edge.
5. **The share-link tracks itself.** Did the buyer open the proposal? Counter-offer? Accept? Rizq sees it. Bypassing = flying blind on what happened.
6. **The artifact does brand work for them.** Every Rizq-stamped proposal a freelancer sends raises *their* perceived professionalism — bypassing = sending an unstamped Word doc that looks amateur by comparison.

All six are earned utility. None are enforced. None require a contract or a paywall to work. The freelancer keeps using Rizq because not-using-Rizq is genuinely worse for them on every dimension.

---

## 7. Mainstream path

Sequence to becoming the default Saudi freelance pricing reference:

1. **v0.1 (mostly shipped)**: statistical benchmark + crowd submissions. Iteration 1 of the proposal flow, on the wrong side of the Excel line. Earns early trust and seeds the dataset.
2. **v0.2 (the unified proposal flow)**: brief intake + scope extraction + priced bilingual artifact + smart follow-up gap-filling. **This is where Rizq crosses the Excel line** — see [`engine-research.md`](./engine-research.md) for the decision-grade research and §8 of this doc for the build plan.
3. **v0.3 (outcome capture + compounding)**: track open/reply/counter-offer/accept on shared proposals. Per-freelancer history starts weighting their personal recommendations. The data flywheel begins turning.
4. **v0.4 (voice + capture surfaces)**: WhatsApp Business integration, voice note ingestion via Fanar Speech, browser extension for capture from email/LinkedIn DMs.
5. **v0.5 (silent buyer enrichment)**: Wathiq / Maroof / Etimad lookups silently adjust the recommendation based on who the buyer is. Still seller-facing.
6. **v0.6 (buyer-side surface)**: a buyer-facing experience that lets companies look up "what should I pay for X in KSA" using the same engine. Two-sided market positioning emerges.
7. **v1.0 (mainstream)**: integrations with WhatsApp Business, Gmail, LinkedIn, Mostaql/Khamsat. PR push around "Rizq is the Saudi pricing standard." Public methodology + transparency report. Become the cited benchmark in Saudi freelance media.

The pivot from "tool people use" to "authority the market expects" happens between v0.3 and v0.6. By v1.0, Rizq-stamped proposals are the assumed format for serious Saudi freelance work — not because we mandate it, but because the buyer side has come to expect it.

---

## 8. v0.2 wedge — the unified proposal flow

The v0.2 slice ships the **one-button, one-output** experience. There is no separate "smart pricing" mode — the proposal flow *is* the new tool. The existing `/[locale]/tool` route gets replaced (or kept behind a fallback toggle for users who want just a number preview).

### 8.1 The user journey

A Saudi freelancer in Riyadh just got a WhatsApp message from a client. They tap Rizq.

1. **Land on `/tool`** — single big textarea with placeholder "ألصق رسالة العميل هنا" / "Paste the client's message here". Optional file/image upload alongside.
2. **Paste the brief**, tap **«أنشئ العرض»** / **"Generate the proposal"** — one button, no dropdowns.
3. **3–4 seconds**: skeleton state. Engine extracts scope, computes price (statistical core + their personal-history weighting), generates the bilingual artifact.
4. **Optional follow-up**: if scope confidence < threshold, engine asks 1–3 bilingual questions inline ("How many revisions?", "Local or international launch?"). Freelancer answers or skips.
5. **Output**: Rizq-stamped bilingual proposal artifact. The freelancer reviews, tweaks if needed, taps:
   - **Download PDF**
   - **Copy share link** (auto-opens read-receipts)
   - **Send via WhatsApp** (formatted summary)
6. **Saved to dashboard** as "Proposal #N" — re-runnable, fork-able.

### 8.2 What the v0.2 wedge ships (one feature in three parts)

This is **one feature**: the unified proposal flow. The three internal parts:

- **Scope extraction** — DeepSeek (Fanar fallback for Arabic-dialect-heavy briefs) extracts a structured scope object from the brief via [Vercel AI SDK `generateObject`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-object). Each field carries a confidence score.
- **Priced proposal generation** — statistical price core (already shipped) weighted by the freelancer's personal history (new), wrapped into a bilingual artifact: scope block + price block + halal milestones + Rizq verification stamp + methodology link.
- **Smart follow-up gap-filling** — rule-based, not info-gain-ranked. For fields with low confidence, hand-authored bilingual question templates fire. **Reframe as "smart follow-ups" in marketing — never "AI picks the smartest question".**

### 8.3 Onboarding upgrade

Onboarding becomes more substantial in v0.2 because every proposal autopopulates from the freelancer's profile:

- Existing fields: specialty, city, experience tier, preferred language
- **New fields**:
  - Brand block: name, logo, contact (email + phone + WhatsApp)
  - Pricing defaults: preferred deposit % (default 50%), revisions offered (default 2), milestone structure
  - IP terms: default transfer / license / per-project decision
  - Voice: short Arabic tagline that appears on every proposal

Reused everywhere. Set once. The proposal artifact looks personal-to-them out of the box.

### 8.4 Monetization shift

| | v0.1 today | v0.2 reframed |
|---|---|---|
| Unit of value | Query (a number) | **Proposal** (an artifact) |
| Free anonymous | 1 lifetime query | 1 lifetime **price preview** (number only — no artifact) |
| Free authenticated | 3 queries / Riyadh month | **1 proposal / month** + price previews unlimited |
| Pro | Unlimited queries | **20 proposals / month** + custom branding + read-receipt analytics + 100 price previews |
| Pro pricing | SAR 49 / month (confirmed) | Unchanged — but willingness-to-pay is higher per unit |

Why this works: each proposal has direct revenue consequence for the freelancer. Paying SAR 49/month to generate 20 proposals that each potentially win SAR 2,000–8,000 of work is an obvious yes. Paying SAR 49/month for unlimited median lookups is a harder sell.

### 8.5 What stays unchanged from v0.1

- Auth (email + Google + LinkedIn + Apple-later) — reused as-is
- Onboarding skeleton — additive changes only
- Crowd-sourced submissions — reframed as **outcome capture** ("you sent proposal X — what happened?") instead of standalone "I charged Y for Z"
- Dashboard — query history becomes proposal history; richer, same shape
- Quota plumbing — counter switches from queries to proposals; rest is unchanged
- Admin review — unchanged
- Error boundaries, instrumentation, methodology page — unchanged
- Statistical core (`/lib/pricing/...`) — embedded inside the proposal flow, not deleted

### 8.6 Deliberately out of v0.2 (deferred to later versions)

- Voice note ingestion (v0.4 — needs Fanar Speech, has WER caveats on dialect)
- Outcome tracking dashboards (v0.3 — capture the data in v0.2, build the UI later)
- Per-freelancer Bayesian model (post-v0.3 — needs outcome data first)
- Multi-source scraped data (post-v0.3 — defer until submissions cross ~500 records)
- Client KYC / public-registry enrichment (v0.5)
- Buyer-side mode (v0.6)
- WhatsApp Business API capture (v0.4)
- True information-gain question ranking (only build if v0.2 heuristics prove insufficient)

### 8.7 Build sequence (best-effort, no SLA)

This is engineering-lead-paced — no week-by-week schedule, no deadline. Work blocks below are listed in **dependency order** — each block unblocks the next. We move at the pace that lets us ship something we'd be proud to put a Rizq stamp on. See [`engine-research.md` §7.9](./engine-research.md#79-build-sequence-dependency-ordered-best-effort-no-sla) for the same table.

| # | Block | Depends on |
|---|---|---|
| 1 | Scope schema + Zod validator + DeepSeek extraction prompt v1 | 50-brief test corpus (founder-supplied) |
| 2 | LLM bake-off: DeepSeek vs Fanar vs Jais on the test corpus | Block 1 + Fanar/Jais API keys |
| 3 | Repurpose `/[locale]/tool` route — auth gate splits preview (anon) from full proposal flow (authed) | Block 2 |
| 4 | Follow-up question templates (Arabic + English) + inline question UI | Block 3 |
| 5 | Onboarding upgrade — brand block, pricing defaults, IP defaults | parallel to LLM blocks |
| 6 | Price calc upgrade — existing core weighted by freelancer's personal history | Block 5 |
| 7 | Artifact HTML template + bilingual rendering + Rizq verification stamp visual | Block 6 + design assets |
| 8 | PDF export + WhatsApp text summary | Block 7 |
| 9 | Public proposal route `/[locale]/p/[id]` + view tracking | Block 8 |
| 10 | End-to-end dogfooding with 5 real freelancers | all above |
| 11 | Telemetry on share/open rates → moat hypothesis validation | Block 10 |

### 8.8 Definition of done

v0.2 ships when:
- A freelancer can paste a real WhatsApp brief and receive a usable proposal artifact in a single short interaction
- The PDF + share link + WhatsApp summary all work end-to-end on mobile
- Artifact view tracking captures buyer-side opens (this is how the moat hypothesis becomes empirically answerable)
- Statistical preview mode at `/tool` works for anonymous users — the SEO + free-funnel entry point
- Founder + 5 real freelancers each generated ≥ 3 proposals successfully without engineering help

### 8.9 Cost shape

Per 1k proposals (whenever they land — months or years, doesn't matter):
- DeepSeek tokens: ~$30
- Fanar tokens (Arabic-critical fraction): ~$20
- PDF rendering: ~$5
- Storage: existing tier
- **Marginal cost: ~$0.06 per proposal**. Pro tier at SAR 49/mo is >95% gross margin even at heavy use. Cost is **not** a constraint.

---

## 9. Risks and open questions

**Technical risks**
- DeepSeek extraction quality on Saudi dialect Arabic. Mitigation: prompt engineering + few-shot examples + Arabic-tuned fallback (Anthropic, Gemini).
- Cold-start: ≤500 comps is thin for k-NN. Mitigation: keep the v0.1 statistical core as the Bayesian prior — never rely on neighbors alone.
- Calibration drift over time. Mitigation: monthly calibration check (does the engine's claimed 90% CI actually contain the realized price 90% of the time?).
- Cost spikes if a user pastes huge briefs / spammy content. Mitigation: hard token cap per call + per-user rate limit (already in place for the v0.1 tool).

**Legal risks**
- Scraping ToS violations on future evidence sources. Mitigation: partnerships > scraping; document robots.txt compliance for any crawled source. Not a v0.2 risk (no scraping in v0.2).
- PDPL compliance on inquiry text (often contains PII). Mitigation: PII detection + redaction at ingestion; configurable retention windows; per-user data export already partly built.
- Misuse of the Rizq stamp on artifacts. Mitigation: verifiable share-links — every artifact published carries a unique ID that resolves on rizq.sa; tampered offline PDFs can be checked against the canonical record.

**Strategic risks**
- Mostaql or Bahr launches a competing pricing-proposal tool. Mitigation: speed-to-market on v0.2 + own the **neutral third-party authority** positioning that a platform with skin in the game cannot credibly take.
- Buyers don't actually treat the Rizq stamp as authoritative. Mitigation: this is the moat hypothesis and must be validated. The v0.2 telemetry on artifact-share rate + buyer-side open rate reveals this once meaningful proposal volume exists — kill or pivot then.
- Government regulation of AI pricing tools. Mitigation: build in transparent methodology + audit log from day one; position as decision-support, not auto-pricing.

**Open product questions**
- Should the proposal artifact be co-brandable with the freelancer's existing brand kit, or always carry Rizq's stamp prominently? (Recommendation: both — co-branded but Rizq stamp non-removable.)
- Do we ever expose the engine as an API for other tools to consume? (Big strategic question: API = mainstream, but also commoditizes us.)
- Should the methodology page link from inside the artifact be deep-linked to the specific data sources cited for that proposal? (Recommendation: yes, eventually — radical transparency reinforces the trust moat.)

---

## 10. What this document is not

- Not an implementation plan. The CTO converts this into a phased plan with concrete tickets when the team is ready to start v0.2.
- Not a final architecture. Major decisions (which embedding model, which Bayesian library, exact data schema) are deferred until v0.2 kickoff.
- Not a commitment for v0.1. **The current v0.1 PRD ships the statistical tool. This engine is the v0.2+ roadmap.**

---

## 11. Suggested next steps (for the CTO)

1. **Read this doc + [`engine-research.md`](./engine-research.md) + [`prd.md`](./prd.md) + [`architecture.md`](./architecture.md).** The research doc is the decision-grade recommendation; this doc is the long-term vision.
2. **Run the 10 founder-led freelancer interviews** described in `engine-research.md` §9.1 **before any code is written**. Question 4 — "Would you share a Rizq-stamped proposal with your client?" — gates the whole v0.2 build. 7/10 yes = greenlight. <4/10 = re-brainstorm.
3. **Have the founder collect 50 real Saudi freelance briefs** (WhatsApp screenshots, email forwards, RFPs). This is the v0.2 test corpus and is gating for the LLM bake-off — see [`engine-research.md` §10.1](./engine-research.md#101-gating--three-things-must-exist-first).
4. **Run a 1-day bake-off** of DeepSeek vs Fanar vs Jais on the 50 briefs. Pick the winner per language path before committing model strategy.
5. **Convert this doc + the research doc into a v0.2 implementation plan** (the `superpowers:writing-plans` skill is the natural next tool). Plan should cover: scope schema, extraction pipeline, follow-up question templates, onboarding upgrade, artifact generator, public proposal route, quota plumbing migration (queries → proposals).
6. **Build the evaluation harness alongside the engine.** A held-out set of 20+ real Saudi briefs with founder-confirmed correct scope extractions is the only way to know the LLM is doing its job.

---

**End of v0.2 engine plan. Revisit and refresh once v0.2 ships and outcome data starts accumulating.**
