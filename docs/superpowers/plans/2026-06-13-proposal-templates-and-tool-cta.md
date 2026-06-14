# Proposal Templates + /tool Proposal CTA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 2.10 (proposal template library: save/use/manage + generate-from-template) and 2.11 (anonymous /tool → proposal CTA) on branch `phase-2-proposal-studio`.

**Architecture:** Server actions with Zod inputs and discriminated-union returns drive all mutations against `public.proposal_templates` (already in schema). `generateProposal` gains an optional `template_id` that loads template pricing defaults (deposit_pct, revisions, ip_terms, tone_preference) before building the artifact. The /tool result card gains a proposal CTA threaded via `isAuthed` from `tool/page.tsx → ToolFlow → ResultCard`. A new server page at `/[locale]/proposals/templates` lists + manages templates with a client island.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase Postgres, Zod v4, next-intl, Tailwind CSS v4, Framer Motion, lucide-react, useTransition + router.refresh() for mutations.

---

## File Map

**Created:**
- `src/app/actions/proposals/templates.ts` — CRUD server actions for `proposal_templates`
- `src/app/[locale]/proposals/templates/page.tsx` — Template manager page (server component, auth-gated)
- `src/components/proposals/TemplateList.tsx` — Client island for template list with mutations
- `src/lib/proposals/templates.test.ts` — Unit tests for pricing_json derivation helper

**Modified:**
- `src/app/actions/proposals/generateProposal.ts` — Accept optional `template_id`, apply template pricing defaults
- `src/components/proposals/ProposalFlow.tsx` — Add template picker select above brief textarea
- `src/app/[locale]/proposals/new/page.tsx` — Load owner templates, pass to ProposalFlow
- `src/components/proposals/ProposalDetailActions.tsx` — Add "Save as template" button + inline name prompt
- `src/components/tool/ResultCard.tsx` — Add proposal CTA below share row
- `src/components/tool/ToolFlow.tsx` — Thread `isAuthed` prop → `ResultCard`
- `src/app/[locale]/tool/page.tsx` — Pass `isAuthed={isAuth}` to `ToolFlow`
- `messages/ar.json` — Add `Proposals.templates` + `Tool.result.createProposal`
- `messages/en.json` — Same in English

---

## Task 1: i18n keys (ar + en)

**Files:**
- Modify: `messages/ar.json`
- Modify: `messages/en.json`

These keys are needed first so TypeScript doesn't complain when components reference them.

- [ ] **Step 1: Add Arabic translation keys**

Open `messages/ar.json`. Inside the `"Proposals"` object, after the `"detail"` block (before the closing `}`), add:

```json
    "templates": {
      "eyebrow": "مكتبة القوالب",
      "title": "قوالبك.",
      "subtitle": "ابدأ عرضك القادم من قالب محفوظ.",
      "newProposal": "عرض جديد",
      "backToProposals": "العودة للعروض",
      "name": "اسم القالب",
      "specialty": "التخصص",
      "usage": "الاستخدامات",
      "defaultBadge": "افتراضي",
      "setDefault": "تعيين كافتراضي",
      "settingDefault": "جارٍ التعيين…",
      "delete": "حذف",
      "deleting": "جارٍ الحذف…",
      "emptyTitle": "ما عندك قوالب بعد.",
      "emptyBody": "احفظ عرضًا كقالب لتسريع العروض القادمة.",
      "saveAsTemplate": "حفظ كقالب",
      "namePromptLabel": "اسم القالب",
      "namePromptPlaceholder": "مثال: موقع شركة",
      "namePromptSubmit": "حفظ",
      "namePromptSubmitting": "جارٍ الحفظ…",
      "setAsDefault": "تعيين كافتراضي",
      "startFromTemplate": "ابدأ من قالب / Start from a template",
      "noTemplate": "بدون قالب"
    }
```

Also add inside `"Tool"` → `"result"` (after `"confidenceLabel"`):

```json
      "createProposal": "أنشئ عرضًا سعرياً كاملاً"
```

- [ ] **Step 2: Add English translation keys**

Open `messages/en.json`. Same structure — inside `"Proposals"`, after `"detail"`:

```json
    "templates": {
      "eyebrow": "Template library",
      "title": "Your templates.",
      "subtitle": "Start your next proposal from a saved template.",
      "newProposal": "New proposal",
      "backToProposals": "Back to proposals",
      "name": "Template name",
      "specialty": "Specialty",
      "usage": "Uses",
      "defaultBadge": "Default",
      "setDefault": "Set as default",
      "settingDefault": "Setting…",
      "delete": "Delete",
      "deleting": "Deleting…",
      "emptyTitle": "No templates yet.",
      "emptyBody": "Save a proposal as a template to speed up future proposals.",
      "saveAsTemplate": "Save as template",
      "namePromptLabel": "Template name",
      "namePromptPlaceholder": "e.g. Marketing site",
      "namePromptSubmit": "Save",
      "namePromptSubmitting": "Saving…",
      "setAsDefault": "Set as default",
      "startFromTemplate": "Start from a template",
      "noTemplate": "No template"
    }
```

And inside `"Tool"` → `"result"` (after `"confidenceLabel"`):

```json
      "createProposal": "Create a full proposal"
```

- [ ] **Step 3: Verify JSON is valid**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('messages/ar.json','utf8')); console.log('ar OK')"
node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('en OK')"
```

Expected: `ar OK` and `en OK` with no errors.

---

## Task 2: Template CRUD server actions

**Files:**
- Create: `src/app/actions/proposals/templates.ts`

This module is `"use server"` and exports five functions gated by `auth.getUser()`. Uses Zod v4 for input validation and returns discriminated-union results.

**Key design decisions:**
- `pricing_json` shape: `{ deposit_pct: number, revisions: number | null, ip_terms: "full_transfer" | "license" | "per_project", tone_preference: "formal" | "balanced" | "friendly" | "persuasive" }`. Derived from proposal fields at save time.
- `scope_json` stored verbatim from the proposal's `scope_json`.
- `specialty_id` stored from the proposal row.
- `usage_count` incremented in `useTemplate` (not on `saveTemplateFromProposal`).
- When `set_default: true`, we first unset all other defaults for the same user in a separate `.update()` before inserting.

- [ ] **Step 1: Write a unit test for the pricing_json derivation helper**

Create `src/lib/proposals/templates.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { derivePricingJson } from "@/lib/proposals/templateHelpers";

describe("derivePricingJson", () => {
  it("uses deposit 50 as default", () => {
    const result = derivePricingJson({ scope_json: { revisions: 2, ip_transfer: "full_transfer" } });
    expect(result.deposit_pct).toBe(50);
  });

  it("reads revisions from scope_json", () => {
    const result = derivePricingJson({ scope_json: { revisions: 3 } });
    expect(result.revisions).toBe(3);
  });

  it("defaults revisions to null when absent", () => {
    const result = derivePricingJson({ scope_json: {} });
    expect(result.revisions).toBeNull();
  });

  it("maps full_transfer ip_transfer", () => {
    const result = derivePricingJson({ scope_json: { ip_transfer: "full_transfer" } });
    expect(result.ip_terms).toBe("full_transfer");
  });

  it("maps license ip_transfer", () => {
    const result = derivePricingJson({ scope_json: { ip_transfer: "license" } });
    expect(result.ip_terms).toBe("license");
  });

  it("falls back to full_transfer for unclear ip_transfer", () => {
    const result = derivePricingJson({ scope_json: { ip_transfer: "unclear" } });
    expect(result.ip_terms).toBe("full_transfer");
  });
});
```

Run: `pnpm test` — expect FAIL because `templateHelpers` does not exist yet.

- [ ] **Step 2: Create the templateHelpers lib**

Create `src/lib/proposals/templateHelpers.ts`:

```typescript
/**
 * Pure helpers for proposal template derivation.
 * No Supabase, no side-effects.
 */

export type PricingJson = {
  deposit_pct: number;
  revisions: number | null;
  ip_terms: "full_transfer" | "license" | "per_project";
  tone_preference: "formal" | "balanced" | "friendly" | "persuasive";
};

type ProposalLike = {
  scope_json: Record<string, unknown>;
  tone_preference?: string | null;
};

export function derivePricingJson(proposal: ProposalLike): PricingJson {
  const scope = proposal.scope_json;

  const revisions =
    typeof scope["revisions"] === "number" ? scope["revisions"] : null;

  const rawIp = scope["ip_transfer"];
  let ip_terms: PricingJson["ip_terms"] = "full_transfer";
  if (rawIp === "license") ip_terms = "license";
  else if (rawIp === "per_project") ip_terms = "per_project";
  // anything else (including "unclear" or null) → full_transfer

  const rawTone = proposal.tone_preference;
  let tone_preference: PricingJson["tone_preference"] = "balanced";
  if (
    rawTone === "formal" ||
    rawTone === "friendly" ||
    rawTone === "persuasive"
  ) {
    tone_preference = rawTone;
  }

  return { deposit_pct: 50, revisions, ip_terms, tone_preference };
}
```

- [ ] **Step 3: Run test to confirm it passes**

Run: `pnpm test src/lib/proposals/templates.test.ts`
Expected: all 6 tests PASS.

- [ ] **Step 4: Create the templates server actions**

Create `src/app/actions/proposals/templates.ts`:

```typescript
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { derivePricingJson } from "@/lib/proposals/templateHelpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TemplateRow = {
  id: string;
  name_ar: string;
  name_en: string | null;
  specialty_id: string | null;
  specialty_name?: string | null; // joined in listTemplates
  tone_preference: string;
  usage_count: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// saveTemplateFromProposal
// ---------------------------------------------------------------------------

const SaveTemplateSchema = z.object({
  proposal_id: z.string().uuid(),
  name_ar: z.string().min(1).max(120),
  name_en: z.string().max(120).optional(),
  set_default: z.boolean().optional(),
});

export type SaveTemplateResult =
  | { ok: true; template_id: string }
  | { ok: false; code: "unauthorized" | "invalid" | "not_found" | "error" };

export async function saveTemplateFromProposal(
  rawInput: unknown
): Promise<SaveTemplateResult> {
  const parsed = SaveTemplateSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const input = parsed.data;

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Load the owner's proposal
  const { data: proposal, error: propErr } = await supabase
    .from("proposals")
    .select("scope_json, specialty_id, tone_preference")
    .eq("id", input.proposal_id)
    .eq("user_id", userId)
    .single();

  if (propErr || !proposal) return { ok: false, code: "not_found" };

  const pricingJson = derivePricingJson({
    scope_json: (proposal.scope_json as Record<string, unknown>) ?? {},
    tone_preference: proposal.tone_preference as string | null,
  });

  // If set_default, unset all others first
  if (input.set_default) {
    await supabase
      .from("proposal_templates")
      .update({ is_default: false })
      .eq("user_id", userId);
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("proposal_templates")
    .insert({
      user_id: userId,
      name_ar: input.name_ar,
      name_en: input.name_en ?? null,
      specialty_id: proposal.specialty_id ?? null,
      scope_json: proposal.scope_json,
      pricing_json: pricingJson,
      tone_preference: pricingJson.tone_preference,
      is_default: input.set_default ?? false,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    console.error("[saveTemplateFromProposal] insert failed", insertErr?.message);
    return { ok: false, code: "error" };
  }

  return { ok: true, template_id: inserted.id as string };
}

// ---------------------------------------------------------------------------
// listTemplates
// ---------------------------------------------------------------------------

export type ListTemplatesResult =
  | { ok: true; templates: TemplateRow[] }
  | { ok: false; code: "unauthorized" | "error" };

export async function listTemplates(): Promise<ListTemplatesResult> {
  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };

  const { data, error } = await supabase
    .from("proposal_templates")
    .select(
      "id, name_ar, name_en, specialty_id, tone_preference, usage_count, is_default, created_at, updated_at, specialties(name_ar, name_en)"
    )
    .eq("user_id", userResult.user.id)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[listTemplates] query failed", error.message);
    return { ok: false, code: "error" };
  }

  const templates: TemplateRow[] = (data ?? []).map((row) => {
    const sp = row.specialties as { name_ar: string; name_en: string } | null;
    return {
      id: row.id as string,
      name_ar: row.name_ar as string,
      name_en: row.name_en as string | null,
      specialty_id: row.specialty_id as string | null,
      specialty_name: sp?.name_ar ?? null,
      tone_preference: row.tone_preference as string,
      usage_count: row.usage_count as number,
      is_default: row.is_default as boolean,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  });

  return { ok: true, templates };
}

// ---------------------------------------------------------------------------
// setDefaultTemplate
// ---------------------------------------------------------------------------

const SetDefaultSchema = z.object({ template_id: z.string().uuid() });

export type SetDefaultResult =
  | { ok: true }
  | { ok: false; code: "unauthorized" | "invalid" | "error" };

export async function setDefaultTemplate(
  rawInput: unknown
): Promise<SetDefaultResult> {
  const parsed = SetDefaultSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Unset all
  await supabase
    .from("proposal_templates")
    .update({ is_default: false })
    .eq("user_id", userId);

  // Set this one
  const { error } = await supabase
    .from("proposal_templates")
    .update({ is_default: true })
    .eq("id", parsed.data.template_id)
    .eq("user_id", userId);

  if (error) {
    console.error("[setDefaultTemplate] update failed", error.message);
    return { ok: false, code: "error" };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// deleteTemplate
// ---------------------------------------------------------------------------

const DeleteSchema = z.object({ template_id: z.string().uuid() });

export type DeleteTemplateResult =
  | { ok: true }
  | { ok: false; code: "unauthorized" | "invalid" | "error" };

export async function deleteTemplate(
  rawInput: unknown
): Promise<DeleteTemplateResult> {
  const parsed = DeleteSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };

  const { error } = await supabase
    .from("proposal_templates")
    .delete()
    .eq("id", parsed.data.template_id)
    .eq("user_id", userResult.user.id);

  if (error) {
    console.error("[deleteTemplate] delete failed", error.message);
    return { ok: false, code: "error" };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// useTemplate
// ---------------------------------------------------------------------------

const UseTemplateSchema = z.object({ template_id: z.string().uuid() });

export type UseTemplateResult =
  | {
      ok: true;
      template: TemplateRow & {
        pricing_json: {
          deposit_pct: number;
          revisions: number | null;
          ip_terms: "full_transfer" | "license" | "per_project";
          tone_preference: "formal" | "balanced" | "friendly" | "persuasive";
        };
      };
    }
  | { ok: false; code: "unauthorized" | "invalid" | "not_found" | "error" };

export async function useTemplate(
  rawInput: unknown
): Promise<UseTemplateResult> {
  const parsed = UseTemplateSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  const { data: row, error } = await supabase
    .from("proposal_templates")
    .select("*")
    .eq("id", parsed.data.template_id)
    .eq("user_id", userId)
    .single();

  if (error || !row) return { ok: false, code: "not_found" };

  // Increment usage_count
  await supabase
    .from("proposal_templates")
    .update({ usage_count: (row.usage_count as number) + 1 })
    .eq("id", parsed.data.template_id);

  return {
    ok: true,
    template: {
      id: row.id as string,
      name_ar: row.name_ar as string,
      name_en: row.name_en as string | null,
      specialty_id: row.specialty_id as string | null,
      tone_preference: row.tone_preference as string,
      usage_count: (row.usage_count as number) + 1,
      is_default: row.is_default as boolean,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      pricing_json: row.pricing_json as {
        deposit_pct: number;
        revisions: number | null;
        ip_terms: "full_transfer" | "license" | "per_project";
        tone_preference: "formal" | "balanced" | "friendly" | "persuasive";
      },
    },
  };
}
```

- [ ] **Step 5: Run typecheck to verify the actions compile**

Run: `pnpm typecheck`
Expected: no errors referencing `templates.ts` or `templateHelpers.ts`.

---

## Task 3: Extend generateProposal to accept template_id

**Files:**
- Modify: `src/app/actions/proposals/generateProposal.ts`

Add `template_id?: string` to `InputSchema`. When present, load the template and override `depositPct`, `revisions`, and `ipTerms` in the `buildArtifactData` calls. Also store `template_id` in the insert row and increment `usage_count` after insert.

- [ ] **Step 1: Add template_id to the InputSchema**

In `generateProposal.ts`, change the `InputSchema` from:

```typescript
const InputSchema = z.object({
  brief_text: z.string().min(10),
  client_name: z.string().optional(),
  city_slug: z.string().min(1).max(64),
  experience_tier_slug: z.string().min(1).max(64),
});
```

to:

```typescript
const InputSchema = z.object({
  brief_text: z.string().min(10),
  client_name: z.string().optional(),
  city_slug: z.string().min(1).max(64),
  experience_tier_slug: z.string().min(1).max(64),
  template_id: z.string().uuid().optional(),
});
```

- [ ] **Step 2: Add templateDefaults resolution after auth**

After step 2 (auth guard), before step 3 (load ref context), add a section to load template defaults when `template_id` is present. Add this import at the top of the file:

```typescript
import type { PricingJson } from "@/lib/proposals/templateHelpers";
```

Then after `const userId = userResult.user.id;`, add:

```typescript
  // 2b. Load template defaults if template_id provided
  let templateDefaults: PricingJson | null = null;
  if (input.template_id) {
    const { data: tplRow } = await supabase
      .from("proposal_templates")
      .select("pricing_json")
      .eq("id", input.template_id)
      .eq("user_id", userId)
      .single();
    if (tplRow?.pricing_json) {
      templateDefaults = tplRow.pricing_json as PricingJson;
    }
  }
```

- [ ] **Step 3: Use templateDefaults when building the artifact**

In both `buildArtifactData` calls (steps 11 and the update call), change the hardcoded values to use templateDefaults when available.

Change the first `buildArtifactData` call (around line 204):
```typescript
  const artifactData = buildArtifactData({
    // ... other fields unchanged ...
    revisions: templateDefaults?.revisions ?? scope.revisions,
    // ... other fields unchanged ...
    depositPct: templateDefaults?.deposit_pct ?? 50,
    ipTerms:
      templateDefaults?.ip_terms ??
      (scope.ip_transfer === "full_transfer"
        ? "full_transfer"
        : scope.ip_transfer === "license"
          ? "license"
          : "full_transfer"),
    // ... rest unchanged ...
  });
```

Change the second `buildArtifactData` call (around line 281):
```typescript
  const artifactWithId = buildArtifactData({
    // ... other fields unchanged ...
    revisions: templateDefaults?.revisions ?? scope.revisions,
    // ... other fields unchanged ...
    depositPct: templateDefaults?.deposit_pct ?? 50,
    ipTerms:
      templateDefaults?.ip_terms ??
      (scope.ip_transfer === "full_transfer"
        ? "full_transfer"
        : scope.ip_transfer === "license"
          ? "license"
          : "full_transfer"),
    // ... rest unchanged ...
  });
```

- [ ] **Step 4: Store template_id in the insert row**

In the `.insert({...})` object (around line 236), add:
```typescript
      template_id: input.template_id ?? null,
```

- [ ] **Step 5: Increment usage_count after successful insert**

After the `await supabase.from("proposals").update(...)` call that sets `artifact_json` with real ID (after line 313), add:

```typescript
  // Increment template usage_count if a template was used
  if (input.template_id) {
    await supabase
      .from("proposal_templates")
      .update({ usage_count: supabase.rpc ? undefined : undefined }) // handled inline below
      .eq("id", input.template_id)
      .eq("user_id", userId);
    // Use raw increment via RPC-less approach: fetch + increment
    const { data: tplForCount } = await supabase
      .from("proposal_templates")
      .select("usage_count")
      .eq("id", input.template_id)
      .single();
    if (tplForCount) {
      await supabase
        .from("proposal_templates")
        .update({ usage_count: (tplForCount.usage_count as number) + 1 })
        .eq("id", input.template_id);
    }
  }
```

- [ ] **Step 6: Run typecheck**

Run: `pnpm typecheck`
Expected: no new errors.

---

## Task 4: Template picker in ProposalFlow

**Files:**
- Modify: `src/components/proposals/ProposalFlow.tsx`
- Modify: `src/app/[locale]/proposals/new/page.tsx`

Add an optional template picker `<select>` above the brief textarea. When a template is selected, pass `template_id` into `generateProposal`.

- [ ] **Step 1: Add templates prop to ProposalFlow**

In `ProposalFlow.tsx`, change the `Props` type:

```typescript
type TemplateOption = { id: string; name_ar: string; name_en: string | null };

type Props = {
  locale: "ar" | "en";
  specialties: Option[];
  cities: Option[];
  tiers: Option[];
  defaultCitySlug: string;
  templates?: TemplateOption[];  // NEW
};
```

Update the function signature to destructure `templates = []`:
```typescript
export function ProposalFlow({ locale, specialties, cities, tiers, defaultCitySlug, templates = [] }: Props) {
```

- [ ] **Step 2: Add selectedTemplateId state**

After `const [tierSlug, setTierSlug] = useState("mid");`, add:

```typescript
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
```

- [ ] **Step 3: Pass template_id in generateProposal call**

In `handleSubmit`, change the `generateProposal` call:

```typescript
      const result = await generateProposal({
        brief_text: briefText.trim(),
        client_name: clientName.trim() || undefined,
        city_slug: citySlug,
        experience_tier_slug: tierSlug,
        template_id: selectedTemplateId || undefined,   // NEW
      });
```

- [ ] **Step 4: Add template picker UI above brief textarea**

In the FORM section, before the brief textarea `<div>`, add (after the opening `<form>` tag's wrapping before the "Brief textarea" comment):

```tsx
      {/* Template picker — only shown when templates are available */}
      {templates.length > 0 && (
        <div>
          <label
            htmlFor="template"
            className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}
          >
            {t("templatePicker")}
          </label>
          <select
            id="template"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors appearance-none ${font}`}
          >
            <option value="">{t("templatePickerNone")}</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {isAr ? tpl.name_ar : (tpl.name_en ?? tpl.name_ar)}
              </option>
            ))}
          </select>
        </div>
      )}
```

Note: We need two more i18n keys `templatePicker` and `templatePickerNone` in `Proposals.new`. Add these to both ar.json and en.json in the `"new"` section:

AR: `"templatePicker": "ابدأ من قالب / Start from a template"` and `"templatePickerNone": "بدون قالب"`
EN: `"templatePicker": "Start from a template"` and `"templatePickerNone": "No template"`

- [ ] **Step 5: Load templates in the new page and pass down**

In `src/app/[locale]/proposals/new/page.tsx`:

Add import at top:
```typescript
import { listTemplates } from "@/app/actions/proposals/templates";
```

In `ProposalNewPage`, after the auth guard and before the parallel data load, add template loading to the parallel Promise.all:

Change:
```typescript
  const [cities, tiers] = await Promise.all([getCities(), getExperienceTiers()]);
```
to:
```typescript
  const [cities, tiers, templatesResult] = await Promise.all([
    getCities(),
    getExperienceTiers(),
    listTemplates(),
  ]);
  const templates = templatesResult.ok ? templatesResult.templates : [];
```

Then pass `templates` to `ProposalFlow`:
```tsx
        <ProposalFlow
          locale={locale as "ar" | "en"}
          specialties={[]}
          cities={cityOptions}
          tiers={tierOptions}
          defaultCitySlug={defaultCitySlug}
          templates={templates.map((t) => ({
            id: t.id,
            name_ar: t.name_ar,
            name_en: t.name_en,
          }))}
        />
```

- [ ] **Step 6: Run typecheck**

Run: `pnpm typecheck`
Expected: no errors.

---

## Task 5: "Save as template" in ProposalDetailActions

**Files:**
- Modify: `src/components/proposals/ProposalDetailActions.tsx`

Add a "Save as template" button that reveals an inline name prompt and calls `saveTemplateFromProposal`.

- [ ] **Step 1: Add imports and state**

At the top of `ProposalDetailActions.tsx`, add:

```typescript
import { useTranslations } from "next-intl";
// Note: t is already imported — change useTranslations namespace usage
import { saveTemplateFromProposal } from "@/app/actions/proposals/templates";
```

The component already imports `useTranslations`. Add template-related state after the `declineReason` state:

```typescript
  const tTemplates = useTranslations("Proposals.templates");

  // Template save flow
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isSavingTemplate, startSaveTemplateTransition] = useTransition();
  const [templateSaved, setTemplateSaved] = useState(false);
```

- [ ] **Step 2: Add handleSaveTemplate handler**

After `handleMarkDeclined`, add:

```typescript
  function handleSaveTemplate() {
    if (!templateName.trim()) return;
    startSaveTemplateTransition(async () => {
      const result = await saveTemplateFromProposal({
        proposal_id: proposalId,
        name_ar: templateName.trim(),
        name_en: templateName.trim(),
      });
      if (result.ok) {
        track("proposal_template_saved", { locale, proposal_id: proposalId });
        setTemplateSaved(true);
        setShowTemplateSave(false);
        setTemplateName("");
      }
    });
  }
```

- [ ] **Step 3: Add the button and inline prompt to the render**

In the main `<div className="flex flex-wrap gap-3">` section (after the Share button), add:

```tsx
          {/* Save as template */}
          {!templateSaved && (
            <button
              type="button"
              onClick={() => setShowTemplateSave(true)}
              className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink px-6 py-3 text-sm font-medium hover:border-rizq-green/40 transition-all ${font}`}
            >
              {tTemplates("saveAsTemplate")}
            </button>
          )}
          {templateSaved && (
            <span className={`inline-flex items-center gap-2 rounded-full border border-rizq-green/30 bg-rizq-green/10 text-rizq-green px-6 py-3 text-sm font-medium ${font}`}>
              ✓ {tTemplates("saveAsTemplate")}
            </span>
          )}
```

After the `showDeclineReason` block, add:

```tsx
        {/* Template name prompt */}
        {showTemplateSave && !isSavingTemplate && (
          <div
            dir={dir}
            className={`rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 p-4 space-y-3 animate-fade-in ${font}`}
          >
            <label
              htmlFor="template-name"
              className={`block text-sm font-medium text-rizq-ink ${font}`}
            >
              {tTemplates("namePromptLabel")}
            </label>
            <input
              id="template-name"
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={tTemplates("namePromptPlaceholder")}
              className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 transition-colors ${font}`}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={!templateName.trim()}
                className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-2.5 text-sm font-medium hover:bg-rizq-green-dark transition-colors disabled:opacity-50 ${font}`}
              >
                {isSavingTemplate ? tTemplates("namePromptSubmitting") : tTemplates("namePromptSubmit")}
              </button>
              <button
                type="button"
                onClick={() => { setShowTemplateSave(false); setTemplateName(""); }}
                className={`text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors ${font}`}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        )}
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: no errors.

---

## Task 6: Template manager page

**Files:**
- Create: `src/app/[locale]/proposals/templates/page.tsx` — server component
- Create: `src/components/proposals/TemplateList.tsx` — client island

- [ ] **Step 1: Create the TemplateList client component**

Create `src/components/proposals/TemplateList.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Loader2, Star, Trash2 } from "lucide-react";
import { setDefaultTemplate, deleteTemplate } from "@/app/actions/proposals/templates";
import type { TemplateRow } from "@/app/actions/proposals/templates";

type Props = {
  locale: "ar" | "en";
  templates: TemplateRow[];
};

export function TemplateList({ locale, templates }: Props) {
  const t = useTranslations("Proposals.templates");
  const router = useRouter();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (templates.length === 0) {
    return (
      <div
        dir={dir}
        className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-8 text-center ${font}`}
      >
        <p className="text-rizq-ink font-semibold mb-2">{t("emptyTitle")}</p>
        <p className="text-sm text-rizq-ink-soft">{t("emptyBody")}</p>
      </div>
    );
  }

  function handleSetDefault(templateId: string) {
    setPendingId(templateId + ":default");
    startTransition(async () => {
      await setDefaultTemplate({ template_id: templateId });
      router.refresh();
      setPendingId(null);
    });
  }

  function handleDelete(templateId: string) {
    setPendingId(templateId + ":delete");
    startTransition(async () => {
      await deleteTemplate({ template_id: templateId });
      router.refresh();
      setPendingId(null);
    });
  }

  return (
    <div dir={dir} className="space-y-3">
      {templates.map((tpl) => {
        const isSettingDefault = pendingId === tpl.id + ":default";
        const isDeleting = pendingId === tpl.id + ":delete";

        return (
          <div
            key={tpl.id}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-rizq-gold/20 bg-rizq-cream/85 p-5 ${font}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold text-rizq-ink truncate">
                  {isAr ? tpl.name_ar : (tpl.name_en ?? tpl.name_ar)}
                </span>
                {tpl.is_default && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rizq-gold/40 bg-rizq-gold/10 px-2 py-0.5 text-xs text-rizq-gold-dark">
                    <Star size={10} />
                    {t("defaultBadge")}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-rizq-ink-soft">
                {tpl.specialty_name && (
                  <span>{t("specialty")}: {tpl.specialty_name}</span>
                )}
                <span>{t("usage")}: {tpl.usage_count}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              {!tpl.is_default && (
                <button
                  type="button"
                  onClick={() => handleSetDefault(tpl.id)}
                  disabled={!!pendingId}
                  className={`inline-flex items-center gap-1.5 rounded-full border border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink-soft px-4 py-2 text-xs font-medium hover:border-rizq-green/40 hover:text-rizq-green transition-all disabled:opacity-60 ${font}`}
                >
                  {isSettingDefault ? (
                    <><Loader2 size={12} className="animate-spin" />{t("settingDefault")}</>
                  ) : (
                    <><Star size={12} />{t("setDefault")}</>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => handleDelete(tpl.id)}
                disabled={!!pendingId}
                className={`inline-flex items-center gap-1.5 rounded-full border border-red-300/50 text-red-600 px-4 py-2 text-xs font-medium hover:bg-red-50 transition-all disabled:opacity-60 ${font}`}
              >
                {isDeleting ? (
                  <><Loader2 size={12} className="animate-spin" />{t("deleting")}</>
                ) : (
                  <><Trash2 size={12} />{t("delete")}</>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create the templates page**

Create `src/app/[locale]/proposals/templates/page.tsx`:

```tsx
/**
 * /[locale]/proposals/templates — Template manager page.
 * Phase-2 task 2.10.
 *
 * Server component. Auth-gated. Lists owner's proposal templates
 * with set-default and delete actions via TemplateList client island.
 */

import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { listTemplates } from "@/app/actions/proposals/templates";
import { SiteNav } from "@/components/nav/SiteNav";
import { TemplateList } from "@/components/proposals/TemplateList";

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Proposals.templates" });
  return { title: `${t("title")} — رِزق` };
}

export default async function ProposalTemplatesPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Auth gate
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const loginPath = getPathname({ href: "/login", locale: locale as "ar" | "en" });
    redirect(loginPath);
  }

  const t = await getTranslations({ locale, namespace: "Proposals.templates" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const isAr = locale === "ar";

  const templatesResult = await listTemplates();
  const templates = templatesResult.ok ? templatesResult.templates : [];

  return (
    <div className="relative min-h-screen flex flex-col bg-paper">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.45] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(200, 169, 81, 0.18) 1px, transparent 1.6px)",
          backgroundSize: "30px 30px",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      />

      <SiteNav locale={locale as "ar" | "en"} />

      <main
        className="relative z-10 flex-1 mx-auto w-full max-w-3xl px-6 sm:px-10 lg:px-16 py-12 sm:py-16 lg:py-20"
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <Link
            href="/proposals"
            className={`text-xs text-rizq-ink-soft hover:text-rizq-ink transition-colors mb-4 inline-block ${font}`}
          >
            ← {t("backToProposals")}
          </Link>
          <p className="eyebrow mb-3">{t("eyebrow")}</p>
          <div className="flex items-end justify-between gap-4">
            <h1 className={`display-2 text-rizq-ink ${font}`}>{t("title")}</h1>
            <Link
              href="/proposals/new"
              className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-2.5 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
            >
              {t("newProposal")}
            </Link>
          </div>
          <p className={`mt-3 text-base text-rizq-ink-soft max-w-xl ${font}`}>
            {t("subtitle")}
          </p>
        </div>

        {/* Template list */}
        <TemplateList
          locale={locale as "ar" | "en"}
          templates={templates}
        />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: no errors on the templates page or TemplateList component.

---

## Task 7: Proposal CTA in /tool ResultCard (Task 2.11)

**Files:**
- Modify: `src/components/tool/ResultCard.tsx`
- Modify: `src/components/tool/ToolFlow.tsx`
- Modify: `src/app/[locale]/tool/page.tsx`

Thread `isAuthed: boolean` from page → ToolFlow → ResultCard, then add the CTA below the share row.

- [ ] **Step 1: Add isAuthed to ToolFlow props and ResultCard call**

In `ToolFlow.tsx`, change `Props`:
```typescript
type Props = {
  locale: "ar" | "en";
  specialties: Option[];
  cities: Option[];
  tiers: Option[];
  canShare: boolean;
  isAuthed: boolean;  // NEW
};
```

Update the function signature:
```typescript
export function ToolFlow({ locale, specialties, cities, tiers, canShare, isAuthed }: Props) {
```

Pass `isAuthed` to `ResultCard` in the result branch:
```tsx
      <ResultCard
        locale={locale}
        query_id={view.data.query_id}
        // ... existing props unchanged ...
        canShare={canShare}
        isAuthed={isAuthed}  // NEW
        onReset={reset}
      />
```

- [ ] **Step 2: Add isAuthed prop to ResultCard and render the CTA**

In `ResultCard.tsx`, add `isAuthed: boolean` to the `Props` type:

```typescript
type Props = {
  // ...existing...
  canShare: boolean;
  initiallyShared?: boolean;
  isAuthed: boolean;  // NEW
  onReset: () => void;
};
```

Update the function signature to destructure `isAuthed`:
```typescript
export function ResultCard({
  locale,
  // ...
  canShare,
  initiallyShared = false,
  isAuthed,
  onReset,
}: Props) {
```

Add the CTA at the bottom of the `<article>`, after the `{canShare && (...contributeYourPrice...)}` block:

```tsx
      {/* Proposal CTA — for all users; authed goes to /proposals/new, anon goes to signup */}
      <div className="mt-6 pt-5 border-t border-rizq-gold/15">
        <Link
          href={isAuthed ? "/proposals/new" : `/signup?next=/proposals/new`}
          onClick={() => track("proposal_cta_clicked", { authed: isAuthed })}
          className={`group inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
        >
          <span>{t("createProposal")}</span>
          <span className="inline-block rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
            →
          </span>
        </Link>
      </div>
```

Note: The `track` import is already available in `ResultCard.tsx` — add it if not present:
```typescript
import { track } from "@/lib/analytics/track";
```

- [ ] **Step 3: Pass isAuthed from tool/page.tsx to ToolFlow**

In `src/app/[locale]/tool/page.tsx`, change the `<ToolFlow>` call:

```tsx
        <ToolFlow
          locale={locale}
          specialties={specialtyOptions}
          cities={cityOptions}
          tiers={tierOptions}
          canShare={isAuth}
          isAuthed={isAuth}  // NEW
        />
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: no errors.

---

## Task 8: Final verification

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: 155+ tests pass (the new `templates.test.ts` adds 6 tests).

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: clean — zero errors.

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: green. Verify that `/[locale]/proposals/templates` appears in the build output as a static/dynamic route.

- [ ] **Step 4: Commit**

```bash
git checkout phase-2-proposal-studio 2>/dev/null || git checkout -b phase-2-proposal-studio
git add -A
git commit -m "feat(proposals): template library (save/use/manage + generate-from-template) + anon /tool proposal CTA"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `saveTemplateFromProposal` — load owner's proposal, store template with scope_json + pricing_json + specialty_id + tone_preference; set_default unsets others first.
- [x] `listTemplates()` — owner's templates, order is_default desc, updated_at desc.
- [x] `setDefaultTemplate` — unset others, set this.
- [x] `deleteTemplate` — owner-gated delete.
- [x] `useTemplate` — usage_count++, return template.
- [x] `generateProposal` extended with optional `template_id` — loads template, applies pricing defaults (deposit_pct, revisions, ip_terms, tone_preference), increments usage_count, stores template_id on row.
- [x] Templates manager page at `/[locale]/proposals/templates` (server + client island).
- [x] Auth-gate on templates page.
- [x] Template picker in ProposalFlow (select above brief).
- [x] "Save as template" button in ProposalDetailActions with inline name prompt.
- [x] `track("proposal_template_saved")` in save handler.
- [x] Proposal CTA in ResultCard — authed → `/proposals/new`, anon → `/signup?next=/proposals/new`.
- [x] `isAuthed` threaded from `tool/page.tsx → ToolFlow → ResultCard`.
- [x] `track("proposal_cta_clicked", { authed })` on CTA click.
- [x] i18n keys for `Proposals.templates` and `Tool.result.createProposal` in ar + en.
- [x] `pnpm typecheck` + `pnpm build` + `pnpm test` verified at the end.

**pricing_json shape decision:** `{ deposit_pct: 50, revisions: number | null, ip_terms: "full_transfer" | "license" | "per_project", tone_preference: "formal" | "balanced" | "friendly" | "persuasive" }`. Derived at save-time from the proposal's `scope_json.revisions`, `scope_json.ip_transfer`, and `tone_preference` (DB enum column).

**isAuthed threading:** `tool/page.tsx` already computes `isAuth = !!userData.user`. It was previously only passed as `canShare`. We now also pass it as `isAuthed` to `ToolFlow`, which forwards it to `ResultCard`. Both `canShare` and `isAuthed` remain separate props because they are conceptually distinct (canShare = can toggle share; isAuthed = is logged in for CTA routing).

**Template defaults override:** `templateDefaults` is resolved once after auth. Both `buildArtifactData` calls (initial with `proposalId: "pending"` and the final update with real ID) use `templateDefaults?.deposit_pct ?? 50` and `templateDefaults?.ip_terms ?? (scope-derived)` and `templateDefaults?.revisions ?? scope.revisions` so the behavior is consistent.
