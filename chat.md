# Exploding Kittens Lab — chat log

## 2026-10-19 — first build (builder agent, games phase 2 brief)
- **Asked:** Tim: "Also add ... Exploading kittens to the list". Manager brief: exact deck, Party Pack + Imploding variants, rules-check with sources, computers with measured strength, online, exact odds, tracker, hint, study mode, real-table companion, ideas, original art, QA, live.
- **Built:** pure engine + exact-odds belief + 3 computer levels + simulator; Play / Table / Learn / Settings tabs; original SVG card art; online rooms via the shared `_online` module (`js/netgame.js` adapter); `docs/rules-check.md`, `docs/ideas.md`.
- **Verified:** `npm test` 31/31; each test file seen failing against a deliberately broken copy (5 mutations: Defuse count, attack stacking, odds insert, rng leak, private log dropped); full UI games via headless clicks (game-over sheet seen in 3/3); two headless browsers finished an online game on the real Firebase project with no console errors and no leaked secrets; phone-view 393 px + desktop on every tab, no overflow; live check at d50e1ec.
- **Open:** QA agent findings (below if any); real-iPhone check.

## 2026-10-20 — QA fix round (builder agent)
- **Asked (coordinator, from QA):** Party 8–10 freeze; dial too low against Medium/Hard; Table "One fewer" crash, silently dropped events, defuse Cancel, Undo after "Someone defused it", face-up IK in "I saw the top"; Learn resetting on computer moves; duplicate toasts; pass-the-phone review pooled; browser Back leaving the site; possible online stall after a host reload.
- **Built:** cached incremental odds with world caps and light mode for Easy/Medium; odds model each computer's hiding habit (engine `insert` event now carries `left`); Play tab patched in place, log scroll only on laptop after paint; `renderIfPlay`; Table refuses impossible changes, groups two-event taps for Undo, logs a defuse only on Save, records a face-up IK; same toast shown once per 2 s; review per person; tab history. Dial help text reworded (flagged to Tim).
- **Verified:** `npm test` 37/37; the 6 new Table tests all failed on the old code first; calibration 300 games (4 Hard 14.2% → 14.7%, was 14.5% → 38.2%); Party 10 Medium in node: decide avg 2.3 ms, max 223 ms, belief max 85 ms (was 1–35 s); WebKit 393 px: render avg 92 → 42 ms; Learn kept its open section and slider through 11 computer moves; Back went Table → Learn → Play; Table count stopped at the kitten count with no errors.
- **Open:** online stall after host reload (not reproduced); real iPhone speed for Party 10; strength numbers measured before the light belief.

## 2026-10-20 — visual design pass (builder agent)
- **Asked (manager):** Tim: "once you're finished with all the games, review them again for design improvements especially visually ... just start working."
- **Built:** card faces get a top shine, inner keyline and band edge; card back gets a dot pattern, glow and medallion; overlapped hand cards draw icon/name inside the visible strip; your-turn status edge + slow Draw glow; opponent-turn pulse; disabled Play/Draw read as "off" (neutral, not muddy); laptop hand 92 → 112 px, seats centred and larger; phone Play dial 118 → 132 px; Table stats no longer wrap on laptop; `?` buttons get a 40 px tap area; selected card lifts with a small overshoot. No rule or wording changes.
- **Verified:** `npm test` 37/37; phone-view 393 px + desktop before/after on setup, game, selected card, Cards sheet, Table, Learn, Settings: no overflow, no console errors (shots in the manager scratchpad `design/exploding-kittens/`).
- **Open:** real iPhone look; reviewer ideas not done (smaller phone header, setup fitting without scroll, Defuse/Favor redraws) left for Tim.

## 2026-10-20 — sounds, celebrations, animations (builder agent)
- **Asked (manager):** Tim: "add opptional sounds ... win celebrations, and other fun annimations ... customizable in the settings". Ideas: draw tension, explosion + shake, Defuse snip + relief, Nope stamp, See the Future whoosh, Shuffle, Attack, Skip, Favor/steal, eliminated, win.
- **Built:** `js/fx.js` (verbatim shared library), `js/sfx.js` (event → sound/animation map, 5 custom sounds, Table-tab sounds, drumroll rule), wiring in app.js (local, pass-the-phone, online snapshot diff), "Sound & effects" panel in Settings, CSS so Animations off / Fast also cover the existing deal, land, sheet and boom animations. Full map in progress.md.
- **Verified:** `tests/fx.test.js` 7 tests (failed first: module missing), `npm test` all green; headless WebKit 393 px + 1440 px: spy on FX.play saw shuffle/deal/turn/draw/snip/phew/explosion/win/lose in real games; Animations off → 0 animations through 14 game events; drumroll delays the draw 150–550 ms; storage blocked plays fine; Settings' fx Speed no longer changes Computer speed; no console errors, no overflow. Confetti screenshots in Chrome headless.
- **Open:** real iPhone audio; online room with two browsers.
