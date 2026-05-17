# Rizq Engine — Research Report & Recommendation

| Field | Value |
|---|---|
| Document version | v1.0 |
| Author | Claude Code (acting CTO) |
| Date | 2026-05-14 |
| Status | **Decision-grade — recommends one path with evidence** |
| Companion docs | `engine.md` (vision), `prd.md` (v0.1 state) |

---

## 1. Recommendation — read this first

**Build one unified product — the proposal-authoring flow with pricing intelligence baked in.** Not a pricing tool. Not a proposal tool. **One button, one output.** The freelancer pastes their client's brief; Rizq extracts the scope, computes the price using the freelancer's onboarding data + market data, asks 1–3 bilingual follow-up questions if scope is ambiguous, and produces a **Rizq-stamped bilingual proposal artifact** the freelancer hands to their buyer. The price is justified because it is embedded inside a methodology-grounded artifact. The proposal is credible because the price is data-grounded. Neither has utility without the other — and shipping them as separate features misses the whole point.

Drop all "patent", "active-elicitation", and "information-gain ranking" framing — they are correct as engineering concepts but cause harm as marketing claims. The market gap is real (Saudi platforms have zero pricing tools; international AI-proposal tools are all form-driven and English-first), LLM capability is production-ready for the parts that matter, and the Rizq-stamped artifact creates the actual moat: not algorithm defensibility, but **credibility lock-in** — once Saudi buyers come to expect Rizq-stamped pricing as the standard, freelancers must use it.

Do not promise "AI that picks the smartest next question". Promise "Rizq writes the proposal you send your client. The price is part of it." Then quietly engineer the rest.

---

## 2. The Excel-line stress test — the founder's MEH is correct

The founder's complaint, verbatim from this conversation: *"the app right now feels MEH and anyone who is practical in excel can do our system faster in just a 30 minute setting"*. This is **right**.

A practical Excel-fluent person can rebuild Rizq v0.1's math in 30 minutes: AVERAGEIFS for the median bucket, MIN/MAX on filtered arrays, COUNTIFS for the sample size, a data-validation dropdown UX, and they're done. The statistical lookup is genuinely trivial.

Excel **cannot** cross into:

| Capability | Excel | What's needed |
|---|---|---|
| Compute median/min/max over filtered data | ✅ trivial | — |
| Bilingual Arabic-RTL mobile UX | ❌ hours of fighting | Web app |
| Multi-user auth + quota + RLS | ❌ impossible at scale | Backend |
| **Parse a WhatsApp brief into structured scope** | ❌ flat impossible | **LLM** |
| **Voice note → transcript → scope** | ❌ flat impossible | **Whisper / Fanar Speech** |
| **Generate a bilingual proposal with Saudi-polite phrasing** | ❌ mail-merge ≠ this | **LLM** |
| **Per-freelancer learning from outcomes** | ❌ doesn't scale past N=1 | **DB + model** |
| **Adaptive follow-up questions** | ❌ flat impossible | **LLM + logic** |
| **Rizq-stamped credibility artifact** | ❌ no such concept exists | **Brand + workflow** |

**The line**: anything purely numerical, Excel handles. Anything involving natural language, learning, branded artifacts, or end-to-end workflow capture, Excel cannot. Current Rizq v0.1 lives on the wrong side of that line. The v0.2 unified flow moves it decisively to the right side.

External validation: the [Qemma Soft 2026 Saudi freelancing guide](https://qemma-soft.com/en/blog/freelancing-guide-saudi-arabia-2026) literally recommends *"Excel sheets, QuickBooks, or Wave"* as pricing/financial tools for Saudi freelancers. This is the status quo Rizq is competing against. The bar is not high — but it is real.

---

## 3. The Saudi freelancer's real pricing pain — cited evidence

### 3.1 Underpricing is systemic and self-perpetuating

The [Hsoub I/O Arabic freelance community](https://io.hsoub.com/freelancing/122096-كيفية-تسعير-خدمات-العمل-الحر-سواء-كنت-مستقل-أو-عميل) — the largest Arabic freelancer forum, owned by the company behind Mostaql/Khamsat — surfaces these specific patterns in user comments:

- **Race-to-the-bottom offers**: real example cited of "400 pages for $15 in 3 days" — destroys the market price floor for every other freelancer.
- **Pricing/scope disconnect**: a freelancer quoted **$6 for a 500-word SEO-optimized article**; the (Saudi) client offered **$1**. This is the gap Rizq needs to close.
- **Market confusion (verbatim quote)**: *"كيف مثلًا يمكنني عمل مقال مع ضبط السيو والرفع ب5 دولار فقط"* — "How can I write a SEO-optimized article for just $5?" — this is the daily lived experience.
- **Commenters demand structural fixes**: enforced minimum-price standards across platforms, transparent rate floors per specialty/region — this is exactly the niche Rizq can fill credibly.

### 3.2 Saudi-specific underpricing is documented

The [Qemma Soft 2026 Saudi freelancing guide](https://qemma-soft.com/en/blog/freelancing-guide-saudi-arabia-2026) states directly: **"most new Saudi freelancers undervalue themselves severely"** — and identifies the specific failure mode: charging by hours rather than by value, and undercutting established rates by 50% to win cheap clients who then damage portfolios.

That source also provides concrete 2026 Saudi rate benchmarks Rizq can validate its data against:

| Service | 2026 KSA rate (SAR) |
|---|---|
| Logo design | 500 – 3,000 |
| Web design (5-page) | 2,000 – 8,000 |
| Social media monthly | 1,500 – 5,000 |
| App dev (simple) | 8,000 – 30,000 |
| Arabic article (1k words) | 150 – 400 |
| Video edit (3-min) | 300 – 1,200 |
| SEO monthly retainer | 2,000 – 8,000 |

Use these as ground-truth comparison for your existing dataset.

### 3.3 The pain pattern Rizq must solve

Saudi freelancers experience pricing pain at **three distinct moments**:

1. **Pre-quote moment** — "what should I even charge for this gig?" — Rizq v0.1 partially addresses (statistical lookup) but generically, with no scope-awareness for the specific brief.
2. **During-negotiation moment** — "the client says it's too expensive; how do I defend my price?" — Rizq v0.1 does NOT address. This is where the **Rizq-stamped artifact** is decisive: third-party authority shifts the negotiation from "your number vs my number" to "Rizq's verified market rate vs your offer".
3. **Scope-creep moment** — "we agreed on X but they keep asking for Y" — out of scope for v0.2; flag for later proposal-versioning feature.

The current product addresses 1/3 weakly and 2/3 not at all. The v0.2 unified flow addresses 1/3 and 2/3 substantively.

---

## 4. What competitors actually do — cited evidence

### 4.1 Saudi-native platforms have zero pricing tools

[**Bahr.sa**](https://bahr.sa/en) (Saudi government HRDF freelance platform, 0% commission, Saudi-citizens-only): marketplace + ratings + freelance certificate. **No pricing tool, no proposal tool, no scope tool, no workflow tooling at all.** Pure listings.

**Mostaql** (Hsoub, largest Arabic freelance platform, 10% commission, $25 project minimum): bidding marketplace. **No pricing tool for freelancers** — freelancers price themselves blind. Bidding fields are pure free-text.

**Khamsat** (Hsoub, $5 starting price, 20% commission): gig-package marketplace. Freelancers set fixed gig prices manually. **No pricing assistant.**

This is the gap. Saudi/Arabic freelancers have **no purpose-built pricing tool** today, full stop. Rizq is the first attempt.

### 4.2 International AI-proposal tools are form-driven and English-first

The newer 2024–2026 AI-proposal wave — [SoloTools](https://solotools.dev), [Bonsai](https://hellobonsai.com), [Bookipi Proposal AI](https://bookipi.com/proposal-ai/), [Taskade](https://www.taskade.com/generate/proposal/freelance-proposal), [Piktochart](https://piktochart.com/ai-proposal-generator/) — all share the same shape:

- **Intake**: form fields ("client name, project type, budget, scope notes"). **None take a brief-paste**, none take a doc upload, none take a voice note. SoloTools' own homepage describes intake as *"approximately 30 seconds"* of typing into fields.
- **Output**: bilingual? No — all are English-first or English-only. PDF + share link + e-signature is standard.
- **Pricing recommendation**: SoloTools claims "smart pricing suggestions for uncertain rates" but it's heuristic; not a real benchmark-data engine.
- **Market positioning**: workflow tool, not pricing authority. None claim third-party verification credibility.

Bonsai — the most-mature freelancer-stack tool — explicitly **does not have AI proposal drafting** as of 2026. Per a 2026 review: *"None of them will write a proposal for you. None of them will generate contract terms from a one-line brief."* This is a real gap.

**Rizq's opportunity space in one sentence**: combine SoloTools' AI-proposal UX (brief → artifact) + Bonsai's freelance-tool maturity + a uniquely Arabic-first + Saudi-localized + **benchmark-data-grounded credibility-stamp** that none of them have.

### 4.3 Patterns Rizq should steal

| Pattern | Source | Why |
|---|---|---|
| Brief-paste → instant proposal | SoloTools (but extend to dialect Arabic) | Crosses the Excel line decisively |
| PDF + shareable link + e-signature | Bonsai, SoloTools, PandaDoc | The "Rizq-stamped artifact" needs this surface |
| Free tier (3 proposals/month) | SoloTools ($0 free, $14.99 pro) | Aligns with current Rizq freemium model |
| 50% upfront deposit milestones | Qemma 2026 Saudi guide recommendation | Halal-compliant, Saudi-trusted default |
| "Based on N comparable projects" provenance citation in artifact | Original to Rizq | This IS the credibility moat |

### 4.4 Patterns to avoid

| Antipattern | Why |
|---|---|
| "Information-gain ranked questions" as marketing claim | No shipping product does this; sets you up for disappointment. Reframe as "smart follow-ups". |
| Voice-note ingestion at v0.2 launch | Whisper alone is ~25–35% WER on Saudi dialect; need Fanar Speech or ElevenLabs Scribe. Defer to v0.4 with a confirmation step. |
| Information-only output (no artifact) | The lock-in is the artifact. A number alone is replaceable; a branded artifact citing N comps with Rizq's seal is not. |
| Multi-source scraped data at launch | High legal + maintenance cost; low marginal accuracy gain at small N. Defer until submissions cross ~500 records. |

---

## 5. LLM capability bounds — what's actually shippable in 2026

(Adapted from research delivered with stable canonical sources cited.)

| Engine task | Verdict | Notes |
|---|---|---|
| **Brief → structured scope (English/MSA)** | 🟢 GREEN | ~90% field accuracy on clean briefs with [Vercel AI SDK `generateObject`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-object) + DeepSeek or Claude. |
| **Brief → structured scope (Saudi dialect WhatsApp)** | 🟡 YELLOW | ~70–80% accuracy. Mitigation: add per-field confidence score; ask follow-up on low-confidence fields. **Test DeepSeek vs. [Fanar](https://fanar.qa) vs. [Jais](https://inceptionai.ai/jais) on 50 real briefs before locking model choice.** |
| **Voice note → transcript (Saudi dialect)** | 🟡 YELLOW | Whisper-large-v3 hits 25–35% WER on Gulf dialect. Use Fanar Speech or [ElevenLabs Scribe](https://elevenlabs.io/speech-to-text) and add a "did we hear you right?" confirmation step. **Defer to v0.4.** |
| **Bilingual proposal artifact generation** | 🟢 GREEN | Solid 2026 territory. Cost ≈ $0.002–0.02 per proposal. Final Arabic legal/payment phrasing should be human-reviewed for v0.2 launch. |
| **"Information-gain" ranked question generation** | 🔴 RED *(as marketed)* / 🟢 GREEN *(as gap-filling)* | No shipping consumer product does true info-gain ranking. Reframe as "confidence-ranked gap-filling with LLM-phrased follow-ups". Hand-author the question templates per scope field, in Arabic + English. Ships in days, not months. |
| **Per-freelancer personalization** | 🟢 GREEN | Pure DB + weighted aggregation problem. Trivial engineering. Compounds with data. |

**Model recommendation**: DeepSeek as cost-default for English/structured-output tasks; **Fanar or Jais for Arabic-critical paths** (dialect-heavy scope extraction, formal proposal Arabic). Run a 1-day bake-off on 50 real Saudi briefs before committing.

---

## 6. The Rizq-stamped artifact — why this is the actual moat

The founder, verbatim: *"the client is the freelancer the client for me is the freelancer I am the service provider and my client is the freelancer who can share the pricing stamped official by my application for reference"*.

This is **the strategic insight of this entire research**. It is not a small detail — it changes the moat from "engine smartness" to "credibility authority". Three implications:

### 6.1 The artifact is the product

The price number is **not** the deliverable. The deliverable is a bilingual document the freelancer hands to their buyer-client containing:
- The scope (extracted, structured)
- The recommended price + band ("Based on N comparable Saudi projects in [city] over the last 12 months")
- Halal payment milestones (default 50/50)
- Freelancer's own branding (logo, name, contact)
- **Rizq's verification seal** — small, dignified, with a methodology link
- Timeline, revisions, IP terms (Saudi-law compliant)
- A unique shareable link the buyer can verify on rizq.sa

This artifact does three jobs:
1. **For the freelancer**: defends the price under negotiation pressure.
2. **For the buyer**: gives them confidence the price is fair-market, not arbitrary.
3. **For Rizq**: every artifact shared is a brand impression on a new buyer-side audience, distributed by every freelancer who uses Rizq.

### 6.2 The lock-in compounds via the buyer side

Once buyers in Riyadh / Jeddah see 5–10 Rizq-stamped proposals from different freelancers, *they* start expecting Rizq-stamped pricing as the standard. At that point freelancers MUST use Rizq because:
- Pricing without a Rizq stamp looks unverified by comparison
- Their personal history with Rizq compounds their personal pricing accuracy
- The PDF + share-link workflow is faster than writing it themselves

This is the **mainstream path**: not patent, not technical moat, but a workflow that propagates virally through the freelancer→buyer relationship and slowly becomes the default. It is the exact playbook Toptal (verified-talent stamp), Behance (verified-portfolio stamp), and Stripe (verified-payment stamp) used.

### 6.3 The artifact is the only thing Rizq does that nobody else can copy quickly

Mostaql could clone Rizq's statistical engine in two weeks. They cannot clone a third-party-authority brand in two years. The data, the brand, the methodology link, the freelancer trust — none of that is engineering work. That's the durable advantage.

---

## 7. The recommended v0.2 build — the unified proposal flow

### 7.1 The user journey (one button, one output)

A Saudi freelancer in Riyadh just got a WhatsApp message from a client at 11pm. They tap Rizq.

1. **Land on `/tool`** (existing route, repurposed) — single big textarea, placeholder *"ألصق رسالة العميل هنا"* / *"Paste the client's message here"*. Optional file/image upload alongside.
2. **Paste the brief**, tap **«أنشئ العرض»** / **"Generate the proposal"** — one button, no dropdowns, no specialty/city selectors (those come from their onboarding profile, set once).
3. **3–4 seconds**: skeleton state. Engine extracts scope, computes price (statistical core + their personal-history weighting), generates the bilingual artifact.
4. **Optional inline follow-up**: if scope confidence is low for high-impact fields, engine asks 1–3 bilingual questions ("How many revisions?", "Local or international launch?"). Freelancer answers or skips.
5. **The artifact appears** — Rizq-stamped bilingual proposal. The freelancer can tweak any block, then:
   - **Download PDF**
   - **Copy share link** (read-receipts on)
   - **Send via WhatsApp** (formatted summary)
6. **Saved to dashboard** as "Proposal #N" — re-runnable, fork-able for similar future gigs.

### 7.2 Why this is ONE feature, not three

The original framing of this report had three features (brief intake / follow-up questions / artifact). That was misleading. **It is one feature: the proposal flow.** The three are internal mechanics of a single user-visible action — pasting a brief and getting an artifact back. The freelancer never thinks "first I extract, then I clarify, then I generate." They think "I'm writing a proposal."

This matters because:
- **The price is justified by being embedded in a methodology-grounded artifact.** A number alone is too thin to act on.
- **The proposal is credible because the price is data-grounded.** A document alone is too unsupported to win negotiations.
- **Excel can't do either, but can do neither even more decisively than each separately.** No Excel-fluent person can produce "brief → priced bilingual proposal artifact in 90 seconds" no matter how many hours they have.
- **The lock-in is the artifact, not the algorithm.** Spend the engineering budget on the artifact's quality, the share-link experience, and the verification stamp's visual weight — not on Bayesian elegance.

### 7.3 Internal mechanics (one flow, three steps)

**Step 1 — Scope extraction.** DeepSeek (Fanar fallback for Arabic-dialect-heavy briefs) extracts a structured scope object via [Vercel AI SDK `generateObject`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-object) against a Zod schema:

```ts
type Scope = {
  specialty: SpecialtyEnum;
  deliverables: string[];
  deliverable_count: number | null;
  revisions: number | null;
  urgency: "rush_under_1_week" | "standard_1_4_weeks" | "long_term" | null;
  complexity_signals: string[];
  client_type: "individual" | "smb" | "corporate" | "government" | "agency" | null;
  geography_target: "ksa_local" | "gcc" | "international" | null;
  language_preference: "ar" | "en" | "both" | null;
  budget_mentioned: number | null;
  ip_transfer: "full_transfer" | "license" | "unclear" | null;
  field_confidence: Record<keyof Scope, number>;
};
```

**Step 2 — Smart follow-ups (rule-based gap-filling).** For fields with `field_confidence < 0.7` AND high price impact, fire hand-authored bilingual question templates. Max 3 per session. If freelancer skips, proceed with widened confidence band. Examples:
- `revisions === null` → "كم عدد المراجعات المتفق عليها؟" / "How many revision rounds?"
- `urgency === null` → "هل العميل مستعجل؟ متى يحتاج التسليم؟" / "Is the client in a rush?"
- `ip_transfer === "unclear"` → "هل سيتم تسليم ملكية التصميم كاملة أم رخصة استخدام؟"

**Step 3 — Rizq-stamped artifact.** Statistical price core (already shipped) weighted by the freelancer's personal history (new) produces the price band. Bilingual artifact rendered via fixed HTML template:
- **Branding block** — logo, name, contact (from onboarding)
- **Scope block** — auto-rendered from the scope object
- **Price block** — band + anchored recommendation + halal milestones (default 50/50)
- **Provenance block** — *"بناءً على N مشاريع مشابهة في [city] خلال آخر 12 شهر — منهجية رِزق"* with methodology link
- **Terms block** — timeline, revisions, IP, Saudi-law clause
- **Rizq verification stamp** — small, dignified seal with unique artifact ID resolving on rizq.sa

Output channels: downloadable PDF (HTML-to-PDF) + shareable link at `/[locale]/p/[proposal_id]` with view tracking + WhatsApp-ready text summary.

### 7.4 Onboarding upgrade (required for v0.2)

Onboarding becomes more substantial because every proposal autopopulates from the freelancer's profile. Existing onboarding captures specialty + city + tier + preferred language. **New fields needed**:

- **Brand block**: name, logo upload, contact (email + phone + WhatsApp)
- **Pricing defaults**: preferred deposit % (default 50%), revisions offered (default 2), milestone structure
- **IP terms default**: full transfer / license / per-project decision
- **Voice**: short Arabic tagline that appears on every proposal

Set once. Reused everywhere. The artifact looks personal-to-them out of the box.

### 7.5 Monetization shift — unit-of-value becomes the proposal

| | v0.1 today | v0.2 reframed |
|---|---|---|
| Unit of value | A query (just a number) | **A proposal** (a real artifact) |
| Free anonymous | 1 lifetime query | 1 lifetime **price preview** (number only, no artifact) — also serves SEO entry point |
| Free authenticated | 3 queries / Riyadh month | **1 proposal / month** + price previews unlimited |
| Pro tier | Unlimited queries | **20 proposals / month** + custom branding + read-receipt analytics + 100 price previews |
| Pro price | SAR 49 / month | Unchanged — but willingness-to-pay is materially higher per unit |

Why this works: each proposal has direct revenue consequence for the freelancer (each proposal potentially wins SAR 2,000–8,000 of work — see [Qemma 2026 rate ranges](https://qemma-soft.com/en/blog/freelancing-guide-saudi-arabia-2026)). SAR 49/month for 20 such artifacts is an obvious yes. SAR 49/month for unlimited median lookups is a harder sell.

### 7.6 What the existing v0.1 `/tool` route becomes

- **Keep statistical preview mode** at `/tool` for anonymous users — type specialty + city, get a price band (no artifact). This is the SEO entry point and free-funnel hook.
- **Authenticated users** at `/tool` see the **unified proposal flow** instead — single textarea, paste-the-brief, generate the artifact.
- The two surfaces share the underlying statistical core. The difference is what the user gives (dropdowns vs brief) and what they get back (number vs artifact).

### 7.7 Out of v0.2 (intentionally deferred)

- Voice note ingestion (v0.4 — requires Fanar Speech)
- Outcome tracking dashboards (v0.3 — capture the data in v0.2, build the UI later)
- Per-freelancer Bayesian model (post-v0.3 — needs outcome data first)
- Multi-source scraped data (post-v0.3 — defer until submissions cross ~500 records)
- KYC / buyer-identity enrichment (v0.5)
- Buyer-side mode (v0.6)

### 7.8 Why keep v0.2 tight (and not bigger)

Three reasons:
1. **The unified flow creates the Excel-line crossing on its own.** Brief intake + bilingual priced artifact + onboarding-driven personalization is enough to differentiate decisively. Adding voice notes, KYC, or Bayesian sophistication doesn't add more "not-Excel"; it adds risk.
2. **The artifact is the moat.** Spend disproportionately on making it gorgeous, share-worthy, and trustworthy. Spend the rest of the budget here, not on algorithmic elegance freelancers will never see.
3. **It validates the credibility-stamp hypothesis cheaply.** If freelancers don't share their artifacts with buyers, the entire moat thesis is wrong — and we find out from a small v0.2 build, not a sprawling one.

### 7.9 Build sequence (dependency-ordered, best-effort, no SLA)

Work blocks listed in the order they unblock each other. **No time estimates** — this is engineering-lead-led, best-effort. Move at the pace that lets us ship something we'd be proud to put a Rizq stamp on.

| # | Block | Depends on |
|---|---|---|
| 1 | Scope schema + Zod validator + DeepSeek extraction prompt v1 | Test corpus (§10) |
| 2 | LLM bake-off: DeepSeek vs Fanar vs Jais on the test corpus. Pick primary + fallback per language path. | Block 1 + Fanar/Jais API keys (§10) |
| 3 | Repurpose `/[locale]/tool` route — auth gate splits between preview (anonymous) and full proposal flow (authed) | Block 2 |
| 4 | Follow-up question templates (Arabic + English) + inline question UI flow | Block 3 |
| 5 | Onboarding upgrade — brand block, pricing defaults, IP defaults | (parallel — independent of LLM blocks) |
| 6 | Price calc upgrade — existing statistical core weighted by freelancer's personal history | Block 5 |
| 7 | Artifact HTML template + bilingual rendering + Rizq verification stamp visual | Block 6 + design assets (§10) |
| 8 | PDF export + WhatsApp text summary | Block 7 |
| 9 | Public proposal route `/[locale]/p/[id]` + view tracking | Block 8 |
| 10 | End-to-end dogfooding with 5 real freelancers | Block 9 + all of above |

### 7.10 Cost shape

At an arbitrary throughput of 1k proposals (whenever they land — months or years, doesn't matter):
- DeepSeek tokens: ~$30 per 1k proposals
- Fanar tokens (Arabic-critical fraction): ~$20 per 1k proposals
- PDF rendering compute: ~$5 per 1k proposals
- Supabase storage for artifacts: existing tier
- **Total marginal cost: ~$0.06 per proposal**

Pro tier at SAR 49/mo per active user. Gross margin >95% even at heavy use. **Cost is not a constraint.**

### 7.11 Definition of done

v0.2 ships when:
- A freelancer can paste a real WhatsApp brief and receive a usable proposal artifact in a single short interaction
- The artifact PDF + share link + WhatsApp summary all work end-to-end on mobile (70%+ of KSA traffic)
- Anonymous statistical preview still works at `/tool` for SEO / free-funnel entry
- Founder + 5 real freelancers have each generated ≥3 proposals successfully without engineering help
- `pnpm build` clean, existing tests green, new core logic unit-tested

No telemetry requirement (founder decision 2026-05-14) — the moat hypothesis is an accepted, unmeasured bet (§9.1).

---

## 8. What comes after v0.2 (sequenced, not timed)

Each version follows when the previous one has shipped and produced data worth learning from. No calendar commitments.

**v0.3 — once v0.2 is shipping and freelancers are generating proposals:**
- Outcome capture (proposal opened? counter-offered? final price?)
- Per-freelancer pricing posterior (their history weights their next recommendation)
- Better follow-up phrasing, learned from which questions actually unlocked tight ranges

**v0.4 — capture surfaces:**
- Voice note ingestion via Fanar Speech + confirmation step
- Mobile share-extension to capture briefs from WhatsApp directly
- Email forward and browser-extension capture

**Post-v0.4 — explicit deferral, do not commit yet:**
- Hierarchical Bayesian core (replaces statistical core if outcome data supports it)
- True calibrated confidence intervals
- Information-gain question ranking — only if the v0.2 gap-filling heuristics prove insufficient
- KYC / public-registry buyer enrichment
- Multi-source scraped data integration
- Buyer-side surface (the two-sided market move)
- WhatsApp Business API integration

---

## 9. Honest risks & gaps

### 9.1 The moat hypothesis — knowingly accepted, unmeasured

The riskiest assumption is: **buyers treat the Rizq stamp as authoritative, so freelancers share it.** Earlier drafts gated v0.2 on 10 founder-led freelancer interviews; a later draft made post-ship telemetry the validator. **Founder decisions (2026-05-14): skip the interviews, and don't build telemetry either.** The reasoning is on the record:

- **Stated preference ≠ revealed preference.** Pre-validation interviews produce a comfortable number that doesn't predict behavior.
- **Instrumenting a funnel before there are users is premature.** Telemetry is not the product; building the proposal flow is. Measurement is a thing you add when there are users worth measuring.
- **The architecture already de-risks the dialect concern.** The follow-up-question loop is the safety net: extraction never needs to be perfect, it needs to be *honest about uncertainty* and ask when unsure. That's a prompt-engineering problem, not a model-quality gate.
- **Best-effort, no-SLA, founder-conviction build.** The cost of being wrong is bounded — no deadline, no team committed. Velocity over a weak proxy is a defensible early-stage tradeoff.

**The accepted risk, stated once for the record:** we commit engineering effort to an unproven moat hypothesis, *and* v0.2 will not instrument whether it's working. We proceed on founder conviction plus whatever qualitative signal comes back from freelancers who use it. If the moat is wrong we'll learn it from word-of-mouth and retention feel, not a dashboard. The founder owns this tradeoff; it is reasonable for this stage. Telemetry can be added later as a small additive change if/when there are enough users to make measurement worthwhile.

The interview script is preserved in git history (commit a8c3316) if the founder ever wants informal qualitative signal — but it is not a gate and not a prerequisite.

### 9.2 Other open risks

| Risk | Mitigation |
|---|---|
| DeepSeek dialect quality below expected | LLM bake-off (block 2 of §7.9); Fanar/Jais are real alternatives |
| Freelancers don't share artifacts with buyers (no virality) | Not instrumented in v0.2 (founder decision); detected qualitatively via freelancer feedback and retention feel |
| Mostaql or Bahr ship a competing tool first | Speed-to-market; the Rizq-stamp authority play takes a brand stance an existing platform can't credibly take |
| Saudi PDPL on inquiry text containing PII | PII detection + redaction at ingestion; configurable retention; per-user data export already partly built |
| Cost spike on a single 100k-token brief | Hard token cap per call (~5k tokens); per-user rate limit already in place |
| The Rizq stamp positioning fails buyer-side | **The accepted risk (§9.1).** Not instrumented in v0.2 by founder decision; we proceed on conviction + qualitative freelancer feedback and accept we won't have hard data. |

### 9.3 What remains unverified (knowingly, by founder decision)

- Real Saudi freelancer demand at scale — no primary interviews; founder accepts this and proceeds on conviction + qualitative feedback (§9.1)
- Whether buyers actually treat the Rizq stamp as authoritative — the accepted, unmeasured risk; no instrumentation in v0.2 by founder decision
- Whether DeepSeek's Saudi-dialect extraction is good enough — de-risked architecturally by the ask-if-unsure loop; revisit only if freelancers report bad extractions
- The current Rizq dataset's accuracy against the Qemma 2026 benchmark ranges (§3.2) — optional spot-check, not a blocker

---

## 10. Before we start — nothing blocks us

No SLA. No deadline. **Founder decision (2026-05-14): nothing external gates the start. We begin now.**

### 10.1 Nothing blocks the start

Earlier drafts gated v0.2 on three founder-supplied prerequisites (10 interviews, a 50-brief corpus, Fanar/Jais keys). The founder reviewed and collapsed all three — correctly. The reasoning is on the record in §9.1. Restated here:

- **Interviews** — dropped. Stated preference doesn't predict behavior (§9.1). Not a gate.
- **50-brief corpus** — *not* a gate. We start the scope schema + extraction prompt with the founder's own briefs plus synthetic ones, and refine against real briefs as they arrive through dogfooding. The corpus is a *quality input gathered while building*, not a precondition.
- **Fanar/Jais keys** — *not* a gate. Ship on DeepSeek. The ask-if-unsure follow-up loop is the architectural safety net for dialect uncertainty (§9.1). Only revisit alternative models if freelancers report bad extractions. Don't pre-optimize a model choice for an unobserved problem.

**Conclusion: engineering can begin immediately.** The first concrete move is the scope schema + Zod validator + DeepSeek extraction prompt v1 (block 1 of §7.9), validated against the founder's own example briefs and synthetic ones.

There is no telemetry obligation. Per founder decision (2026-05-14), v0.2 ships without analytics instrumentation; the moat hypothesis is an accepted, unmeasured bet (§9.1). Measurement is a later additive change, not a v0.2 constraint.

### 10.2 Founder product decisions (gathered as we work)

These will surface during engineering. No need to decide them upfront — but the founder is the deciding voice when they come up.

- **Artifact naming** in Saudi-polite Arabic — `العرض` / `الاقتراح` / `عرض السعر`? (Engineering lead's lean: `العرض`.)
- **Main button label** — `أنشئ العرض` / `اكتب العرض` / something else.
- **Default deposit structure** — 50/50 by default, unless founder says otherwise. (Halal-compliant default.)
- **Default revisions offered** — 2 by default.
- **Halal payment phrasing** — exact Saudi-polite wording founder signs off on for the milestone block.
- **IP transfer default** — full transfer / license / per-project decision.
- **Co-branding rule** — freelancer's logo prominent; Rizq stamp visible-but-secondary; **never removable**. Confirm.
- **Public proposal route** — `/[locale]/p/[id]`? Or something brand-stronger like `/p/[id]` (locale-free, shorter)?

### 10.3 Content the founder writes with engineering's help

- ~16 follow-up question templates (one per scope field × 2 languages). Arabic should be Saudi-polite, English clean and direct.
- Provenance citation phrasing — *"بناءً على N مشاريع مشابهة في [city] خلال آخر 12 شهر — منهجية رِزق"* (template to refine).
- Halal milestone default text.
- Saudi-law IP/terms clause for the proposal artifact footer.
- Bilingual artifact section headings (scope, price, terms, milestones, methodology).

### 10.4 Design work to commission

- **Rizq verification stamp** — single SVG, dignified, notary-style. This is the brand surface on every artifact. Spend disproportionately here.
- **Artifact PDF template visual design** — bilingual-aware, Tajawal for Arabic, Inter for Latin, RTL/LTR mixed gracefully.
- **Onboarding "brand block" UI patterns** — logo upload, brand name, contact, tagline.

### 10.5 Engineering prep (engineering-lead handles, no founder action required)

- [Vercel AI SDK](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-object) installation + DeepSeek/Fanar wiring.
- Zod schema for the scope object.
- PDF generation approach decision (lean: `@react-pdf/renderer` for clean Arabic typography; alternatives evaluated).
- New private Supabase storage bucket: `proposal-artifacts`.
- pgvector confirmation in Supabase (likely already enabled).
- Quota plumbing migration: queries → proposals (DB column rename + tier-config update, low risk).

### 10.6 One-hour data sanity check (optional, not blocking)

Spot-check Rizq's current dataset's medians against the [Qemma 2026 KSA rate ranges](https://qemma-soft.com/en/blog/freelancing-guide-saudi-arabia-2026). If our medians differ by >30% from Qemma's published ranges in 3+ specialties, dataset cleanup should happen alongside v0.2. If they match within 20%, base data is sound. Either way, not a blocker — just informs whether dataset cleanup rides along with the v0.2 work.

### 10.7 Honest gaps, knowingly accepted

- Fanar/Jais commercial pricing is unknown until accounts are created — but we're not gating on a bake-off, so this is deferred, not blocking.
- The moat is unproven and conviction won't prove it — accepted, unmeasured risk (§9.1). No instrumentation in v0.2 by founder decision; we proceed on conviction + qualitative feedback.
- Precise LLM cost is unknown until real briefs run through real APIs — but the ~$0.06/proposal estimate has >95% margin headroom, so cost is not a decision-relevant unknown.

None of these block the start. All become known as v0.2 is built and dogfooded.

---

## 11. The one-paragraph summary for any stakeholder

Rizq v0.1 is a statistical pricing benchmark that a competent Excel user could rebuild in 30 minutes — the founder's MEH is correct, and the Saudi freelance community confirms there is **no purpose-built pricing tool in the market** (Mostaql, Khamsat, Bahr all lack one; international AI-proposal tools are form-driven and English-first). The recommended move is to reframe Rizq as a **proposal-authoring tool with pricing intelligence baked in** — one button, one output, built best-effort with no calendar SLA. The freelancer pastes their client's brief; Rizq extracts scope, computes price using onboarding data + market data, fills scope gaps with 1–3 bilingual follow-ups if needed, and produces a **Rizq-stamped bilingual proposal artifact** the freelancer hands to their buyer. The price and the proposal are inseparable — neither has utility without the other. The artifact is the actual moat — not patents, not algorithm cleverness — because it propagates virally through the freelancer→buyer relationship and slowly establishes Rizq as the Saudi pricing standard. Unit-of-value shifts from "queries" to "proposals", with Pro pricing unchanged but willingness-to-pay materially higher because each proposal directly drives revenue. Per founder decisions (2026-05-14), there is no pre-validation gate and no analytics instrumentation — engineering starts immediately on founder conviction; the moat hypothesis is a knowingly accepted, unmeasured bet (§9.1) validated by qualitative freelancer feedback rather than a dashboard. LLM capability is production-ready for the parts that matter; the ask-if-unsure follow-up loop is the architectural safety net for Saudi-dialect extraction; marginal cost is ~$0.06/proposal, well under SAR 49/mo Pro pricing.

---

## Sources

- [Hsoub I/O — كيفية تسعير خدمات العمل الحر (Arabic freelance pricing community)](https://io.hsoub.com/freelancing/122096-كيفية-تسعير-خدمات-العمل-الحر-سواء-كنت-مستقل-أو-عميل)
- [Qemma Soft — Freelancing in Saudi Arabia 2026 Complete Guide](https://qemma-soft.com/en/blog/freelancing-guide-saudi-arabia-2026)
- [SoloTools — AI Proposal Generator for Freelancers](https://solotools.dev/)
- [Bonsai 2026 review — Capterra](https://www.capterra.com/p/238825/Bonsai/)
- [Bookipi Proposal AI](https://bookipi.com/proposal-ai/)
- [Taskade AI Freelance Proposal Generator](https://www.taskade.com/generate/proposal/freelance-proposal)
- [Bahr.sa — Saudi government freelance platform](https://bahr.sa/en)
- [Mostaql FAQ (Arabic)](https://mostaql.com/p/faq)
- [Jobbers — Mostaql vs Khamsat vs Bahr 2026 comparison](https://www.jobbers.io/mostaql-vs-khamsat-vs-jobbers-best-arabic-freelance-platform-2026-complete-review/)
- [DeepSeek API documentation](https://api-docs.deepseek.com)
- [Open Arabic LLM Leaderboard (OALL) — Hugging Face](https://huggingface.co/spaces/OALL/Open-Arabic-LLM-Leaderboard)
- [Fanar — Saudi/Gulf-tuned Arabic LLM](https://fanar.qa)
- [Jais — Inception AI Arabic LLM](https://inceptionai.ai/jais)
- [Whisper model card — OpenAI](https://github.com/openai/whisper/blob/main/model-card.md)
- [Vercel AI SDK — generateObject documentation](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-object)
- [ElevenLabs Scribe — multilingual STT](https://elevenlabs.io/speech-to-text)
- [Rao & Daumé III — Learning to Ask Good Questions (arXiv)](https://arxiv.org/abs/1805.04655)

**End of research report v1.0.**
