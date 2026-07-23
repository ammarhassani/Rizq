# Wahaj board — for eng

Reference-of-record for pixel-matching Rizq to the Wahaj brand. Open, diff, extract.

## Files
- **`wahaj-board.html`** — Arabic / RTL board (primary). Self-contained.
- **`wahaj-board-en.html`** — English / LTR board (mirror). Self-contained.
- **`REDLINE.md`** — the **values of record**: token hex (light+dark), type scale,
  spacing, radii, neumorph shadow pairs, motion spec, canonical screens. Extract
  numbers **from here**, not by reverse-engineering the rendered DOM (the board
  paints via a runtime; the redline is authoritative and matches `design/wahaj`).

## Using the boards
- **Theme:** top-bar toggle (داكن/فاتح in AR, Dark/Light in EN) → light (default) ⇄ Wahaj dark.
- **Screens:** top switcher (Landing · Dashboard · Proposal Studio) + sidebar nav
  (Clients · Income · Invoices). Invoices → “New invoice” opens the **builder**.

## Coverage vs. your priority list
- (a) **Proposal Studio** — ✅ generation moment, honesty chip, price anchor.
- (b) **Dashboard M0** — ✅ populated (money hero, next-action, widgets, AI strip).
- (c) **Landing hero + final CTA** — ✅ both.
- (d) **App shell** — ✅ sidebar (expanded) + topbar. ⚠️ **collapsed** sidebar not
  in the board — see the live `AppSidebar.tsx` (it already implements collapse);
  redline: collapsed width **64px**, icon-only, group labels hidden.
- (e) **Income** — ✅ stat band + monthly bars. **Invoice builder** — ✅ now added
  (line items, VAT 15%, live preview, totals, send/draft actions) — open Invoices
  → “New invoice”, or the same screen in `wahaj-board-en.html`.

## Themes / locales
- Themes: ✅ light + dark, both in each board.
- Locales: ✅ **ar (RTL, primary)** = `wahaj-board.html`; ✅ **en (LTR)** =
  `wahaj-board-en.html`. The en board is a faithful mirror — LTR flip, Latin
  display type (Space Grotesk headings), Western numerals; confirm RTL↔LTR
  mirroring by diffing the two.

## Known gaps (say the word and I'll build these next)
1. **Collapsed sidebar** state as a board frame (spec in REDLINE; live in `AppSidebar.tsx`).
2. Remaining un-reskinned modules (calendar, catalog, documents, fees, hadaf).

## Notes
- Canonical screens (win if others drift): **Proposal Studio, Dashboard M0, App
  shell** — see REDLINE §5.
- The aliveness proposal is **blessed with one guardrail** (one L3 signature moment
  per screen; Proposal Studio owns it) — REDLINE §4.
- For the current branch's fidelity fixes (theme leaks, motion wiring), see
  `patch_wahaj/` (APPLY.md) — separate from this board.
