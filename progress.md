# Exploding Kittens Lab — progress

## START HERE
Read order: this file → `CLAUDE.md` → `docs/rules-check.md` → `docs/ideas.md` → `chat.md`.
Last updated: 2026-10-20 (QA fix round).

## Goal right now
Tim (via the manager): "Also add ... Exploading kittens to the list" — a study site with the deck exactly right, variants, play vs computers / online, exact kitten odds, card tracker, hint, study mode, real-table companion, own data ideas. First version and the QA fix round are done and live; next is whatever Tim says after he tries it.

## Status
| Part | State |
|---|---|
| Rules engine: Original 56 cards, Imploding (+20), Party Pack (122, paw/no-paw by player count), combos 2/3/5, Nope chains, attack stacking | Done, 20 engine tests incl. a 3000 random-game card-count check |
| Exact odds (`js/odds.js`): weighted "worlds", brute-force-checked, cached per seat, models each computer's hiding habit | Done, 8 odds tests. Calibrated on 300 games each (2026-10-20): 4 Hard, predicted 14.2% → actual 14.7%; 4 Medium, 14.5% → 15.4% |
| Computers Easy / Medium / Hard | Done. 2,000 games each (`tools/sim.js`, 2026-10-19): Hard beats Medium 78.1%, Easy 99.3% heads-up; Medium beats Easy 91.6%; 4-player table Hard 44.5% / Medium 24.9% / Easy 5.8% (fair 25%). Measured before Medium/Easy switched to the light belief (cap 300 worlds); not re-run |
| Play tab: dial, next-3, tracker, Nope risk, hint, review vs Hard (per person in pass-the-phone), study mode | Done |
| Online rooms (shared `_online` module) | Done; two headless browsers played a full game on the real Firebase project, secrecy checked |
| Table tab (real-table companion) | Done; QA fixes covered by `tests/table.test.js` (6 tests) |
| Learn tab: drill, strength, danger curve, seat order, opening cards | Done |
| QA by a fresh agent | Run 2026-10-19; every item fixed 2026-10-20 (see chat.md) |

## Standing instructions (Tim's words)
- "Also add ... Exploading kittens to the list" (the game request).
- Global: never ask permission; $0; background-only testing; Tim owns looks/wording/names.

## Traps
- `js/online.js` is a verbatim copy of the shared module. Don't edit it here.
- Online `publicView` masks hands, pile, out piles and **the rng** (the rng would let a player predict shuffles). `tests/online.test.js` guards this; keep it passing.
- Online play disables Study mode (it would show other hands).
- Card ids are assigned by type order at setup, so an id reveals a card's type: never send other players' ids.
- Odds speed: `MAX_WORLDS` 1500 / budget 8000 (Hard, the dial); light 300 / 2000 (Easy, Medium). `beliefFromLog` caches per (seat, policy key) and replays only new log events. Before this, Party 8–10 froze 1–35 s per move.
- The engine's `insert` event carries `left` (the hider's turns left); the odds use it to model where a computer hides a kitten (`placeWeights` in ai.js). Change a computer's hiding habit → change `placeWeights` too, or the dial reads wrong.
- `renderPlay` patches sections in place (`patch(id, html)`); don't go back to rebuilding `#v-play` each move (WebKit stalls). The log scroll runs only on laptop width, after paint.
- Game moves redraw only the Play tab (`renderIfPlay`); redrawing Table/Learn resets what the person is reading.
- Table: two-event taps share a group `g` so Undo removes both; any change that makes `tableBelief` conflict or `bad` is reverted, never silently dropped.
- `window.EK.perf.on = true` turns on per-step timings (scratchpad `lag3.js` reads them).
- Bump `?v=N` on `css/style.css` and `js/app.js` in `index.html` when shipping CSS/JS changes (now `v=3`).
- `npm test` takes ~30 s (the secrecy test plays three full games).

## Decisions
- Spare Defuses: 2 back in (1 with 5 players), per the 2025 publisher sheet; Party Pack: all.
- Five-card combo on by default (Settings switch), since the 2025 sheet dropped it but earlier printings and Party Pack have it.
- Attack stacking = official "+2" rule; "off" is a labelled house rule.
- Face-up Imploding Kitten's depth is public (our reading of "everyone can see it coming").
- Player isn't asked to Nope their own fresh play.
- Online: each friend's seat is "Online friend" in the normal seat list; joining is a code box on the Play screen.
- Odds assume a computer hides kittens by its known habit, and a person hides them anywhere at random (dial help text says so).
- Each tab switch is a browser history step (Back returns to the last tab).

## NOT verified
- On a real iPhone (only WebKit headless at 393 px).
- Party 10 speed on a real phone: node on a busy laptop, Medium decide avg 2.3 ms, max 223 ms; dial belief max 85 ms (target was under 50 ms). WebKit headless still shows paint gaps up to ~1 s on that busy machine, though our own render work averages 42 ms.
- Online stall after a host reload (QA saw it once in ~9 runs; not reproduced).
- Online with 3+ real people or across a host drop-out (the shared module's tests cover takeover; not run with this game).
- Party Pack 10-player online free-tier cost.

## Rejected / parked
(none yet)
