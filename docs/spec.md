# Rizq — Technical Spec

| Field | Value |
|---|---|
| Author | Claude Code (engineering lead) |
| Updated | 2026-05-18 |
| Status | **Awaiting founder approve / disapprove** |
| Supersedes | the version-numbered framing in `engine.md` / `engine-research.md` / `prd.md` — this is the single build spec |
| Posture | One coherent system. No versions, no deadlines, no incremental-release framing. Phases below are **technical wiring order** — what must exist before what — not products anyone ships separately. |

---

## 1. What this is

Rizq is a proposal-authoring tool with pricing intelligence baked in. A Saudi freelancer pastes a client's message, Rizq resolves a defensible market price from a real data backbone, and produces a Rizq-stamped bilingual proposal artifact they send the client. Price and proposal are one deliverable.

**The data backbone is the project.** The extraction/artifact/stamp engineering is the easy 30%. The hard, valuable part is real price data with zero users and no sustainable manual seeding. This spec is built data-first.

---

## 2. The data backbone (the spine)

All price truth comes from one resolver reading one store fed by four collectors. Crowd submissions are **not** the primary source.

### 2.1 The store: `benchmark_records` (extended)

The existing table stays. Add provenance + freshness so every price row is auditable and the artifact can cite honestly:

```
provenance   enum ['published_ref','ingested','partner','submitted','reasoned']
source_ref   text   (URL / citation / model+prompt-hash depending on provenance)
captured_at  timestamptz
confidence   numeric  (0..1 — collector-assigned trust)
```

Every row knows where it came from and how much to trust it. Nothing is anonymous in the dataset.

### 2.2 Collector 1 — Curated published-reference anchor table

Real, public Saudi price references compiled **once** into structured rows (not recurring seeding):
- Qemma 2026 Saudi rate guide (logo 500–3000, web 2000–8000, app 8000–30000, …)
- Saudi agency public rate cards
- Aggregate Mostaql/Khamsat price ranges *as reported by third-party guides* (an editorial range like "logo gigs run 500–3000" — never harvested per-listing from the platforms themselves; see §2.3)
- HRDF / MHRSD freelance income statistics
- Saudi freelance pricing blogs/guides

Bounded task: 12 specialties × 5 tiers, curate published sources per cell, one pass. `provenance='published_ref'`, `source_ref`=citation. This is the day-zero spine — real and citable.

### 2.3 Collector 2 — Licensed & non-personal volume sources

**Legal finding (researched 2026-05-18):** the Arabic freelance marketplaces (Mostaql/Khamsat/Bahr) expose **no public APIs**, their ToS prohibit automated abuse, and — critically — **Saudi PDPL has no "publicly available data" exemption**. A named freelancer's listed price is personal data; scraping and reprocessing it has real PDPL exposure (SDAIA actively enforcing) and the Anti-Cyber Crime Law treats ToS-violating access as a criminal offence. **Automated scraping of marketplace personal pricing data is out — by law, not by preference.**

The volume engine is therefore built only from sources that are licensed or non-personal:
- **Saudi Open Data Portal** (`open.data.gov.sa`) — Etimad / government procurement datasets under the **Saudi Open Data License**: commercial reuse + adaptation explicitly permitted with attribution. Fully legal, downloadable datasets (not scraped — the portal is consumed via its published dataset files).
- **Aggregate published rate references** — guide/agency rate *ranges* ("logo: 500–3000 SAR"). These are editorial aggregates, **not** personal data → safe to curate. (Overlaps Collector 1; same legal footing.)
- **Formal data-license / partnership deals** — if a marketplace ever grants consented, licensed access, it enters here as `provenance='partner'`. Business development, not engineering.

Adapter interface stays: `fetch() → Raw[] → normalize() → BenchmarkRow[]`, `provenance='ingested'` (open-data) or `'partner'` (licensed), `source_ref`=dataset/license citation. No adapter ever touches a marketplace's authenticated or ToS-protected surface.

### 2.4 Collector 3 — LLM-reasoned constrained prior

For (specialty × city × tier × size) cells the above don't cover: DeepSeek produces a reasoned range **boxed by the anchor table** — it interpolates between known anchors, never invents free-hand. `provenance='reasoned'`, `source_ref`=model id + prompt hash, `confidence` low. Fills gaps day zero; demoted automatically as real rows (`ingested`/`submitted`) arrive for that cell.

### 2.5 Collector 4 — Crowd submissions (luxury, never essential)

The existing submission→review→`benchmark_records` pipeline stays, but the app is **fully functional with zero submissions, forever**. It is not a dependency, not a launch requirement, not a "we'll get data eventually" assumption. If submissions come, the resolver weights them in (`provenance='submitted'`) and the citation upgrades. If none ever come, nothing breaks — Collectors 1–3 already produce a real, cited price for every cell. Pure upside, zero load-bearing.

### 2.6 The resolver

`resolvePrice({ specialty, city, tier, size })`:
1. Pull all `active` rows for the cell; fallback widens (drop size → region → specialty-only) exactly like today.
2. Weight each row by `provenance` × `confidence` × freshness decay (`captured_at`).
3. Output `{ min, anchor, max, sample, dominant_provenance, sources[] }`.
4. Insufficient-data refusal stays — if even the reasoned prior can't bound it, say so.

### 2.7 The honesty rule (this is the moat)

The artifact cites **what the data actually is**, by `dominant_provenance`:
- mostly `reasoned` → *"تقدير رِزق بناءً على أسعار السوق السعودي المنشورة"* / "Rizq estimate from published Saudi market rates"
- mostly `published_ref` → "based on published Saudi 2026 rate references"
- mostly `ingested`/`submitted` → "based on N comparable Saudi projects"

The citation **upgrades itself** as the dataset deepens. We never claim a sample size we don't have. Overclaiming kills the stamp; honest sourcing is the stamp.

---

## 3. Price computation (on top of the backbone)

`resolvePrice` gives the band + anchor. Then:

**Hard dimensions (select the rows):**
| Input | Source |
|---|---|
| specialty | freelancer **profile** (multi-select at onboarding). Brief-extracted specialty used only on fallback or an undeclared-specialty gig. |
| city | profile |
| experience_tier | profile |
| project_size | brief (derived from deliverables + complexity) → defaults to profile-typical if absent |

**Within-band modifiers (move the anchor, never fabricate a band):** urgency, client_type, ip_transfer, budget_mentioned — all from the brief, all hints only.

**Personal weighting:** blend the freelancer's own prior `proposals` anchor with the market anchor; weight grows with their N, zero on first use.

---

## 4. The brief is a hint, not a spec

Real input looks like *"yo chef me an app for laundry make it fast and has AI in it."* Design consequence:

- **Profile is the spine** (declared specialties, tier, city, history). The brief contributes whatever it contributes.
- Extraction returns per-field confidence. Low confidence is normal, not failure.
- **Max 3 follow-up questions**, ranked by price impact. Never an interrogation.
- Every unanswered field falls to a **prior** (freelancer history → market norm → widest defensible band), never a blank.
- Garbage brief → wider band + "answer 2 questions to tighten." It never blocks a result.

Extraction never has to be good. It degrades into priors gracefully.

---

## 5. The proposal flow (wired on top)

1. Authenticated freelancer at `/[locale]/tool`: one textarea, paste brief, tap **«أنشئ العرض»**.
2. Server: extract scope (DeepSeek + Vercel AI SDK `generateObject`, Zod schema, per-field confidence) → `resolvePrice` → modifiers → personal weighting.
3. ≤3 bilingual follow-ups only for low-confidence price-critical fields; skippable.
4. Render Rizq-stamped bilingual artifact: branding (profile) + scope + price band/anchor + halal milestones + honest provenance citation + methodology link + verification stamp + Saudi-law terms.
5. Output: web page at `/[locale]/p/[token]`, downloadable PDF, WhatsApp text summary. Saved as a `proposals` row, re-openable/duplicable.

Anonymous users keep the existing dropdown statistical preview (SEO + funnel), number only, no artifact.

---

## 6. Data model (consolidated)

- **`benchmark_records`** — extended with §2.1 provenance columns.
- **`proposals`** — `id, user_id, brief_text, scope_json, specialty_id, city_id, experience_tier_id, price_min/anchor/max, sample, dominant_provenance, currency, status['draft','final'], public_share, share_token (unique), created_at, updated_at`. RLS: owner CRUD; public SELECT only when `public_share`.
- **`users`** — add brand block: `brand_name, logo_url, contact_email, contact_phone, contact_whatsapp, tagline_ar, default_deposit_pct(50), default_revisions(2), default_ip_terms('full_transfer'), specialties(text[] — multi-select), proposal_count_this_month(0)`.
- **`ingestion_runs`** — `id, source, started_at, finished_at, rows_in, rows_kept, status, error` — observability for the collectors.
- Storage: private `proposal-artifacts` bucket (signed URLs, like `submission-proofs`) for PDFs + logos.
- Enums: `proposal_status`, `benchmark_provenance`.
- No pgvector, no embeddings, no new pricing RPC (the resolver is application code over SQL aggregation).

---

## 7. Technical build phases (dependency-ordered wiring — not releases)

Each phase exists because the next can't be wired without it. No dates, no version names, nothing ships "to the public" mid-way — this is internal wiring order.

**Phase A — Backbone.** Extend `benchmark_records` (provenance/freshness). Build `resolvePrice` with weighting + fallback + insufficient-data refusal. Unit-tested against hand-built fixtures. *Nothing prices without this.*

**Phase B — Fill the backbone.** (B1) Curate the published-reference anchor table → real rows. (B2) LLM-reasoned constrained prior covers gap cells. (B3) Saudi Open Data dataset adapters (Etimad/government procurement) + `ingestion_runs` + normalizer — licensed/non-personal sources only, no marketplace scraping (§2.3). B1 first (it boxes B2 and validates B3). After B, the resolver returns real, cited numbers for every cell.

**Phase C — Price computer.** Profile-driven hard dimensions + brief-derived size + within-band modifiers + personal-history weighting, on top of `resolvePrice`.

**Phase D — Brief intake.** Scope extraction (DeepSeek, Zod, confidence) + bounded follow-up engine + priors fallback.

**Phase E — Artifact.** Bilingual renderer, branding from profile, honest provenance citation, verification stamp, PDF, `/[locale]/p/[token]`, WhatsApp summary.

**Phase F — Account wiring.** Onboarding upgrade (multi-select specialties + brand block), profile settings, quota migration (unit = proposal; anonymous = preview only).

Parallelizable: B and a C-skeleton can overlap once A exists. E depends on C+D. F is independent of B.

---

## 8. Founder decisions (defaults proposed — approve or override)

| # | Decision | Default |
|---|---|---|
| D1 | Artifact name (AR) | `العرض` |
| D2 | Button label | `أنشئ العرض` / "Generate the proposal" |
| D3 | Deposit default | 50% / 50% (halal) |
| D4 | Revisions default | 2 |
| D5 | IP terms default | Full transfer on final payment |
| D6 | Co-branding | Freelancer logo prominent; Rizq stamp visible, secondary, non-removable |
| D7 | Public route | `/[locale]/p/[token]` (unguessable token) |
| D8 | Free tier | 1 proposal/month + unlimited previews |
| D9 | Pro tier | 20 proposals/month + branding + 100 previews (SAR 49/mo) |
| D10 | Halal milestone wording | I draft Saudi-polite AR/EN, you approve before ship |
| D11 | Data-source stance | **No marketplace scraping** (PDPL + Anti-Cyber Crime — see §2.3). Volume from Saudi Open Data licensed datasets + aggregate published references + any consented partnership deals only. Approve this posture or constrain further. |

Silence = build to these.

---

## 9. Risks

| Risk | Position |
|---|---|
| Day-zero data thin | Published anchors + constrained reasoned prior give a real, cited number for every cell from day one; honesty rule (§2.7) keeps the stamp credible while thin |
| Marketplace data is legally off-limits (PDPL/Anti-Cyber Crime, researched 2026-05-18) | Designed out entirely — no scraping adapters. Volume comes from Saudi Open Data licensed datasets + non-personal aggregate published ranges + consented partnerships only (§2.3) |
| Curated published ranges contain personal data | They don't — only editorial aggregate ranges are curated, never individual named-freelancer prices |
| Reasoned prior hallucinates | Boxed by anchor table; low confidence; auto-demoted as real rows arrive; never unconstrained |
| Brief is garbage | Profile-spine + priors + ≤3 follow-ups; extraction never load-bearing (§4) |
| Moat unproven | Accepted, unmeasured (founder decision); no analytics in scope; honest sourcing is the defense, not a dashboard |
| Client PII in `brief_text` | Restricted RLS + per-user delete; document retention before any public launch |

---

## 10. Genuinely out of scope (not "deferred" — not building)

Marketplace scraping (Mostaql/Khamsat/Bahr — legally excluded, §2.3), analytics/telemetry, voice notes, image/PDF brief upload, win-loss tracking, Bayesian/embedding pricing, Fanar/Jais (unless freelancers report bad extractions), KYC/buyer enrichment, buyer-side surface, WhatsApp Business API. Excluded by decision or by law, not parked behind a version number.

---

**Approve / disapprove / amend. On approval → `writing-plans` produces the step-by-step build plan (Phase A first) before any code.**
