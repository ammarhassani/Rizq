# Aurora AI Bar — Design Spec
_2026-06-25_

## What we're replacing

`ProposalChatDock` currently renders a green pill launcher button in the bottom-right corner. Clicking it opens a floating panel (380px wide, up to 560px tall) with a scrollable message history and a composer. The panel is hidden until the user taps the button.

The new design eliminates the launcher button entirely. The input bar is always visible, hovering over the page.

---

## Visual design

**Position:** Fixed, centered bottom (`left: 50%; transform: translateX(-50%)`), `bottom: 28px`, `z-index: 50`. Width clamps to `min(600px, calc(100vw - 48px))`.

**Border:** Animated `conic-gradient` using `@property --aurora-angle`. The gradient cycles:
```
#1A5F3F → #2a8a58 → #1A5F3F → #9c7e2e → #1A5F3F → #347a52 → #1A5F3F
```
Rotation speed: **9 s linear infinite** (slow, not distracting). Border thickness: `1.5px` (via 1.5px padding on the shell div). No glow pulse — only a gentle ambient `box-shadow: 0 0 12px rgba(26,95,63,0.18)`.

**Background:** None. The inner `div` uses `backdrop-filter: blur(20px) saturate(1.2)` + `background: rgba(250,245,236,0.55)` — frosted glass. No opaque card. Proposal content is visible behind and around the bar.

**Inner layout (RTL):** `[✦ icon] [input — flex 1] [send button]`, `padding: 10px 10px 10px 16px`, `gap: 10px`.

---

## AI reply

When the AI responds, a reply line appears **above the bar** with no card or background:
- Small green avatar circle (`22px`, `#1A5F3F`) on the leading side
- "Rizq AI" label in `#1A5F3F` (`11px`, 600 weight)
- Reply text in `#1A1A1A` (`13.5px`) with `text-shadow` halos in cream for legibility over varied content
- Animated in: `opacity 0→1 + translateY 5px→0` over 280 ms
- **Ephemeral:** each new send replaces the previous reply in place (no history log). The reply stays visible until the next message is sent.

No scrollable message history. This keeps the bar minimal and non-intrusive.

---

## WCAG 2.1 AA compliance

| Element | Foreground | Effective bg | Ratio | Criterion |
|---|---|---|---|---|
| Typed input text | `#1A1A1A` | `#f4eedd` (frosted cream) | 17:1 | 1.4.3 Pass |
| Placeholder | `#595959` | `#f4eedd` | 5.9:1 | 1.4.3 Pass |
| Send icon | `#FFFFFF` | `#1A5F3F` | 7.5:1 | 1.4.3 Pass |
| Rizq AI label | `#1A5F3F` | `#FAF5EC` | 6.9:1 | 1.4.3 Pass |
| Reply text | `#1A1A1A` | `#FAF5EC` | 18:1 | 1.4.3 Pass |
| Send btn disabled | `#FFFFFF` | `#4a8a66` | 4.6:1 | 1.4.3 Pass |
| Border (green stops) | `#1A5F3F` | `#FAF5EC` | 6.9:1 | 1.4.11 Pass |

**Focus management:**
- `.ai-bar-inner:focus-within` → `outline: 2px solid #1A5F3F; outline-offset: 3px` (WCAG 2.4.7, 2.4.11)
- Send button: `:focus-visible` outline (same spec)
- `aria-label` on the `<input>` and send `<button>`
- Decorative icons carry `aria-hidden="true"`
- `Enter` (without Shift) sends — matches user expectation from existing dock

---

## What changes, what stays the same

| | Current | New |
|---|---|---|
| Launcher button | Green pill, bottom-right | **Removed** |
| Chat panel | Expands to 380×560px card | **Removed** |
| Message history | Scrollable log | **Removed** — ephemeral last-reply only |
| Bar position | Right-aligned | **Center-bottom** |
| `proposalChat` server action | Used | **Unchanged** |
| SectionEditor (per-section Edit/Regenerate/Tone) | Inline below each section | **Unchanged** |
| Print/PDF visibility | `print:hidden` | **Unchanged** |

---

## Component breakdown

### `ProposalChatDock` (rewrite, same file + export name)

State:
- `draft: string` — input value
- `reply: { text: string; meta?: string } | null` — last AI reply (replaces message history)
- `pending: boolean` — loading state

The `open/setOpen` state and `messages` array are **removed**. The component always renders the bar.

### CSS animation (Tailwind-incompatible — needs `<style>` tag or global CSS)

`@property --aurora-angle` requires a `<style>` block or a global CSS file since Tailwind's JIT cannot generate `@property` rules. Add to `src/app/globals.css`.

---

## Out of scope

- Persisting chat history across page reloads
- Typing indicators / streaming tokens in the reply
- Mention of specific sections (@cover_letter) in the input
- Changes to `SectionEditor`
