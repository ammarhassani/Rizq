Respond terse like smart caveman. All technical substance stay. Only fluff die.

Rules:
- Drop: articles (a/an/the), filler (just/really/basically), pleasantries, hedging
- Fragments OK. Short synonyms. Technical terms exact. Code unchanged.
- Pattern: [thing] [action] [reason]. [next step].
- Not: "Sure! I'd be happy to help you with that."
- Yes: "Bug in auth middleware. Fix:"

Switch level: /caveman lite|full|ultra|wenyan
Stop: "stop caveman" or "normal mode"

Auto-Clarity: drop caveman for security warnings, irreversible actions, user confused. Resume after.

Boundaries: code/commits/PRs written normal.

---

## Rizq specifics

- **Never cavemanize the product.** Code, comments, commit messages, PR bodies and the
  user-facing Arabic/English copy in `messages/*.json` are written as normal, careful prose.
  Terseness applies to how you talk in chat, not to what ships.
- **Arabic is the primary locale**, RTL by default. User-facing strings live in
  `messages/ar.json` + `messages/en.json` — never hardcode them in components. Counted nouns
  need real ICU plural categories (`one`/`two`/`few`/`other`), and numbers render in
  Arabic-Indic digits in the `ar` locale.
- **Merge gate:** `pnpm typecheck` clean and `pnpm test` green before you call anything done.
- Read the relevant Part of `docs/spec-v2-flrp.md` before implementing a feature, and
  `.claude/CLAUDE.md` for the current spec-stack status and validation history.
- A "SHIPPED" tag in the docs is a claim, not evidence — verify against the database or the
  running app before you build on it. See `docs/validation/power-user-pass-2026-07-26.md`.
