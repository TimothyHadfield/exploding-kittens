# Exploding Kittens Lab — progress

## START HERE
Read order: this file → `CLAUDE.md` → `docs/rules-check.md` → `docs/ideas.md` → `chat.md`.
Last updated: 2026-10-20 (real-table look for the Play screen).

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
| Visual design pass (2026-10-20) | Done: card art shine/keyline + patterned back, hand icons kept visible when overlapped, your-turn status edge + Draw glow, opponent-turn pulse, neutral disabled buttons, bigger laptop hand/seats, Table stats unwrapped on laptop, 40 px `?` tap areas |
| Sounds, celebrations, animations (2026-10-20) | Done: shared `js/fx.js` (verbatim copy of `_fx/fx.js`) + game map `js/sfx.js`; "Sound & effects" panel in Settings; 7 tests in `tests/fx.test.js` |
| Real-table look (2026-10-20) | Done: Play screen on a dark-wood table (shared `_table` kit), draw pile as a stack that thins as it's drawn, messy face-up discard (last 5, seeded tilt), your hand as an arced fan, seats with name plates + fanned card backs + face-up kitten when out (arc round the far side on laptop), new cards fly off the pile and turn face up, your played cards glide onto the pile; phone-sideways layout (piles left, hand right). Real-game notes: scratchpad `table/exploding-kittens/real.md` |
| QA by a fresh agent | Run 2026-10-19; every item fixed 2026-10-20 (see chat.md) |

## Standing instructions (Tim's words)
- "Also add ... Exploading kittens to the list" (the game request).
- "add opptional sounds you can add to the games that reflect what's happening in the game accurately as well as win celebrations, and other fun annimations to go along with everything. Just make sure everything is customizable in the settings so the user can play as preffered." (2026-10-20)
- "could you also make sure that each of the games also have a look to them so that the game (either board or card layout) looks almost identical to how the board or card layout looks like in real life, so it's easy to understand if you've already played it before, and also so it feels more like you're actually playing in real life rather than you're playing it online. Even things like how youre cards or other things are laid out infront of you, make it look like they are actual cards laid out similar to how it looks like in real life. Make the decks look like actual decks. Make the board have the same design as it does in real life with the same layouts. It should look kind of like you're looking through a camera that is connected to a user's glasses that is playing in real life (not actually, but the layout and style of everything should be similar)." (2026-10-20)
- Global: never ask permission; $0; background-only testing; Tim owns looks/wording/names.

## Event → sound map (`js/sfx.js`; others' moves at 0.75 volume)
| Event | Sound | Animation |
|---|---|---|
| New game | shuffle, 3× cardDeal | pile shakes |
| Turn becomes yours (not repeat attacked turns) | turn chime | "Your turn" pops; dial pulses if kitten chance ≥ 30% |
| Card played | cardFlip | computer's card flies from its seat to the discard |
| Nope / Yup | stamp (Yup higher) | "NOPE!" red / "YUP!" green floats off the discard, discard pops |
| See the Future / Alter resolves | whoosh | pile flashes blue |
| Skip resolves | whoosh (higher) | — |
| Draw (any seat) | cardDeal | card flies from pile to that seat; your new card deals in (existing) |
| Draw with kitten chance ≥ 30% (odds shown) | roll (drumroll) first, draw waits 360 ms | pile shakes |
| Imploding Kitten drawn face down / put back face up | ominous low note | pile shakes |
| Defuse | snip, then phew | felt flashes green, "Defused!" floats; your defuse = star sparkle |
| Kitten hidden back | cardSlide | — |
| Explosion (player out) | explosion | orange boom flash (existing), game shakes, their seat flashes red |
| Shuffle | shuffle | pile shakes |
| Attack | hit | target seat/hand shakes, "N turns" floats |
| Reverse | slide | — |
| Favor given | cardDeal | card flies giver → taker |
| Pair steal / 3-of-a-kind hit | snatch | card flies |
| 3-of-a-kind miss / empty hand | miss | asked seat shakes |
| Five-card pick | cardDeal | card flies from discard |
| A Defuse lands in your hand | — | star sparkle |
| Game over | win fanfare + confetti (you or any person at the table in pass-the-phone) / lose | — |
| Illegal move or bad room code | error | — |
| Table tab taps | safe = cardDeal; kitten = cardDeal + explosion (or snip + phew if hidden); shuffle; saw = whoosh; altered/hid = cardSlide | explosion shakes the odds panel |
Online: sounds come from the snapshot log diff, so every player hears every move; each sees their own win/lose.

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
- Bump `?v=N` on `css/table.css`, `css/style.css` and `js/app.js` in `index.html` when shipping CSS/JS changes (now `v=6`). `js/art.js` has no `?v`; it can lag ~10 min behind on Pages' cache.
- Hand cards get `cardSVG(t, { tight: true })` when overlapped (>8 px): icon shifts left into the visible strip. Laptop hand card width is 112 px in both `style.css` (`--cw`) and `handOverlap()` — change both together.
- `npm test` takes ~30 s (the secrecy test plays three full games).
- `js/fx.js` is a verbatim copy of `Board and Card Games/_fx/fx.js`: never edit it here. Game sounds/anims live in `js/sfx.js` (`FX.define` for snip/phew/snatch/roll/ominous).
- fx.js is 1.0.3: its "Effects speed" buttons use `data-fxspeed`, so the old `.fx-set` guard is gone. Computer speed goes through `settingsTap` (ui.js); `tests/settings.test.js` renders the real fx rows and checks they never change Computer speed (failed on fx 1.0.0 without the guard).
- `css/table.css` and `js/tablekit.js` are verbatim copies of `Board and Card Games/_table/table.css` / `table.js` (renamed to `tablekit.js` because the game's own `js/table.js` is the Table tab). Never edit them here.
- Hand fan: `handFan()` in app.js (kit's `fanLayout`); card width must match `--cw` in style.css; hand height is fixed per screen size so nothing jumps. Phone sideways (height ≤ 500) uses a two-column grid; `handFan` uses the right column's width. A resize re-renders Play.
- Played-card glide: `act()` records hand rects in `S.fromRects`; `playOnto()` animates the pile card from there (online: waits for the snapshot). Others' cards get the `land` drop only when the top card changes (`S.lastTop`).
- `html.fx-noanim` (Animations off) kills every CSS animation/transition; `html.fx-fast` shortens deal/land/sheet/boom. Set by `fxClasses()` in app.js.
- `fx.js`, `tablekit.js` and `sfx.js` are imported with `?v=6`; bump with app.js.

## Decisions
- Spare Defuses: 2 back in (1 with 5 players), per the 2025 publisher sheet; Party Pack: all.
- Five-card combo on by default (Settings switch), since the 2025 sheet dropped it but earlier printings and Party Pack have it.
- Attack stacking = official "+2" rule; "off" is a labelled house rule.
- Face-up Imploding Kitten's depth is public (our reading of "everyone can see it coming").
- Player isn't asked to Nope their own fresh play.
- Online: each friend's seat is "Online friend" in the normal seat list; joining is a code box on the Play screen.
- Odds assume a computer hides kittens by its known habit, and a person hides them anywhere at random (dial help text says so).
- Each tab switch is a browser history step (Back returns to the last tab).
- Table surface: dark wood (a kitchen table; EK has no board). Odds dial sits on a dark disc so it reads on wood. Card backs stay our own dark-red design.

## NOT verified
- On a real iPhone (only WebKit headless at 393 px).
- Real-table look: the review sub-agent couldn't run (concurrent agent limit), so the "does it look like the real game" pass was self-review only. Real card face layout (where the icon/title/instructions sit) was not checked against photos; card art (art.js) unchanged.
- How the sounds actually sound: headless WebKit on Windows has no Web Audio, so only the calls were checked (spy on FX.play), not the audio. Confetti seen in Chrome headless (WebKit headless too slow to draw frames).
- Sounds/animations in a live online room (mapping shares code with local play; not run with two browsers).
- Party 10 speed on a real phone: node on a busy laptop, Medium decide avg 2.3 ms, max 223 ms; dial belief max 85 ms (target was under 50 ms). WebKit headless still shows paint gaps up to ~1 s on that busy machine, though our own render work averages 42 ms.
- Online stall after a host reload (QA saw it once in ~9 runs; not reproduced).
- Online with 3+ real people or across a host drop-out (the shared module's tests cover takeover; not run with this game).
- Party Pack 10-player online free-tier cost.

## Rejected / parked
(none yet)
