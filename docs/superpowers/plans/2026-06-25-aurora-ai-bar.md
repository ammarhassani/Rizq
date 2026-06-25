# Aurora AI Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `ProposalChatDock` launcher-button + panel pattern with an always-visible, floating aurora-border chat bar centered at the bottom of the proposal page.

**Architecture:** Two-file change. `globals.css` gets `@property --aurora-angle`, `@keyframes aurora-spin`, and two plain CSS utility classes (`ai-aurora-border`, `ai-aurora-inner`) that cannot be expressed in Tailwind's JIT. `ProposalChatDock.tsx` is rewritten in place — same export name, same props, same server action — swapping the open/messages state for a single `reply` atom and removing the launcher button entirely.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, Framer Motion, next-intl, Lucide icons, Vitest (existing tests — no new component test infra needed).

---

## File map

| File | Change |
|---|---|
| `src/app/globals.css` | Add aurora `@property`, `@keyframes`, and `.ai-aurora-border` / `.ai-aurora-inner` classes; extend `prefers-reduced-motion` block |
| `src/components/proposals/ProposalChatDock.tsx` | Full rewrite — same export, same props, new UI |

Everything else (`proposalChat` action, `page.tsx` import, `SectionEditor`) is **untouched**.

---

## Task 1: Aurora CSS utilities in globals.css

**Files:**
- Modify: `src/app/globals.css` (after line 277, before `/* ── WCAG 2.1 */`)

- [ ] **Step 1: Add aurora CSS block**

Open `src/app/globals.css`. After the last chart animation class (`.chart-pin-rise { … }`, around line 277) and before the `/* ── WCAG 2.1 — reduced motion */` comment, insert:

```css
/* ── Aurora AI bar ───────────────────────────────────────────────────────
   @property is required for animating a CSS custom property used inside
   conic-gradient. Tailwind JIT cannot generate @property rules.       */
@property --aurora-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

@keyframes aurora-spin {
  to { --aurora-angle: 360deg; }
}

/* Outer shell — 1.5 px animated border via padding + conic-gradient bg */
.ai-aurora-border {
  border-radius: 18px;
  padding: 1.5px;
  background: conic-gradient(
    from var(--aurora-angle),
    #1a5f3f   0%,
    #2a8a58  20%,
    #1a5f3f  35%,
    #9c7e2e  50%,
    #1a5f3f  65%,
    #347a52  80%,
    #1a5f3f 100%
  );
  animation: aurora-spin 9s linear infinite;
  box-shadow: 0 0 12px rgba(26, 95, 63, 0.18), 0 6px 28px rgba(0, 0, 0, 0.1);
}

/* Inner content — frosted glass, no opaque card */
.ai-aurora-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 16.5px;
  padding-block: 10px;
  padding-inline-start: 16px; /* logical — flips for RTL automatically */
  padding-inline-end: 10px;
  background: rgba(250, 245, 236, 0.55);
  backdrop-filter: blur(20px) saturate(1.2);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
}

/* Keyboard focus ring (WCAG 2.4.7 / 2.4.11) */
.ai-aurora-inner:focus-within {
  outline: 2px solid #1a5f3f;
  outline-offset: 3px;
}
```

- [ ] **Step 2: Extend the prefers-reduced-motion block**

Inside the existing `@media (prefers-reduced-motion: reduce) { … }` block, add `.ai-aurora-border` to the `animation: none` rule so the border freezes for users who opt out of motion:

Find this existing rule:
```css
  .animate-shimmer,
  [style*="shimmer"],
  [class*="shimmer"] {
    animation: none !important;
    background-position: 0 0 !important;
  }
```

Replace it with:
```css
  .animate-shimmer,
  [style*="shimmer"],
  [class*="shimmer"],
  .ai-aurora-border {
    animation: none !important;
    background-position: 0 0 !important;
  }
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style(aurora): add aurora-border CSS utilities + reduced-motion override"
```

---

## Task 2: Rewrite ProposalChatDock

**Files:**
- Modify: `src/components/proposals/ProposalChatDock.tsx` (full rewrite)

- [ ] **Step 1: Replace the file contents**

Overwrite `src/components/proposals/ProposalChatDock.tsx` with:

```tsx
"use client";

/**
 * ProposalChatDock — always-visible aurora bar (feature 001 / US4 redesign).
 *
 * Floats center-bottom over the proposal page. No launcher button — the input
 * is always present. The last AI reply appears above the bar as bare text with
 * a cream text-shadow for legibility; it is replaced on every new send.
 *
 * WCAG 2.1 AA: placeholder #595959 on frosted cream ≈5.9:1, body text 17:1,
 * send icon 7.5:1. Focus ring via .ai-aurora-inner:focus-within in globals.css.
 */

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowUp, Loader2 } from "lucide-react";
import { proposalChat } from "@/app/actions/proposals/proposalChat";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Reply = { text: string; meta?: string };

const SECTION_LABELS: Record<string, { ar: string; en: string }> = {
  cover_letter: { ar: "الخطاب التعريفي", en: "cover letter" },
  understanding: { ar: "فهم المشروع", en: "understanding" },
  approach: { ar: "المنهجية", en: "approach" },
  scope_of_work: { ar: "نطاق العمل", en: "scope of work" },
  assumptions: { ar: "الافتراضات", en: "assumptions" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProposalChatDock({
  proposalId,
  locale,
}: {
  proposalId: string;
  locale: "ar" | "en";
}) {
  const t = useTranslations("Proposals.chat");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const router = useRouter();

  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState<Reply | null>(null);
  const [pending, startTransition] = useTransition();

  function labelFor(id: string): string {
    return SECTION_LABELS[id]?.[isAr ? "ar" : "en"] ?? id;
  }

  function send() {
    const msg = draft.trim();
    if (!msg || pending) return;
    setDraft("");
    startTransition(async () => {
      const res = await proposalChat({ proposal_id: proposalId, message: msg });
      if (!res.ok) {
        setReply({
          text:
            res.code === "ai_unconfigured" ? t("unavailable") : t("error"),
        });
        return;
      }
      const replyText = isAr ? res.reply_ar : res.reply_en;
      const meta =
        res.modified.length > 0
          ? t("updated", {
              sections: res.modified
                .map(labelFor)
                .join(isAr ? "، " : ", "),
            })
          : undefined;
      setReply({ text: replyText, meta });
      if (res.modified.length > 0) router.refresh();
    });
  }

  return (
    <div
      className={`print:hidden fixed bottom-7 left-1/2 z-50 w-[min(600px,calc(100vw-48px))] -translate-x-1/2 ${font}`}
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Last AI reply — floats above bar, no card bg */}
      <AnimatePresence mode="wait">
        {reply && (
          <motion.div
            key={reply.text}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="mb-2.5 flex items-start gap-2 px-1"
          >
            <span
              className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-rizq-green"
              aria-hidden="true"
            >
              <Sparkles size={11} strokeWidth={2} className="text-white" />
            </span>
            <div>
              <p className="mb-1 text-[11px] font-semibold leading-none text-rizq-green">
                Rizq AI
              </p>
              <p
                className="text-[13.5px] leading-relaxed text-rizq-ink"
                style={{
                  textShadow: "0 0 20px #FAF5EC, 0 0 16px #FAF5EC",
                }}
              >
                {reply.text}
                {reply.meta && (
                  <span className="mt-0.5 block text-[11px] text-rizq-green">
                    {reply.meta}
                  </span>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Aurora border shell + frosted input bar */}
      <div className="ai-aurora-border">
        <div className="ai-aurora-inner">
          <Sparkles
            size={17}
            strokeWidth={2.2}
            className="shrink-0 text-rizq-green"
            aria-hidden="true"
          />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={t("placeholder")}
            disabled={pending}
            dir="auto"
            aria-label={t("placeholder")}
            className="flex-1 border-none bg-transparent text-sm text-rizq-ink outline-none placeholder:text-[#595959] disabled:opacity-60"
          />
          <button
            type="button"
            onClick={send}
            disabled={pending || !draft.trim()}
            aria-label={t("send")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-rizq-green text-white transition-colors hover:bg-rizq-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rizq-green disabled:bg-rizq-green/60"
          >
            {pending ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <ArrowUp size={15} strokeWidth={2.5} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -E "ProposalChatDock|aurora|error" | head -20
```

Expected: no output (no errors). If you see `Property 'X' does not exist`, check the `proposalChat` return type in `src/app/actions/proposals/proposalChat.ts` — the component accesses `res.ok`, `res.code`, `res.reply_ar`, `res.reply_en`, `res.modified`, `res.scope_change`. All are present in the existing action.

- [ ] **Step 3: Run existing proposal logic tests**

```bash
npx vitest run src/lib/proposals/__tests__ src/lib/ai/__tests__ src/lib/profile/__tests__
```

Expected output (all green):
```
✓ src/lib/proposals/__tests__/proposalChatShape.test.ts
✓ src/lib/proposals/__tests__/sections.test.ts
✓ src/lib/proposals/__tests__/shareToken.test.ts
✓ src/lib/ai/__tests__/followupsShape.test.ts
✓ src/lib/profile/__tests__/grants.test.ts
✓ src/lib/profile/__tests__/notableClients.test.ts
```

These tests cover the `proposalChat` business logic that the component calls. If any fail, **do not proceed** — the issue is unrelated to this change and must be fixed first.

- [ ] **Step 4: Commit**

```bash
git add src/components/proposals/ProposalChatDock.tsx
git commit -m "feat(ui): aurora AI bar — always-visible hover bar replaces launcher button"
```

---

## Task 3: Manual smoke check

The project's vitest config runs in `node` environment (no jsdom), so component rendering cannot be tested automatically. Do this manually.

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Navigate to a proposal detail page (owner view, `editable` status). Confirm:

1. No launcher button visible anywhere on the page
2. Aurora bar is visible at the bottom-center of the viewport, floating over the proposal content
3. The border has a slow green shimmer (not flashy)
4. Typing in the bar and pressing Enter (or the send button) fires the AI request
5. The loading spinner appears in the send button while pending
6. The AI reply appears above the bar after the response arrives (no card background behind it)
7. Pressing Tab focuses the input; Tab again reaches the send button; both have visible focus rings
8. The bar does not appear on the public share page (`/p/[token]`)

- [ ] **Step 2: Check print**

Open browser print dialog (`Cmd+P`). The bar must not appear in the print preview (it carries `print:hidden`).

- [ ] **Step 3: Commit if any tweaks were needed**

```bash
git add -p   # stage only the tweaks
git commit -m "fix(ui): aurora bar smoke-check tweaks"
```
