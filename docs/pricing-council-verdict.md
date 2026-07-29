# Council verdict on the Rizq pricing engine

Synthesized from five expert analyses and their hostile critiques, checked against `docs/pricing-problem-statement.md` (measured 2026-07-29) and section 9. Positions that failed critique or violate section 9 are dead regardless of pedigree; where they died, the dissent is recorded.

---

## 1. Verdict on the current engine

**Weighted-percentile band over pooled rows — replace.** All five experts and all five critiques agree on the diagnosis, and the document measured it: a weighted median over a bimodal set does not average the regimes, it lurches between them (199 of 700 bands moved under one confidence tweak, extremes −85.9% / +44.4%). Pooling rows across derivation regimes is the root defect; every other change follows from removing it. The estimation unit becomes the evidence family, not the row.

**Evidence families — keep, and promote.** The family split is the best decision in the current engine and every expert built on it. Rows within a family share a derivation, so they share an error; that is exactly the structure that lets sparse first-party data calibrate 2,000 derived rows through a handful of shared parameters. Families stop being an input to a score and become the thing the engine estimates.

**Noisy-or accumulation — delete.** `1 − Π(1 − w)` has no probabilistic meaning here: provenance weights are not probabilities of anything, so the accumulated number is a heuristic monotone in family count dressed as a credence. Everything it gestures at is carried better by real quantities: component count and composition (which families fed the band) and band width. No critique defended it.

**Agreement penalty — delete as a score factor, keep its threshold as a display trigger.** Disagreement between families should widen the published band and switch the card into its two-readings state — visible structure, not an invisible multiplier on a number the user never sees. The `SPREAD_FULL_CREDIT = 1.5` comparison already computed in `aggregate.ts` survives as exactly that trigger.

**Sample factor — fold into per-family precision.** A source's published sample size belongs in its family's component variance (bigger sample → tighter component → more weight in the mixture), not in a separate global multiplier. Delete the standalone factor once the mixture ships.

**Provenance weights, freshness decay, k-anonymity ≥ 3, `forClientAudience()` redaction — keep untouched.** The first two do their job inside family summaries. The last two are section-9 machinery and nothing in this document weakens them.

---

## 2. Answers to the six questions

### Q1 — The estimator

**Neither pool nor pick: model each evidence family as measuring the true log price plus a declared, cited, family-level bias; adjust families toward each other before mixing; the band is the quantiles of the bias-adjusted mixture, so residual disagreement widens the band instead of flipping it.**

Why: the corpus part-identifies the biggest bias itself, which is what makes this more than prior-laundering. The peg/PPP ratio is 3.75/1.85 = 2.03, and the measured Saudi-priced ÷ PPP-converted ratios (1.88–2.76×, §4.1) bracket exactly that factor — so the regime 2 vs 3 "contradiction" is mostly the currency-bridge choice, and digital freelance work is partially tradable, so the truth sits between PPP and the peg. Encode that as a per-specialty tradability weight λ interpolating log-bridge between ln(1.85) and ln(3.75), prior centered at 0.5, cited as an assumption. This was the one Q1 mechanism to survive its critique intact, it is closed-form log-normal (no MCMC, no dependency), and at zero first-party rows it degrades to a wide honest envelope. It also fixes the majority-of-grid problem the economist's critique exposed: for the 14 specialties with no Saudi source, both families cross the same PPP bridge and their errors co-move — the λ adjustment lifts those cells by a declared amount instead of leaving a known understatement in every headline.

Dissents recorded: the economist's petrostate argument (GDP-wide PPP deflator imports the cheap-migrant-labor price level into a professional-services market that doesn't use that labor) is the best *explanation* of why λ should sit above 0.5 for corporate-client work — but his geometric-mean anchor died as self-refuting (it averaged in, at full weight, a pool he declared 1.5–2× biased). The bootstrapper's and skeptic's "anchor on the least-transformed family" died for smuggling regime-picking in as a ranking principle — it crowns the single-source Robert Walters family, which crosses the uncalibrated employment bridge, as truth. The designer's DerSimonian–Laird dressing died at k=2 families per cell (τ² from one degree of freedom).

Confidence: **DECIDED** on the mechanism. The *location* of λ — where between PPP and peg the market actually clears — is **GENUINELY OPEN**, and that is by design: it is the one number first-party data exists to settle (Q3).

### Q2 — One band or regimes?

**One headline band whose width carries the disagreement; when family medians disagree past the existing 1.5× threshold, show two named readings under it with their citations; never ask the freelancer to pick a regime, and never show the breakdown on a client-facing artifact.**

Why: unanimous across all five. Pushing the regime choice onto the freelancer moves the decision to the person with less information (the document's own framing answers itself), but a single band concealing a 2–4× split violates the honesty moat, so both layers ship — the meta-analysis convention of pooled-estimate-plus-forest-plot. The named derivations are negotiation ammunition keyed to information only the freelancer has (client type): "what a Saudi employer pays, converted" is the comparator against a corporation; "what freelancers bill abroad, adjusted" is the floor for open-market work. The disclosure passes through `forClientAudience()` as excluded — printing the lower reading beside the freelancer's quote on a shareable page is a bigger leak than the band feature-011's redaction exists to hide (the bootstrapper proposed exactly that and the critique correctly killed it).

Dissent recorded: the statistician and economist both suspect the editorial-vs-recruiter split is partly *real* market segmentation (SME/Mostaql-arbitraged work vs corporate procurement). Plausible — but the low cluster **is** the unverifiable editorial seed, so naming it a "budget segment" asserts guesswork as observed data. The hypothesis waits for the client_type field (see §3) to confirm or kill it with real rows.

Confidence: **DECIDED**.

### Q3 — How first-party data arbitrates

**Global per-family log-offsets with explicit shrinkage, updated not by paid prices but by the *deviation* between what Rizq suggested and what the freelancer actually charged — because a paid price that merely echoes the displayed band carries no information.**

Why: the shared-parameter structure (Fay–Herriot logic: sparse observations inform global family offsets; every cell inherits the correction) was proposed by four of five experts and is right — it is the only structure where ten transactions that never repeat a cell still move the corpus, with shrinkage (prior pseudo-count n₀ ≈ 10–25, declared in code) preventing five early web-dev invoices from swinging everything. But every expert's version was then hit by the same two critiques, and both are fatal to the naive design:

1. **Reflexivity.** Rizq displays the band before the freelancer quotes. Users anchor on it, quote it, clients pay roughly the quote — so ln(paid/anchor) ≈ 0 regardless of market truth, and the calibration measures the anchor's persuasiveness, not its accuracy. Three of five critiques found this independently; no expert did. The fix is cheap and ships first: snapshot the band at proposal creation, record whether the user saw the suggestion before pricing (`saw_band_first`), elicit the onboarding stated rate *before* `OnboardingPricePreview` renders, and treat deviation-from-anchor as the calibration signal. Only deviations carry independent information.
2. **"Paid" is not verified.** No payment rails exist (Tap is founder-gated and unbuilt); the paid flag is self-clicked, and `provenance.ts` already refuses the word "verified" for submitted rows. So: winsorize at ±ln 3, activate only at ≥3 distinct contributors, never print «موثَّقة» — the honest word is «مسجَّلة» (recorded).

Also decided here: calibration consumes only cells passing the k ≥ 3 gate, and the statistician's critique is right that this makes arrival slower than his "~10 pairs" headline — the first ten transactions scattered across the grid may produce zero k-anonymous cells. Collapsing the city axis (Q4) is the mitigation: 700 cells become 100, concentrating contributors ~7× faster toward the gate.

Confidence: **DECIDED** on structure and on deviation-as-signal; the exact shrinkage constants are implementation detail, tuned in the unit test, not a doctrine.

### Q4 — The city axis

**Drop city as a pricing axis now. Bands go national, the card says so honestly, city stays captured on first-party contributions, and the axis re-earns itself per city only when that city-cell holds ≥ 3 distinct contributors — the PDPL gate doubles as the axis-activation gate.**

Why: the strongest consensus in the council — the only question where three experts earned outright "sound" verdicts. The measurement is dispositive: 0 of 492 cited rows carry a city; the entire Riyadh-vs-Jeddah differentiation is unverifiable seed, which is the document's own "lie of interface" and a 7× multiplier of fake cell-granularity that manufactures the sparsity the rest of the system agonizes over. One engineering trap, caught by critique: do **not** just NULL `city_id` on the fanned seed rows — `resolve.ts` treats NULL city as supports-every-city, so nulling turns ~21 rows per specialty×tier into wildcards and inflates sample ~7× while the fabricated city deltas survive as fake spread. The migration must dedupe to one national min/median/max triple per (specialty, tier, size) and deactivate the copies (preserving the triple keeps editorial-only cells above `MIN_SAMPLE = 3`).

Dissents recorded: the statistician's GaStat regional-wage-ratio multiplier dies on verification — the critique could not confirm a citable region-level wage series, and a load-bearing multiplier may not rest on data whose citable existence is unconfirmed. The cost-of-living-index route (Numbeo) dies on principle: a consumption-basket ratio applied to service prices is exactly the invented-bridge class §3 exists to retire, and its sources contradict each other anyway. Both are on the do-not-do list.

Confidence: **DECIDED**.

### Q5 — The three invented constants

**Stop pretending there are three constants: 1250, 1.25 and 1.30 enter every price only as a product, so only the composite employment bridge is identifiable — keep them solely as the documented, literature-cited decomposition of one composite prior, which Q3's offsets calibrate as a whole. PROJECT_HOURS moves from a constant to a provenance-carrying table and gets measured directly — never backed out of invoices.**

Why: the identifiability argument appeared independently in four of five analyses and every critique endorsed it — regressing invoices against three multiplied constants recovers nothing but their product; effort spent separating them is provably wasted. The composite (≈ 2.7× the employment hourly wage) sits at the aggressive edge of the practitioner literature's 2–2.5× range, so it is a defensible prior once cited as such, with its uncertainty widened rather than its point value re-tuned. Hours are the exception because they *can* be measured independently: one optional `expected_hours` field on proposals and one optional `actual_hours` field at gig completion. Both channels are direct; both carry provenance ("stated by n freelancers" vs "assumed"). Hours vary far less than prices, so single-digit n per (specialty × size) beats a guess that is plausibly off 2×.

What died, and it matters: **invoice-implied hours (paid ÷ hourly anchor) is circular** — users quote the anchor Rizq shows them, so the "measurement" returns the constant it was built to test. Three separate critiques caught three separate experts proposing it. It is banned. Also dead: the economist's line-item rebuild (drop the 1.30 premium to 1.0 per Hamilton 2000, rebuild overhead from GOSI arithmetic) — directionally interesting, but the celebrated "convergence" of the regimes after dropping 1.30 is indistinguishable from tuning constants until families agree, with zero new observations behind it. Hamilton's finding (median self-employed earn *less* than employees, premium only in the right tail) is recorded as the strongest reason to keep the composite's prior wide on the downside.

Confidence: **DECIDED**.

### Q6 — Cold-start behaviour

**Never refuse a number at the quoting moment — but for the 14 foreign-only specialties, invert the card: the evidence sentence leads, the figure follows with an ≈ prefix, precision coarsens to the nearest 500 SAR, and the evidence label states *composition on two axes* (Saudi vs foreign origin AND observed vs bridged derivation), never a rank.**

Why: a wide, honestly-labeled band beats both a refusal and a falsely tight one — the freelancer's real question is "what floor can I defend," and a floor with a named source and visible arithmetic wins that conversation. The current failure is salience, not data: visual hierarchy is itself a claim, and today the hierarchy says "certain" while a footnote whispers "derived." Coarsening displayed precision to match evidence (3,330 → ≈3,500) kills the false-precision tell directly. The limited/moderate/good tiers die with the noisy-or.

The critical correction from critique, applied here: **no single-axis trust chip.** Both the statistician's and economist's taxonomies were killed for the same flaw — labeling Robert Walters-derived cells "Saudi-sourced" at top trust badges employment data crossing the invented 2.7× bridge as stronger than foreign freelance-native data crossing the cited PPP bridge, when the document says nothing can adjudicate that ranking. The honest labels name the derivation, not a rank: «من رواتب سعودية منشورة، محوَّلة لعمل حر» / «من تقارير مستقلين أجنبية، معدَّلة للسعودية» / «صفقات سعودية مسجَّلة». And per Q3: never «موثَّقة» for self-attested rows.

The contribution CTA ships on this card because cold-start honesty and first-party acquisition are the same feature — the moment of seeing "no Saudi source for your specialty yet" is peak motivation to contribute. What died: the Cooke expert panel (circular — its calibration variables were published figures from one of the disputed regimes, so performance-weighting imports that regime's bias into the panel; and 15–20 panelists covering 20 specialties × tiers × cities means opining on markets they don't practice).

Confidence: **DECIDED** on mechanism; exact copy iterates in the normal way.

---

## 3. The target design

The engine stays pure TypeScript in `src/lib/pricing/`, Supabase Postgres underneath, no new runtime dependency, closed-form throughout.

### Estimator

- **`src/lib/pricing/bridges.ts`** — all transforms (currency bridge, employment composite, hours) move *out* of ingestion into `applyBridges(row, calibration)` called at aggregation time. Migration adds `benchmark_records.price_original numeric` and `original_unit text`, backfilled from ingestion records. Recalibration then never re-ingests 2,112 rows, and the citation can print the exact transform applied. (Skeptic's refactor; survived critique untouched.)
- **`src/lib/pricing/familyBias.ts`** — a config table `{family: {mu, tau, rationale, source_ref, as_of}}`: the priors are themselves cited provenance. Holds the per-specialty tradability weight λ (default 0.5, prior Beta(2,2)) interpolating the currency bridge between PPP 1.85 and peg 3.75; the employment composite with its decomposition (1250 hours, statutory load, premium) and its two literature citations; a modest overstatement prior on `gulf_recruiter` (large-employer skew); a wide zero-centered prior on `editorial`.
- **`src/lib/pricing/latentTruth.ts`** — per family: weighted log-median and spread from that family's rows (existing provenance × confidence × freshness weights, published sample feeding component variance); bias-adjust each component by its family's posterior mean; band = p10/p50/p90 of the precision-weighted log-normal mixture, computed by bisection. When adjusted family medians still disagree past 1.5×, the band widens to the envelope of the family interquartile ranges and the result is flagged `band_kind: 'disagreement'`. Editorial feeds min/max context only and is excluded from the anchor wherever any cited family exists.
- **`aggregate.ts`** — already builds `pricesByFamily`; it now emits per-family summaries, calls the combiner, and exposes `families: {family, adjusted_median, low, high, source_count, citation}[]`, `evidence_composition`, and `band_kind` on `Aggregate`. The pooled `weightedPercentile` call, the noisy-or block, the standalone sample factor and the agreement multiplier are deleted.

### City

National bands. One migration dedupes the editorial and founder fan-out to a single national min/median/max triple per (specialty, tier, size) with `city_id = NULL`, deactivating the per-city copies (history preserved). `resolve.ts` loses the city and region passes (net deletion — the NULL wildcard already made national rows serve every query); the fallback ladder collapses to size → national. `ResolveResult` gains `city_backed: boolean`. First-party contributions keep writing real `city_id`; a city pass returns for a given city-cell only at ≥ 3 distinct contributors, reusing `applyKAnonymity`.

### Calibration path as first-party data arrives

- **`band_snapshots`** (new table, written at proposal creation): query id, anchor, band, evidence composition, and `saw_band_first`. This is the reflexivity instrument and it ships *before* any calibration code is allowed to consume a transaction.
- **Onboarding order change:** `StepRates` elicits the stated rate before `OnboardingPricePreview` renders. The stated rate is the only pre-anchor observation Rizq will ever get per user; showing the band first destroys it.
- **`src/lib/pricing/calibration.ts`** + table `pricing_calibration(family, delta_log, n_obs, distinct_contributors, updated_at)` — a nightly job (pg_cron) computes per-family deviation terms from k-anonymous cells only, winsorized at ±ln 3, conjugate-updated against the `familyBias.ts` prior with declared pseudo-count. At n=0 the table is empty, the priors hold, and every existing band is byte-identical — so it ships now at zero risk. As deviations accumulate, the family offsets (chiefly λ) move, and all cells inherit the correction. Citation line when active: «معايَر وفق N صفقة مسجَّلة» — recorded, never verified.
- **`clients.client_type`** enum (government / enterprise / SME / individual), captured in the Client Book and stamped onto calibration observations. Costs one column now; it is the only field that can resolve whether the regime split is source error or real client-segment structure, and it must exist before the transactions it explains arrive.

### Hours

Table `project_hours(specialty_id, project_size, hours, provenance check in ('reasoned','stated','measured'), n, as_of)`, seeded with today's 8/24/60/160 as `'reasoned'`, n=0. Loader `src/lib/pricing/projectHours.ts` with precedence measured > stated > reasoned, override at n ≥ 5 per (specialty × size). Inputs: optional `proposals.expected_hours`, optional `gigs.actual_hours` at completion. The provenance string on any price names which basis fed it.

### Display (Arabic-first)

`ResultCard` becomes a state machine on evidence composition:

- **Derived-only** (14 specialties today): amber treatment, evidence sentence *above* the figure — «تقدير مشتق من مصادر عالمية — لا بيانات سعودية بعد» — anchor with ≈ prefix, rounded to nearest 500, framed as negotiation floor: «استخدمه نقطة بداية للتفاوض، لا سعرًا سوقيًا مؤكَّدًا». Conversion shown as visible arithmetic with the fitted factor and its range.
- **Disagreement state** (`band_kind: 'disagreement'`): two named readings, stacked, label right / tabular figure left — «من رواتب سعودية منشورة (محوَّلة لعمل حر): ~١٢٬٢٠٠ ﷼» · «من أسعار مستقلين عالمية (معدَّلة للسعودية): ~٥٬٢٠٠ ﷼» — with the footer «لا توجد صفقات سعودية مسجَّلة ترجِّح أحد التقديرين بعد — إن كان عميلك جهة توظِّف بهذه الرواتب فالرقم الأعلى هو مرجع تفاوضك.»
- **National scope line** on every card until city cells re-earn: «الأسعار وطنية حالياً — لا يفرّق أي مصدر منشور بين المدن السعودية بعد».
- **Transaction-backed** (at k ≥ 3): solid figure, «يستند إلى N صفقات مسجَّلة من مستقلين سعوديين — آخر تحديث [شهر]», plus a progress line toward the gate for cells still short («٢ من ٣ مساهمات مطلوبة لعرض بيانات سعودية لهذا التخصص») and the CTA «سجّل أول فاتورة لتصبح هذه الأرقام سعودية».

All copy in both catalogs; Arabic-Indic digit and plural-count conventions from feature 011 (`src/lib/format/count.test.ts`) apply to every new count. `forClientAudience()` excludes the family breakdown, the readings, the composition chip and the progress line — client artifacts carry the chosen price only.

### Accountability

Once ≥ 10 completed loops exist: the methodology page publishes median log(recorded paid / shown anchor) with n and date — «متوسط انحراف رِزق عن الصفقات المسجَّلة». It reuses `band_snapshots`, costs one join, and makes "honesty is the moat" falsifiable. If the number is embarrassing, that is the product working.

---

## 4. Sequence

Each step ships independently; order within a trigger is the recommended order.

**NOW**
1. City retirement migration (dedupe to national triples, deactivate fanned copies) + national scope line + resolver ladder deletion. Biggest honesty win, net code deletion, unblocks everything by concentrating cells 7×.
2. `bridges.ts` refactor: `price_original`/`original_unit` columns, transforms applied at aggregation. Prerequisite for any recalibration ever happening without re-ingestion.
3. `familyBias.ts` + `latentTruth.ts`: bias-adjusted mixture replaces the pooled percentile; delete noisy-or, agreement multiplier, sample factor. Regression test replays the 199-band lurch (perturb confidences ±20%, assert anchor moves < 5%) and the content-writing · mid seed-vs-PPP case (band must span both regimes).
4. Display state machine: composition labels, ≈ + round-to-500 on derived-only, two-readings disclosure, progress line, CTA. Redaction allow-list extended to exclude all of it.
5. Reflexivity instrumentation: `band_snapshots` table + `saw_band_first` + reorder `StepRates` to elicit before preview. Must precede any calibration consumption.
6. `project_hours` table + loader + the two optional hours fields.
7. `clients.client_type` enum, captured in M2.
8. Ship `pricing_calibration` table + `calibration.ts` inert (empty table = byte-identical bands), with its unit tests.

**AT FIRST N TRANSACTIONS**
9. At the first k-anonymous cell: activate the nightly calibration job; citation gains the «معايَر وفق N صفقة مسجَّلة» line at n ≥ 5.
10. At n ≥ 5 per (specialty × size): `project_hours` measured/stated rows override the reasoned seed.
11. At ≥ 3 distinct contributors in a city-cell: that city's pass re-activates; card names the city again.
12. At ≥ 10 completed proposal→paid loops: publish the self-error metric on the methodology page.
13. At ~30+ stated-vs-recorded pairs: fit the stated-ask bias term so the stated pool inherits a citable correction.

**FOUNDER DECISION**
14. Proposal-outcome signal (accepted quote = censored observation that the market clears ≥ X): high value, arrives 10× faster than invoices, but harvesting outcomes into benchmark evidence needs an explicit opt-in consent design first — §9 makes contribution opt-in, and auto-capture is not.
15. Practitioner hours elicitation for the top 3–5 specialties only (not 20): cheap, citable as «ساعات مقدَّرة باستطلاع ممارسين (ن، تاريخ)», but it costs founder time to recruit.
16. Any expert-panel rate elicitation: dead as designed by the council (see do-not-do); revisit only with non-circular calibration variables and per-panelist scope limited to markets they practice.

---

## 5. Do-not-do list

- **No marketplace scraping, ever** — §9, non-negotiable, and the claim the product's credibility rests on.
- **No anchoring on the "least-transformed" family** — it is regime-picking wearing a principle's clothes, and it crowns a single source (Robert Walters) crossing the uncalibrated employment bridge.
- **No geometric-mean or pooled anchor that includes a family you have declared biased without adjusting it** — a known 1.5–2× understatement must not ship inside every headline at full weight.
- **No calibrating 1250 / 1.25 / 1.30 separately** — only their product is identifiable; the effort is provably wasted.
- **No invoice-implied hours (paid ÷ anchor)** — circular: it returns the constant it claims to test. Three critiques caught it independently.
- **No calibration from prices that echoed the displayed band** — reflexivity: without the `saw_band_first` instrument, the posterior converges to Rizq's own prior, not the market.
- **No "verified / موثَّقة" for self-attested rows** — no payment rails exist; `provenance.ts` already refuses the word, and an honesty product may not overrule its own honesty gate in a chip.
- **No single-axis trust chip that ranks regimes** — labeling bridged salary data above bridged freelance data (or vice versa) asserts the ranking §4.3 says nothing can adjudicate.
- **No regime breakdown, band, floor or progress line on client-facing artifacts** — feature-011's `forClientAudience()` redaction exists precisely because these arm the client.
- **No cost-of-living city multiplier (Numbeo etc.)** — a consumption-basket ratio applied to service prices is the invented-bridge class §3 exists to retire, and the sources contradict each other.
- **No GaStat regional wage multiplier until the series is verified citable at region level** — a load-bearing number may not rest on data whose citable existence is unconfirmed.
- **No NULL-ing city_id on fanned seed rows without deduping** — the NULL wildcard would inflate every national sample ~7× and preserve the fabricated deltas as fake spread.
- **No Cooke panel calibrated on published figures from a disputed regime** — performance-weighting on Robert Walters numbers imports regime 3's bias and then claims independence.
- **No Delphi across all 20 specialties** — ~100+ recruited Saudi experts is fantasy for this team; elicit narrow (top specialties, hours not prices) or not at all.
- **No DerSimonian–Laird τ² at k=2 families** — one degree of freedom lends false statistical authority to what is honestly "span the two medians."
- **No naming the editorial low cluster a "budget segment"** — it is the unverifiable seed; calling it observed market structure is asserting guesswork as data. Let `client_type` rows earn or kill the segmentation hypothesis.
- **No auto-harvesting proposal outcomes into benchmark evidence without opt-in** — §9's PDPL constraint covers contribution in every form, including the passive ones.
