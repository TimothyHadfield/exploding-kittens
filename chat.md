# Exploding Kittens Lab — chat log

## 2026-10-19 — first build (builder agent, games phase 2 brief)
- **Asked:** Tim: "Also add ... Exploading kittens to the list". Manager brief: exact deck, Party Pack + Imploding variants, rules-check with sources, computers with measured strength, online, exact odds, tracker, hint, study mode, real-table companion, ideas, original art, QA, live.
- **Built:** pure engine + exact-odds belief + 3 computer levels + simulator; Play / Table / Learn / Settings tabs; original SVG card art; online rooms via the shared `_online` module (`js/netgame.js` adapter); `docs/rules-check.md`, `docs/ideas.md`.
- **Verified:** `npm test` 31/31; each test file seen failing against a deliberately broken copy (5 mutations: Defuse count, attack stacking, odds insert, rng leak, private log dropped); full UI games via headless clicks (game-over sheet seen in 3/3); two headless browsers finished an online game on the real Firebase project with no console errors and no leaked secrets; phone-view 393 px + desktop on every tab, no overflow; live check at d50e1ec.
- **Open:** QA agent findings (below if any); real-iPhone check.
