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

**Build a focused engine wedge in 6–8 weeks that does three things Excel cannot:** (a) parse a freelancer's raw client brief into a structured scope object, (b) ask 1–3 bilingual clarifying questions when scope is ambiguous, and (c) generate a **Rizq-stamped bilingual proposal artifact** the freelancer hands to their buyer as third-party pricing authority. Drop all "patent" and "active-elicitation" framing — both are correct as engineering concepts but cause more harm than help as positioning and marketing claims. The market gap is real (Saudi platforms have zero pricing tools; international AI-proposal tools are all form-driven and English-first), LLM capability is production-ready for these three jobs, and the Rizq-stamped artifact creates the actual moat: not patent defensibility, but **credibility lock-in** — once Saudi buyers come to expect Rizq-stamped pricing, freelancers must use it.

Do not promise "AI that knows the smartest question to ask next" in marketing. Promise "Rizq writes you a proposal you can send the client". Then quietly engineer the rest.

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

**The line**: anything purely numerical, Excel handles. Anything involving natural language, learning, branded artifacts, or end-to-end workflow capture, Excel cannot. Current Rizq v0.1 lives on the wrong side of that line. Phase A of this plan moves it decisively to the right side.

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

The current product addresses 1/3 weakly and 2/3 not at all. The Phase A engine addresses 1/3 and 2/3 substantively.

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
| Voice-note ingestion at v0.2 launch | Whisper alone is ~25–35% WER on Saudi dialect; need Fanar Speech or ElevenLabs Scribe. Add to Phase B with a confirmation step. |
| Information-only output (no artifact) | The lock-in is the artifact. A number alone is replaceable; a branded artifact citing N comps with Rizq's seal is not. |
| Multi-source scraped data at launch | High legal + maintenance cost; low marginal accuracy gain at small N. Defer until submissions cross ~500 records. |

---

## 5. LLM capability bounds — what's actually shippable in 2026

(Adapted from research delivered with stable canonical sources cited.)

| Engine task | Verdict | Notes |
|---|---|---|
| **Brief → structured scope (English/MSA)** | 🟢 GREEN | ~90% field accuracy on clean briefs with [Vercel AI SDK `generateObject`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-object) + DeepSeek or Claude. |
| **Brief → structured scope (Saudi dialect WhatsApp)** | 🟡 YELLOW | ~70–80% accuracy. Mitigation: add per-field confidence score; ask follow-up on low-confidence fields. **Test DeepSeek vs. [Fanar](https://fanar.qa) vs. [Jais](https://inceptionai.ai/jais) on 50 real briefs before locking model choice.** |
| **Voice note → transcript (Saudi dialect)** | 🟡 YELLOW | Whisper-large-v3 hits 25–35% WER on Gulf dialect. Use Fanar Speech or [ElevenLabs Scribe](https://elevenlabs.io/speech-to-text) and add a "did we hear you right?" confirmation step. **Defer to Phase B.** |
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

## 7. The recommended Phase A wedge — 6–8 weeks of engineering

### 7.1 Scope (build all three, ship together)

**Feature 1: Brief intake**
- New route: `/[locale]/tool/smart` (lives alongside the existing `/tool` for now).
- UI: a single large textarea + optional file/image upload (PDF, screenshot).
- Backend: DeepSeek (Fanar fallback for Arabic-dialect-heavy briefs) extracts a structured scope object via a Zod schema using [Vercel AI SDK `generateObject`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-object).
- Scope schema (initial):
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
    field_confidence: Record<keyof Scope, number>;  // 0..1 per field
  };
  ```
- Each field carries a confidence score from the model — drives Feature 2.

**Feature 2: Smart follow-up questions (NOT info-gain, just gap-filling)**
- For every field with `field_confidence < 0.7` AND that affects price, ask a bilingual follow-up.
- Hand-authored question templates per field. Examples:
  - `revisions === null` → AR: "كم عدد المراجعات المتفق عليها؟" / EN: "How many revision rounds?"
  - `urgency === null` → AR: "هل العميل مستعجل؟ متى يحتاج التسليم؟" / EN: "Is the client in a rush? When do they need delivery?"
  - `ip_transfer === "unclear"` → AR: "هل سيتم تسليم ملكية التصميم كاملة أم رخصة استخدام؟"
- Max 3 questions per session. If the freelancer skips, proceed with current scope and widen confidence band.
- Never ship marketing copy saying "AI picks the smartest question". Ship "Rizq fills gaps with quick follow-ups."

**Feature 3: Rizq-stamped proposal artifact**
- After scope is locked + price is calculated (using existing statistical core, weighted by freelancer's own past prices):
- Generate a bilingual artifact via DeepSeek/Fanar with a fixed template:
  - Freelancer branding block (logo, name, contact — set during onboarding)
  - Scope block (auto-rendered from scope object)
  - Price block (band + anchored recommendation + halal milestones)
  - Provenance block (*"بناءً على N مشاريع مشابهة في [city] خلال آخر 12 شهر — منهجية رِزق"* with methodology link)
  - Terms block (timeline, revisions, IP, Saudi-law clause)
  - **Rizq verification stamp** — a small dignified seal, similar visual weight to a notary stamp
- Output channels:
  - Downloadable PDF (Puppeteer or Vercel's HTML-to-PDF)
  - Shareable web link at `/[locale]/p/[proposal_id]` with view tracking
  - WhatsApp-ready text summary

### 7.2 Out of Phase A (intentionally)

- Voice note ingestion (Phase B — requires Fanar Speech)
- Outcome tracking (Phase B)
- Per-freelancer Bayesian model (Phase C)
- Multi-source scraped data (Phase C+, after submissions cross 500)
- KYC / buyer-identity enrichment (Phase D — out of v0.2 entirely)
- Buyer-side mode (Phase D)

### 7.3 Why this scope and not larger

Three reasons to keep it tight:
1. **Phase A creates the Excel-line crossing on its own.** Brief intake + bilingual artifact + per-freelancer weighting is enough to differentiate. Adding more features doesn't add more "not-Excel"; it adds risk.
2. **The artifact is the only feature that creates compounding moat.** Spend disproportionately on making it gorgeous. Spend the rest of the budget here, not on info-gain math.
3. **Validates the credibility-stamp positioning** without committing 12 months of engineering. If freelancers don't share the artifact, the moat hypothesis is wrong — and you find out cheap, not expensive.

### 7.4 Engineering build path

Rough sequencing (assume 1 fullstack + 0.5 ML/backend, 6–8 weeks):

| Week | Work |
|---|---|
| 1 | Scope schema + Zod validator. DeepSeek extraction prompt v1. 50-brief test harness (need real briefs — see §10). |
| 2 | Bake-off: DeepSeek vs Fanar vs Jais on 50 briefs. Pick winner per language path. Wire `/[locale]/tool/smart` route. |
| 3 | Follow-up question templates (Arabic + English, 8 fields × 2 langs = 16 templates). UI flow. |
| 4 | Price calculation upgrade: use existing statistical core + per-freelancer weighting (new). Confidence band logic. |
| 5 | Artifact generation: HTML template, bilingual rendering, branding capture flow, PDF export. |
| 6 | `/[locale]/p/[proposal_id]` public route + view tracking + Rizq stamp visual. WhatsApp summary export. |
| 7 | End-to-end test with 5 real freelancers (founder-recruited). Iterate on weak points. |
| 8 | Final polish, telemetry, ship behind a `/tool/smart` opt-in toggle. Keep `/tool` (statistical) live as fallback. |

### 7.5 Cost shape

At 1k smart-proposals/month:
- DeepSeek tokens: ~$30/mo
- Fanar tokens (Arabic-critical fraction): ~$20/mo
- PDF rendering compute: ~$5/mo
- Supabase storage for artifacts: existing tier
- **Total marginal cost ~$0.06 per smart-proposal**

Pro tier at SAR 49/mo = SAR 49 revenue per active user. Gross margin >95% even with heavy use. Cost is **not** a constraint.

### 7.6 Definition of done for Phase A

The wedge ships when:
- Founder + 5 real Saudi freelancers can each paste a real brief and get a usable proposal in <90 seconds
- The artifact PDF + share link work end-to-end on mobile (70%+ of KSA traffic)
- Smart mode is opt-in via toggle — statistical mode remains the safe default
- Telemetry tracks: brief-paste rate, follow-up-question completion rate, artifact-share rate, artifact-view rate by buyers

---

## 8. Phase B (~3 months after A), Phase C (~6 months after B)

**Phase B — once Phase A is shipping and freelancers are sharing artifacts:**
- Voice note ingestion with Fanar Speech + confirmation step
- Outcome capture (proposal opened? counter-offered? final price?)
- Per-freelancer pricing posterior (their history weights their next recommendation)
- Mobile share-extension to capture briefs from WhatsApp directly
- Better follow-up phrasing learned from which questions actually unlocked tight ranges

**Phase C — once outcome data has accumulated:**
- Replace the statistical core with hierarchical Bayesian posterior over scope embeddings
- True calibrated confidence intervals
- (Maybe) information-gain ranking, IF the gap-filling heuristics in Phase A turn out to be insufficient — verify empirically before building

**Phase D and beyond — explicit deferral, do not commit yet:**
- Buyer-side mode
- KYC / public-registry enrichment
- Multi-source scraped data integration
- WhatsApp Business API integration

---

## 9. Honest risks & gaps

### 9.1 The product-fit interview gap (single most important caveat)

**I cannot interview 10 real Saudi freelancers.** Everything in §3 is from public sources — community posts, blog posts, freelancer guides. The pattern is consistent and convincing, but it is **not primary research**.

Before committing the 8 weeks for Phase A, the founder should personally do 10 conversations. Use this outreach script (Arabic):

> "السلام عليكم، أنا أبني أداة تساعد المستقلين السعوديين يسعّرون شغلهم بشكل أعدل. حابب أسألك ٤ أسئلة سريعة (٥ دقائق فقط) عن كيف تسعّر اليوم وأكبر مشكلة تواجهها."

Four questions:
1. آخر مرة سعّرت فيها مشروع، كيف وصلت للسعر؟
2. هل تذكر مرة سعّرت فيها بسعر ندمت عليه؟ ليش ندمت؟
3. لو فيه أداة تكتب لك العرض التجاري للعميل بناءً على بيانات السوق السعودي، كم راح تستخدمها؟
4. لو الأداة تعطيك نطاق سعر «مختوم من رِزق»، هل تشارك المختوم مع عميلك؟ ليش؟

Question 4 is the decisive one. If 7/10 say yes to sharing the Rizq stamp with their buyer, the moat hypothesis is validated and Phase A is greenlit. If <4/10, the moat is broken and we need to rethink.

### 9.2 Other open risks

| Risk | Mitigation |
|---|---|
| DeepSeek dialect quality below expected | Phase A week 2 bake-off; Fanar/Jais are real alternatives |
| Freelancers don't share artifacts with buyers (no virality) | Telemetry tracks share rate; if <30%, escalate to design fix or pivot |
| Mostaql or Bahr ship a competing tool first | Speed-to-market; the Rizq-stamp authority play takes a brand stance an existing platform can't credibly take |
| Saudi PDPL on inquiry text containing PII | PII detection + redaction at ingestion; configurable retention; per-user data export already partly built |
| Cost spike on a single 100k-token brief | Hard token cap per call (~5k tokens); per-user rate limit already in place |
| The Rizq stamp positioning fails buyer-side | Phase B view-tracking telemetry will reveal this within 2 months of Phase A launch — kill or refine then |

### 9.3 What I could not verify

- Real Saudi freelancer demand at scale (no primary interviews — see §9.1)
- Whether Fanar API quotas/pricing are commercially viable at Rizq's projected volume (need a 30-min check with the Fanar/QCRI team)
- Whether buyers will actually treat the Rizq stamp as authoritative (revealed by Phase A telemetry, not pre-launch research)
- The current Rizq dataset's accuracy against the Qemma 2026 benchmark ranges (§3.2) — quick spot-check needed

---

## 10. What to do this week — concrete next 5 actions

1. **Founder runs 10 freelancer interviews using the script in §9.1.** Decision trigger: 7/10 yes to question 4 = greenlight Phase A. <4/10 = back to brainstorming. **This is the only step that should happen before any code is written.**

2. **Founder collects 50 real freelance briefs in Arabic + English** — WhatsApp screenshots, email forwards, RFPs. From founder's own network or by asking interview participants. These become the Phase A week-1 test corpus. **Without this corpus, the LLM bake-off in week 2 cannot happen.**

3. **CTO/founder runs a 1-hour spot-check** of the current Rizq dataset against the [Qemma 2026 KSA rate benchmarks](https://qemma-soft.com/en/blog/freelancing-guide-saudi-arabia-2026). If Rizq's medians differ by >30% from Qemma's ranges in 3+ specialties, dataset quality is a v0.1 issue worth fixing before any v0.2 engine work.

4. **Decide model strategy on paper** before any code: DeepSeek primary or Fanar primary for Arabic paths? Get a Fanar API key + a Jais API key alongside the existing DeepSeek key so the week-2 bake-off is unblocked.

5. **Run the existing Excel-line audit** on the rest of v0.1 (dashboard, submissions, admin) — what other surfaces feel MEH? Phase A focuses on the tool; the founder's anxiety about "feels MEH" might apply more broadly. Fix or accept each surface explicitly.

---

## 11. The one-paragraph summary for any stakeholder

Rizq v0.1 is a credible statistical pricing benchmark that a competent Excel user could rebuild in 30 minutes — the founder's MEH is correct, and the Saudi freelance community confirms there is **no purpose-built pricing tool in the market** to compete with (Mostaql, Khamsat, Bahr all lack one; international AI-proposal tools are form-driven and English-first). The recommended move is a 6–8 week engineering wedge that adds three Excel-uncrossable features: brief-paste intake using DeepSeek/Fanar scope extraction, bilingual rule-based clarifying questions, and a **Rizq-stamped bilingual proposal artifact** the freelancer shares with their buyer as third-party pricing authority. The artifact is the actual moat — not patents, not algorithm cleverness — because it propagates virally through the freelancer→buyer relationship and slowly establishes Rizq as the Saudi pricing standard. Before any code is written, the founder should run 10 short freelancer interviews to validate the Rizq-stamp sharing hypothesis (question 4 in §9.1); 7/10 yes = greenlight, <4/10 = re-brainstorm. Total Phase A cost is engineering-time only (marginal LLM cost is ~$0.06/proposal, well under the SAR 49/mo Pro tier). LLM capability for the three features is production-ready in 2026 per stable canonical sources.

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
