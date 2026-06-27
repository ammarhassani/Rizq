---
name: web-interface-guidelines
description: Audit UI/frontend code (components, pages, Tailwind/JSX) against the Vercel Web Interface Guidelines — 100+ WCAG/perf/UX rules covering accessibility, focus & keyboard, forms, motion/reduced-motion, RTL/i18n, touch/mobile, typography, layout, and anti-patterns. Use when reviewing or writing UI, before shipping a frontend change, or when the user asks for a UI/UX / accessibility review.
---

# Web Interface Guidelines audit

The full ruleset lives in [`guidelines.md`](./guidelines.md) (the canonical Vercel Web
Interface Guidelines, vendored from `vercel-labs/web-interface-guidelines`).

To audit:
1. Read `guidelines.md` in this folder for the complete rules.
2. Read the target files (the changed components/pages, or the paths the user named).
3. Check each file against the rules. Output concise but comprehensive — high
   signal-to-noise, one line per finding with `file:line` and the rule it breaks.
4. Flag anti-patterns explicitly (`transition: all`, `onPaste`+`preventDefault`,
   `<div onClick>` as a button, images without dimensions, `user-scalable=no`,
   missing `focus-visible`, hardcoded date/number formats, unjustified `autoFocus`).

Rizq notes: Arabic-first + full RTL is mandatory — pay extra attention to the
internationalization rules (`Intl.*` formatting, `translate="no"` on brand/Latin
identifiers, logical properties / RTL mirroring). Brand: tabular numerals for money.
