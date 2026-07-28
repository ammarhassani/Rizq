# Drive plan — the locked search space, covered pairwise

Eight axes (`drive/axes.mjs`) cross to hundreds of thousands of combinations; nobody finishes
that. Combination defects almost always involve two values interacting, so this plan covers
every one of the **887 reachable pairs** in **100 runs**.

**This plan is driven as a loop, not a checklist.** `node drive/e2e.mjs --loop` clears the
ticks when it reaches the end and starts again at row 1. The app changes underneath it, so
the same row is not the same test twice — and the coverage record lives in `runs.jsonl`,
which keeps every run forever, not in the `done` column, which only says what to drive next.

Impossible combinations are excluded by `isValid()` — an anonymous visitor cannot log income,
a DOCX exists only for a proposal, asking whether something survives volume requires volume.
A row nobody can execute is worse than a missing one, because a skipped row still looks
covered.

When every row is ticked and three consecutive runs find no new P1/P2, the search space is
exhausted — and that claim finally means something. Adding an axis reopens it and resets the
dry counter: allowed, but a deliberate decision rather than a quiet improvement.

**Reopened 2026-07-28 — `theme` (light/dark), rows 89–100.** Rows 1–88 are recorded as
`light` because that is what they drove: next-themes defaults to light and no run ever
touched the toggle. The axis earns the reset rather than manufacturing work — every colour
decision this product has audited was measured in light, including the remediation that
closed RZQ-0002 and RZQ-0013, which darkened `--warn` and `--over` in the light block only.
`[data-theme="dark"]` carries its own `--warn` (#e9c15f), `--over` and `--content-faint`,
and nothing has ever looked at them. The runner sets the theme before first paint, so a row
cannot report dark coverage for checks that ran while the page was still light.

| # | persona | flow | strategy | surface | state | tier | entry | theme | done |
|---|---|---|---|---|---|---|---|---|---|
| 1 | veteran | proposal-to-client | fuzz | share-anonymous | minimal | free | in-app-navigation | light | 2026-07-28 |
| 2 | veteran | clients-and-projects | metamorphic | screen-desktop | empty | pro-lapsed | shared-link | light | 2026-07-28 |
| 3 | veteran | invoice-and-vat | differential | print-pdf | degraded-profile | pro-active | direct-url | light | 2026-07-28 |
| 4 | veteran | income-and-hadaf | adversarial | csv-export | edge-unicode | free-exhausted | back-or-refresh-midflow | light | 2026-07-28 |
| 5 | newcomer | proposal-to-client | state-machine | screen-desktop | heavy | pro-active | back-or-refresh-midflow | light | 2026-07-28 |
| 6 | meticulous | proposal-to-client | time-travel | screen-mobile | degraded-profile | anon | direct-url | light | 2026-07-28 |
| 7 | rusher | proposal-to-client | differential | docx-export | realistic | free-exhausted | shared-link | light | 2026-07-28 |
| 8 | sceptic | mobile | fuzz | screen-desktop | edge-unicode | pro-lapsed | direct-url | light | 2026-07-28 |
| 9 | rusher | pricing-tool | fuzz | share-anonymous | degraded-profile | pro-lapsed | back-or-refresh-midflow | light | 2026-07-28 |
| 10 | english-first | clients-and-projects | fuzz | screen-mobile | heavy | free-exhausted | guided-context | light | 2026-07-28 |
| 11 | sceptic | recovery | time-travel | screen-desktop | degraded-profile | free-exhausted | in-app-navigation | light | 2026-07-28 |
| 12 | rusher | income-and-hadaf | metamorphic | screen-mobile | edge-unicode | pro-active | in-app-navigation | light | 2026-07-28 |
| 13 | rusher | invoice-and-vat | metamorphic | screen-desktop | heavy | free | direct-url | light | 2026-07-28 |
| 14 | rusher | clients-and-projects | differential | csv-export | minimal | free | back-or-refresh-midflow | light | 2026-07-28 |
| 15 | sceptic | proposal-to-client | metamorphic | print-pdf | minimal | anon | back-or-refresh-midflow | light | 2026-07-28 |
| 16 | meticulous | income-and-hadaf | adversarial | screen-desktop | minimal | free | shared-link | light | 2026-07-28 |
| 17 | english-first | pricing-tool | time-travel | share-anonymous | edge-unicode | pro-active | shared-link | light | 2026-07-28 |
| 18 | english-first | income-and-hadaf | state-machine | csv-export | realistic | pro-lapsed | in-app-navigation | light | 2026-07-28 |
| 19 | newcomer | pricing-tool | adversarial | share-anonymous | realistic | anon | direct-url | light | 2026-07-28 |
| 20 | meticulous | pricing-tool | metamorphic | share-anonymous | heavy | free-exhausted | in-app-navigation | light | 2026-07-28 |
| 21 | meticulous | english-locale | fuzz | screen-desktop | realistic | pro-active | back-or-refresh-midflow | light | 2026-07-28 |
| 22 | newcomer | documents-and-catalog | fuzz | csv-export | degraded-profile | pro-lapsed | shared-link | light | 2026-07-28 |
| 23 | sceptic | pricing-tool | state-machine | screen-mobile | empty | anon | direct-url | light | 2026-07-28 |
| 24 | sceptic | mobile | scale | screen-mobile | heavy | free | shared-link | light | 2026-07-28 |
| 25 | english-first | pricing-tool | differential | screen-desktop | empty | free | back-or-refresh-midflow | light | 2026-07-28 |
| 26 | veteran | pricing-tool | state-machine | share-anonymous | minimal | free-exhausted | direct-url | light | 2026-07-28 |
| 27 | english-first | mobile | adversarial | screen-mobile | minimal | pro-lapsed | back-or-refresh-midflow | light | 2026-07-28 |
| 28 | english-first | proposal-to-client | adversarial | screen-desktop | degraded-profile | pro-lapsed | guided-context | light | 2026-07-28 |
| 29 | newcomer | mobile | state-machine | screen-desktop | empty | free | in-app-navigation | light | 2026-07-28 |
| 30 | meticulous | mobile | differential | screen-mobile | degraded-profile | free-exhausted | in-app-navigation | light | 2026-07-28 |
| 31 | rusher | invoice-and-vat | state-machine | print-pdf | degraded-profile | free | in-app-navigation | light | 2026-07-28 |
| 32 | english-first | income-and-hadaf | scale | csv-export | heavy | pro-active | direct-url | light | 2026-07-28 |
| 33 | meticulous | clients-and-projects | state-machine | screen-mobile | edge-unicode | free | guided-context | light | 2026-07-28 |
| 34 | sceptic | clients-and-projects | differential | screen-mobile | realistic | pro-active | guided-context | light | 2026-07-28 |
| 35 | newcomer | clients-and-projects | time-travel | screen-desktop | empty | free-exhausted | direct-url | light | 2026-07-28 |
| 36 | newcomer | income-and-hadaf | metamorphic | csv-export | minimal | free-exhausted | guided-context | light | 2026-07-28 |
| 37 | meticulous | income-and-hadaf | fuzz | csv-export | empty | pro-lapsed | back-or-refresh-midflow | light | 2026-07-28 |
| 38 | newcomer | invoice-and-vat | differential | print-pdf | heavy | pro-lapsed | shared-link | light | 2026-07-28 |
| 39 | newcomer | proposal-to-client | adversarial | docx-export | edge-unicode | pro-active | guided-context | light |  |
| 40 | english-first | proposal-to-client | metamorphic | print-pdf | empty | free-exhausted | guided-context | light |  |
| 41 | rusher | proposal-to-client | time-travel | docx-export | empty | pro-lapsed | back-or-refresh-midflow | light |  |
| 42 | newcomer | english-locale | time-travel | screen-mobile | heavy | free-exhausted | back-or-refresh-midflow | light |  |
| 43 | meticulous | documents-and-catalog | time-travel | screen-mobile | minimal | pro-active | direct-url | light |  |
| 44 | meticulous | invoice-and-vat | time-travel | print-pdf | empty | free-exhausted | guided-context | light |  |
| 45 | sceptic | invoice-and-vat | fuzz | share-anonymous | empty | pro-active | direct-url | light |  |
| 46 | veteran | invoice-and-vat | state-machine | screen-mobile | realistic | free | back-or-refresh-midflow | light |  |
| 47 | veteran | documents-and-catalog | metamorphic | screen-desktop | realistic | free | shared-link | light |  |
| 48 | meticulous | recovery | scale | screen-mobile | heavy | pro-active | back-or-refresh-midflow | light |  |
| 49 | newcomer | recovery | differential | screen-mobile | edge-unicode | free | direct-url | light |  |
| 50 | rusher | recovery | adversarial | screen-desktop | heavy | pro-lapsed | shared-link | light |  |
| 51 | english-first | onboarding | time-travel | screen-desktop | empty | free | shared-link | light |  |
| 52 | sceptic | english-locale | adversarial | screen-desktop | empty | free | in-app-navigation | light |  |
| 53 | veteran | english-locale | state-machine | screen-mobile | edge-unicode | pro-lapsed | shared-link | light |  |
| 54 | rusher | proposal-to-client | scale | screen-desktop | heavy | anon | shared-link | light |  |
| 55 | veteran | proposal-to-client | fuzz | print-pdf | edge-unicode | anon | back-or-refresh-midflow | light |  |
| 56 | english-first | invoice-and-vat | differential | share-anonymous | edge-unicode | free-exhausted | guided-context | light |  |
| 57 | veteran | income-and-hadaf | time-travel | csv-export | heavy | free | guided-context | light |  |
| 58 | english-first | documents-and-catalog | adversarial | csv-export | empty | free-exhausted | back-or-refresh-midflow | light |  |
| 59 | sceptic | documents-and-catalog | differential | screen-mobile | heavy | free | in-app-navigation | light |  |
| 60 | veteran | mobile | time-travel | screen-mobile | realistic | free-exhausted | direct-url | light |  |
| 61 | newcomer | mobile | metamorphic | screen-mobile | degraded-profile | pro-active | shared-link | light |  |
| 62 | rusher | documents-and-catalog | state-machine | screen-mobile | edge-unicode | pro-lapsed | back-or-refresh-midflow | light |  |
| 63 | veteran | recovery | fuzz | screen-desktop | minimal | pro-active | shared-link | light |  |
| 64 | english-first | recovery | metamorphic | screen-mobile | empty | pro-active | direct-url | light |  |
| 65 | rusher | english-locale | differential | screen-desktop | degraded-profile | pro-active | direct-url | light |  |
| 66 | sceptic | income-and-hadaf | fuzz | screen-desktop | degraded-profile | pro-active | guided-context | light |  |
| 67 | english-first | invoice-and-vat | adversarial | print-pdf | minimal | free-exhausted | back-or-refresh-midflow | light |  |
| 68 | rusher | clients-and-projects | adversarial | screen-desktop | degraded-profile | free-exhausted | guided-context | light |  |
| 69 | meticulous | onboarding | metamorphic | screen-mobile | degraded-profile | free | back-or-refresh-midflow | light |  |
| 70 | newcomer | onboarding | differential | screen-mobile | degraded-profile | free | direct-url | light |  |
| 71 | english-first | english-locale | metamorphic | screen-desktop | minimal | pro-lapsed | in-app-navigation | light |  |
| 72 | english-first | proposal-to-client | differential | print-pdf | realistic | anon | shared-link | light |  |
| 73 | rusher | clients-and-projects | scale | csv-export | heavy | free | in-app-navigation | light |  |
| 74 | veteran | proposal-to-client | scale | docx-export | heavy | free-exhausted | back-or-refresh-midflow | light |  |
| 75 | rusher | mobile | time-travel | screen-desktop | heavy | free-exhausted | shared-link | light |  |
| 76 | sceptic | documents-and-catalog | scale | csv-export | heavy | pro-lapsed | shared-link | light |  |
| 77 | english-first | income-and-hadaf | differential | screen-mobile | degraded-profile | pro-active | back-or-refresh-midflow | light |  |
| 78 | newcomer | invoice-and-vat | scale | share-anonymous | heavy | pro-lapsed | guided-context | light |  |
| 79 | sceptic | proposal-to-client | state-machine | docx-export | minimal | free | in-app-navigation | light |  |
| 80 | english-first | proposal-to-client | metamorphic | docx-export | realistic | pro-active | direct-url | light |  |
| 81 | meticulous | proposal-to-client | fuzz | docx-export | degraded-profile | pro-active | back-or-refresh-midflow | light |  |
| 82 | rusher | recovery | state-machine | screen-mobile | realistic | free-exhausted | back-or-refresh-midflow | light |  |
| 83 | rusher | english-locale | scale | screen-mobile | heavy | pro-lapsed | in-app-navigation | light |  |
| 84 | veteran | pricing-tool | scale | screen-mobile | heavy | free | in-app-navigation | light |  |
| 85 | sceptic | onboarding | fuzz | screen-mobile | empty | free | in-app-navigation | light |  |
| 86 | rusher | onboarding | state-machine | screen-mobile | empty | free | back-or-refresh-midflow | light |  |
| 87 | veteran | onboarding | adversarial | screen-mobile | empty | free | in-app-navigation | light |  |
| 88 | english-first | proposal-to-client | scale | print-pdf | heavy | anon | direct-url | light |  |
| 89 | meticulous | clients-and-projects | adversarial | csv-export | empty | free-exhausted | direct-url | dark |  |
| 90 | rusher | proposal-to-client | differential | share-anonymous | edge-unicode | pro-active | back-or-refresh-midflow | dark |  |
| 91 | sceptic | income-and-hadaf | scale | screen-desktop | heavy | free | in-app-navigation | dark |  |
| 92 | veteran | proposal-to-client | adversarial | docx-export | minimal | pro-lapsed | shared-link | dark |  |
| 93 | newcomer | english-locale | metamorphic | screen-mobile | realistic | free-exhausted | in-app-navigation | dark |  |
| 94 | english-first | pricing-tool | time-travel | share-anonymous | degraded-profile | free | direct-url | dark |  |
| 95 | sceptic | invoice-and-vat | fuzz | print-pdf | degraded-profile | free | guided-context | dark |  |
| 96 | newcomer | proposal-to-client | state-machine | screen-mobile | degraded-profile | anon | shared-link | dark |  |
| 97 | rusher | onboarding | fuzz | screen-desktop | degraded-profile | free | shared-link | dark |  |
| 98 | veteran | recovery | time-travel | screen-mobile | degraded-profile | pro-lapsed | back-or-refresh-midflow | dark |  |
| 99 | rusher | mobile | fuzz | screen-desktop | degraded-profile | free | shared-link | dark |  |
| 100 | rusher | documents-and-catalog | differential | screen-desktop | edge-unicode | free | shared-link | dark |  |
