# Wahaj — Redline / values of record

For eng. Every value below is the **source of truth**; the board (`wahaj-board.html`)
is the visual diff target. Where the shipped `design/wahaj` `globals.css` already
matches, that's noted — those are correct, don't change them.

Fonts (Google): **El Messiri** (display/headings, wordmark), **Reem Kufi**
(eyebrows/labels), **Tajawal** (Arabic body/UI), **Space Grotesk** (Latin UI +
large numerals), **Space Mono** (money/tabular).

---

## 1. Color tokens — per theme (hex)

These match the shipped `globals.css` token blocks. Components must consume tokens
only (never raw hex — that's the fidelity leak the patch fixes).

| Token | Light (default) | Dark (Wahaj night) | Use |
|---|---|---|---|
| `--bg` | `#E4DCCE` | `#05080A` | app background (deepest) |
| `--surface` | `#EDE6D8` | `#0C1012` | sidebar / page base |
| `--panel` | `#E7DFD1` | `#0E1416` | secondary panels, CTA band |
| `--raised` | `#F3ECE0` | `#12181A` | cards (extruded) |
| `--track` | `#D9D0BF` | `#0A0E0F` | ring/bar tracks, insets |
| `--nm-dark` | `#CBC2B1` | `#080B0C` | neumorph shadow (dark side) |
| `--nm-light` | `#FBF8F0` | `#1B2427` | neumorph shadow (light side) |
| `--content` | `#241F19` | `#EAF3EE` | primary text |
| `--content-2` | `#463D30` | `#C7D3CC` | strong secondary |
| `--content-3` | `#5E5545` | `#A9B6AE` | secondary |
| `--content-muted` | `#6A5F4E` | `#93A19A` | labels (AA-verified) |
| `--content-faint` | `#5F5642` | `#6B7972` | captions/10px (AA-darkened) |
| `--line` | `rgba(60,45,20,.12)` | `rgba(255,255,255,.09)` | hairlines |
| `--line-2` | `rgba(60,45,20,.07)` | `rgba(255,255,255,.05)` | faint hairlines |
| `--acc` | `#0A6B4B` | `#34E6A8` | accent / positive / money-up |
| `--acc-tint` | `#0A6B4B` | `#7FD8C0` | tinted accent text |
| `--gold` | `#B8862E` | `#E9C15F` | warmth pole / chart pt 2 |
| `--warn` | `#94671F` | `#E9C15F` | pending |
| `--over` | `#BE4326` | `#F0715A` | overdue / destructive |
| `--on-accent` | `#06110C` | `#06110C` | ink on aurora fills (both) |

**Gradients (per theme).**
- `--grad` (display/money text): light `linear-gradient(100deg,#0A8F66,#0E8FA0 50%,#B8862E)` · dark `linear-gradient(100deg,#34E6A8,#31D0DE 50%,#E9C15F)`
- `--grad-m` (money short): light `linear-gradient(100deg,#0A8F66,#B8862E)` · dark `linear-gradient(100deg,#34E6A8,#E9C15F)`
- `--fill` (buttons/active/avatars): light `linear-gradient(120deg,#12C58C,#12A6B8)` · dark `linear-gradient(120deg,#34E6A8,#31D0DE)`
- Aurora rotating border (conic, "magic"): `#34E6A8 → #31D0DE → #E9C15F → #34E6A8` (bright in both themes — reads on light and dark).

**Glow token (NEW — from the polish patch; replaces hardcoded neon).**
- `--acc-glow`: light `0 0 20px -4px rgba(10,143,102,.42)` · dark `0 0 20px -4px rgba(52,230,168,.55)`
- `--acc-glow-strong`: light `0 0 26px -3px rgba(10,143,102,.52)` · dark `0 0 26px -3px rgba(52,230,168,.6)`

**Status chips.** positive→`--acc` · pending→`--warn` · overdue→`--over` · neutral→`--content-muted`; each at ~12% tint bg + ~30% border (see `.status-*` in globals.css).

---

## 2. Type scale (board values)

Sizes in px as drawn at desktop; Arabic uses El Messiri (headings) / Tajawal (body),
Latin uses Space Grotesk. Numerals always `font-variant-numeric: tabular-nums`.

| Role | Family | Size | Weight | Line-height | Tracking |
|---|---|---|---|---|---|
| Wordmark | El Messiri | 22 (sidebar) / 26 (landing) | 700 | 1.0 | 0 |
| Landing H1 | El Messiri | clamp 35–52 | 700 | 1.15 | -0.01em |
| Landing aurora subline | El Messiri | 34 | 700 | 1.2 | 0 |
| Page H1 (app) | El Messiri | 32 | 700 | 1.1 | 0 |
| Section title | El Messiri | 18–24 | 700 | 1.4 | 0 |
| Eyebrow | Reem Kufi | 10 | 600 | 1.0 | 0.2em, uppercase |
| Body | Tajawal | 12–15 | 400 | 1.6–1.75 | 0 |
| Label | Tajawal | 11 | 500 | 1.3 | 0 |
| Caption | Tajawal | 9–10 | 400–500 | 1.3 | 0 |
| Money hero | Space Grotesk | 46 (dash) / 34 (tiles) | 700 | 1.0 | -0.02em |
| Numerals/amounts | Space Mono | 10–15 | 700 | 1.0 | 0 |
| Button label | Tajawal | 13–15 | 700 | 1.0 | 0 |

Landing display uses `clamp()`; `.display-1/.display-2/.eyebrow` already in globals.css.

---

## 3. Spacing, radii, shadows

**Spacing rhythm** (px): base grid **4**; common gaps 8 / 12 / 14 / 18; card padding
18–24; section gaps 18. Widget grid gap **18**. Sidebar item padding `10px 12px`.

**Radii** (px): cards **22** (`.card-wahaj`) / **20** (large surfaces) / **18**
(`.card-wahaj-sm`, small cards); controls/inputs **13**; nav items **13**; chips
**10–20**; pills / CTAs **9999** (full). Avatars/tiles **11–14**.

**Neumorph shadow pairs** (offset x/y, blur, color — light-side up-left, dark-side down-right):
- Raised: `7px 7px 16px var(--nm-dark), -7px -7px 16px var(--nm-light)`
- Raised sm: `4px 4px 9px var(--nm-dark), -4px -4px 9px var(--nm-light)`
- Inset: `inset 4px 4px 12px var(--nm-dark), inset -4px -4px 12px var(--nm-light)` (inputs use `3px/8px`)
- Raised + hero glow: append `, var(--acc-glow)`

---

## 4. Motion spec

**Tokens.** Easing `cubic-bezier(0.22, 1, 0.36, 1)` (standard). Durations:
entrance **600–700ms** · state **180–200ms** · signature **1500–1700ms** ·
aurora spin **6–8s** · orb drift **14–18s**.

| Element | Animation | Keyframe / detail |
|---|---|---|
| Section/card entrance | `rise` 600–700ms, staggered | opacity 0→1 + translateY 16px→0 |
| Money figure | count-up 1.4s (cubic ease-out) | `AnimatedNumber` component |
| Goal ring | fill 0→target 1.7s on mount | `@property --gp` + `ringfill` |
| Income bars | `bar-rise` scaleY 0→1, 90ms stagger | `barrise` |
| Aurora border (generation, next-action, CTA) | `spin`/`aurora-spin` 6–8s linear | `@property --ang` conic |
| Aurora orbs | `floata`/`floatb` 14–18s | `.orb-drift-a/-b` |
| Wordmark / generation card | `sheen` sweep 3.5s | translateX skew |
| Sparkline | draw-in 1.1s + area fade | `.chart-line-draw` |

**Reduced-motion:** the global `@media (prefers-reduced-motion: reduce)` block
neutralizes CSS animation and snaps to rest; rings/bars/counts land at final
values, orbs sit still, aurora borders become a static `--acc` edge. Framer Motion
components use `useReducedMotion()`. **This is a hard requirement — keep the a11y
e2e green.**

### Aliveness proposal — blessed, with one guardrail
Eng's 3-level proposal is **approved**: L1 entrance (rise/count-up/ring/bars),
L2 ambient (orb drift + aurora spin), L3 signature (the Proposal generation
surface). Guardrail: **one signature moment per screen** — L3 belongs to Proposal
Studio only; elsewhere stop at L1–L2 so money/data stay calm and legible. Redirect
if any ambient motion reduces text contrast below AA.

---

## 5. Canonical screens (reference-of-record if others drift)
1. **Proposal Studio** (the wedge) — generation moment, honesty chip, price anchor.
2. **Dashboard M0** — money hero, next-action, widget hierarchy, aurora tokens.
3. **App shell** — sidebar (active state, groups) + topbar.

If any other screen conflicts with these three, **these win.**
