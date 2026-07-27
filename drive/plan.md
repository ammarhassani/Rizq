# Drive plan — the locked search space, covered pairwise

Seven axes (`drive/axes.mjs`) cross to hundreds of thousands of combinations; nobody finishes
that. Combination defects almost always involve two values interacting, so this plan covers
every one of the **797 reachable pairs** in **88 runs**.

Impossible combinations are excluded by `isValid()` — an anonymous visitor cannot log income,
a DOCX exists only for a proposal, asking whether something survives volume requires volume.
A row nobody can execute is worse than a missing one, because a skipped row still looks
covered.

When every row is ticked and three consecutive runs find no new P1/P2, the search space is
exhausted — and that claim finally means something. Adding an axis reopens it and resets the
dry counter: allowed, but a deliberate decision rather than a quiet improvement.

| # | persona | flow | strategy | surface | state | tier | entry | done |
|---|---|---|---|---|---|---|---|---|
| 1 | veteran | proposal-to-client | fuzz | share-anonymous | minimal | free | in-app-navigation | 2026-07-27 |
| 2 | veteran | clients-and-projects | metamorphic | screen-desktop | empty | pro-lapsed | shared-link |  |
| 3 | veteran | invoice-and-vat | differential | print-pdf | degraded-profile | pro-active | direct-url |  |
| 4 | veteran | income-and-hadaf | adversarial | csv-export | edge-unicode | free-exhausted | back-or-refresh-midflow |  |
| 5 | newcomer | proposal-to-client | state-machine | screen-desktop | heavy | pro-active | back-or-refresh-midflow |  |
| 6 | meticulous | proposal-to-client | time-travel | screen-mobile | degraded-profile | anon | direct-url |  |
| 7 | rusher | proposal-to-client | differential | docx-export | realistic | free-exhausted | shared-link |  |
| 8 | sceptic | mobile | fuzz | screen-desktop | edge-unicode | pro-lapsed | direct-url |  |
| 9 | rusher | pricing-tool | fuzz | share-anonymous | degraded-profile | pro-lapsed | back-or-refresh-midflow |  |
| 10 | english-first | clients-and-projects | fuzz | screen-mobile | heavy | free-exhausted | guided-context |  |
| 11 | sceptic | recovery | time-travel | screen-desktop | degraded-profile | free-exhausted | in-app-navigation |  |
| 12 | rusher | income-and-hadaf | metamorphic | screen-mobile | edge-unicode | pro-active | in-app-navigation |  |
| 13 | rusher | invoice-and-vat | metamorphic | screen-desktop | heavy | free | direct-url |  |
| 14 | rusher | clients-and-projects | differential | csv-export | minimal | free | back-or-refresh-midflow |  |
| 15 | sceptic | proposal-to-client | metamorphic | print-pdf | minimal | anon | back-or-refresh-midflow |  |
| 16 | meticulous | income-and-hadaf | adversarial | screen-desktop | minimal | free | shared-link |  |
| 17 | english-first | pricing-tool | time-travel | share-anonymous | edge-unicode | pro-active | shared-link |  |
| 18 | english-first | income-and-hadaf | state-machine | csv-export | realistic | pro-lapsed | in-app-navigation |  |
| 19 | newcomer | pricing-tool | adversarial | share-anonymous | realistic | anon | direct-url |  |
| 20 | meticulous | pricing-tool | metamorphic | share-anonymous | heavy | free-exhausted | in-app-navigation |  |
| 21 | meticulous | english-locale | fuzz | screen-desktop | realistic | pro-active | back-or-refresh-midflow |  |
| 22 | newcomer | documents-and-catalog | fuzz | csv-export | degraded-profile | pro-lapsed | shared-link |  |
| 23 | sceptic | pricing-tool | state-machine | screen-mobile | empty | anon | direct-url |  |
| 24 | sceptic | mobile | scale | screen-mobile | heavy | free | shared-link |  |
| 25 | english-first | pricing-tool | differential | screen-desktop | empty | free | back-or-refresh-midflow |  |
| 26 | veteran | pricing-tool | state-machine | share-anonymous | minimal | free-exhausted | direct-url |  |
| 27 | english-first | mobile | adversarial | screen-mobile | minimal | pro-lapsed | back-or-refresh-midflow |  |
| 28 | english-first | proposal-to-client | adversarial | screen-desktop | degraded-profile | pro-lapsed | guided-context |  |
| 29 | newcomer | mobile | state-machine | screen-desktop | empty | free | in-app-navigation |  |
| 30 | meticulous | mobile | differential | screen-mobile | degraded-profile | free-exhausted | in-app-navigation |  |
| 31 | rusher | invoice-and-vat | state-machine | print-pdf | degraded-profile | free | in-app-navigation |  |
| 32 | english-first | income-and-hadaf | scale | csv-export | heavy | pro-active | direct-url |  |
| 33 | meticulous | clients-and-projects | state-machine | screen-mobile | edge-unicode | free | guided-context |  |
| 34 | sceptic | clients-and-projects | differential | screen-mobile | realistic | pro-active | guided-context |  |
| 35 | newcomer | clients-and-projects | time-travel | screen-desktop | empty | free-exhausted | direct-url |  |
| 36 | newcomer | income-and-hadaf | metamorphic | csv-export | minimal | free-exhausted | guided-context |  |
| 37 | meticulous | income-and-hadaf | fuzz | csv-export | empty | pro-lapsed | back-or-refresh-midflow |  |
| 38 | newcomer | invoice-and-vat | differential | print-pdf | heavy | pro-lapsed | shared-link |  |
| 39 | newcomer | proposal-to-client | adversarial | docx-export | edge-unicode | pro-active | guided-context |  |
| 40 | english-first | proposal-to-client | metamorphic | print-pdf | empty | free-exhausted | guided-context |  |
| 41 | rusher | proposal-to-client | time-travel | docx-export | empty | pro-lapsed | back-or-refresh-midflow |  |
| 42 | newcomer | english-locale | time-travel | screen-mobile | heavy | free-exhausted | back-or-refresh-midflow |  |
| 43 | meticulous | documents-and-catalog | time-travel | screen-mobile | minimal | pro-active | direct-url |  |
| 44 | meticulous | invoice-and-vat | time-travel | print-pdf | empty | free-exhausted | guided-context |  |
| 45 | sceptic | invoice-and-vat | fuzz | share-anonymous | empty | pro-active | direct-url |  |
| 46 | veteran | invoice-and-vat | state-machine | screen-mobile | realistic | free | back-or-refresh-midflow |  |
| 47 | veteran | documents-and-catalog | metamorphic | screen-desktop | realistic | free | shared-link |  |
| 48 | meticulous | recovery | scale | screen-mobile | heavy | pro-active | back-or-refresh-midflow |  |
| 49 | newcomer | recovery | differential | screen-mobile | edge-unicode | free | direct-url |  |
| 50 | rusher | recovery | adversarial | screen-desktop | heavy | pro-lapsed | shared-link |  |
| 51 | english-first | onboarding | time-travel | screen-desktop | empty | free | shared-link |  |
| 52 | sceptic | english-locale | adversarial | screen-desktop | empty | free | in-app-navigation |  |
| 53 | veteran | english-locale | state-machine | screen-mobile | edge-unicode | pro-lapsed | shared-link |  |
| 54 | rusher | proposal-to-client | scale | screen-desktop | heavy | anon | shared-link |  |
| 55 | veteran | proposal-to-client | fuzz | print-pdf | edge-unicode | anon | back-or-refresh-midflow |  |
| 56 | english-first | invoice-and-vat | differential | share-anonymous | edge-unicode | free-exhausted | guided-context |  |
| 57 | veteran | income-and-hadaf | time-travel | csv-export | heavy | free | guided-context |  |
| 58 | english-first | documents-and-catalog | adversarial | csv-export | empty | free-exhausted | back-or-refresh-midflow |  |
| 59 | sceptic | documents-and-catalog | differential | screen-mobile | heavy | free | in-app-navigation |  |
| 60 | veteran | mobile | time-travel | screen-mobile | realistic | free-exhausted | direct-url |  |
| 61 | newcomer | mobile | metamorphic | screen-mobile | degraded-profile | pro-active | shared-link |  |
| 62 | rusher | documents-and-catalog | state-machine | screen-mobile | edge-unicode | pro-lapsed | back-or-refresh-midflow |  |
| 63 | veteran | recovery | fuzz | screen-desktop | minimal | pro-active | shared-link |  |
| 64 | english-first | recovery | metamorphic | screen-mobile | empty | pro-active | direct-url |  |
| 65 | rusher | english-locale | differential | screen-desktop | degraded-profile | pro-active | direct-url |  |
| 66 | sceptic | income-and-hadaf | fuzz | screen-desktop | degraded-profile | pro-active | guided-context |  |
| 67 | english-first | invoice-and-vat | adversarial | print-pdf | minimal | free-exhausted | back-or-refresh-midflow |  |
| 68 | rusher | clients-and-projects | adversarial | screen-desktop | degraded-profile | free-exhausted | guided-context |  |
| 69 | meticulous | onboarding | metamorphic | screen-mobile | degraded-profile | free | back-or-refresh-midflow |  |
| 70 | newcomer | onboarding | differential | screen-mobile | degraded-profile | free | direct-url |  |
| 71 | english-first | english-locale | metamorphic | screen-desktop | minimal | pro-lapsed | in-app-navigation |  |
| 72 | english-first | proposal-to-client | differential | print-pdf | realistic | anon | shared-link |  |
| 73 | rusher | clients-and-projects | scale | csv-export | heavy | free | in-app-navigation |  |
| 74 | veteran | proposal-to-client | scale | docx-export | heavy | free-exhausted | back-or-refresh-midflow |  |
| 75 | rusher | mobile | time-travel | screen-desktop | heavy | free-exhausted | shared-link |  |
| 76 | sceptic | documents-and-catalog | scale | csv-export | heavy | pro-lapsed | shared-link |  |
| 77 | english-first | income-and-hadaf | differential | screen-mobile | degraded-profile | pro-active | back-or-refresh-midflow |  |
| 78 | newcomer | invoice-and-vat | scale | share-anonymous | heavy | pro-lapsed | guided-context |  |
| 79 | sceptic | proposal-to-client | state-machine | docx-export | minimal | free | in-app-navigation |  |
| 80 | english-first | proposal-to-client | metamorphic | docx-export | realistic | pro-active | direct-url |  |
| 81 | meticulous | proposal-to-client | fuzz | docx-export | degraded-profile | pro-active | back-or-refresh-midflow |  |
| 82 | rusher | recovery | state-machine | screen-mobile | realistic | free-exhausted | back-or-refresh-midflow |  |
| 83 | rusher | english-locale | scale | screen-mobile | heavy | pro-lapsed | in-app-navigation |  |
| 84 | veteran | pricing-tool | scale | screen-mobile | heavy | free | in-app-navigation |  |
| 85 | sceptic | onboarding | fuzz | screen-mobile | empty | free | in-app-navigation |  |
| 86 | rusher | onboarding | state-machine | screen-mobile | empty | free | back-or-refresh-midflow |  |
| 87 | veteran | onboarding | adversarial | screen-mobile | empty | free | in-app-navigation |  |
| 88 | english-first | proposal-to-client | scale | print-pdf | heavy | anon | direct-url |  |
