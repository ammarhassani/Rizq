# Contracts — Proposal Studio Revision Round

These contracts describe the **interfaces** this feature adds or changes. They are
implementation-guiding, not implementation. Conventions for this codebase:

- **Server actions** are owner-gated (`auth.getUser()` + RLS) and return a discriminated
  result `{ ok: true, ... }` | `{ ok: false, code }` — never throw to the client.
- **AI routes** stream with the Vercel AI SDK (`streamObject` → `toTextStreamResponse()`),
  persist in `onFinish`, and degrade gracefully (HTTP 200 `{ code: "ai_unconfigured" }`)
  when no model key is configured.
- **Zod schemas** validate every AI `generateObject`/`streamObject` output and every
  action input.
- **Honesty guardrail (binding):** no AI interface may author or mutate `pricing`,
  `timeline`, `milestones`, or `terms`. Price changes flow only through the deterministic
  market resolver.
- **Bilingual:** every user-facing string ships AR + EN.

| Contract | Covers |
|----------|--------|
| [ai-clarifying-questions.md](./ai-clarifying-questions.md) | Feature ① — dynamic AI questions |
| [proposal-chat.md](./proposal-chat.md) | Feature ② — hovering conversational editor |
| [share-link-state.md](./share-link-state.md) | Bug ④ — active/disabled/missing share states |
| [profile-save-and-rendering.md](./profile-save-and-rendering.md) | Bugs ⑧/⑤/③ + ⑥/⑦ — grants, gig redirect, phone, experience, notable clients |
