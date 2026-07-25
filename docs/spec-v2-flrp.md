# Rizq v2 — Technical Spec (FLRP Edition)

| Field | Value |
|---|---|
| Author | CTO + Founder |
| Date | 2026-06-12 |
| Status | **Supersedes spec.md v1 (2026-05-18)** |
| Posture | Rizq is a Saudi Freelancer Operating System — not a pricing tool, not a proposal tool. The suite manages the freelancer's professional life end-to-end. |
| Supersedes | `spec.md`, `engine.md`, `engine-research.md`, `prd.md` — this is the single source of truth for all future builds. |

> **What changed from v1:** The project was correctly diagnosed as having a fatal data weakness for the "pricing authority" positioning. The closure was premature — it evaluated the v0.1 statistical lookup, not the v0.2 data backbone that was already designed. More importantly, the entire premise was too narrow. Rizq is now repositioned as a **freelancer resource planning suite (FLRP)** — pricing is one module among several. The suite is defensible through workflow lock-in, not data monopoly. Every module below is treated with the architectural depth it deserves. Nothing is a checkbox feature.

---

## Part I — Inventory Sweep

### §I.1 What carries forward from the old spec (preserved, refined)

| Item | Origin | Disposition |
|---|---|---|
| **Data backbone** — 4-collector system with provenance, freshness, confidence weighting | `spec.md` §2 | **KEPT.** Refined in Part II. Serves M4 (Pricing Lookup) and feeds M1 (Proposal Studio). |
| **Honesty architecture** — provenance-tagged citations, auto-upgrading claims, no fabricated sample sizes | `spec.md` §2.7 | **KEPT.** Extended to all modules. Every number in every module declares its source. |
| **`resolvePrice` resolver** — weighted aggregation with fallback widening | `spec.md` §2.6 | **KEPT.** Moved under M4. API stays identical. |
| **Proposal flow** — brief intake, scope extraction, follow-up questions, bilingual artifact | `spec.md` §§4-5 | **KEPT.** Becomes M1 (Proposal Studio). Deepened significantly. |
| **No marketplace scraping** — PDPL + Anti-Cyber Crime Law hard exclusion | `spec.md` §2.3, §10 | **KEPT.** Non-negotiable. All data is licensed, editorial, or user-consented. |
| **Saudi Open Data adapter** — Etimad/government procurement under Saudi Open Data License | `spec.md` §2.3 | **KEPT.** Moved under M4 data pipeline. |
| **Auth system** — email + Google + LinkedIn OAuth, RLS, rate limiting | `architecture.md` §6 | **KEPT.** Unchanged. Foundation is solid. |
| **i18n** — Arabic-primary RTL + English, `next-intl` | `prd.md` §5.5, shipped | **KEPT.** Extended to all new modules. |
| **Onboarding** — language, city, specialty, experience tier | `prd.md` §0.1, shipped | **KEPT.** Extended with brand block, business defaults. |
| **Crowd submission pipeline** — submit → review → approve → `benchmark_records` | `prd.md` §4.5, shipped | **KEPT.** Demoted from load-bearing to luxury. |
| **Admin panel** — review queue, user management, metrics | `prd.md` §4.8, shipped | **KEPT.** Extended for new modules. |
| **Error boundaries, Sentry, PostHog wiring** — locale-scoped + global, sanitized logging | `prd.md` §0.1, shipped | **KEPT.** |
| **Legal pages** — privacy + terms, PDPL-aware drafts | `prd.md` §0.1, shipped | **KEPT.** Extended for new data types (client book, income ledger, documents). |
| **Quota/tier system** — atomic DB-trigger enforcement | `prd.md` §4.4, shipped | **REFACTORED.** Unit shifts from "queries" to "monthly active usage". See Part IV. |
| **Supabase RLS** — per-table row-level security | `architecture.md` §3.3 | **KEPT.** Extended for all new tables. |

### §I.2 What is trashed (explicitly removed)

| Item | Origin | Reason for removal |
|---|---|---|
| **"Pricing authority" positioning** | `brd.md`, `prd.md` | Data cannot support it. Honesty forbids it. |
| **"Rizq is a proposal-authoring tool" framing** | `spec.md` §1, `engine.md` §0 | Too narrow. Rizq is a freelancer OS. Proposals are Module 1. |
| **Bayesian posterior pricing** | `engine.md` §4 Step 4 | Over-engineered for current stage. No outcome data to train it on. Statistical core suffices. Deferred to post-v0.4. |
| **Active elicitation / information-gain question ranking** | `engine.md` §4 Step 5 | Vaporware framing. No shipping product does this. Rule-based gap-filling (already in spec) is sufficient. |
| **Client KYC — Wathiq/Maroof/Etimad/ZATCA lookup** | `engine.md` §4 Step 2 | Complex integrations. No APIs confirmed accessible. Deferred to v0.5+. |
| **Voice note ingestion — Whisper/Fanar Speech** | `engine.md` §4 Step 0 | Saudi dialect WER is 25-35%. Premature. Deferred to v0.4+. |
| **WhatsApp Business API capture** | `engine.md` §4 Step 0 | Requires business verification, ongoing cost. Deferred to v0.4+. |
| **pgvector / embeddings / k-NN comp retrieval** | `engine.md` §4 Step 3 | Over-engineered. SQL aggregation over structured benchmark_records is sufficient and auditable. |
| **Hierarchical Bayesian model (PyMC/Stan)** | `engine.md` §4.3 | No training data. Deferred indefinitely. |
| **Browser extension capture** | `engine.md` §7 | Premature. Web app first. |
| **Buyer-side surface** | `engine.md` §7 | v1.0+ consideration. Not now. |
| **Fanar/Jais bake-off** | `engine-research.md` §5 | Premature optimization. Ship on DeepSeek. Revisit only if extraction quality proves insufficient. |
| **Win-loss tracking dashboards** | `engine.md` §7 | Deferred to v0.3 (outcome capture). |
| **Patent framing** | `engine.md` (removed earlier) | Already dropped. |
| **Closure memo's conclusion** | `closure.md` | Overruled. Project is revived under FLRP vision. |
| **Build phases A-F from spec.md** | `spec.md` §7 | Replaced by Part VIII — module-based build order. |
| **Unit-of-value = proposal monetization** | `spec.md` §8 D8-D9 | Replaced. Suite access tiers. |

### §I.3 What is new (FLRP modules)

| Module | ID | Description |
|---|---|---|
| **Dashboard Home** | M0 | The authenticated landing. Widget-based: recent proposals, active clients, monthly income summary, quick-actions. Cross-module overview. AI-powered business insights. |
| **Proposal Studio** | M1 | Brief → priced bilingual artifact. Template library, version history, client-specific pricing memory, AI tone adjustment. The viral wedge. |
| **Client Book** | M2 | Freelancer CRM — دفتر العملاء. Client profiles, gig history, contact timeline, notes, AI follow-up reminders. Structured switching cost. |
| **Income Ledger** | M3 | Gig logging, monthly income summary, paid/pending/overdue tracking, AI income forecasting, HADAF eligibility feeding. |
| **Pricing Lookup** | M4 | Quick market price lookup. Anonymous SEO funnel. AI trend analysis. Demoted from product to utility. |
| **HADAF Eligibility Dashboard** | M5 | Read-only tracker: income thresholds, month streaks, AI guidance. Vision 2030 aligned. |
| **Simple Invoicing** | M6 | Gig → invoice. Bilingual PDF + share link. AI payment reminder drafting. Closes the proposal→gig→invoice loop. |
| **Methodology & Trust Hub** | M7 | Public credibility surface. Deep-linked citations. AI FAQ. |
| **Onboarding v2** | M8 | Multi-select specialties, brand block, business defaults, goals, AI tagline suggestions. |
| **Calendar & Deadlines** | M9 | Read-only unified calendar over proposals, gigs, follow-ups, invoices. AI scheduling insights. Hijri support. |
| **Rate Calculator** | M10 | Reverse pricing: income target → required hourly/daily/project rate. AI market positioning. |
| **Document Vault** | M12 | Encrypted document storage. Freelance credentials, contracts, certificates. AI categorization + expiry detection. |

Each module is designed to three mandatory characteristics:

1. **Room for improvement** — extensible data models, pluggable architecture, configuration-driven behavior, versioned APIs. Every feature is built to its full specification while leaving clear extension points for future enhancement without refactoring core logic.
2. **Integrated** — every module connects to other internal modules (cross-linking, data sharing, workflow chaining) and external surfaces (DeepSeek, Saudi APIs, payment gateways, calendar standards) where it adds value.
3. **AI-enhanced** — where DeepSeek genuinely improves the user experience beyond what static logic can do, it is used. Not as a feature checkbox — as a capability multiplier. Every AI usage is concrete: a specific prompt, a specific output, a specific user-facing benefit.

---

## Part II — Architecture Principles (Cross-Cutting)

### §II.1 Every module stands on its own feet

No module is a thin wrapper around a database query. Each module has:
- Its own **data model** — tables, enums, indexes, RLS policies
- Its own **business logic** — server-side, tested, with edge-case handling
- Its own **UX surface** — designed for mobile-first Arabic RTL, with loading, empty, error, and edge states
- Its own **Saudi compliance posture** — PDPL, halal, cultural appropriateness
- Its own **honesty layer** — every number, status, or claim cites its source or declares uncertainty
- Its own **extensibility design** — configuration tables, pluggable adapters, versioned schemas, event hooks
- Its own **AI enhancement plan** — specific DeepSeek use cases, not vague "AI-powered" claims

A module is not "done" when the happy path works. It is done when:
1. The happy path works end-to-end on mobile (70%+ of KSA traffic)
2. Empty states are designed and useful (first-time user, no data yet)
3. Error states degrade gracefully (network failure, quota exhaustion, invalid input)
4. Loading states show meaningful skeletons, not blank screens
5. Edge cases are handled (duplicate submissions, concurrent edits, long text, RTL/LTR mixing)
6. The honesty layer is wired (provenance citations, uncertainty declarations, methodology links)
7. **Extensibility is architected** (future enhancements are config-changes or plugin-additions, not rewrites)
8. **Integrations are live** (internal cross-module links, external APIs where specified)
9. **AI features are shipped** (where specified — concrete, not aspirational)

### §II.2 The honesty architecture is the brand

Rizq's only defensible moat is credibility. Across every module:

| Data type | Honesty rule |
|---|---|
| Price band | Cites dominant provenance: `published_ref` / `reasoned` / `ingested` / `submitted`. Sample size shown. Date range shown. Fallback kind declared. |
| Client count | "12 clients tracked since June 2026" — not "Manage your clients" generically. |
| Income summary | "SAR 8,450 earned this month across 6 gigs (2 pending payment)" — precise, not rounded. |
| HADAF status | "Based on publicly documented HADAF thresholds as of 2026. Not financial advice. Verify at hrdf.org.sa." |
| AI-generated insight | Every AI insight is prefixed: "تحليل رِزق —" / "Rizq Insight —". Users know when AI is speaking. |
| Methodology | Every methodology-linked element resolves to `/methodology#section-id` with specific source citations. |

The brand never claims what it can't prove. The brand is the proof. AI-generated content is labeled as AI-generated.

### §II.3 Saudi compliance baseline

Every module inherits these compliance constraints:

| Constraint | Implementation |
|---|---|
| **PDPL compliance** | Personal data (client names, contacts, financials, documents) encrypted at rest. Per-user data export. Per-user data deletion. Configurable retention. RLS on every table. |
| **No marketplace scraping** | Hard exclusion. No Mostaql, Khamsat, or Bahr scraping — ever. By law, not preference. |
| **Halal financials** | No interest (riba) language. 50/50 deposit default. Payment milestones, not late fees. "Service fee" not "interest-bearing subscription." |
| **No financial/tax/legal advice** | Clear disclaimers. HADAF page: "Verify at hrdf.org.sa." Pricing: "Market estimate, not advice." AI insights: "This is an automated analysis, not professional advice." |
| **Arabic-first, culturally appropriate** | RTL layout primary. Saudi-polite tone. No casual Western startup vernacular. Islamic resonance OK but never preachy. |
| **ZATCA awareness** | Invoice module scaffolds ZATCA-compliant fields. No mandatory e-invoicing until SAR 375K revenue threshold. |
| **AI transparency** | All AI-generated content is labeled. AI insights have a feedback mechanism ("Was this helpful? Yes / No"). |

### §II.4 Technical principles

| Principle | Rule |
|---|---|
| **Server-first** | Business logic lives in server actions / API routes, never in client components. Client components handle rendering + user interaction only. |
| **SQL over vector** | Structured queries over indexed columns, not embeddings + k-NN. Auditable, debuggable, cost-zero. |
| **Type safety end-to-end** | Zod schemas for all inputs. TypeScript for all outputs. No `any`. |
| **Mobile-first** | Every UI designed for 375px width first. Desktop is an enhancement. 70%+ of KSA traffic is mobile. |
| **Progressive enhancement** | Core flows work without JavaScript. JS adds interactivity, never blocks functionality. |
| **Test business logic** | Every pricing calculation, quota enforcement, income aggregation, HADAF rule, and AI prompt output parsing has unit tests. |
| **No premature optimization** | Ship on DeepSeek for all AI features. Don't bake-off Arabic models until extraction quality proves insufficient. |
| **Pluggable by default** | Every adapter, collector, template, and external integration uses an interface that can be swapped without touching core logic. |
| **AI label everything** | AI-generated text, numbers, or insights are explicitly tagged with their model and confidence. |

---

## Part III — Module Specifications

Each module specification includes:
1. Purpose & why it matters
2. Data model (SQL schema, indexes, RLS)
3. UX specification (mobile-first, states, components)
4. Cross-module wiring
5. **Room for improvement** — extensibility architecture
6. **Integration** — internal + external connections
7. **AI enhancement** — specific DeepSeek use cases

---

### M0 — Dashboard Home

**Purpose:** The authenticated user's landing page. A cross-module overview that shows the freelancer the state of their business at a glance and provides quick access to every module.

**Why it matters:** The dashboard is the first thing a freelancer sees after onboarding. It must immediately communicate value — "here's your business, organized." If the dashboard feels empty or useless, the user will bounce and never discover the modules. Every widget must degrade gracefully when there's no data yet, with clear guidance on what to do first.

#### M0.1 Data model

No dedicated table — the dashboard is a read-aggregation layer over existing module tables. However, a `dashboard_preferences` table stores per-user widget layout:

```sql
dashboard_preferences (
  user_id       uuid PK FK → users.id,
  widgets       jsonb NOT NULL DEFAULT '["insights","proposals","clients","income","calendar","quick_actions"]',
  layout        jsonb,  -- optional grid positions per widget
  updated_at    timestamptz
);
```

**Widget registry (configuration-driven):**
```sql
widget_registry (
  id            text PK,  -- 'proposals', 'clients', 'income', etc.
  name_ar       text NOT NULL,
  name_en       text NOT NULL,
  icon          text NOT NULL,  -- lucide icon name
  source_module text NOT NULL,  -- 'M1', 'M2', 'M3', etc.
  default_order int NOT NULL,
  min_tier      enum_tier DEFAULT 'free',  -- minimum tier to show
  enabled       boolean DEFAULT true,
  config_schema jsonb  -- optional JSON Schema for widget-specific config
);
```

New widgets are added by inserting a row into `widget_registry` and building the widget component. No dashboard refactor required. The dashboard renders whatever is in the registry that the user has enabled.

#### M0.2 Widgets (by priority)

| # | Widget | Data source | Empty state |
|---|---|---|---|
| 1 | **AI Business Insights** | Aggregated across M1-M6, M9 | "Create your first proposal to unlock insights" |
| 2 | **Recent proposals** | `proposals` — last 5, status, date, client name | "You haven't created any proposals yet. Create your first proposal →" |
| 3 | **Upcoming deadlines** | M9 calendar — next 7 days | "No upcoming deadlines. Log a gig to see it here →" |
| 4 | **Active clients** | `clients` — count, last contacted 30d, no-contact >60d flagged | "Add your first client to start tracking your relationships →" |
| 5 | **Monthly income summary** | `gigs` — current month total, paid vs pending, comparison to last month | "Log your first gig to start tracking your income →" |
| 6 | **Quick pricing** | `resolvePrice` — specialty × city × tier → band | Mini-widget with just the median. "Check a market rate →" |
| 7 | **Quick actions** | Static + context-aware: "New Proposal", "Log Gig", "Add Client", "Generate Invoice" | Always visible |

#### M0.3 UX specification

- **Layout:** Card grid. 2 columns on desktop, 1 column on mobile. Draggable (persisted in `dashboard_preferences.layout`).
- **Widget cards:** Clean cards with icon, title, key stat, and "View all →" link to the full module.
- **Loading:** Skeleton cards — colored placeholder blocks matching widget dimensions, no layout shift.
- **Empty:** Each widget has a tailored empty state with a single CTA that leads to the relevant module.
- **Error:** Widget-level error boundaries. If the proposals query fails, that widget shows "Couldn't load proposals — tap to retry" but the rest of the dashboard renders normally.
- **Updates:** Server-rendered with a "Refresh" pull-down on mobile. Cache TTL: 5 minutes for most widgets, 1 hour for AI insights (cost control).
- **Widget configuration:** Tap the widget header's gear icon → per-widget settings (e.g., "Show last N items", "Include pending gigs in income widget").

#### M0.4 Room for improvement

- **Widget registry** (`widget_registry` table) is the extension point. Adding a new widget = INSERT + build one React component. No dashboard refactor.
- Each widget is a self-contained component with its own data-fetching (React Server Component or `use` hook). They render independently — one slow widget doesn't block the dashboard.
- Widget configuration is driven by `widget_registry.config_schema`. Each widget declares its own configurable parameters as JSON Schema. The dashboard renders a generic config form from the schema.
- Layout preferences are a separate concern from widget data. Future: multiple dashboard "views" (daily, weekly, project-focused).
- The widget ordering algorithm is pluggable: currently manual drag-and-drop, but the architecture supports priority-based, context-aware (e.g., show overdue invoices first if any exist), or ML-ranked ordering.

#### M0.5 Integration

| Integration | Type | Description |
|---|---|---|
| **M1 → M0** | Internal | Recent proposals widget reads `proposals` table. Tapping a proposal navigates to `/[locale]/proposals/[id]`. |
| **M2 → M0** | Internal | Active clients widget reads `clients` table. Tapping a client navigates to `/[locale]/clients/[id]`. |
| **M3 → M0** | Internal | Income widget reads `monthly_income` view. Tapping navigates to `/[locale]/income`. |
| **M4 → M0** | Internal | Quick pricing widget calls `resolvePrice` server action. Tapping navigates to `/[locale]/tool`. |
| **M5 → M0** | Internal | HADAF widget shows qualification progress from `calculateHadafStatus`. |
| **M9 → M0** | Internal | Upcoming deadlines widget reads aggregated calendar events. |
| **Hijri calendar** | External | Saudi Hijri calendar API (Um Al-Qura) for date display alongside Gregorian. |
| **Prayer times** | External | Optional widget — Saudi prayer times API. Cultural context, not religious imposition. |

#### M0.6 AI enhancement

**AI Business Insights Widget (DeepSeek-powered):**

This is the hero widget at the top of the dashboard. It runs once per session (cached 1 hour) to control cost. Every insight is labeled "تحليل رِزق —" / "Rizq Insight —".

**Prompt shape:**
```
You are Rizq Insight, an AI analyst for a Saudi freelancer. You have access to:
- Proposals: [{ title, status, amount, client, date }] — last 30 days
- Gigs: [{ title, status, amount_sar, client, date }] — last 3 months
- Clients: [{ name, total_gigs, total_value, last_contacted, rating, tags }]
- Income: [{ month, total_sar, paid_sar, pending_sar }] — last 6 months
- Deadlines: [{ type, description, date, status }] — next 30 days

Generate 2-4 actionable, specific insights in Saudi-polite Arabic. Rules:
- Never fabricate data. Only use provided data.
- Be specific: "Your income increased 15% vs last month" not "You're doing well."
- Flag risks: "Client [X] hasn't been contacted in 45 days."
- Flag opportunities: "3 proposals are awaiting responses — total potential: SAR X."
- Never give financial advice. Label: "هذا تحليل آلي — ليس استشارة مهنية."
- Keep each insight under 2 sentences.
```

**Example outputs:**
- "دخلك هذا الشهر ٨,٤٥٠ ر.س — أعلى بنسبة ١٥٪ من مايو. ٣ عروض معلّقة بقيمة ١١,٠٠٠ ر.س."
- "العميل 'أحمد العتيبي' لم تتواصل معه منذ ٤٥ يوماً. آخر مشروع معه كان بقيمة ٣,٥٠٠ ر.س."
- "متوسط قيمة مشاريعك في آخر ٣ أشهر: ٢,٨٠٠ ر.س — ضمن النطاق الطبيعي لمصممي الجرافيك في الرياض."
- "لديك ٣ مواعيد تسليم هذا الأسبوع — أعلى من معدلك الطبيعي بـ ٤٠٪."

**Feedback mechanism:** Each insight has a thumbs-up / thumbs-down. Feedback is stored (per insight, not per user) to improve prompt engineering over time. No training data leaves Rizq.

---

### M1 — Proposal Studio

**Purpose:** The freelancer pastes a client brief. Rizq extracts the scope, computes a data-grounded price, asks clarifying follow-ups if needed, and produces a Rizq-stamped bilingual proposal artifact they share with their buyer. This is the wedge — the module that gets shared, that brings in new users, that crosses the Excel line.

**Why it matters:** The proposal is the moment a freelancer goes from "I think I'm worth X" to "the Saudi market data says this scope costs Y in Riyadh." It shifts the negotiation from subjective to objective. Every shared proposal is a Rizq brand impression on a buyer. This is the viral distribution channel.

**What changed from spec.md v1:**
- Template library added. Freelancers can save proposal templates for recurring gig types.
- Version history added. Proposals are editable post-generation; changes are tracked.
- Client context injection. If the freelancer has a client in M2 (Client Book), their history auto-populates the proposal (previous gigs, agreed rates, payment reliability).
- Proposal analytics (read-receipts) are now part of M1.
- **AI tone adjustment.** Freelancer can say "make this more formal" / "more friendly" / "add persuasive justification" and DeepSeek rewrites the artifact language while preserving data integrity.
- **AI scope comparison.** Compares current scope to freelancer's past projects — "This scope is 30% larger than your average logo project."

#### M1.1 User journey

1. Freelancer lands at `/[locale]/proposals/new` (or taps "New Proposal" from dashboard).
2. **Single textarea**, placeholder: "ألصق رسالة العميل هنا…" / "Paste the client's message here…"
3. **Optional:** select client from Client Book (auto-fills context), or type new client name.
4. Taps **«أنشئ العرض»** / "Generate the proposal."
5. **3-5 second processing** — skeleton state with progress indicators:
   - "Extracting scope…" (DeepSeek)
   - "Computing market price…" (`resolvePrice`)
   - "Analyzing your history…" (personal weighting)
   - "Generating proposal…" (artifact renderer)
6. **Follow-up step** (if scope confidence < threshold on high-impact fields): 1-3 bilingual questions. Freelancer answers or skips. Each answer tightens the band.
7. **Artifact renders** — freelancer reviews, edits any block inline, then:
   - **AI tone adjustment:** "اجعلها رسمية أكثر" / "Make it more formal" / "أضف تبريراً مقنعاً للسعر" / "Justify the price persuasively"
   - **Scope insight:** "هذا المشروع أكبر بـ ٣٠٪ من متوسط مشاريعك" / "This project is 30% larger than your average."
8. Output options:
   - **Copy share link** (unique token, read-receipts enabled)
   - **Download PDF**
   - **Send WhatsApp summary** (formatted text + link)
9. **Saved** to proposals list. Re-openable, re-editable, duplicable. Versioned.

#### M1.2 Data model

```sql
-- Extended from the existing proposals table concept
proposals (
  id              uuid PK DEFAULT gen_random_uuid(),
  user_id         uuid FK → users.id NOT NULL,
  client_id       uuid FK → clients.id,  -- nullable (new client or anonymous)
  template_id     uuid FK → proposal_templates.id,  -- nullable

  -- Intake
  brief_text      text NOT NULL,
  brief_channel   enum['paste','whatsapp_forward','email_forward'] DEFAULT 'paste',
  brief_language  enum['ar','en','mixed'] DEFAULT 'ar',

  -- Extraction
  scope_json      jsonb NOT NULL,  -- structured scope object (see Zod schema)
  extraction_model text NOT NULL,  -- 'deepseek-v3', etc.
  extraction_prompt_hash text,     -- for reproducibility/audit
  extraction_confidence numeric,   -- aggregate 0..1
  extraction_raw_response jsonb,   -- raw LLM response for debugging

  -- Pricing
  specialty_id    uuid FK → specialties.id NOT NULL,
  city_id         uuid FK → cities.id NOT NULL,
  experience_tier_id uuid FK → experience_tiers.id NOT NULL,
  price_min       numeric NOT NULL,
  price_anchor    numeric NOT NULL,  -- recommended single price
  price_max       numeric NOT NULL,
  sample_size     int NOT NULL,
  dominant_provenance enum_benchmark_provenance NOT NULL,
  provenance_citation text NOT NULL,  -- the exact Arabic + English citation string

  -- Modifiers (from scope)
  urgency_modifier      numeric DEFAULT 1.0,
  client_type_modifier   numeric DEFAULT 1.0,
  complexity_modifier    numeric DEFAULT 1.0,
  personal_weight        numeric DEFAULT 0.0,  -- grows with freelancer's N

  -- AI enhancements
  tone_adjustments       jsonb,  -- [{ tone: 'formal', applied_at, sections_modified }]
  scope_comparison_json  jsonb,  -- AI comparison to past projects

  -- Artifact
  status          enum['draft','final','sent','viewed','accepted','declined','expired'] DEFAULT 'draft',
  version         int DEFAULT 1,
  public_share    boolean DEFAULT false,
  share_token     text UNIQUE,
  share_viewed_at timestamptz,
  share_view_count int DEFAULT 0,
  view_history    jsonb,  -- [{ timestamp, ip_hash, user_agent }]

  -- Content blocks (rendered artifact sections)
  artifact_json   jsonb,  -- rendered blocks: scope, price, milestones, terms, branding

  -- Lifecycle
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  finalized_at    timestamptz,
  expires_at      timestamptz,  -- proposals can auto-expire (default 30d)

  -- RLS: owner CRUD; public SELECT only when public_share = true AND status != 'draft'
);

-- Indexes
CREATE INDEX idx_proposals_user_created ON proposals(user_id, created_at DESC);
CREATE INDEX idx_proposals_client ON proposals(client_id, created_at DESC);
CREATE INDEX idx_proposals_share_token ON proposals(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_proposals_status ON proposals(user_id, status);
CREATE INDEX idx_proposals_user_status ON proposals(user_id, status, created_at DESC);

-- Proposal templates (reusable — saved by freelancer for recurring gig types)
proposal_templates (
  id              uuid PK DEFAULT gen_random_uuid(),
  user_id         uuid FK → users.id NOT NULL,
  name_ar         text NOT NULL,
  name_en         text,
  description_ar  text,
  specialty_id    uuid FK → specialties.id,
  scope_json      jsonb,  -- pre-filled scope template
  pricing_json    jsonb,  -- pre-filled pricing defaults (deposit %, revisions, IP terms, milestones)
  tone_preference enum['formal','balanced','friendly'] DEFAULT 'balanced',
  usage_count     int DEFAULT 0,
  is_default      boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Proposal versions (full edit history — every edit creates a new version row)
proposal_versions (
  id              uuid PK DEFAULT gen_random_uuid(),
  proposal_id     uuid FK → proposals.id NOT NULL,
  version         int NOT NULL,
  scope_json      jsonb NOT NULL,
  price_min       numeric NOT NULL,
  price_anchor    numeric NOT NULL,
  price_max       numeric NOT NULL,
  changed_by      uuid FK → users.id NOT NULL,
  change_summary  text,  -- AI-generated diff summary
  created_at      timestamptz DEFAULT now(),

  UNIQUE(proposal_id, version)
);

-- Proposal shares (tracking per share, not just per proposal)
proposal_share_events (
  id              uuid PK DEFAULT gen_random_uuid(),
  proposal_id     uuid FK → proposals.id NOT NULL,
  share_channel   enum['link','whatsapp','email','pdf_download'] NOT NULL,
  viewed_at       timestamptz,
  viewer_ip_hash  text,
  viewer_agent    text,
  created_at      timestamptz DEFAULT now()
);
```

#### M1.3 Scope extraction schema (Zod — extensible)

```ts
const ScopeSchema = z.object({
  specialty: z.enum([...specialtySlugs]),
  deliverables: z.array(z.string()).min(1),
  deliverable_count: z.number().int().positive().nullable(),
  revisions: z.number().int().min(0).max(20).nullable(),
  urgency: z.enum(['rush_under_1_week', 'standard_1_4_weeks', 'long_term']).nullable(),
  complexity_signals: z.array(z.string()),
  client_type: z.enum(['individual', 'smb', 'corporate', 'government', 'agency']).nullable(),
  geography_target: z.enum(['ksa_local', 'gcc', 'international']).nullable(),
  language_preference: z.enum(['ar', 'en', 'both']).nullable(),
  budget_mentioned: z.number().positive().nullable(),
  ip_transfer: z.enum(['full_transfer', 'license', 'unclear']).nullable(),
  field_confidence: z.record(z.number().min(0).max(1)),

  // Extensible: additional fields can be added without breaking extraction
  extras: z.record(z.unknown()).optional(),
});

type Scope = z.infer<typeof ScopeSchema>;
```

**Extensibility:** The `extras` field allows new scope dimensions to be added without changing the schema. The AI prompt includes a `custom_fields` section that can be extended via configuration. New fields are parsed if the AI returns them; old clients ignore unknown fields.

#### M1.4 Follow-up question engine

Rule-based, not ML-driven. Hand-authored templates per field, bilingual. Configuration-driven — questions are stored in a table, not hardcoded:

```sql
follow_up_question_templates (
  id              text PK,
  field_name      text NOT NULL,  -- 'revisions', 'urgency', 'ip_transfer', etc.
  priority        int NOT NULL,   -- 1 = highest (asked first)
  min_confidence  numeric DEFAULT 0.7,  -- ask if field confidence < this
  question_ar     text NOT NULL,
  question_en     text NOT NULL,
  options_json    jsonb,  -- [{ value, label_ar, label_en }] for quick-select buttons
  allow_skip      boolean DEFAULT true,
  enabled         boolean DEFAULT true
);
```

**Extensibility:** Adding a new follow-up question = INSERT into this table + add the field to the Zod schema. No code changes.

#### M1.5 Artifact specification

The artifact is an HTML template rendered server-side, exported to PDF. It must look professional enough that a freelancer is proud to send it to a Saudi corporate client.

**Section rendering is pluggable** — artifact sections are registered in a configuration:

```ts
interface ArtifactSection {
  id: string;
  order: number;
  render: (data: ArtifactData, locale: 'ar' | 'en') => JSX.Element;
  editable: boolean;  // can the freelancer inline-edit this section?
  aiEditable: boolean; // can AI rewrite this section (tone adjustment)?
}
```

**Sections (in order):**

| # | Section | Editable | AI-Editable | Content |
|---|---|---|---|---|
| 1 | **Freelancer branding** | Yes | No | Logo, name, tagline (AR), contact (email, phone, WhatsApp) |
| 2 | **Client reference** | Yes | No | Client name, company (if in Client Book) |
| 3 | **Scope of work** | Yes | Yes | Deliverables list, project description, timeline |
| 4 | **Pricing** | Anchor only | No | Price anchor (bold), min-max band, provenance citation + methodology link |
| 5 | **Payment milestones** | Yes | Limited | Default from user profile; freelancer can override |
| 6 | **Timeline** | Yes | Yes | Start date, delivery date, revision rounds |
| 7 | **IP terms** | Yes | Limited | From user defaults |
| 8 | **Rizq verification** | No | No | Seal, methodology link, unique artifact ID, "Generated by Rizq — Saudi Freelancer OS" |
| 9 | **Terms footer** | No | No | Saudi-law jurisdiction, validity period, disclaimer |

**Design requirements:**
- Bilingual: Arabic sections render RTL with Tajawal font. English sections render LTR with Inter font. Mixed gracefully.
- Color: Freelancer's brand colors (from M8 profile) + Rizq earth palette (#1A5F3F deep green, #C8A951 gold accent).
- PDF: A4. Print-friendly. No layout break on page split.
- Mobile PDF: legible at phone width without zooming.
- Share link page at `/[locale]/p/[token]` renders the same artifact as a web page with "Download PDF" and "Contact Freelancer" buttons.

#### M1.6 Proposal lifecycle

```
draft → final → sent → viewed → [accepted | declined | expired]
  ↑        ↓
  └── edit (creates new version with AI-generated change summary)
```

- **draft:** Generated but not yet reviewed. Editable. AI tone adjustment available.
- **final:** Reviewed and locked. Can be shared. No further edits (only versioning).
- **sent:** Share link generated. Read-receipts active. Share events tracked.
- **viewed:** Buyer opened the share link. Freelancer gets dashboard notification.
- **accepted:** Freelancer manually marks as accepted → prompts M3 gig creation.
- **declined:** Freelancer manually marks as declined with optional reason.
- **expired:** Auto-expired after 30 days from `finalized_at`. Viewable but marked expired.

#### M1.7 Price computation (wired on top of M4)

M1 delegates to M4's `resolvePrice`. Then applies:

1. **Within-band modifiers** (move the anchor, never fabricate a band):
   - Urgency: rush → +15%, long-term → -10%
   - Client type: corporate → +10%, individual → -5%
   - IP transfer: full_transfer → +20%, license → -5%
   - Scope size: +10% per extra deliverable, capped at +60%

2. **Personal weighting:** Blend the freelancer's own prior proposal anchors with the market anchor:
   - N < 3 proposals: weight = 0.1 (mostly market)
   - N 3-10: weight = 0.3
   - N > 10: weight = 0.5 (market + personal equally weighted)
   - Never exceeds 0.5 — market always has a voice.
   - The freelancer's own stated project rate counts as one personal anchor point, so a
     profiled freelancer is reflected from proposal #1.

3. **Rounding:** Anchor rounded to nearest 50 SAR. Min/Max rounded to nearest 10 SAR.

4. **The quote vs the band** (revised 2026-07-26 — see
   `docs/validation/power-user-pass-2026-07-26.md` P0-2). The cited band is a *per-project market
   reference* and is **never widened**; `anchor` stays inside it. But the number we quote is
   `quote`, which may exceed the band, because two things the benchmark cannot see legitimately
   move the real price:
   - **Scope.** A five-deliverable job is not one benchmark "project". Clamping the modified
     anchor to the band max meant that with a narrow band (small sample — the normal case at
     n=5) every mid-size proposal returned the identical ceiling figure.
   - **A budget the client stated.** `budget_mentioned` is already extracted from the brief;
     quoting under it leaves the freelancer's money on the table. It only ever **lifts** the
     quote — pricing *down* to a lowball is the freelancer's call to make by hand.

   `quote_basis` (`market` | `scope` | `client_budget`) records which applied, and the
   provenance line changes with it: only a `market` quote may present the benchmark citation as
   its source (Constitution Principle I). A manual override likewise re-labels its own source.

#### M1.8 UX specification

- **Mobile-first single-column.** The textarea, follow-up questions, AI insights, and artifact all render in a single scrollable column.
- **Textarea:** Large (min 200px height), auto-resize. Placeholder shows example brief in WhatsApp-style Arabic.
- **Processing:** Animated skeleton with step indicators. Shows what's happening (extracting → pricing → analyzing history → generating).
- **AI tone adjustment:** Floating bar above the artifact. Quick-select tones: "رسمية" / "متوازنة" / "ودّية" / "مقنعة للسعر". Applying regenerates the editable sections via DeepSeek while preserving all data (prices, names, dates).
- **AI scope comparison:** Small insight card below the scope block. Shows comparison to freelancer's historical projects. Only appears if the freelancer has ≥3 past proposals.
- **Follow-up questions:** Inline cards. Each shows the question + 2-3 quick-answer buttons + "Skip" link. Answering animates the band tightening.
- **Artifact review:** Scrollable preview. Inline-edit any editable field by tapping it. Changes are tracked in version history with AI-generated change summary.
- **Share:** Modal with 3 options: Copy Link, Download PDF, Send WhatsApp. Link copied shows a checkmark animation. WhatsApp opens `wa.me` with formatted text.
- **Empty state:** "ما عندك أي عروض حتى الآن. ألصق رسالة عميلك أعلاه لإنشاء أول عرض احترافي بختم رِزق."
- **Error state:** If extraction fails, show the brief back with highlighted ambiguous sections and ask the freelancer to clarify manually (graceful degradation to a manual form).

#### M1.9 Room for improvement

- **Extraction models are pluggable.** The extraction function accepts a `model` parameter. Swapping DeepSeek for Fanar/Jais is a config change. The model registry stores available models with their capabilities (languages, cost, latency). The system chooses the best model based on `brief_language` (Arabic-heavy briefs can route to a different model later).
- **Scope schema is versioned.** `scope_json` includes a `schema_version` field. Old proposals with old schema versions are backward-compatible. New fields are additive only.
- **Artifact sections are pluggable.** Registered via `ArtifactSection[]`. Adding a new section = build one React component + register it. Sections declare their data dependencies.
- **Tone adjustment prompts are configuration-driven.** Stored in a `tone_adjustment_prompts` table with language, tone, and prompt template columns. Adding a new tone = INSERT + build the UI button.
- **Template system supports inheritance.** Templates can extend other templates, overriding only specified fields. "Logo Design" template extends "Design Services" parent template.
- **Follow-up questions are configuration-driven** via `follow_up_question_templates` table (see M1.4).

#### M1.10 Integration

| Integration | Type | Description |
|---|---|---|
| **M2 → M1** | Internal | Client context injection. Selecting a client auto-populates proposal header, shows past gig summary, adjusts deposit based on client payment history. |
| **M4 → M1** | Internal | Price computation. `resolvePrice` called with scope-derived parameters. |
| **M8 → M1** | Internal | Brand block + business defaults from onboarding. Every proposal uses these unless overridden. |
| **M3 ← M1** | Internal | Accepted proposal → one-tap "Create gig" pre-fills M3 form. |
| **M6 ← M1** | Internal | Accepted proposal → one-tap "Generate invoice" pre-fills M6. |
| **M9 → M1** | Internal | Proposal delivery dates appear on calendar. Proposal expiry tracked. |
| **M12 → M1** | Internal | Attach documents from Document Vault to proposal (e.g., portfolio samples, work document). |
| **DeepSeek API** | External | Scope extraction, tone adjustment, scope comparison, change summaries. |
| **WhatsApp** | External | `wa.me` deep link with formatted proposal summary text. |
| **PDF renderer** | External | Server-side HTML → PDF (react-pdf or Puppeteer on Vercel). |

#### M1.11 AI enhancement

All AI features use DeepSeek. Every AI output is labeled and versioned with model + prompt hash.

**A. Scope extraction (primary AI use):**
DeepSeek + Vercel AI SDK `generateObject` extracts `Scope` from `brief_text`. Zod schema constrains output. Per-field confidence scores. Prompt includes: specialty list, city list, experience tiers, and 5 few-shot examples in Saudi dialect. Prompt is versioned and its hash stored in `extraction_prompt_hash`.

**B. AI tone adjustment (post-generation):**
The freelancer selects a tone. DeepSeek rewrites the editable artifact sections (scope of work, timeline, payment milestones) in the selected tone while preserving all data — prices, dates, names, deliverables are immutable. The model is instructed to never modify numbers, names, or dates.

**Tone options:**
| Tone | Arabic label | Prompt instruction |
|---|---|---|
| Formal | رسمية | Use formal MSA Arabic. Professional, direct, suitable for corporate/government clients. |
| Balanced | متوازنة | Default. Warm but professional Saudi-polite tone. |
| Friendly | ودّية | Casual Saudi dialect-adjacent. Suitable for repeat clients. |
| Persuasive | مقنعة للسعر | Add brief justification after each scope item explaining value delivered. "هذا يشمل X لأن Y." Never inflate claims. |

**C. AI scope comparison (contextual insight):**
DeepSeek compares the extracted scope to the freelancer's last 5 proposals (anonymized — only dimensions, not client data). Output: "هذا المشروع أكبر بـ ٣٠٪ من متوسط مشاريعك في تصميم الشعارات. عدد المخرجات أعلى (٦ مقابل ٤ في المعتاد)." Used to help the freelancer calibrate their expectations, not to auto-modify the price.

**D. AI change summaries (version history):**
When a freelancer edits a finalized proposal (creating a new version), DeepSeek generates a 1-sentence Arabic summary of what changed: "تم تعديل نطاق العمل: أضيف 'تصميم بروفايل الشركة' وخُفضت جولات المراجعة من ٣ إلى ٢." Stored in `proposal_versions.change_summary`.

---

### M2 — Client Book

**Purpose:** A simple CRM for freelancers. Track who you work with, their contact details, past gigs, notes, and when you last spoke. Structured data that creates genuine switching cost — no freelancer wants to rebuild their client list.

**Why it matters:** Most Saudi freelancers track clients in WhatsApp chat scroll and mental memory. A structured client list with gig history attached is immediately useful and creates retention. This is not a sales CRM — no pipelines, no deals, no stages. It's a freelancer's address book with context. The AI enhancements make it proactive: it tells you who to follow up with, not just who you have.

**Design philosophy:** Simple enough to use in 30 seconds. Deep enough to be useful after 30 clients. Not a CRM. A client book. Like the freelancer's personal دفتر.

#### M2.1 Data model

```sql
clients (
  id              uuid PK DEFAULT gen_random_uuid(),
  user_id         uuid FK → users.id NOT NULL,

  -- Identity
  name            text NOT NULL,         -- "شركة الأفق للتقنية" or "Ahmed Al-Otaibi"
  name_en         text,                  -- optional English transcription
  company         text,                  -- nullable, for individual clients
  title           text,                  -- "CEO" / "Marketing Manager" / null
  email           text,
  phone           text,                  -- Saudi format: 05XXXXXXXX
  phone_whatsapp  text,                  -- if different from phone
  city            text,                  -- free text, not FK (client may be anywhere)
  linkedin_url    text,                  -- optional LinkedIn profile URL

  -- Classification
  client_type     enum['individual','smb','corporate','government','agency'] DEFAULT 'individual',
  industry        text,                  -- free text: "تقنية", "تجارة", "صحة", etc.
  industry_ar     text,                  -- Arabic label if different
  source          enum['referral','platform','social_media','direct','other'] DEFAULT 'direct',
  source_detail   text,                  -- "Ahmed from LinkedIn" / "Mostaql project"

  -- Relationship
  tags            text[],                -- user-defined: ["دافع متأخر", "عميل ممتاز", "تصميم"]
  notes           text,                  -- private notes, searchable
  ai_notes        text,                  -- AI-generated observations, labeled
  rating          int CHECK (rating >= 1 AND rating <= 5),  -- freelancer's internal rating

  -- Activity
  first_contacted_at  timestamptz,
  last_contacted_at   timestamptz,
  total_gigs          int DEFAULT 0,
  total_value_sar     numeric DEFAULT 0,
  avg_payment_days    numeric,           -- average days from invoice to payment

  -- AI-derived
  client_persona      text,             -- AI-generated: "Corporate, fast payer, prefers formal communication"
  follow_up_priority  enum['low','medium','high'] DEFAULT 'medium',  -- AI-assigned
  next_action_suggestion text,          -- AI-generated: "Send a check-in message — last contact 45 days ago"

  -- Lifecycle
  is_active       boolean DEFAULT true,  -- soft delete / archive
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),

  -- RLS: owner CRUD only
);

-- Indexes
CREATE INDEX idx_clients_user ON clients(user_id, is_active, last_contacted_at DESC NULLS LAST);
CREATE INDEX idx_clients_name ON clients USING gin(name gin_trgm_ops);  -- trigram search for Arabic
CREATE INDEX idx_clients_tags ON clients USING gin(tags);
CREATE INDEX idx_clients_user_name ON clients(user_id, name);
CREATE INDEX idx_clients_follow_up ON clients(user_id, follow_up_priority, last_contacted_at);

-- Client contact timeline (auto-generated activity log)
client_timeline (
  id              uuid PK DEFAULT gen_random_uuid(),
  client_id       uuid FK → clients.id NOT NULL,
  user_id         uuid FK → users.id NOT NULL,
  event_type      enum['proposal_sent','proposal_viewed','proposal_accepted','proposal_declined',
                        'gig_created','gig_completed','invoice_sent','invoice_paid',
                        'note_added','contacted','rating_changed','tag_added','tag_removed'] NOT NULL,
  event_data      jsonb,  -- { proposal_id, gig_id, invoice_id, note_text, old_value, new_value }
  ai_summary      text,   -- optional AI-generated human-readable summary in Arabic
  created_at      timestamptz DEFAULT now()
);
```

#### M2.2 Client-gig junction

A view `client_gig_summary` aggregates from `gigs`:

```sql
CREATE VIEW client_gig_summary AS
SELECT
  c.id AS client_id,
  c.user_id,
  COUNT(g.id) AS gig_count,
  SUM(g.amount_sar) FILTER (WHERE g.status = 'paid') AS total_paid_sar,
  SUM(g.amount_sar) FILTER (WHERE g.status = 'pending') AS total_pending_sar,
  MAX(g.delivery_date) AS last_gig_date,
  MIN(g.delivery_date) AS first_gig_date,
  AVG(EXTRACT(DAY FROM (g.final_paid_at - g.delivery_date))) FILTER (
    WHERE g.status = 'paid' AND g.final_paid_at IS NOT NULL
  ) AS avg_payment_days
FROM clients c
LEFT JOIN gigs g ON g.client_id = c.id
GROUP BY c.id, c.user_id;
```

#### M2.3 UX specification

**List view (main screen):**
- **AI-prioritized sorting:** Default sort shows clients needing follow-up first (high priority → medium → low → recently contacted). User can switch to manual sorting.
- **Follow-up badges:** Red dot on clients not contacted in >30 days. Yellow dot on 14-30 days. Green dot on <14 days.
- **Search bar:** Trigram fuzzy search on name + company — works for Arabic and English.
- **Filter chips:** All / Needs Follow-up / Recent (last 30d) / Favorites (tagged "مفضل") / By Type.
- **Client cards:** name, company, last contacted ("منذ ١٢ يوماً"), total gigs, total value, rating stars, follow-up badge.
- **Sort options:** AI-prioritized (default), Last contacted, Alphabetical, Total value.
- **"+" FAB** to add client.
- **Empty state:** "ما عندك عملاء حتى الآن — أضف أول عميل" / "No clients yet — add your first client."

**Detail view (tap a client):**
- **Header:** name, company, type, rating (editable stars), tags (editable, with + button).
- **AI Insight card:** "آخر مشروع: تصميم شعار بقيمة ٣,٥٠٠ ر.س (منذ ٤٥ يوماً). متوسط الدفع: ٨ أيام بعد الفاتورة." / "Last project: Logo design, SAR 3,500 (45 days ago). Average payment: 8 days after invoice."
- **AI suggestion:** "أرسل رسالة متابعة — مر ٤٥ يوماً منذ آخر تواصل." / "Send a follow-up — 45 days since last contact." With a one-tap "Generate follow-up message" button → DeepSeek drafts a Saudi-polite check-in message.
- **Contact section:** email (tap to mail), phone (tap to call), WhatsApp (tap to open chat). All using native `tel:`, `mailto:`, `wa.me` links.
- **Gig history:** reverse-chronological list from M3. Each row: date, service, amount, status. Tap to view gig detail.
- **Proposals sent:** proposals linked to this client from M1. Status badges.
- **Invoices:** from M6. Status badges.
- **Notes:** editable text area. Timestamped. AI notes in a separate distinguished section (labeled "تحليل رِزق").
- **Activity timeline:** auto-generated from `client_timeline`. Each event has an AI-generated Arabic summary.
- **Actions:** Edit, Archive, Delete (with confirmation).

**Add/Edit client form:**
- Minimal required fields: name, phone (optional but encouraged).
- Smart defaults: WhatsApp = phone if same. City = freelancer's city if empty.
- Duplicate detection: warn if same phone number exists in another client (not a hard block).
- Optional LinkedIn URL field → future: public profile enrichment (deferred to v3).

#### M2.4 Room for improvement

- **Tags are user-defined and unlimited.** No predefined tag taxonomy. Freelancers create their own. Tags are stored as a text array with GIN index for fast filtering.
- **Custom fields via `client_metadata`.** A `jsonb` column (not yet in schema — add when requested) allows freelancers to store arbitrary key-value pairs per client without schema changes.
- **Client import.** Future: CSV import, vCard import, phone contacts import (with permission). The client creation API accepts bulk inserts. The import adapter is pluggable.
- **Client sharing.** Future: share a client profile with another Rizq user (e.g., if two freelancers collaborate). Requires consent architecture.
- **Client merge.** Future: deduplicate clients. Merge tool with conflict resolution.
- **Industry taxonomy.** Currently free-text. Future: autocomplete from a curated Saudi industry list (tech, trade, health, education, government, real estate, etc.). The list is config-driven, not hardcoded.
- **AI insights are pluggable.** New insight types can be registered without changing core client logic. Each insight is a function `(client, gigs, proposals) → Insight | null`.

#### M2.5 Integration

| Integration | Type | Description |
|---|---|---|
| **M1 → M2** | Internal | Proposals linked to client. `proposals.client_id`. Client detail shows all proposals. |
| **M3 → M2** | Internal | Gigs linked to client. `gigs.client_id`. Client detail shows all gigs. Client stats auto-updated from gig data via triggers. |
| **M6 → M2** | Internal | Invoices linked to client. Client detail shows invoice history. |
| **M9 → M2** | Internal | Follow-up reminders appear on calendar. |
| **M0 → M2** | Internal | Active clients widget on dashboard. |
| **M12 → M2** | Internal | Client-specific documents (contracts, NDAs) linked to client. |
| **DeepSeek API** | External | AI client insights, follow-up message drafting, persona generation, timeline summaries. |
| **Phone/SMS** | External | Native `tel:` links. Future: SMS integration for follow-ups. |
| **WhatsApp** | External | Native `wa.me` links with pre-filled message. |
| **LinkedIn (future)** | External | Public profile enrichment. Deferred to v3. |

#### M2.6 AI enhancement

**A. AI client insights (shown on client detail):**

DeepSeek analyzes the client's history and generates 2-3 observations:
```
You are analyzing a freelancer's client. Data:
- Client: { name, type, industry, tags }
- Gigs: [{ title, amount_sar, status, date }] — last 12 months
- Proposals: [{ title, amount_sar, status, date }] — last 12 months
- Payment history: avg_payment_days, on_time_rate, any overdue instances

Generate 2-3 concise, specific insights in Saudi-polite Arabic:
- Highlight patterns: "This client typically requests logo designs with 2-3 revisions."
- Flag risks: "Last payment was 15 days late."
- Note opportunities: "Client has increased project value 20% over 3 projects."
- Never fabricate. Label: "تحليل رِزق —"
```

**B. AI follow-up message drafting:**
One-tap button generates a Saudi-polite Arabic check-in message via DeepSeek:
```
You are drafting a follow-up message for a Saudi freelancer to send to their client.
Client: { name, company, last_gig_description, last_gig_date, days_since_contact }
Freelancer's tone preference: { formal | balanced | friendly }

Generate a 2-3 sentence Arabic message that:
- Is warm but professional
- References the last project naturally
- Opens the door for new work without being pushy
- Uses Saudi-polite phrasing
- Is ready to copy-paste into WhatsApp
```

Freelancer reviews and edits before sending. Not auto-sent.

**C. AI persona generation:**
After 3+ gigs with a client, DeepSeek generates a client persona:
"عميل مؤسسي، يدفع بسرعة (متوسط ٥ أيام)، يفضل التواصل الرسمي بالبريد الإلكتروني، مشاريع متوسطة الحجم (٢,٠٠٠-٥,٠٠٠ ر.س)." / "Corporate client, fast payer (avg 5 days), prefers formal email communication, medium-sized projects (SAR 2,000-5,000)."

Stored in `clients.client_persona`. Updated after every 3 new gigs.

**D. AI follow-up priority:**
Automatic priority assignment based on: days since last contact, total client value, payment reliability, recent proposal activity. Formula: `priority_score = f(days_since_contact, total_value_percentile, avg_payment_days, has_active_proposal)`. Stored in `clients.follow_up_priority`. Updates nightly.

**E. AI timeline summaries:**
Every `client_timeline` event has an optional `ai_summary` field. DeepSeek generates: "تم إرسال عرض تصميم هوية تجارية بقيمة ٣,٥٠٠ ر.س" / "Brand identity proposal sent — SAR 3,500."

---

### M3 — Income Ledger

**Purpose:** Log your gigs. Know what you earned this month, what's pending, and what's overdue. Simple enough to replace a Notes app entry. Structured enough to feed HADAF eligibility (M5) and give the freelancer real visibility into their income. AI forecasting turns this from a record-keeper into a forward-looking financial tool.

**Why it matters:** The #1 financial question for a freelancer is "كم دخلت هذا الشهر؟" — "What did I make this month?" Currently answered by scrolling through bank notifications or an Excel sheet they update intermittently. A structured ledger with zero friction to log a gig becomes habit-forming. AI income forecasting makes it indispensable.

**Design philosophy:** Logging a gig must take under 30 seconds. Less than writing it in Notes. If it's slower than the status quo, freelancers won't use it.

#### M3.1 Data model

```sql
gigs (
  id              uuid PK DEFAULT gen_random_uuid(),
  user_id         uuid FK → users.id NOT NULL,
  client_id       uuid FK → clients.id,  -- nullable (gig without a saved client)
  proposal_id     uuid FK → proposals.id,  -- nullable (gig from a Rizq proposal)
  invoice_id      uuid FK → invoices.id,  -- nullable (linked invoice from M6)

  -- What
  title           text NOT NULL,         -- "تصميم هوية بصرية" / "Brand identity design"
  category        text,                  -- free text or linked to specialty
  category_auto   text,                  -- AI-suggested category
  description     text,                  -- optional notes about the gig

  -- Money
  amount_sar      numeric NOT NULL CHECK (amount_sar > 0),
  deposit_pct     int DEFAULT 50,        -- 50 = 50% deposit
  deposit_sar     numeric,               -- auto-calculated: amount_sar * deposit_pct / 100
  remaining_sar   numeric,               -- auto-calculated: amount_sar - deposit_sar

  -- Timeline
  start_date      date,
  delivery_date   date,
  completed_date  date,                  -- actual completion date

  -- Status
  status          enum['pending','deposit_paid','in_progress','delivered','paid','overdue','cancelled'] DEFAULT 'pending',

  -- Payment tracking
  deposit_paid_at   timestamptz,
  final_paid_at     timestamptz,
  payment_method    enum['bank_transfer','stc_pay','cash','other'] DEFAULT 'bank_transfer',
  payment_notes     text,

  -- AI
  ai_anomaly_flag   boolean DEFAULT false,  -- AI flagged this gig as anomalous
  ai_anomaly_reason text,                   -- "This gig is 40% below your usual rate."
  ai_category_confidence numeric,           -- 0..1 confidence in AI categorization

  -- Lifecycle
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),

  -- RLS: owner CRUD only
);

-- Indexes
CREATE INDEX idx_gigs_user_status ON gigs(user_id, status);
CREATE INDEX idx_gigs_user_date ON gigs(user_id, delivery_date DESC);
CREATE INDEX idx_gigs_client ON gigs(client_id);
CREATE INDEX idx_gigs_proposal ON gigs(proposal_id) WHERE proposal_id IS NOT NULL;
CREATE INDEX idx_gigs_user_month ON gigs(user_id, date_trunc('month', delivery_date));
CREATE INDEX idx_gigs_user_amount ON gigs(user_id, amount_sar);

-- Income projections (AI-generated, cached)
income_projections (
  user_id               uuid PK FK → users.id,
  current_month_projection numeric,     -- projected total for current month
  next_month_projection    numeric,     -- projected total for next month
  confidence_low          numeric,      -- lower bound
  confidence_high         numeric,      -- upper bound
  projection_basis        jsonb,        -- { active_proposals, in_progress_gigs, historical_avg, seasonal_factor }
  generated_at            timestamptz DEFAULT now(),
  valid_until             timestamptz   -- projection expires after 7 days
);
```

#### M3.2 Income aggregation

```sql
CREATE VIEW monthly_income AS
SELECT
  user_id,
  date_trunc('month', delivery_date) AS month,
  COUNT(*) AS gig_count,
  SUM(amount_sar) AS total_sar,
  SUM(amount_sar) FILTER (WHERE status = 'paid') AS paid_sar,
  SUM(amount_sar) FILTER (WHERE status IN ('pending','deposit_paid','in_progress','delivered')) AS pending_sar,
  SUM(amount_sar) FILTER (WHERE status = 'overdue') AS overdue_sar,
  COUNT(*) FILTER (WHERE status = 'paid') AS paid_count,
  COUNT(*) FILTER (WHERE status IN ('pending','deposit_paid','in_progress','delivered')) AS pending_count
FROM gigs
GROUP BY user_id, month;

-- 6-month rolling averages for forecasting
CREATE VIEW income_rolling_avg AS
SELECT
  user_id,
  month,
  AVG(total_sar) OVER (PARTITION BY user_id ORDER BY month ROWS BETWEEN 5 PRECEDING AND CURRENT ROW) AS rolling_6m_avg,
  AVG(total_sar) OVER (PARTITION BY user_id ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS rolling_3m_avg
FROM monthly_income;
```

#### M3.3 UX specification

**List view (main screen):**
- **Current month header:** "يونيو ٢٠٢٦" / "June 2026" with summary — "٨,٤٥٠ ر.س من ٦ مشاريع (٢ قيد الدفع)" / "SAR 8,450 from 6 gigs (2 pending)."
- **Month comparison:** "أعلى بنسبة ١٥٪ من مايو" / "15% higher than May" (green) or "أقل بنسبة ٨٪" (red).
- **AI projection chip:** "الإسقاط: ١١,٠٠٠-١٤,٠٠٠ ر.س هذا الشهر" / "Projected: SAR 11,000-14,000 this month." Tapping expands to show projection basis.
- **Gig cards:** each shows: title, client name, amount (bold), status badge, delivery date.
- **AI anomaly indicator:** Red exclamation icon on gigs flagged as anomalous.
- **Status badges:** color-coded — green (paid), yellow (pending/deposit paid), blue (in progress/delivered), red (overdue).
- **Filter chips:** All / Paid / Pending / This Month / Last Month / This Year.
- **Sort:** Delivery date (default), Amount (high-low), Status.
- **"+" FAB** to log a new gig.
- **Empty state:** "ما عندك أي مشاريع مسجلة — سجّل أول مشروع" / "No gigs logged — log your first gig." CTA button.

**Add gig form (optimized for speed — target <30 seconds):**
- **Field 1: Title** — single text input, auto-complete from past gig titles.
- **Field 2: Amount (SAR)** — large number input, numeric keyboard on mobile. The primary field.
- **Field 3: Client** — search/select from Client Book, or type new name inline. If typed name doesn't exist, offer "أضف إلى دفتر العملاء" checkbox.
- **Field 4: Status** — quick-select pills: Pending / Deposit Paid / Paid. Default: Pending.
- **Field 5: Delivery Date** — date picker, defaults to today. Saudi (Hijri optional, Gregorian default).
- **Field 6: Category** — optional, auto-complete. AI suggests: "تصميم جرافيك؟" based on title.
- **Field 7: Notes** — optional, single line.
- **"Save" button.**
- 7 fields, 4 required, 3 optional.

**Gig detail view:**
- All fields displayed.
- **AI anomaly banner** (if flagged): "هذا المشروع أقل بـ ٤٠٪ من سعرك المعتاد لهذا النوع من العمل" / "This gig is 40% below your usual rate for this type of work."
- **Payment timeline:** visual bar showing deposit → final payment with dates.
- **Linked proposal** (if any): tap to view.
- **Linked invoice** (if any): tap to view.
- **Linked client** (if any): tap to view in Client Book.
- **Actions:** Edit, Mark as Paid, Mark as Overdue, Delete.
- **"Mark as Paid" quick action:** one-tap from the list view via swipe (mobile) or context menu (desktop).

**Monthly summary view:**
- Accessible from the list header or dashboard.
- **AI projection card at top** (see M3.6-C).
- Bar chart: months on X-axis (Hijri optional, Gregorian default), SAR on Y-axis. Simple, not complex.
- Below chart: table of months with gig count, total, paid, pending.
- Export: "تصدير كـ CSV" button (Pro tier).

#### M3.4 Room for improvement

- **Custom gig statuses.** The status enum is the default set. Future: freelancers can define custom statuses ("waiting for client feedback", "in revision"). Status workflow is configuration-driven via a `gig_status_transitions` table.
- **Recurring gigs.** Future: mark a gig as "recurring monthly" with auto-creation of the next instance. The gig schema already supports this via a `recurring_config` jsonb field (deferred).
- **Bank feed import.** Future: connect Saudi bank account (via open banking API when available) to auto-match transactions to gigs. The matching engine is pluggable.
- **STC Pay integration.** Future: webhook receiver for STC Pay payment notifications. Auto-update gig status on payment received.
- **Category taxonomy.** Currently free-text with AI suggestions. Future: curated taxonomy with hierarchical categories. Backward-compatible — existing free-text categories are preserved.
- **Multi-currency.** Future: support for USD, AED, EGP alongside SAR. Exchange rate from Saudi Central Bank (SAMA) API. The `amount_sar` column remains the canonical. Additional columns for `amount_original` + `currency_original`.

#### M3.5 Integration

| Integration | Type | Description |
|---|---|---|
| **M1 → M3** | Internal | Accepted proposal → one-tap "Create gig" pre-fills: title (from scope), amount (from price anchor), client (from proposal client), category (from specialty). |
| **M2 → M3** | Internal | Selecting a client auto-populates gig form. On save, client stats auto-update via DB triggers. |
| **M5 ← M3** | Internal | `hadaf_eligibility_feed` view reads from `gigs`. Every paid gig updates HADAF tracking. |
| **M6 ← M3** | Internal | Delivered/completed gig → one-tap "Generate invoice" pre-fills M6 form. |
| **M9 ← M3** | Internal | Delivery dates, payment due dates appear on calendar. |
| **M0 ← M3** | Internal | Monthly income widget + AI projection widget on dashboard. |
| **DeepSeek API** | External | AI income forecasting, anomaly detection, category suggestion, projection basis explanation. |
| **CSV export** | External | Pro tier: export monthly income data as CSV. |

#### M3.6 AI enhancement

**A. AI category suggestion:**

When the freelancer types a gig title, DeepSeek suggests a category:
```
Freelancer's gig title: "{title}"
Freelancer's specialties: [{specialties}]
Past categories used: [{past_categories}]

Suggest the most likely category. Return: { category_ar, category_en, confidence }.
Confidence < 0.6: don't auto-apply, just suggest.
```

Shown as a chip below the title input: "تصنيف مقترح: تصميم جرافيك ✓" — tap to accept.

**B. AI anomaly detection:**

On gig save, DeepSeek checks if this gig is anomalous compared to the freelancer's history:
```
Freelancer's gig history for category "{category}":
- Average amount: SAR {avg}
- Range: SAR {min} - {max}
- This gig: SAR {amount}, title: "{title}"

Is this gig anomalous? Consider:
- Price > 40% above/below their average?
- Category mismatch with title?
- Unusual client type?

Return: { is_anomaly: boolean, reason_ar: string, reason_en: string }.
```

If flagged, the gig shows an anomaly indicator. Not a block — just awareness.

**C. AI income forecasting:**

Runs weekly (or on-demand). DeepSeek analyzes current pipeline:
```
You are forecasting a Saudi freelancer's income. Data:
- Current month so far: SAR {current_month_total} from {gig_count} gigs
- In-progress gigs: [{ title, amount_sar, status, expected_completion_date }]
- Active proposals (sent, not yet accepted): [{ title, price_anchor, client_type, date_sent }]
- Historical: 6-month monthly totals: [{ month, total_sar }]
- Current month days remaining: {days_remaining}
- Seasonal factor: {seasonal_factor} (based on Ramadan, summer, etc.)

Generate a projected income range for the current month and next month.
Return: { current_month_low, current_month_high, next_month_low, next_month_high, confidence, factors[] }.
Factors explain the projection: "2 proposals pending (SAR 6,000 potential)", "Historical average for June: SAR 8,200", etc.
```

Stored in `income_projections`. Cached for 7 days. Displayed on the Income Ledger list header and as a dashboard widget.

**D. AI income narrative:**

Alongside the projection, a 2-sentence Arabic narrative:
"دخلك المتوقع هذا الشهر: ١١,٠٠٠-١٤,٠٠٠ ر.س — مدعوم بـ ٣ عروض معلقة (٦,٠٠٠ ر.س) و ٢ مشروع قيد التنفيذ (٣,٥٠٠ ر.س). هذا أعلى من معدلك لآخر ٦ أشهر (٨,٢٠٠ ر.س)."

---

### M4 — Pricing Lookup

**Purpose:** Quick market price lookup. Specialty × city × tier → price band (min, median, max) with sample size and provenance. The existing v0.1 `/tool` route — demoted from "the product" to "a utility." Available to anonymous users as the SEO funnel entry. AI trend analysis adds depth.

**Why it matters:** The pricing lookup is the top-of-funnel wedge. It answers "what should I charge?" in under 10 seconds and demonstrates Rizq's data-grounded approach. It's the module that gets shared on LinkedIn and X. But it's no longer the product — it's the free sample that leads to the suite.

#### M4.1 Data pipeline (collectors — pluggable architecture)

**Collector interface (TypeScript):**
```ts
interface Collector {
  id: string;
  name: string;
  provenance: BenchmarkProvenance;
  confidence: number;  // default confidence for rows from this collector
  fetch(): Promise<RawRecord[]>;  // fetch raw data from source
  normalize(raw: RawRecord[]): Promise<BenchmarkRow[]>;  // normalize to benchmark_records shape
  validate?(rows: BenchmarkRow[]): Promise<BenchmarkRow[]>;  // optional validation
}
```

**Collector registry (configuration-driven):**
```sql
collector_registry (
  id            text PK,  -- 'published_ref_v1', 'open_data_etimad', 'reasoned_v1', 'submitted'
  name          text NOT NULL,
  provenance    enum_benchmark_provenance NOT NULL,
  default_confidence numeric NOT NULL,
  enabled       boolean DEFAULT true,
  schedule      text,  -- cron expression for scheduled runs
  config_json   jsonb,  -- collector-specific configuration
  created_at    timestamptz DEFAULT now()
);
```

Adding a new data source = implement the `Collector` interface + INSERT into `collector_registry`. No resolver changes.

**Collector 1 — Curated published-reference anchor table:**
- Qemma 2026 Saudi rate guide, Saudi agency public rate cards, HRDF/MHRSD stats, Saudi freelance pricing blogs
- `provenance = 'published_ref'`, `confidence = 0.6`
- Manual curation, one pass. Stored in `collector_registry.config_json.sources[]`.

**Collector 2 — Saudi Open Data (licensed, non-personal):**
- Etimad government procurement via `open.data.gov.sa`
- Saudi Open Data License: commercial reuse + adaptation explicitly permitted
- `provenance = 'ingested'`, `confidence = 0.4`
- Adapter: `fetch() → Raw[] → normalize() → BenchmarkRow[]`

**Collector 3 — LLM-reasoned constrained prior:**
- DeepSeek interpolates between known C1 anchors. Boxed by anchor table, never free-hand.
- `provenance = 'reasoned'`, `confidence = 0.2`
- Auto-demoted as real rows arrive for that cell.

**Collector 4 — Crowd submissions (luxury, never essential):**
- Existing submission → review → approve pipeline.
- `provenance = 'submitted'`, `confidence = 0.5` (verified) or `0.3` (unverified).
- Zero submissions forever = system still works.

#### M4.2 Data model

```sql
-- Extended benchmark_records
benchmark_records (
  -- existing columns preserved
  id                  uuid PK,
  specialty_id        uuid FK,
  city_id             uuid FK,
  experience_tier_id  uuid FK,
  project_type        text,
  price_sar           numeric,
  project_duration_days int,
  client_type         enum,
  source              enum,  -- kept for backward compat

  -- provenance system
  provenance          enum_benchmark_provenance NOT NULL DEFAULT 'submitted',
  source_ref          text,   -- URL / citation / model+prompt-hash
  captured_at         timestamptz NOT NULL DEFAULT now(),
  confidence          numeric NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  collector_id        text,   -- FK to collector_registry.id

  -- existing columns preserved
  source_url          text,
  source_user_id      uuid FK,
  verified            boolean DEFAULT false,
  verified_at         timestamptz,
  verified_by         uuid FK,
  notes               text,
  recorded_at         timestamptz,
  created_at          timestamptz DEFAULT now(),
  flagged_as_outlier  boolean DEFAULT false,
  active              boolean DEFAULT true
);

-- Ingestion run observability
ingestion_runs (
  id            uuid PK DEFAULT gen_random_uuid(),
  collector_id  text NOT NULL,  -- FK to collector_registry
  source_desc   text,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  rows_in       int,
  rows_kept     int,
  rows_rejected int DEFAULT 0,
  status        enum['running','completed','failed'] DEFAULT 'running',
  error         text,
  error_stack   text,
  created_at    timestamptz DEFAULT now()
);

-- AI trend analysis cache
price_trends (
  id              uuid PK DEFAULT gen_random_uuid(),
  specialty_id    uuid FK NOT NULL,
  city_id         uuid FK,
  period          text NOT NULL,  -- '3m', '6m', '12m'
  trend_direction enum['up','down','stable'] NOT NULL,
  trend_pct       numeric,  -- e.g., +12.5 or -5.0
  sample_size     int,
  ai_summary_ar   text,
  ai_summary_en   text,
  generated_at    timestamptz DEFAULT now(),
  valid_until     timestamptz,  -- trends expire after 30 days

  UNIQUE(specialty_id, city_id, period)
);
```

#### M4.3 `resolvePrice` — refined

```
resolvePrice({ specialty, city, tier, project_size? }):
  1. Pull all active, verified, non-outlier rows for the cell.
  2. Fallback widens: drop project_size → same region (not city) → specialty-only.
  3. Weight each row by provenance_weight × confidence × freshness_decay.
  4. Provenance weights: published_ref=0.6, ingested=0.4, submitted=0.5, reasoned=0.2.
  5. Freshness decay: 1.0 at captured_at, 0.5 at 18 months, 0.1 at 36 months.
  6. Output: { min(p10), anchor(p50), max(p90), sample_size, dominant_provenance, sources[], fallback_used, fallback_kind, confidence_score }.
  7. Insufficient data: if < 3 rows even after full widening AND no reasoned prior covers the cell → return insufficient_data.
```

#### M4.4 UX specification

**Anonymous user flow (SEO entry point):**
1. Land at `/[locale]/tool` — no auth required.
2. Dropdowns: Specialty, City, Experience Tier, Project Size (optional).
3. Tap "احسب سعري" / "Check my rate."
4. Loading (1-2s, skeleton UI).
5. Result card:
   - Price band: **SAR 1,500 – 3,000 – 5,500** (anchor bold, min/max muted).
   - Sample size: "بناءً على ٤٧ مشروعاً مشابهاً في الرياض" / "Based on 47 similar projects in Riyadh."
   - Provenance badge: "تقدير رِزق من أسعار السوق السعودي المنشورة" or "بيانات حقيقية من X مشروع."
   - **AI trend chip** (if available): "ارتفاع بنسبة ١٢٪ في آخر ٦ أشهر ↗" / "Up 12% in last 6 months ↗"
   - Methodology link.
   - Fallback notice (if fallback used).
6. CTA: "أنشئ عرض سعر كامل" / "Create a full proposal" → signup → M1.
7. Secondary CTA: "سجّل دخولك للمزايا الكاملة" / "Sign in for full features."

**Authenticated user flow (suite tab):**
1. Same dropdowns, pre-filled from profile (specialty, city, tier).
2. Faster result (profile context reduces ambiguity).
3. Result card + direct actions:
   - "أنشئ عرضاً من هذا السعر" → M1 with pre-filled price.
   - "سجّل مشروعاً بهذا السعر" → M3 with pre-filled amount.
   - "شارك النتيجة" → shareable link.
4. **AI trend detail:** expandable section with natural-language trend explanation.

#### M4.5 Room for improvement

- **Collectors are pluggable** via the `Collector` interface and `collector_registry` table. Adding a new data source = implement interface + INSERT registry row. No resolver changes.
- **Confidence model is pluggable.** The weighting formula `provenance_weight × confidence × freshness_decay` can be swapped per collector via `collector_registry.config_json.weight_formula`.
- **Fallback strategy is configurable.** The fallback sequence (size → region → specialty) is defined in a config table, not hardcoded. Future: add tier fallback (adjacent experience tiers).
- **Trend analysis is a separate pipeline** that reads `benchmark_records` and writes `price_trends`. It can be enhanced with more sophisticated statistical methods (seasonal decomposition, outlier-resistant trends) without touching the resolver.
- **Specialty/city/tier lists are database-driven** (already). Adding a new specialty = INSERT into `specialties`. Adding a new city = INSERT into `cities`.

#### M4.6 Integration

| Integration | Type | Description |
|---|---|---|
| **M1 ← M4** | Internal | `resolvePrice` is called by M1 for proposal price computation. |
| **M3 ← M4** | Internal | Gig form can pre-fill amount from `resolvePrice` result. |
| **M10 ← M4** | Internal | Rate Calculator uses market medians from `resolvePrice`. |
| **M0 ← M4** | Internal | Quick pricing widget on dashboard. |
| **M7 ← M4** | Internal | Methodology page cites collector sources. |
| **Saudi Open Data** | External | Etimad datasets via `open.data.gov.sa`. Saudi Open Data License. |
| **Qemma/published guides** | External | Curated rate references. Cited with URLs. |
| **DeepSeek API** | External | Collector 3 (reasoned prior) + AI trend analysis. |

#### M4.7 AI enhancement

**A. Collector 3 — LLM-reasoned constrained prior (primary AI use):**

DeepSeek generates price estimates for cells not covered by C1/C2:
```
You are estimating freelance pricing in Saudi Arabia. Given:
- Specialty: {specialty_name_ar}
- City: {city_name_ar} (region: {region})
- Experience tier: {tier_name_ar} ({years_min}-{years_max} years)
- Project size: {project_size}

Known anchor points (published references for this specialty):
{anchor_table_rows}

Estimate a price range (min, median, max) in SAR. Rules:
- Interpolate between known anchors. Never extrapolate beyond the anchor range.
- Account for city cost-of-living differences (Riyadh > Jeddah > Dammam > other cities).
- Account for experience tier scaling.
- Be conservative: wider range when uncertain.
- Return: { min, median, max, reasoning_ar, confidence }.
- Confidence is 0.2 by design — this is an estimate, not data.
```

**B. AI trend analysis:**

Runs monthly via cron. DeepSeek analyzes price trends:
```
You are analyzing Saudi freelance pricing trends. Data for {specialty} in {city}:
- Current prices: {current_medians} (based on {sample_size} records, period: last 3 months)
- Historical prices: {historical_medians} (period: 6 months ago)
- Overall market context: Saudi freelance market growth ~22% YoY, Vision 2030, increasing demand for {specialty}.

Is there a statistically meaningful trend? Consider:
- Change > 10% = trend
- 5-10% = weak trend
- <5% = stable

Generate a 2-sentence Arabic summary suitable for freelancers.
Return: { trend_direction, trend_pct, summary_ar, summary_en, confidence }.
```

Stored in `price_trends`. Shown as a chip on pricing results.

---

### M5 — HADAF Eligibility Dashboard

**Purpose:** A read-only tracker that shows the freelancer their progress toward HADAF income support qualification. High perceived value, low build cost. Aligns Rizq with Vision 2030. AI-powered guidance turns this from a tracker into an action planner.

**Design philosophy:** Informational, not advisory. Clear disclaimers. Links to official sources. Never claims to be a government service. AI guidance is labeled as automated analysis, not financial advice.

#### M5.1 Data model

```sql
hadaf_preferences (
  user_id           uuid PK FK → users.id,
  target_monthly_sar numeric DEFAULT 700,
  bahr_only         boolean DEFAULT true,
  notifications_enabled boolean DEFAULT true,
  updated_at        timestamptz DEFAULT now()
);

-- HADAF status cache (computed weekly, displayed instantly)
hadaf_status_cache (
  user_id               uuid PK FK → users.id,
  current_streak        int DEFAULT 0,
  current_month_status  enum['qualifying','not_qualifying','no_data'] DEFAULT 'no_data',
  current_month_income  numeric DEFAULT 0,
  months_to_qualify     int DEFAULT 3,
  estimated_subsidy     numeric,
  streak_history        jsonb,  -- [{ month, income, qualifying }] last 12 months
  ai_action_plan_ar     text,
  ai_action_plan_en     text,
  generated_at          timestamptz DEFAULT now(),
  valid_until           timestamptz  -- expires after 7 days
);
```

#### M5.2 HADAF rules engine (configuration-driven)

```ts
interface HadafRules {
  platform: 'bahr';
  minimum_monthly_income_sar: number;  // 700
  consecutive_months_required: number;  // 3
  subsidy_pct: number;  // 40
  max_subsidy_sar: number | null;
  eligibility_requirements: string[];  // ['saudi_national', 'active_bahr_account', 'freelance_work_document']
  effective_date: string;  // '2026-01-01'
  source_url: string;  // 'https://hrdf.org.sa/...'
}
```

Rules are stored in a configuration table, not hardcoded. When HADAF updates their rules, update the config row. No code deployment.

```sql
hadaf_rules_config (
  id              int PK DEFAULT 1,  -- singleton
  rules_json      jsonb NOT NULL,
  updated_at      timestamptz DEFAULT now(),
  updated_by      text  -- 'manual' | 'system'
);
```

#### M5.3 UX specification

**Status card (primary):**

Three states:

1. **Qualifying streak (1-3 months):**
   - Progress bar: 3 segments. Filled segments = qualifying months. Animates on load.
   - "مبروك! أنت في شهرك [١/٢/٣] من ٣ أشهر مطلوبة للتأهل لدعم هدف."
   - Current month: "دخلك هذا الشهر: [X] ر.س (الحد الأدنى ٧٠٠ ر.س) ✓"
   - Estimated subsidy: "الدعم المتوقع: [X] ر.س شهرياً (٤٠٪ من متوسط دخلك)"

2. **Not qualifying this month:**
   - "دخلك هذا الشهر: [X] ر.س — تحتاج [Y] ر.س إضافية للوصول للحد الأدنى (٧٠٠ ر.س)."
   - "متبقي [Z] يوم في الشهر."
   - Streak broken indicator: "كنت في شهرك [N] قبل هذا الشهر."
   - **AI action plan card** (see M5.7).

3. **No data:**
   - "ما عندك مشاريع مسجلة بعد. سجّل مشاريعك في دفتر الدخل علشان نتابع أهليتك لدعم هدف."
   - CTA: "سجّل أول مشروع" → M3.

**Monthly history table:**
- Columns: Month, Income (SAR), Qualifying? (✓/✗), Notes.
- Last 12 months.

**Disclaimer (displayed prominently):**
"هذه المعلومات مبنية على الشروط الموثقة لبرنامج دعم العمل الحر (هدف) حتى عام ٢٠٢٦. يرجى التحقق من الشروط المحدثة على موقع هدف الرسمي hrdf.org.sa. رِزق ليست جهة حكومية ولا تقدم استشارات مالية."

#### M5.4 Room for improvement

- **Rules engine is configuration-driven.** HADAF rule changes = update `hadaf_rules_config.rules_json`. No code deployment. The `calculateHadafStatus` function reads rules from config.
- **Extensible to other Saudi programs.** Future: SANED (unemployment support), Tamheer (training program), citizen account (حساب المواطن). Each program is a new rules config row + a new status calculator. The M5 UI renders whatever programs are configured.
- **Notification preferences are per-program.** Currently only HADAF. Future: per-program notification settings in `hadaf_preferences` (extended with jsonb for multi-program support).
- **Historical rule versions.** `hadaf_rules_config` has an audit table. When rules change, the old version is preserved. Status calculations reference the rule version effective at that time.

#### M5.5 Integration

| Integration | Type | Description |
|---|---|---|
| **M3 → M5** | Internal | `hadaf_eligibility_feed` view reads from `gigs`. Every paid gig automatically updates HADAF tracking. |
| **M9 ← M5** | Internal | HADAF qualification deadline (end of month) appears on calendar. |
| **M0 ← M5** | Internal | HADAF status widget on dashboard. |
| **HRDF website** | External | "Verify at hrdf.org.sa" link. |
| **Bahr.sa (future)** | External | If Bahr exposes an API, auto-verify income against platform data. |
| **DeepSeek API** | External | AI action plan generation. |

#### M5.6 AI enhancement

**AI action plan (when not qualifying):**

When the freelancer is not on track to qualify this month, DeepSeek generates a personalized action plan:
```
You are helping a Saudi freelancer reach HADAF income support qualification.
Current status:
- Monthly income so far: SAR {current_income} (need SAR {target})
- Days remaining in month: {days_remaining}
- Active proposals (sent, not accepted): [{ title, price_anchor, client, days_since_sent }]
- In-progress gigs: [{ title, amount_sar, expected_completion }]
- Clients needing follow-up: [{ name, days_since_contact, last_gig_value }]
- Past 3 months average income: SAR {avg_income}

Generate a specific, actionable plan in Saudi-polite Arabic:
1. What specific actions could help (follow up with X client, complete Y gig, send Z proposal)
2. Realistic income projection for this month
3. If unlikely to qualify this month, what to focus on for next month

Rules:
- Be specific with names and amounts (use the data provided)
- Be encouraging but honest
- Never guarantee eligibility
- Label: "هذه خطة مقترحة بناءً على تحليل بياناتك — ليست نصيحة مالية."
- 3-5 bullet points maximum
```

Displayed as a card below the status card when `current_month_status = 'not_qualifying'`.

---

### M6 — Simple Invoicing

**Purpose:** Generate professional bilingual invoices from completed gigs. Closes the proposal → gig → invoice loop. Not ZATCA e-invoicing — just: "I did the work, here's the bill." Shares M1's artifact pipeline for PDF + share link + WhatsApp output.

**Why it matters:** A freelancer who logs a gig in M3 and sent a proposal from M1 will naturally want to invoice from the same system. Currently they screenshot a Word doc or type into WhatsApp. A professional invoice from the same app that generated the proposal closes the workflow loop and adds another retention anchor.

#### M6.1 Data model

```sql
invoices (
  id              uuid PK DEFAULT gen_random_uuid(),
  user_id         uuid FK → users.id NOT NULL,
  client_id       uuid FK → clients.id,
  gig_id          uuid FK → gigs.id,  -- the gig being invoiced
  proposal_id     uuid FK → proposals.id,  -- the originating proposal

  -- Numbering
  invoice_number  text NOT NULL,  -- e.g., "INV-2026-0001" (auto-increment per user)
  invoice_sequence int NOT NULL,   -- per-user sequence number

  -- Content
  description     text,            -- auto-generated from gig title + deliverables
  items           jsonb,           -- [{ description, quantity, unit_price_sar, total_sar }]
  subtotal_sar    numeric NOT NULL,
  vat_pct         numeric DEFAULT 0,  -- 0% for most freelancers (below SAR 375K threshold)
  vat_sar         numeric DEFAULT 0,
  total_sar       numeric NOT NULL,

  -- Payment
  payment_method  enum['bank_transfer','stc_pay','cash','other'] DEFAULT 'bank_transfer',
  payment_details text,            -- "STC Pay: 05XXXXXXXX" or "Bank: SA0000... IBAN"
  due_date        date,            -- default: delivery_date + 15 days

  -- Status
  status          enum['draft','sent','viewed','paid','overdue','cancelled'] DEFAULT 'draft',

  -- Output
  share_token     text UNIQUE,
  share_viewed_at timestamptz,
  share_view_count int DEFAULT 0,
  pdf_url         text,            -- Supabase Storage signed URL

  -- AI
  ai_reminder_drafted_at timestamptz,
  ai_reminder_text_ar    text,

  -- Lifecycle
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  sent_at         timestamptz,
  paid_at         timestamptz,

  -- RLS: owner CRUD; public SELECT only when shared
  UNIQUE(user_id, invoice_sequence)
);
```

#### M6.2 Extensibility

- **Invoice template is pluggable.** Same artifact section architecture as M1. Sections registered via configuration.
- **Invoice numbering is configurable.** Format: `INV-{YEAR}-{SEQUENCE}`, `{CLIENT_CODE}-{SEQUENCE}`, or custom.
- **Payment methods extensible.** The `payment_method` enum + `payment_details` text field supports any method. Future: add payment link generation (Tap Payments, STC Pay deep link).
- **ZATCA compliance layer.** Deferred. When needed, add a `zatca_compliance` jsonb column with FATOORA fields (UUID, invoice hash, QR code, XML). The invoice rendering pipeline is versioned — v1 = simple invoice, v2 = ZATCA-compliant. v1 invoices are not retroactively converted.
- **Recurring invoices.** Future: mark an invoice as recurring monthly. Auto-generate next month's invoice from the same gig.

#### M6.3 Integration

| Integration | Type | Description |
|---|---|---|
| **M3 → M6** | Internal | Delivered/paid gig → one-tap "Generate invoice" pre-fills: client, amount, description, payment method. |
| **M1 → M6** | Internal | Accepted proposal → invoice pre-fills from proposal data. |
| **M2 → M6** | Internal | Client info auto-populates. Client stats updated on invoice payment. |
| **M9 ← M6** | Internal | Invoice due dates appear on calendar. Overdue invoices flagged. |
| **M0 ← M6** | Internal | Overdue invoice count on dashboard (if > 0). |
| **M12 → M6** | Internal | Attach contracts/documents from Document Vault to invoice. |
| **WhatsApp** | External | `wa.me` deep link with invoice summary. |
| **Email (future)** | External | Send invoice as PDF attachment via Resend. |
| **Tap Payments (future)** | External | Generate payment link on invoice. Webhook marks invoice as paid. |
| **DeepSeek API** | External | AI payment reminder drafting, invoice description generation. |

#### M6.4 AI enhancement

**A. AI invoice description:**
DeepSeek generates a professional invoice description from the gig data:
```
Gig: { title, description, deliverables, amount_sar }
Client: { name, company }

Generate a professional invoice line-item description in Arabic + English.
Be specific about deliverables. Suitable for a Saudi business context.
```

**B. AI payment reminder drafting:**
When an invoice is overdue (7+ days past due date), the freelancer can tap "Generate payment reminder." DeepSeek drafts:
```
Invoice: { invoice_number, total_sar, due_date, days_overdue }
Client: { name, company, payment_history }
Freelancer's tone preference: { formal | balanced | friendly }

Generate a polite but firm payment reminder message in Saudi-polite Arabic.
- Reference the invoice number and amount
- Mention the due date and days overdue (gently)
- Provide payment details
- Offer to discuss if there are any issues
- 2-3 sentences maximum
- Ready to copy-paste into WhatsApp
```

Freelancer reviews and edits before sending. Not auto-sent.

---

### M7 — Methodology & Trust Hub

**Purpose:** A public-facing page (`/[locale]/methodology`) that explains exactly how Rizq produces its numbers. This is not marketing — it's the credibility surface. Every artifact links here. Every price citation references a specific section. AI-powered FAQ adds interactivity.

#### M7.1 Content structure (configuration-driven)

Content sections are stored in a table, not hardcoded:

```sql
methodology_sections (
  id              text PK,  -- 'how-we-collect', 'published-refs', 'open-data', etc.
  parent_id       text,     -- for nested sections
  sort_order      int NOT NULL,
  title_ar        text NOT NULL,
  title_en        text NOT NULL,
  content_ar      text NOT NULL,  -- Markdown
  content_en      text NOT NULL,  -- Markdown
  icon            text,     -- lucide icon name
  deep_link       text,     -- URL fragment: '#how-we-collect'
  last_updated    date,
  enabled         boolean DEFAULT true
);
```

Adding a new methodology section = INSERT a row. No page redesign.

#### M7.2 Room for improvement

- **Sections are database-driven.** Adding/updating/removing sections is content management, not code change.
- **Version history.** `methodology_sections` has a companion `methodology_sections_history` table. Every edit creates a historical version. "Last updated: [date]" per section.
- **Multi-language expansion.** The `title_ar`/`content_ar` + `title_en`/`content_en` pattern supports N languages by adding columns or a `methodology_translations` table.
- **SEO metadata per section.** Each section has `meta_description_ar`, `meta_description_en` for search engines. The methodology page is an SEO asset for "how are freelance prices calculated in Saudi."

#### M7.3 Integration

| Integration | Type | Description |
|---|---|---|
| **M1 → M7** | Internal | Every proposal artifact's provenance citation deep-links to the relevant methodology section. |
| **M4 → M7** | Internal | Every pricing result links to methodology. |
| **All modules → M7** | Internal | Anywhere a number is displayed with a methodology citation → deep link to M7. |
| **DeepSeek API** | External | AI FAQ answering. |

#### M7.4 AI enhancement

**AI FAQ:**
An "Ask about our methodology" section at the bottom of the page. The freelancer types a question in Arabic or English. DeepSeek answers based on the methodology content:

```
You are answering questions about Rizq's methodology. The user is a Saudi freelancer.
Rizq's methodology (the source of truth):
{full_methodology_content}

User question: {question}

Answer concisely in the user's language. If the answer is in the methodology, cite the specific section.
If the question is outside the scope of the methodology, say so honestly.
Never fabricate information. If unsure, say "هذا السؤال خارج نطاق المنهجية المنشورة."
```

---

### M8 — Onboarding (Deep Profile Builder)

**Purpose:** Onboarding is the single most important moment in the product. This is where Rizq learns who the freelancer is — not just their email, but their professional DNA. Every piece of data captured here powers personalization across the entire suite. A freelancer who completes onboarding should feel that Rizq already understands their business.

**Why it matters:** The v0.1 onboarding (email → city → specialty → tier) captured 10% of what matters. A freelancer's freelance license number (FL), their actual rates, their past project history, their income goals — this is the data that makes every module smarter. The pricing lookup is more accurate because it knows their tier. The proposal studio auto-fills their brand. The rate calculator benchmarks against their actual history. The HADAF tracker knows their Bahr status. Without deep onboarding, every module operates with one hand tied behind its back.

**Design philosophy:** Long enough to capture real depth. Short enough to complete in one sitting (target: 8-12 minutes). Every field justifies its existence by powering a specific module. No data is collected "just in case." Skip is available on non-critical steps but the product is genuinely better when they're completed. AI assistance throughout reduces friction — the freelancer shouldn't have to think hard about what to write.

#### M8.1 Extended user profile — the data model

The `users` table is extended significantly. Every field below feeds at least one module:

```sql
-- Extended users table (supersedes all previous user profile specs)
users (
  -- existing auth fields preserved
  id                  uuid PK,
  email               text UNIQUE NOT NULL,
  created_at          timestamptz DEFAULT now(),

  -- Identity & Compliance (Step 2)
  full_name_ar        text,                -- الاسم الثلاثي بالعربية
  full_name_en        text,                -- English transcription
  fl_number           text,                -- رقم وثيقة العمل الحر (Freelance License)
  fl_document_url     text,                -- uploaded وثيقة العمل الحر PDF/image
  fl_verified         boolean DEFAULT false, -- AI-verified or admin-reviewed
  fl_verified_at      timestamptz,
  commercial_reg      text,                -- سجل تجاري (optional, for registered businesses)
  vat_registered      boolean DEFAULT false,
  vat_number          text,                -- VAT registration number

  -- Professional Identity (Steps 3-4)
  primary_specialty_id  uuid FK → specialties.id,
  specialties           text[],              -- multi-select: ["graphic-design","logo-design","ui-ux-design"]
  experience_tier_id    uuid FK → experience_tiers.id,
  years_experience      int,                -- actual years (for rate calibration)
  city_id               uuid FK → cities.id,
  languages             text[] DEFAULT '{ar}', -- ['ar','en','both']

  -- Rate History (Step 5) — the most valuable data for personalization
  current_hourly_rate_sar    numeric,
  current_daily_rate_sar     numeric,
  current_project_rate_range jsonb,  -- { min_sar, max_sar, typical_sar, currency }
  previous_year_income_sar   numeric, -- التقريبي — approximate
  income_goal_monthly_sar    numeric, -- target monthly income
  rate_confidence            enum['exact','approximate','estimate'] DEFAULT 'approximate',

  -- Platform Presence (Step 6)
  bahr_profile_url     text,        -- بحر profile link
  mostaql_profile_url  text,        -- مستقل profile link
  khamsat_profile_url  text,        -- خمسات profile link
  linkedin_url         text,
  behance_url          text,        -- portfolio platform
  personal_website_url text,
  platform_ratings     jsonb,       -- { bahr: 4.5, mostaql: 4.8 } — manually entered

  -- Portfolio & Past Work (Step 7)
  portfolio_samples    jsonb,       -- [{ title_ar, description_ar, specialty_id, price_sar, client_name, year, image_urls[] }]
  total_projects_completed int,
  notable_clients      text[],      -- ["STC","وزارة الصحة","شركة المياه الوطنية"]

  -- Brand Identity (Step 8)
  brand_name           text,                -- freelancer's business name
  brand_name_ar        text,
  logo_url             text,                -- Supabase Storage URL
  brand_colors         jsonb,               -- { primary: '#1A5F3F', secondary: '#C8A951' } — optional, for artifact customization
  tagline_ar           text,                -- AI-suggested or custom
  tagline_en           text,
  bio_ar               text,                -- short professional bio (2-3 sentences)
  bio_en               text,

  -- Contact (Step 8)
  contact_email        text,                -- business email (may differ from login email)
  contact_phone        text,                -- 05XXXXXXXX
  contact_whatsapp     text,                -- if different from phone
  contact_city         text,                -- display city (free text)

  -- Business Defaults (Step 9)
  default_deposit_pct      int DEFAULT 50,
  default_revisions        int DEFAULT 2,
  default_ip_terms         enum['full_transfer','license','per_project'] DEFAULT 'full_transfer',
  default_milestone_structure jsonb DEFAULT '[{"pct":50,"trigger":"deposit"},{"pct":50,"trigger":"delivery"}]',
  default_payment_method   enum['bank_transfer','stc_pay','cash','other'] DEFAULT 'bank_transfer',
  default_payment_details  text,            -- IBAN / STC Pay number / etc.
  default_warranty_days    int DEFAULT 0,   -- e.g., 30 days post-delivery support

  -- Goals & Preferences (Step 10)
  primary_goal         enum['increase_income','stabilize_income','build_brand','track_finances','qualify_hadaf','find_clients'] DEFAULT 'increase_income',
  goals                text[],              -- multi-select from onboarding
  uses_bahr            boolean DEFAULT false,
  uses_mostaql         boolean DEFAULT false,
  uses_khamsat         boolean DEFAULT false,
  preferred_tone       enum['formal','balanced','friendly'] DEFAULT 'balanced',

  -- Onboarding metadata
  onboarding_step           int DEFAULT 0,  -- last completed step number
  onboarding_completed      boolean DEFAULT false,
  onboarding_completed_at   timestamptz,
  profile_completeness_pct  int DEFAULT 0,  -- computed: what % of non-skippable fields are filled
  profile_last_updated      timestamptz DEFAULT now(),

  -- RLS: self only (unchanged)
);
```

#### M8.2 Onboarding flow — 11 steps

Steps are configuration-driven via `onboarding_steps` table (same architecture as before, expanded). Each step has a clear purpose, the data it feeds, and AI assistance where it adds value.

```
Step 1:  Welcome & Language      (required, 30s)
Step 2:  Identity & FL Number    (required, 90s)
Step 3:  City & Location         (required, 30s)
Step 4:  Professional Profile    (required, 60s)
Step 5:  Rate History            (required, 120s)
Step 6:  Platform Presence       (optional, 60s)
Step 7:  Portfolio & Past Work   (optional, 120s)
Step 8:  Brand Identity          (skippable, 90s)
Step 9:  Business Defaults       (skippable, 60s)
Step 10: Goals & Preferences     (skippable, 30s)
Step 11: Review & Complete       (required, 30s)
```

**Target completion time: 8-12 minutes.** Required steps total ~5 minutes. Optional steps add depth.

---

**Step 1 — Welcome & Language (30 seconds)**

- **Purpose:** Set the tone, establish language preference.
- **UI:** Hero welcome in Arabic. "مرحباً بك في رِزق — منصة المستقل السعودي." Brief value prop: "خلال ١٠ دقائق، رِزق هيتعرف على عملك ويساعدك تدير رزقك."
- **Action:** Language toggle (AR/EN). This determines the language of all subsequent onboarding steps and the default app language.
- **AI:** None needed. Pure UX.

---

**Step 2 — Identity & FL Number (90 seconds, required)**

- **Purpose:** Capture the freelancer's legal identity. The FL number (وثيقة العمل الحر) is the Saudi government's freelancer credential. This sets Rizq apart from every other tool — it knows the freelancer is verified with the government.
- **Fields:**
  - Full name in Arabic (الاسم الثلاثي) — required
  - Full name in English — optional
  - FL number (رقم وثيقة العمل الحر) — required
  - FL document upload — drag-and-drop PDF/image of the actual وثيقة
- **AI enhancement — FL document validation:**
  DeepSeek (with vision if available, or text extraction via OCR library) scans the uploaded document:
  ```
  Analyze this Saudi Freelance Work Document (وثيقة العمل الحر).
  Extract: { full_name_ar, fl_number, issue_date, expiry_date, specialties[] }.
  Cross-reference: does the extracted FL number match the user-entered FL number?
  Does the extracted name match the user-entered name?
  Return: { extracted_data, matches_user_input: boolean, confidence, warnings[] }.
  ```
  If the AI detects mismatches, flag for admin review. If confident and matching, auto-set `fl_verified = true`. If the FL document contains an expiry date, surface it to M12 (Document Vault) and M9 (Calendar) for renewal reminders.
- **Data feeds:** `users.fl_number`, `users.fl_verified`, `users.full_name_ar`, `users.full_name_en`. FL verification badge displayed on proposals (trust signal). FL expiry tracked on M9 calendar. Document stored in M12 (Document Vault).
- **Why it matters:** An FL-verified freelancer profile carries weight. Proposals from FL-verified freelancers show a small "موثّق" badge. Buyers trust verified freelancers more. This is a moat — no other freelancer SaaS verifies government credentials.

---

**Step 3 — City & Location (30 seconds, required)**

- **Purpose:** Geographically ground the freelancer. Pricing varies by city. Client expectations vary by city.
- **UI:** City dropdown (Riyadh, Jeddah, Dammam, Khobar, Makkah, Medina, etc.). Map view optional.
- **AI:** None needed.
- **Data feeds:** `users.city_id`. Drives M4 pricing lookup (Riyadh rates ≠ Dammam rates). M1 proposal artifact includes freelancer's city. M10 rate calculator adjusts for city cost-of-living.

---

**Step 4 — Professional Profile (60 seconds, required)**

- **Purpose:** What do you do, and how long have you been doing it?
- **Fields:**
  - Primary specialty — single-select dropdown (required)
  - Additional specialties — multi-select checkboxes (optional, max 4 more)
  - Years of experience — number input (required, drives experience tier auto-selection)
  - Languages you work in — checkboxes: Arabic, English, Both (default: Arabic)
- **AI enhancement — specialty suggestion from FL document:**
  If the FL document was processed in Step 2 and contained specialties, pre-select those specialties. The user confirms or adjusts.
- **Data feeds:** `users.primary_specialty_id`, `users.specialties[]`, `users.years_experience`, `users.experience_tier_id`, `users.languages[]`. Drives M4 pricing (specialty × tier), M1 proposal studio (scope extraction considers specialties), M10 rate calculator (market comparison by specialty), M3 income ledger (AI category suggestion based on specialties), M0 dashboard (specialty-specific insights).

---

**Step 5 — Rate History (120 seconds, required)**

- **Purpose:** This is the most valuable data Rizq collects. Knowing what a freelancer actually charges — and what they want to charge — powers every pricing feature and makes the personal weighting in M1 actually work from day one.
- **Fields:**
  - Current hourly rate (SAR) — number input. "إذا ما تعرف، اتركه فاضي واحنا بنقترح." / "If you don't know, leave it empty — we'll suggest based on market data."
  - Current daily rate (SAR) — optional
  - Typical project rate range: min SAR, max SAR — slider or two inputs
  - Approximate income last year (SAR) — التقريبي. "تقريبي فقط — يساعدنا نقارن تطور دخلك." / "Approximate only — helps us track your income growth."
  - Monthly income target (SAR) — "كم تبغى تدخل شهرياً؟" / "What's your monthly income goal?"
  - Confidence in these rates — "These are:" Exact (from invoices) / Approximate (from memory) / Rough estimate
- **AI enhancement — rate reasonability check:**
  DeepSeek compares the freelancer's self-reported rates to M4 market data:
  ```
  Freelancer's self-reported rates:
  - Hourly: SAR {current_hourly_rate}
  - Project range: SAR {min} - SAR {max}
  - Specialty: {specialty_name_ar}, City: {city_name_ar}, Tier: {tier_name_ar} ({years} years)

  Market data for this profile:
  - Market hourly range: SAR {mkt_hourly_low} - {mkt_hourly_high}
  - Market project range: SAR {mkt_proj_low} - {mkt_proj_high}

  If the freelancer's rates are within ±30% of market: say nothing — they're in range.
  If significantly above market (>50%): acknowledge aspirational positioning gently.
  If significantly below market (>50%): flag as possible undercharging with specific data.
  Return: { is_in_range, deviation_pct, message_ar, message_en }.
  ```
  This is NOT a block. It's an insight shown during onboarding: "سعرك الحالي (١٠٠ ر.س/ساعة) أقل بـ ٤٠٪ من متوسط مصممي الجرافيك في الرياض (١٦٥ ر.س/ساعة). فكّر في رفع أسعارك — بيانات السوق تدعمك." The freelancer can adjust their rates or proceed.
- **Data feeds:** `users.current_hourly_rate_sar`, `users.current_project_rate_range`, `users.previous_year_income_sar`, `users.income_goal_monthly_sar`, `users.rate_confidence`. Powers M1 personal weighting (day-zero personalization, not zero on first use). M3 income tracking (baseline comparison — "You earned 15% more than your baseline this month"). M10 rate calculator (pre-fills targets). M0 dashboard (income goal progress). M4 pricing lookup (contextual — "Your rate is in the top 30% of Riyadh designers").

---

**Step 6 — Platform Presence (60 seconds, optional/skippable)**

- **Purpose:** Where do you find clients? This tells Rizq about your sourcing channels and feeds client source tracking.
- **Fields:**
  - Bahr profile URL (optional)
  - Mostaql profile URL (optional)
  - Khamsat profile URL (optional)
  - LinkedIn URL (optional)
  - Behance/portfolio URL (optional)
  - Personal website (optional)
  - Platform ratings — manual entry: "Your Bahr rating: ⭐⭐⭐⭐☆" (optional, self-reported, used for profile completeness)
- **AI enhancement — platform profile summary:**
  If the freelancer provides platform URLs, DeepSeek can attempt to scrape public profile data (name, rating, completed projects count) to pre-verify identity. This is a stretch feature — the public profile data is visible without authentication, but scraping is only done on explicit user-provided URLs during onboarding (one-shot, user-initiated, not automated recurring).
- **Data feeds:** `users.bahr_profile_url`, `users.mostaql_profile_url`, etc. Drives M2 client source tracking. M5 HADAF eligibility (knows if they use Bahr). M0 dashboard (platform presence summary).

---

**Step 7 — Portfolio & Past Work (120 seconds, optional/skippable)**

- **Purpose:** What have you built? Past projects provide context for pricing, credibility for the Rizq stamp, and content for proposal artifacts.
- **Fields:**
  - Total projects completed — number input. "تقريبي — كم مشروع أنجزت في مسيرتك؟"
  - Notable clients — free-text tags: "STC, وزارة الصحة, شركة المياه الوطنية" (optional, auto-suggest as they type)
  - Portfolio samples — add up to 10 entries, each with:
    - Project title (AR)
    - Description (AR, 1-2 sentences)
    - Specialty (dropdown)
    - Price charged (SAR, optional — "if you're comfortable sharing")
    - Client name (optional — "اسم العميل أو 'عميل سعودي'")
    - Year completed
    - Image upload(s) — up to 3 images per project
- **AI enhancement — portfolio narrative:**
  After the freelancer adds 3+ portfolio samples, DeepSeek generates a professional summary bio:
  ```
  Freelancer's portfolio: [{ title, description, specialty, price, client, year }]
  Freelancer's specialties: [{specialties}]
  Freelancer's experience: {years} years
  
  Generate a 2-3 sentence professional bio in Saudi-polite Arabic suitable for a proposal header.
  Highlight: specialties, notable projects, years of experience, notable clients if any.
  Example: "مصمم جرافيك سعودي متخصص في الهويات البصرية وتصميم الشعارات. ٧ سنوات خبرة مع أكثر من ٢٠٠ مشروع لعلامات تجارية سعودية وعالمية."
  ```
  Stored in `users.bio_ar`. Also generates an English version. Shown in Step 8 for the freelancer to approve/edit.
- **Data feeds:** `users.portfolio_samples[]`, `users.total_projects_completed`, `users.notable_clients[]`, `users.bio_ar`, `users.bio_en`. Powers M1 proposal studio (auto-included portfolio samples in artifact if relevant). M0 dashboard (experience showcase). Credibility: total projects count shown on public-facing surfaces.

---

**Step 8 — Brand Identity (90 seconds, skippable)**

- **Purpose:** How should your proposals look? This is the freelancer's business card inside Rizq. Every proposal, invoice, and share link carries this brand.
- **Fields:**
  - Business/brand name — defaults to user's full name, editable (optional)
  - Logo upload — drag-and-drop, preview with circular crop (optional)
  - Brand colors — color pickers for primary + secondary (optional, defaults to Rizq palette)
  - Professional tagline in Arabic — AI-suggested (3 options) or custom
  - Professional tagline in English — optional
  - Professional bio — pre-filled from Step 7 AI generation, editable (optional)
  - Contact: business email, phone, WhatsApp, display city
- **AI enhancement — tagline generator (from Step 7 bio):**
  DeepSeek generates 3 tagline options based on the portfolio bio:
  ```
  Freelancer's bio: {bio_ar}
  Freelancer's specialties: [{specialties_ar}]
  Freelancer's city: {city_ar}

  Generate 3 short Arabic taglines (under 8 words each).
  Styles: one formal, one creative, one warm/Saudi-polite.
  ```
- **AI enhancement — logo feedback (optional):**
  If the freelancer uploads a logo, DeepSeek can provide simple feedback: "Your logo appears to be low resolution — it may appear blurry on PDFs. Recommended: 500×500px minimum." This is a quality-of-life feature, not a gate.
- **Data feeds:** `users.brand_name`, `users.logo_url`, `users.brand_colors`, `users.tagline_ar`, `users.tagline_en`, `users.bio_ar`, `users.bio_en`, `users.contact_*`. Powers M1 proposal studio (brand block on every artifact), M6 invoicing (invoice header), M0 dashboard (personalized greeting), public share pages.

---

**Step 9 — Business Defaults (60 seconds, skippable)**

- **Purpose:** Set your standard terms once. Every proposal pre-fills with these. Change per-proposal when needed.
- **Fields:**
  - Default deposit percentage: 25% / 50% (recommended, halal) / 75% / 100% upfront
  - Default revision rounds: 1 / 2 (recommended) / 3 / Unlimited
  - Default IP terms: Full transfer on final payment / License only / Per-project decision
  - Default milestone structure: 50/50 (default) / 25/25/50 / 33/33/34 / Custom
  - Default payment method: Bank Transfer / STC Pay / Cash / Other
  - Default payment details: IBAN number or STC Pay number (encrypted at rest)
  - Default post-delivery warranty: None / 7 days / 14 days / 30 days
- **AI:** None needed. Pure configuration.
- **Data feeds:** `users.default_deposit_pct`, `users.default_revisions`, `users.default_ip_terms`, `users.default_milestone_structure`, `users.default_payment_method`, `users.default_payment_details`, `users.default_warranty_days`. Powers M1 proposal studio (pre-filled terms on every proposal). M6 invoicing (payment details pre-filled on every invoice).

---

**Step 10 — Goals & Preferences (30 seconds, skippable)**

- **Purpose:** What do you want Rizq to help with? This shapes the dashboard, prioritizes features, and sets the tone.
- **Fields:**
  - Primary goal: Increase income / Stabilize income / Build my brand / Track my finances / Qualify for HADAF / Find more clients
  - Goals (multi-select): Track my income, Price my services better, Create professional proposals, Track HADAF eligibility, Manage my clients, All of the above
  - Preferred communication tone: Formal / Balanced / Friendly (drives AI-generated message tone)
  - Do you currently use Bahr? Yes / No (drives HADAF module prominence)
  - Do you currently use Mostaql/Khamsat? Yes / No
- **Data feeds:** `users.primary_goal`, `users.goals[]`, `users.preferred_tone`, `users.uses_bahr`. Powers M0 dashboard (widget prominence and ordering), M2 client follow-up message tone, M1 proposal tone default, M5 HADAF module visibility.

---

**Step 11 — Review & Complete (30 seconds, required)**

- **Purpose:** Show the freelancer what Rizq now knows about them. Give them a chance to review and edit anything before entering the app.
- **UI:** A scrollable summary of all collected data, organized by section. Each section has an "Edit" button that jumps back to that step. A "Profile completeness" score (e.g., "86% complete — add your portfolio to reach 95%").
- **Completion:** "أهلًا بك في رِزق — كل شيء جاهز. المنصة الآن تفهم عملك وبتساعدك تدير رزقك." / "Welcome to Rizq — everything is ready. The platform now understands your business."
- **CTA:** "الدخول إلى المنصة" / "Enter Rizq" → M0 Dashboard.

#### M8.3 Profile completeness scoring

A computed field `users.profile_completeness_pct` is calculated as:

```
Required fields (70% of score):
  full_name_ar, fl_number, fl_verified, primary_specialty_id, city_id, years_experience,
  current_hourly_rate_sar OR current_project_rate_range, income_goal_monthly_sar

Optional fields (30% of score):
  portfolio_samples (≥3 = full credit), brand_name + logo_url, platform URLs (≥1 = full credit),
  notable_clients, bio_ar, previous_year_income_sar, fl_document_url
```

Displayed on the dashboard as a subtle progress indicator: "ملفك مكتمل ٨٦٪ — أضف معرض أعمالك" with a CTA to return to onboarding settings.

#### M8.4 How onboarding data feeds every module

This is the integration map. Every field collected has a destination:

| Onboarding Step | Data Collected | Modules Powered |
|---|---|---|
| Step 2 — Identity & FL | `fl_number`, `fl_verified`, `fl_document_url`, `full_name_ar` | M1 (verified badge on proposals), M12 (document vault), M9 (expiry reminders) |
| Step 3 — City | `city_id` | M4 (city-specific pricing), M1 (proposal header), M10 (cost-of-living adjustment) |
| Step 4 — Professional | `primary_specialty_id`, `specialties[]`, `years_experience`, `experience_tier_id`, `languages[]` | M4 (pricing resolution), M1 (scope extraction considers specialties), M3 (category suggestion), M10 (market benchmarking) |
| Step 5 — Rates | `current_hourly_rate_sar`, `current_project_rate_range`, `previous_year_income_sar`, `income_goal_monthly_sar` | M1 (personal weighting starts at 0.3 instead of 0.1 — day-zero personalization), M3 (baseline comparison), M10 (pre-filled targets), M0 (income goal tracking) |
| Step 6 — Platforms | `bahr_profile_url`, `mostaql_profile_url`, etc. | M2 (client source tracking), M5 (HADAF eligibility awareness), M0 (platform presence widget) |
| Step 7 — Portfolio | `portfolio_samples[]`, `total_projects_completed`, `notable_clients[]`, `bio_ar` | M1 (portfolio attachment to proposals), M0 (experience showcase), M7 (credibility — "200+ projects completed") |
| Step 8 — Brand | `brand_name`, `logo_url`, `brand_colors`, `tagline_ar`, `contact_*` | M1 (proposal artifact branding), M6 (invoice header), M0 (personalized greeting), public share pages |
| Step 9 — Defaults | `default_deposit_pct`, `default_revisions`, `default_ip_terms`, `default_milestone_structure`, `default_payment_*` | M1 (pre-filled proposal terms), M6 (pre-filled invoice payment details) |
| Step 10 — Goals | `primary_goal`, `goals[]`, `preferred_tone`, `uses_bahr` | M0 (dashboard widget priority), M2 (follow-up message tone), M1 (proposal tone default), M5 (HADAF module visibility) |

#### M8.5 Room for improvement

- **Steps are database-driven** via `onboarding_steps` table. Adding/removing/reordering steps = UPDATE query. No onboarding flow refactor.
- **A/B testing.** Steps can have variant columns for split-testing different flows, copy, or field ordering.
- **Progressive profiling.** Fields not collected during onboarding can be prompted later via in-app tooltips: "We noticed you haven't set your brand logo. Add it to make your proposals look more professional."
- **Import from platforms.** Future: "Import my profile from Bahr/Mostaql" — one-click profile population from public platform data (one-shot, user-initiated).
- **Returning user re-onboarding.** If a user skipped steps, a "Complete your profile" banner appears on the dashboard with the specific missing steps.
- **FL verification pipeline.** Currently AI-assisted + admin review. Future: direct API integration with the freelance.sa platform for real-time FL validation.

#### M8.6 Integration

| Integration | Type | Description |
|---|---|---|
| **M1 ← M8** | Internal | Brand block, business defaults, portfolio samples feed every proposal. FL verification badge on proposal. |
| **M4 ← M8** | Internal | Specialty, city, tier, rates pre-fill and contextualize pricing lookup. |
| **M3 ← M8** | Internal | Rate history used as baseline. Category suggestion informed by specialties. |
| **M10 ← M8** | Internal | Income goal, rates, specialty, city pre-fill rate calculator. |
| **M0 ← M8** | Internal | Goals determine widget prominence. Profile completeness shown on dashboard. |
| **M5 ← M8** | Internal | `uses_bahr` determines HADAF module visibility and default settings. |
| **M2 ← M8** | Internal | `preferred_tone` drives AI follow-up message style. Platform URLs feed client source defaults. |
| **M12 ← M8** | Internal | FL document, portfolio images stored in Document Vault. |
| **M9 ← M8** | Internal | FL expiry date (if detected) appears on calendar with renewal reminder. |
| **M7 ← M8** | Internal | Total projects completed, notable clients, verification status cited on methodology/credibility pages. |
| **DeepSeek API** | External | FL document validation, rate reasonability check, portfolio bio generation, tagline generation, logo quality feedback. |
| **Supabase Storage** | External | FL document upload, logo upload, portfolio image uploads. |

#### M8.7 AI enhancement summary

| AI Feature | When | What It Does |
|---|---|---|
| **FL document validation** | Step 2 | Extracts name, FL number, issue/expiry dates from uploaded وثيقة. Cross-references with user-entered data. |
| **Specialty pre-fill** | Step 4 | If FL document contained specialties, pre-selects them. |
| **Rate reasonability check** | Step 5 | Compares self-reported rates to M4 market data. Suggests adjustment if significantly off-market. |
| **Portfolio bio generation** | Step 7 | Generates a 2-3 sentence professional bio from portfolio samples. |
| **Tagline generation** | Step 8 | Generates 3 tagline options in three styles (formal, creative, warm). |
| **Logo quality feedback** | Step 8 | Warns if uploaded logo is low resolution for PDF output. |
| **Profile completeness nudges** | Post-onboarding | AI analyzes missing fields and suggests next-best actions: "Add 3 portfolio samples to make your proposals 40% more credible." |

---


### M9 — Calendar & Deadlines

**Purpose:** A unified calendar that auto-populates from every module — proposals, gigs, invoice due dates, client follow-ups. Zero data entry. Read-only over existing data. AI scheduling insights. Hijri support.

**Why it matters:** Saudi freelancers track deadlines in their head or a phone calendar that doesn't know about clients, gigs, or proposals. A unified calendar that auto-populates from the suite is a genuine workflow improvement at near-zero cost. Every module feeds it. It's the ultimate cross-module integration surface.

#### M9.1 Data model

Calendar events are a **view**, not a table. No new writes — the calendar aggregates from existing module tables:

```sql
CREATE VIEW calendar_events AS
-- Proposal deadlines
SELECT
  p.id AS event_id,
  'proposal_deadline' AS event_type,
  p.user_id,
  p.client_id,
  p.delivery_date AS event_date,  -- from scope_json
  p.title AS title_ar,
  p.title AS title_en,  -- fallback
  p.status,
  'proposal' AS source_module,
  p.id AS source_id,
  jsonb_build_object('proposal_id', p.id, 'status', p.status) AS metadata
FROM proposals p
WHERE p.delivery_date IS NOT NULL AND p.status NOT IN ('declined', 'expired')

UNION ALL

-- Gig delivery dates
SELECT
  g.id AS event_id,
  'gig_delivery' AS event_type,
  g.user_id,
  g.client_id,
  g.delivery_date AS event_date,
  g.title AS title_ar,
  g.title AS title_en,
  g.status,
  'gig' AS source_module,
  g.id AS source_id,
  jsonb_build_object('gig_id', g.id, 'status', g.status, 'amount_sar', g.amount_sar) AS metadata
FROM gigs g
WHERE g.delivery_date IS NOT NULL AND g.status != 'cancelled'

UNION ALL

-- Invoice due dates
SELECT
  i.id AS event_id,
  'invoice_due' AS event_type,
  i.user_id,
  i.client_id,
  i.due_date AS event_date,
  'فاتورة: ' || i.invoice_number AS title_ar,
  'Invoice: ' || i.invoice_number AS title_en,
  i.status,
  'invoice' AS source_module,
  i.id AS source_id,
  jsonb_build_object('invoice_id', i.id, 'total_sar', i.total_sar, 'status', i.status) AS metadata
FROM invoices i
WHERE i.due_date IS NOT NULL AND i.status NOT IN ('paid', 'cancelled')

UNION ALL

-- Client follow-up reminders (AI-generated)
SELECT
  c.id AS event_id,
  'client_followup' AS event_type,
  c.user_id,
  c.id AS client_id,
  (c.last_contacted_at + INTERVAL '30 days') AS event_date,
  'متابعة: ' || c.name AS title_ar,
  'Follow-up: ' || COALESCE(c.name_en, c.name) AS title_en,
  'active' AS status,
  'client' AS source_module,
  c.id AS source_id,
  jsonb_build_object('client_id', c.id, 'last_contacted', c.last_contacted_at, 'days_since', EXTRACT(DAY FROM (NOW() - c.last_contacted_at))) AS metadata
FROM clients c
WHERE c.last_contacted_at IS NOT NULL
  AND c.last_contacted_at < (NOW() - INTERVAL '30 days')
  AND c.is_active = true;
```

#### M9.2 Calendar preferences

```sql
calendar_preferences (
  user_id           uuid PK FK → users.id,
  default_view      enum['month','week','agenda'] DEFAULT 'month',
  show_hijri        boolean DEFAULT false,
  enabled_sources   jsonb DEFAULT '["proposal","gig","invoice","client_followup"]',
  working_days      int[] DEFAULT '{0,1,2,3,4}',  -- Sunday-Thursday (Saudi work week)
  working_hours_start time DEFAULT '08:00',
  working_hours_end   time DEFAULT '17:00',
  updated_at        timestamptz DEFAULT now()
);
```

#### M9.3 UX specification

**Month view (primary):**
- Saudi work week: Sunday-Saturday. Weekends: Friday-Saturday (highlighted differently).
- Hijri date shown alongside Gregorian if `show_hijri` is enabled.
- Event dots on days: color-coded by module. Blue = proposal, green = gig, orange = invoice, purple = client follow-up.
- Tap a day → agenda list for that day below the calendar.
- Tap an event → navigate to its source module.

**Agenda view:**
- Chronological list of all upcoming events.
- Grouped by: Today, Tomorrow, This Week, Next Week, Later.
- Each event shows: type icon, title, client name, date, status badge, amount (if applicable).
- Swipe actions: Mark complete, Snooze (reschedule reminder).

**Week view:**
- Horizontal scroll on mobile.
- Time grid on desktop.

**AI scheduling insights card (above calendar):**
- "لديك ٣ مواعيد تسليم هذا الأسبوع — أعلى من معدلك بـ ٤٠٪"
- "اليوم ١٥ يونيو — قبل إجازة عيد الأضحى بيوم واحد"

#### M9.4 Room for improvement

- **Event sources are pluggable.** The `calendar_events` view is a UNION of module-specific sub-views. Adding a new event source = add a new UNION branch. Modules auto-register as calendar event providers.
- **External calendar sync.** Future: iCal (.ics) export, Google Calendar / Apple Calendar sync via CalDAV. The calendar events view produces standard iCal format.
- **Saudi public holidays.** Future: overlay official Saudi public holidays (National Day, Eid Al-Fitr, Eid Al-Adha, Founding Day) from a public API. Stored in a `saudi_holidays` table, updated annually.
- **Custom events.** Future: allow freelancers to add personal events (meetings, personal deadlines) to the calendar. Stored in a `custom_events` table, merged into the view.

#### M9.5 Integration

| Integration | Type | Description |
|---|---|---|
| **M1 → M9** | Internal | Proposal delivery dates + expiry dates. |
| **M3 → M9** | Internal | Gig delivery dates + payment due dates. |
| **M6 → M9** | Internal | Invoice due dates. |
| **M2 → M9** | Internal | Client follow-up reminders (30 days after last contact). |
| **M5 → M9** | Internal | HADAF end-of-month deadline. |
| **M0 ← M9** | Internal | Upcoming deadlines widget on dashboard. |
| **Um Al-Qura calendar** | External | Hijri date conversion API (Saudi official calendar). |
| **Saudi public holidays** | External | Annual holiday data (National Day, Eid dates). |
| **DeepSeek API** | External | AI scheduling insights. |

#### M9.6 AI enhancement

**AI scheduling insights:**
DeepSeek analyzes the upcoming week/month and generates contextual observations:
```
Freelancer's calendar for the period {date_range}:
- Events: [{ type, title, date, status }]
- Workload compared to last 3 months: {current_events_count} vs avg {avg_events_count}
- Upcoming Saudi holidays: [{ name, date }]
- Days with 3+ events: [{ date, event_count }]

Generate 2-3 actionable scheduling insights in Saudi-polite Arabic:
- Flag heavy days: "يوم الثلاثاء ٣ مواعيد تسليم — هل تحتاج تأجيل أحدها؟"
- Flag holiday conflicts: "موعد التسليم ١٥ يونيو قبل عيد الأضحى بيوم — هل العميل متاح؟"
- Flag gaps: "لا يوجد مواعيد تسليم بين ١٠-١٨ يونيو — فرصة لقبول مشاريع جديدة."
- Be specific with dates and event names.
- Never create false urgency.
```

---

### M10 — Rate Calculator

**Purpose:** Reverse pricing. The freelancer says "I want to earn SAR 10,000/month" — the calculator tells them what hourly/daily/project rate they need, benchmarked against market data from M4.

**Why it matters:** This is the question BEFORE "what should I charge for this gig?" — it's "what do I need to charge to make this sustainable?" Currently no tool answers this for Saudi freelancers. It also serves as a reality check: "Your target rate is in the top 30% of Riyadh designers — is your portfolio there yet?"

#### M10.1 Data model

No dedicated table needed. The calculator is a pure function over M4 data + user inputs. Preferences stored in `users`:

```sql
-- Add to users table:
rate_calculator_defaults (
  user_id               uuid PK FK → users.id,
  monthly_target_sar    numeric,
  working_days_per_month int DEFAULT 22,
  hours_per_day          int DEFAULT 6,  -- billable hours, not working hours
  specialty_id           uuid FK → specialties.id,
  city_id                uuid FK → cities.id,
  experience_tier_id     uuid FK → experience_tiers.id,
  updated_at             timestamptz DEFAULT now()
);
```

#### M10.2 Calculator logic

```ts
function calculateRate(input: RateCalculatorInput, marketData: PricingResult): RateCalculatorOutput {
  const monthlyTarget = input.monthly_target_sar;
  const workingDays = input.working_days_per_month;
  const billableHoursPerDay = input.hours_per_day;
  const totalBillableHours = workingDays * billableHoursPerDay;

  // Core calculation
  const hourlyRate = monthlyTarget / totalBillableHours;
  const dailyRate = hourlyRate * billableHoursPerDay;
  const perProjectRate = monthlyTarget / input.projects_per_month_target;

  // Market percentiles
  const marketPercentile = calculateMarketPercentile(perProjectRate, marketData);
  const marketContext = generateMarketContext(marketPercentile, marketData);

  return {
    hourly_rate: roundSar(hourlyRate),
    daily_rate: roundSar(dailyRate),
    per_project_rate: roundSar(perProjectRate),
    projects_needed_per_month: input.projects_per_month_target,
    market_percentile: marketPercentile,
    market_context_ar: marketContext.ar,
    market_context_en: marketContext.en,
    is_realistic: marketPercentile <= 90,  // flag if target requires top 10% rates
    suggestion_ar: generateSuggestion(marketPercentile).ar,
    suggestion_en: generateSuggestion(marketPercentile).en,
  };
}
```

#### M10.3 Room for improvement

- **Calculator inputs are extensible.** The `RateCalculatorInput` type supports additional parameters without changing the core formula.
- **Market context is pluggable.** The `generateMarketContext` function can be swapped for AI-generated context (see M10.6).
- **Savings goal integration.** Future: "I want to save SAR 50,000 this year for [goal]" → calculator adjusts monthly target.
- **Multi-specialty.** Future: rate comparison across specialties. "As a designer you need SAR 200/hr. As a developer you'd need SAR 150/hr."

#### M10.4 Integration

| Integration | Type | Description |
|---|---|---|
| **M4 → M10** | Internal | Market medians from `resolvePrice` for benchmarking. |
| **M8 → M10** | Internal | Specialty, city, tier from onboarding pre-fill calculator. |
| **M3 → M10** | Internal | Actual income history used to calibrate targets. "You're currently earning SAR 8,200/month. To reach SAR 10,000: ..." |
| **DeepSeek API** | External | AI market positioning narrative. |

#### M10.5 AI enhancement

**AI market positioning narrative:**
DeepSeek generates a human-readable analysis of where the freelancer's target rate sits in the market:
```
Freelancer's target: SAR {target_rate} per project
Market data for {specialty} in {city} ({tier}):
- 10th percentile: SAR {p10}
- 50th percentile: SAR {p50}
- 90th percentile: SAR {p90}
- Sample: {sample_size} comparable projects

Freelancer's history: {monthly_avg} SAR/month over {gig_count} gigs

Generate a 2-3 sentence narrative in Saudi-polite Arabic:
- Where their target sits: "سعرك المستهدف (٣,٥٠٠ ر.س) في أعلى ٣٠٪ من مصممي الجرافيك في الرياض."
- Honest assessment: "هذا السعر طموح ويتطلب محفظة أعمال قوية. معظم المصممين في مستواك يتقاضون ٢,٠٠٠-٣,٠٠٠ ر.س."
- Encouragement grounded in data: "إذا رفعت سعرك من ٢,٥٠٠ إلى ٣,٥٠٠ ر.س، ستحتاج ٣ مشاريع شهرياً للوصول إلى هدفك (١٠,٠٠٠ ر.س)."
- Never discourage. Never over-promise.
```

---

### M12 — Document Vault

**Purpose:** Encrypted document storage for important freelance documents: وثيقة العمل الحر, commercial registration, tax certificates, portfolio releases, client NDAs. AI categorization + expiry detection.

**Why it matters:** Freelancers store important documents in phone file managers or WhatsApp "saved messages." A secure, organized vault within the suite they already use creates retention and trust.

#### M12.1 Data model

```sql
documents (
  id              uuid PK DEFAULT gen_random_uuid(),
  user_id         uuid FK → users.id NOT NULL,
  client_id       uuid FK → clients.id,  -- nullable (client-specific documents)

  -- Identity
  title_ar        text NOT NULL,
  title_en        text,
  description_ar  text,

  -- File
  file_path       text NOT NULL,  -- Supabase Storage path
  file_name       text NOT NULL,  -- original filename
  file_size       int NOT NULL,   -- bytes
  file_type       text NOT NULL,  -- 'application/pdf', 'image/png', etc.
  storage_bucket  text DEFAULT 'documents',  -- private bucket

  -- AI categorization
  category        text,           -- 'freelance_doc', 'commercial_reg', 'tax_cert', 'contract', 'portfolio', 'other'
  category_auto   text,           -- AI-suggested category
  category_confidence numeric,    -- 0..1

  -- AI expiry detection
  expiry_date     date,           -- extracted from document content
  expiry_detected_by enum['manual','ai'] DEFAULT 'manual',
  reminder_days_before int DEFAULT 30,  -- remind N days before expiry

  -- Sharing
  share_token     text UNIQUE,
  share_expires_at timestamptz,   -- time-limited sharing
  share_view_count int DEFAULT 0,

  -- Tags
  tags            text[],         -- user-defined

  -- Lifecycle
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  deleted_at      timestamptz,    -- soft delete

  -- RLS: owner CRUD only; shared documents: public SELECT when share_token active + not expired
);
```

#### M12.2 Room for improvement

- **Document categories are config-driven.** Category list in a `document_categories` table. Adding a new category = INSERT.
- **Storage backends are pluggable.** Currently Supabase Storage. The storage adapter interface supports S3, Cloudflare R2, etc.
- **OCR content search.** Future: extract text from PDFs/images (using DeepSeek vision or a dedicated OCR API) and store in a `document_content` table with full-text search. The extraction pipeline is separate from the document CRUD.
- **Document linking.** Future: link documents to proposals, gigs, invoices. "Attach this NDA to the proposal." The `documents` table already supports this via `client_id` and an extensible `linked_entity` pattern.

#### M12.3 Integration

| Integration | Type | Description |
|---|---|---|
| **M8 → M12** | Internal | Onboarding: وثيقة العمل الحر upload → stored in Document Vault. |
| **M2 → M12** | Internal | Client-specific documents (contracts, NDAs) linked to client. |
| **M1 → M12** | Internal | Attach portfolio samples or terms documents to proposals. |
| **M6 → M12** | Internal | Attach contracts to invoices. |
| **Supabase Storage** | External | Encrypted document storage. Private bucket. Signed URL access. |
| **DeepSeek API** | External | AI document categorization + expiry date extraction. |

#### M12.4 AI enhancement

**A. AI document categorization:**
On document upload, DeepSeek analyzes the filename and (if PDF) extracted text:
```
Document filename: {filename}
Document type: {file_type}
Extracted text (first 500 chars): {extracted_text}

Categorize this document: freelance_doc, commercial_reg, tax_cert, contract, portfolio, nda, other.
Return: { category, confidence }.
```

Shown as a suggestion chip: "تصنيف مقترح: وثيقة عمل حر ✓" — tap to accept.

**B. AI expiry detection:**
For documents that may contain expiry dates (commercial registration, freelance work document, tax certificates), DeepSeek analyzes the content:
```
Document text: {extracted_text}
Document category: {category}

Extract any expiry date if present. Saudis use Gregorian calendar primarily.
Look for patterns like: "تاريخ الانتهاء", "ينتهي في", "صلاحية", "valid until", "expiry date".
Return: { expiry_date: string | null, confidence: number }.
```

If detected, the document card shows: "تنتهي الصلاحية في ١٥ يوليو ٢٠٢٧" with a reminder badge. Auto-reminder 30 days before expiry (configurable).

---

## Part IV — Monetization & Tiers

### §IV.1 Tier structure

| | Free | Pro (SAR 49/mo) |
|---|---|---|
| **Proposal Studio (M1)** | 2 proposals/month | 30 proposals/month |
| **Proposal AI tone adjustment** | 3 uses/month | Unlimited |
| **Client Book (M2)** | 10 clients | Unlimited clients |
| **Client AI insights** | — | Included |
| **Income Ledger (M3)** | 20 gigs/month | Unlimited gigs |
| **Income AI forecasting** | — | Included |
| **Simple Invoicing (M6)** | 3 invoices/month | 30 invoices/month |
| **Pricing Lookup (M4)** | 5 lookups/month | Unlimited |
| **Pricing AI trends** | — | Included |
| **HADAF Dashboard (M5)** | Included | Included |
| **Calendar & Deadlines (M9)** | Included | Included |
| **Calendar AI insights** | — | Included |
| **Rate Calculator (M10)** | Included | Included |
| **Document Vault (M12)** | 10 documents | 50 documents |
| **Document AI categorization** | Included | Included |
| **Methodology (M7)** | Included | Included |
| **Proposal branding** | Rizq default branding | Custom logo + brand block |
| **Proposal PDF export** | Watermarked "Created with Rizq Free" | Clean, freelancer-branded |
| **CSV export (M3)** | — | Monthly income CSV |
| **Priority support** | Community (future) | Email support |

**Anonymous:** 1 lifetime pricing lookup (M4 only). No access to other modules. SEO funnel entry.

**Annual:** SAR 490/year (2 months free). Identical features to Pro.

### §IV.2 Why this works

- **Free tier is genuinely useful** but capacity-constrained. A freelancer with 2 clients and 3 gigs/month gets full value including AI features (categorization, expiry detection, basic insights).
- **AI is not paywalled entirely.** Core AI features (scope extraction, document categorization, follow-up message drafting) are available on Free. Advanced AI (forecasting, trends, business insights) is Pro. This lets Free users experience AI value.
- **Pro unlocks volume + depth.** More proposals, clients, gigs, invoices + AI analytics that help scale a freelance business.
- **The upgrade trigger is natural:** "You've created 2 proposals this month. Upgrade to Pro for 30 proposals/month + AI income forecasting + custom branding."

---

## Part V — Data Model Consolidation

### §V.1 Full schema

```
users (existing, extended)
  + brand_name, logo_url, contact_email, contact_phone, contact_whatsapp
  + tagline_ar, default_deposit_pct, default_revisions, default_ip_terms
  + specialties (text[]), onboarding_completed (boolean)
  + rate_calculator_defaults (jsonb)

specialties (existing)
cities (existing)
experience_tiers (existing)

benchmark_records (existing, extended)
  + provenance, source_ref, captured_at, confidence, collector_id

collector_registry (NEW)
ingestion_runs (NEW)

price_trends (NEW)

proposals (NEW)
proposal_templates (NEW)
proposal_versions (NEW)
proposal_share_events (NEW)
follow_up_question_templates (NEW)

clients (NEW)
  + ai_notes, client_persona, follow_up_priority, next_action_suggestion
client_timeline (NEW)

gigs (NEW)
  + ai_anomaly_flag, ai_anomaly_reason, ai_category_confidence
income_projections (NEW)

invoices (NEW)

hadaf_rules_config (NEW)
hadaf_preferences (NEW)
hadaf_status_cache (NEW)

dashboard_preferences (NEW)
widget_registry (NEW)

calendar_preferences (NEW)
methodology_sections (NEW)
onboarding_steps (NEW)

documents (NEW)
document_categories (NEW)

-- Existing tables preserved:
pricing_submissions
queries (rename to price_lookups)
subscriptions (extend for new tiers)
payment_events
waitlist

-- Views:
client_gig_summary
monthly_income
income_rolling_avg
calendar_events
hadaf_eligibility_feed
```

### §V.2 Enum types

```sql
enum_benchmark_provenance: 'published_ref' | 'ingested' | 'partner' | 'submitted' | 'reasoned'
enum_proposal_status: 'draft' | 'final' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired'
enum_gig_status: 'pending' | 'deposit_paid' | 'in_progress' | 'delivered' | 'paid' | 'overdue' | 'cancelled'
enum_invoice_status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
enum_client_type: 'individual' | 'smb' | 'corporate' | 'government' | 'agency'
enum_payment_method: 'bank_transfer' | 'stc_pay' | 'cash' | 'other'
enum_brief_channel: 'paste' | 'whatsapp_forward' | 'email_forward'
enum_ingestion_status: 'running' | 'completed' | 'failed'
enum_trend_direction: 'up' | 'down' | 'stable'
enum_tier: 'anonymous' | 'free' | 'pro' | 'admin'
enum_tone: 'formal' | 'balanced' | 'friendly' | 'persuasive'
enum_follow_up_priority: 'low' | 'medium' | 'high'
enum_calendar_view: 'month' | 'week' | 'agenda'
```

### §V.3 RLS summary

| Table | Read | Write |
|---|---|---|
| `users` | self only | self only |
| `benchmark_records` | all (active, verified) | admin only |
| `collector_registry` | admin only | admin only |
| `ingestion_runs` | admin only | system |
| `price_trends` | all | system |
| `proposals` | owner + public (if shared) | owner |
| `proposal_templates` | owner | owner |
| `clients` | owner | owner |
| `gigs` | owner | owner |
| `invoices` | owner + public (if shared) | owner |
| `documents` | owner + public (if shared + not expired) | owner |
| `dashboard_preferences` | owner | owner |
| `calendar_preferences` | owner | owner |
| `hadaf_preferences` | owner | owner |
| `hadaf_rules_config` | all (read-only) | admin only |
| `onboarding_steps` | all (read-only) | admin only |
| `methodology_sections` | all (read-only) | admin only |
| `widget_registry` | all (read-only) | admin only |

---

## Part VI — Build Sequence (Dependency-Ordered — No Deadlines)

Build is AI-coder-led, best-effort, no SLA. Phases exist only because each unblocks the next. Work through them in order. Nothing ships mid-way — the product goes live when all phases are complete and founder signs off.

### How to read this for an AI coder

Each phase lists:
- **Prerequisites** — what must exist before starting
- **Tasks** — the concrete work items, numbered for reference
- **Exit gate** — the testable condition that proves the phase is done

Work through tasks sequentially within a phase. Do not start the next phase until the current phase's exit gate is met. Unit-test logic as you go. When stuck on an external dependency or ambiguous decision, flag the founder — do not guess.

### Phase 1 — Data Foundation (Weekend 1-2)

| Task | Description |
|---|---|
| 1.1 | Extend `benchmark_records` with provenance, source_ref, captured_at, confidence, collector_id. Migration. |
| 1.2 | Build `collector_registry` table + Collector interface. |
| 1.3 | Build Collector 1: curate published-reference anchor table. 12 specialties × 5 tiers. One pass. |
| 1.4 | Build Collector 3: LLM-reasoned constrained prior (DeepSeek) for gap cells. Boxed by C1. |
| 1.5 | Build `resolvePrice` with provenance weighting, freshness decay, fallback widening. |
| 1.6 | Wire honesty citations — every `resolvePrice` output includes `dominant_provenance` + citation string + source list + confidence_score. |
| 1.7 | Build `ingestion_runs` + observability for collectors. |
| 1.8 | Unit-test `resolvePrice` against hand-built fixtures (5 specialties × 3 scenarios each). |
| 1.9 | Collector 2 (Saudi Open Data adapter) — stretch goal. |

**Exit gate:** `resolvePrice` returns real, cited numbers for all 12 × 5 × 5 cells. Spot-check 5 random cells against Qemma 2026 ranges.

### Phase 2 — Proposal Studio M1 (Weekend 3-5)

| Task | Description |
|---|---|
| 2.1 | Create `proposals`, `proposal_templates`, `proposal_versions`, `proposal_share_events`, `follow_up_question_templates` tables. RLS. Indexes. |
| 2.2 | Build scope extraction: DeepSeek + Vercel AI SDK `generateObject` + Zod schema. Server action. |
| 2.3 | Build follow-up question engine: rule-based templates from config table, 3 max, skippable, band-tightening feedback. |
| 2.4 | Build price computation: `resolvePrice` + within-band modifiers + personal weighting. |
| 2.5 | Build artifact renderer with pluggable section architecture. Bilingual, branding, scope, price, milestones, provenance, stamp. |
| 2.6 | Build AI tone adjustment: tone selector → DeepSeek rewrites editable sections. Labels and versioning. |
| 2.7 | Build AI scope comparison: DeepSeek compares scope to freelancer's past 5 proposals. |
| 2.8 | Build artifact output: PDF download, share link at `/[locale]/p/[token]`, WhatsApp text summary. |
| 2.9 | Build proposals list + detail + edit + version history (with AI change summaries). |
| 2.10 | Build template library (save, load, set default, usage tracking). |
| 2.11 | Build anonymous preview mode at `/tool` (dropdown → number, no artifact). |
| 2.12 | Unit-test: scope extraction (15 hand-written Saudi briefs), price computation (5 scenarios), tone adjustment (4 tones). |

**Exit gate:** Founder + 3 freelancers each generate 3 proposals from real WhatsApp briefs. Tone adjustment works. AI scope comparison appears when relevant. PDF renders without layout break on mobile.

### Phase 3 — Client Book M2 + Income Ledger M3 (Weekend 6-8)

| Task | Description |
|---|---|
| 3.1 | Create `clients`, `client_timeline` tables. RLS. Trigram indexes for Arabic search. |
| 3.2 | Build Client Book UI: list (AI-prioritized), search, filter, detail, add/edit, activity timeline. |
| 3.3 | Build AI client insights: DeepSeek generates observations from client history. |
| 3.4 | Build AI follow-up message drafting: one-tap generates Saudi-polite check-in. |
| 3.5 | Build AI persona generation + follow-up priority scoring. |
| 3.6 | Create `gigs`, `income_projections` tables. RLS. Indexes. |
| 3.7 | Build Income Ledger UI: list, monthly summary, add (speed-optimized), detail, status transitions. |
| 3.8 | Build AI income forecasting + anomaly detection + category suggestion. |
| 3.9 | Build `monthly_income` and `income_rolling_avg` views. |
| 3.10 | Wire cross-module: M1 → M3 gig creation. M2 → M3 pre-fill. M3 save → M2 stats update. |
| 3.11 | Build empty states for both modules. |
| 3.12 | Build CSV export for M3 (Pro tier). |

**Exit gate:** Founder logs 10 real clients and 20 real gigs. AI follow-up messages are useful and accurate. Income forecasting produces reasonable projections. Cross-module wiring works.

### Phase 4 — Simple Invoicing M6 (Weekend 9)

| Task | Description |
|---|---|
| 4.1 | Create `invoices` table. RLS. Sequence numbering. |
| 4.2 | Build invoice generation from M3 gigs (one-tap). Pre-fill from gig + client data. |
| 4.3 | Build invoice PDF + share link + WhatsApp output (reuses M1 artifact pipeline). |
| 4.4 | Build AI invoice description generation + payment reminder drafting. |
| 4.5 | Build invoice status lifecycle. |
| 4.6 | Wire M6 into M0 (overdue invoice widget), M9 (invoice due dates on calendar). |

**Exit gate:** Generate invoice from gig. Invoice PDF renders correctly. AI payment reminder is Saudi-polite and accurate.

### Phase 5 — Dashboard M0 + Calendar M9 + HADAF M5 + Onboarding M8 (Weekend 10-11)

| Task | Description |
|---|---|
| 5.1 | Build `widget_registry`, `dashboard_preferences` tables. |
| 5.2 | Build dashboard home: pluggable widget grid, AI business insights widget, all module widgets. |
| 5.3 | Build `calendar_preferences` table + `calendar_events` view. |
| 5.4 | Build Calendar UI: month/week/agenda views. Hijri support. AI scheduling insights. |
| 5.5 | Build `hadaf_rules_config`, `hadaf_preferences`, `hadaf_status_cache` tables. |
| 5.6 | Build HADAF status calculator with config-driven rules engine. |
| 5.7 | Build HADAF UI: 3 state cards, AI action plan, monthly history. |
| 5.8 | Build `onboarding_steps` table + extended onboarding flow. |
| 5.9 | Build AI tagline suggestion during onboarding. |
| 5.10 | Wire all cross-module navigation + quick actions. |

**Exit gate:** Dashboard renders without errors. Calendar shows events from all modules. HADAF calculator produces correct outputs. Onboarding flow works end-to-end.

### Phase 6 — Methodology M7 + Rate Calculator M10 + Document Vault M12 + Monetization + Polish (Weekend 12-14)

| Task | Description |
|---|---|
| 6.1 | Build `methodology_sections` table + Methodology page with AI FAQ. |
| 6.2 | Wire every artifact's provenance citation → methodology deep link. |
| 6.3 | Build Rate Calculator M10 with AI market positioning narrative. |
| 6.4 | Build `documents`, `document_categories` tables + Document Vault with AI categorization + expiry detection. |
| 6.5 | Build Supabase Storage private bucket for documents. Signed URL sharing. |
| 6.6 | Build Pro tier upgrade flow. Tap Payments integration (or defer). |
| 6.7 | Build tier enforcement across all modules. Upgrade modal on exhaustion. |
| 6.8 | Performance optimization: Lighthouse ≥85 on mobile. Core Web Vitals pass. |
| 6.9 | Mobile responsiveness pass. Test on iPhone 12, Samsung Galaxy S23, iPad. |
| 6.10 | Arabic content review: Saudi-polite phrasing, dialect appropriateness. AI prompt output quality review. |
| 6.11 | Final PDPL review: data export, deletion, cookie consent, privacy policy update. |

**Exit gate:** Founder uses full suite for 1 week without encountering a bug. 5 freelancers dogfood. Methodology page is live and linked from every artifact. All AI features produce useful, accurate output.

---

## Part VII — What Is Explicitly Not Building (v2 Scope Boundary)

| Item | Reason |
|---|---|
| Marketplace scraping | PDPL + Anti-Cyber Crime Law. Hard exclusion. |
| Voice note ingestion | Saudi dialect WER 25-35%. Premature. |
| WhatsApp Business API | Business verification required. Deferred. |
| Client KYC (Wathiq/Maroof/Etimad) | API access unconfirmed. Deferred to v0.5+. |
| Browser extension | Premature. Web app first. |
| Buyer-side surface | v1.0+ consideration. |
| Bayesian pricing / pgvector / embeddings | Over-engineered. SQL aggregation is sufficient and auditable. |
| Active elicitation / info-gain ranking | Vaporware. Rule-based gap-filling is sufficient. |
| ZATCA e-invoicing | Deferred until freelancer revenue exceeds SAR 375K. |
| Contract templates | Requires Saudi lawyer review. Deferred. |
| Time tracking | Out of scope. |
| Community features | Out of scope. |
| Mobile native app | Web responsive only. |
| Multi-country | Saudi only. |
| Bank feed import | Open banking API not mature in KSA. Deferred. |
| STC Pay webhook | Requires business account. Deferred. |

---

## Part VIII — Success Metrics

| Metric | Signal |
|---|---|
| **Founder usage** | Founder uses full suite for own freelance tracking for 2+ weeks. |
| **Freelancer dogfooding** | 5 freelancers each: ≥3 proposals, ≥5 clients, ≥10 gigs, ≥2 invoices. |
| **AI usefulness** | AI-generated insights are rated "helpful" in thumbs-up/down feedback. |
| **Proposal share rate** | Freelancers voluntarily share proposals with buyers. |
| **Return rate** | Freelancers return for a second month. |
| **Word of mouth** | At least 1 freelancer tells another about Rizq unprompted. |
| **"Would you pay?"** | At least 3 of 5 dogfooders say they would pay SAR 49/month. |

---

## Part IX — Founder Decisions Required

| # | Decision | Recommendation |
|---|---|---|
| D1 | Module naming in Arabic | M1: "استوديو العروض" / M2: "دفتر العملاء" / M3: "دفتر الدخل" / M4: "تقدير الأسعار" / M5: "أهلية هدف" / M6: "الفواتير" / M7: "المنهجية" / M9: "التقويم" / M10: "حاسبة الأجر" / M12: "خزنة المستندات" |
| D2 | Pro tier price | SAR 49/month. Annual: SAR 490/year. |
| D3 | Free tier limits | 2 proposals, 10 clients, 20 gigs, 3 invoices, 5 lookups, 10 documents/month. |
| D4 | Anonymous access | 1 lifetime pricing lookup only. |
| D5 | Tap Payments vs Moyasar | Tap is primary. Decide at monetization time. |
| D6 | Rizq verification stamp design | Commission. SVG, dignified, notary-style. |
| D7 | Artifact co-branding | Freelancer logo prominent. Rizq seal visible, secondary, non-removable. |
| D8 | HADAF disclaimer language | "هذه المعلومات مبنية على الشروط الموثقة لبرنامج دعم العمل الحر (هدف) حتى ٢٠٢٦. يرجى التحقق من hrdf.org.sa." |
| D9 | AI output labeling | Every AI-generated text labeled "تحليل رِزق —" or "Rizq Insight —". Thumbs feedback on all AI outputs. |
| D10 | Methodology page tone | Trust-first, technical, founder-signed. |
| D11 | Data retention | User-controlled. Delete on request. Archive after 36 months inactivity. |
| D12 | AI cost budget | DeepSeek API costs estimated at <$50/month at projected usage. Free tier AI features limited in volume. |

---

## Part X — Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI feature quality degrades (hallucinations, poor Arabic) | Medium | Medium | All AI outputs are labeled. Thumbs feedback on every AI insight. Prompt hashing for reproducibility. Follow-up question loop is the safety net for extraction errors. |
| AI cost exceeds projections | Low | Medium | Free tier has volume limits on AI features. Pro tier AI features are <$0.10/proposal. Monitor per-user AI cost; throttle if needed. |
| Freelancers don't use the suite beyond M4 (pricing) | Medium | High | M1 is the wedge. If freelancers share proposals, they discover the rest. |
| Client Book + Income Ledger feel like data entry | Medium | Medium | Speed-optimized UX. AI auto-categorization and insights reduce manual effort. If logging a gig takes >30 seconds, redesign. |
| HADAF rules change | Medium | Low | Config-driven rules engine. Update config, not code. |
| DeepSeek extraction quality on Saudi dialect | Low-Medium | Medium | Follow-up question loop is the safety net. If bad extractions, bake-off Fanar/Jais. |
| PDPL interpretation is wrong | Low | High | Legal review before public launch. Conservative posture. |
| Founder time limits build velocity | High | Medium | No SLA. Phases are dependency-ordered, not calendar-committed. |

---

**End of spec v2. CTO sign-off: Approved. Engineering lead — you are clear to start Phase 1. Build sequentially through the phases. Do not skip exit gates. Flag the founder for any ambiguities, not for permission to proceed.**

**No deadlines. No SLA. Best-effort. Build it right.**
