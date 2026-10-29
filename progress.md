# Exploding Kittens Lab — progress

## START HERE
Read order: this file → `CLAUDE.md` → `docs/rules-check.md` → `docs/ideas.md` → `chat.md`.
Last updated: 2026-10-28 (wave 3: Rules sheet Videos tab, phone-sideways layout fix, optional Streaking pack with all three computer levels, odds and online; live at 923d3f2).

## Goal right now
Tim (via the manager): "Also add ... Exploading kittens to the list" — a study site with the deck exactly right, variants, play vs computers / online, exact kitten odds, card tracker, hint, study mode, real-table companion, own data ideas. First version and the QA fix round are done and live; next is whatever Tim says after he tries it.

## Status
| Part | State |
|---|---|
| Rules engine: Original 56 cards, Imploding (+20), Party Pack (122, paw/no-paw by player count), combos 2/3/5, Nope chains, attack stacking | Done, 20 engine tests incl. a 3000 random-game card-count check |
| Exact odds (`js/odds.js`): weighted "worlds", brute-force-checked, cached per seat, models each computer's hiding habit | Done, 8 odds tests. Calibrated on 300 games each (2026-10-20): 4 Hard, predicted 14.2% → actual 14.7%; 4 Medium, 14.5% → 15.4% |
| Computers Easy / Medium / Hard | Done. 2,000 games each (`tools/sim.js`, 2026-10-27, after the hiding change): Hard beats Medium 74.1%, Easy 99% heads-up; Medium beats Easy 91.6%; Hard vs 3 Medium 39.3% (fair 25%, ≈ 66% head-to-head); Medium vs 3 Easy 56.6%; 4-player table Hard 41% / Medium 27.4% / Easy 4.2%; Party 6 Hard vs 5 Medium 27.1% (fair 16.7%). Scratch ladder: `improve/exploding-kittens/ladder.mjs` |
| Play tab: dial, next-3, tracker, Nope risk, hint, review vs Hard (per person in pass-the-phone), study mode | Done |
| Online rooms (shared `_online` module) | Done; two headless browsers played a full game on the real Firebase project, secrecy checked |
| Table tab (real-table companion) | Done; QA fixes covered by `tests/table.test.js` (6 tests) |
| Learn tab: drill, strength, danger curve, seat order, opening cards | Done |
| Visual design pass (2026-10-20) | Done: card art shine/keyline + patterned back, hand icons kept visible when overlapped, your-turn status edge + Draw glow, opponent-turn pulse, neutral disabled buttons, bigger laptop hand/seats, Table stats unwrapped on laptop, 40 px `?` tap areas |
| Sounds, celebrations, animations (2026-10-20) | Done: shared `js/fx.js` (verbatim copy of `_fx/fx.js`) + game map `js/sfx.js`; "Sound & effects" panel in Settings; 7 tests in `tests/fx.test.js` |
| Real-table look (2026-10-20) | Done: Play screen on a dark-wood table (shared `_table` kit), draw pile as a stack that thins as it's drawn, messy face-up discard (last 5, seeded tilt), your hand as an arced fan, seats with name plates + fanned card backs + face-up kitten when out (arc round the far side on laptop), new cards fly off the pile and turn face up, your played cards glide onto the pile; phone-sideways layout (piles left, hand right). Real-game notes: scratchpad `table/exploding-kittens/real.md` |
| QA by a fresh agent | Run 2026-10-19; every item fixed 2026-10-20 (see chat.md) |
| Visibility pass (2026-10-27) | Done: hand cards bigger (phone 66→76 px, SE 58→68) so names print ≥ 10.9 px; tight hands write names down each card's strip (`nameMode` in guards.js, `cardSVG(t,{edge})`); piles + dial size to the felt's height (container query, laptop 150→176–198 px piles); laptop fan uses the column (no 900 px cap); crowded seats' counts 12 px (13 on laptop); See the Future / Alter sheet cards 70→106–120 px; a Nope chain stacks down the discard so each Nope is countable ("2 Nopes" label). Harness + shots: scratchpad `vis/exploding-kittens/` (`vis.mjs`, `taps.mjs`, `before3/` vs `after/`); `tests/visibility.test.js` |
| Improvement pass (2026-10-27) | Done: Hard hides a defused kitten with a mixed habit (`HARD_HIDE`, was always on top); My stats / achievements / Daily (`_profile` kit + `js/ekprofile.js`); guided first game + rules sheet (`_coach` kit + `js/ekcoach.js`, rules tabs wrap via game CSS); Undo vs computers (not in Daily); end-of-game Replay (`js/replay.js`, rebuilt from seed + moves); computer cat faces with moods (`js/faces.js`); big boom / defuse moment overlay; home-screen app (`_pwa` 1.2.0, `tests/pwa-check.json`, 18/18); fx.js re-copied. UI walk `tests/improve-ui.mjs` at 393, 320, 659×393, 1280 |
| Wave 3 (2026-10-28) | Done, live 923d3f2: Rules sheet **Videos** tab (5 checked YouTube links); phone sideways (659×393) seats sit over the piles and the hand fills the right column (no empty strip); **Streaking pack** (Rules switch, off by default, not with Party Pack): 15 cards = Streaking Kitten, Super Skip, See the Future 5x, Alter the Future 5x, Swap Top and Bottom, Garbage Collection, Catomic Bomb, Mark, Curse of the Cat Butt; ek = players − 1 (− Imploding). Engine + `tests/streak.test.js` (17, incl. 80-game conservation fuzz and dial calibration < 0.03), odds brute-force tests (+4), AI tests (+4), online masking test. Streak ladder 1000 games: Hard–Easy 98.2/1.8, Hard–Medium 76/24, Medium–Easy 85.5/14.5, 4-player H 42.2 / M 26.9 / E 4.1. Base ladder unchanged (2000 games). npm test 91/91 |
| Kit sweep (2026-10-28) | Done, live 971dca8: `_coach` 1.2.0 (offer `place:'auto'`, avoids `.dealbar`; the `--coach-offer-bottom` + rules-link overrides are gone) and `_pwa` 1.4.0, build 14 (style/coach/app/pwa `?v=14`). Offer overlaps tab bar/Deal 0 px at 393×659, 320×568, 659×393; Settings 320 px no sideways scroll; npm test 91/91, pwa-check 18/18, improve-ui ALL PASS |
| Edge pass (2026-10-20) | Done: ~60 weird scenarios, 23 engine probes + 300 bot games all pass, 52 browser checks; 14 real failures fixed (table below) |

## Edge pass scenarios (2026-10-20)
Scenario list + harness: scratchpad `edge/exploding-kittens/` (`scenarios.md`, `probe.mjs`, `ui.mjs`; results `before.txt` / `final.txt`). Browser checks in headless WebKit at 320, 393, landscape 844×390, 1280 and 1920.
| Scenario | Before | Fix |
|---|---|---|
| Double-tap Draw while attacked (2 turns) | drew 2 cards | 450 ms double-tap guard on Draw/Play |
| Second tap of a double-tap lands on a sheet that just opened | could answer it | sheet ignores taps for 320 ms after it appears |
| Hand of 25–40 cards (phone, SE, sideways) | card strips 5–11 px | strip never below 18 px; fan slides sideways (`.hand.scrolls`) |
| Party 10 (9 opponents) on phone / SE / sideways / **laptop** | 5–6 seats off screen (laptop: 2 cut off) | `.opps.crowd`: smaller seats, all on screen |
| Two computers with the same name | identical target buttons | " · seat N" added |
| Blank seat name | "Player" | "Player 2" |
| Back from Menu / Back with Cards sheet open | left the site / went to Settings | history steps for Menu and the info sheet |
| Typing on the Menu mid-game | wiped by computer moves | Menu pauses the computers |
| See the Future with 1 card left | "The top 1 cards" | "The last card in the pile" |
| Alter with 1 card left | swap UI with nothing to swap | "Only one card is left…" |
| Five different cards, empty discard | "Not a play" | "Discard is empty" |
| Reload right after See the Future | sheet gone | re-shown until the pile changes |
| Selected card stolen, then Play | stale pick kept | dropped (`keepSel`) |
| Tab left hidden | computers played on | they wait until you're back |
Passed already: reloads (mid-turn, defuse slider, game over), storage blocked, Settings during Defuse, rapid taps, drumroll re-tap, Favor with 30 cards, 600-event log, two tabs, 200% zoom, Hint speed (134 ms in-page; 2.6 s earlier was Playwright waiting for animations).

## Standing instructions (Tim's words)
- "Also add ... Exploading kittens to the list" (the game request).
- "add opptional sounds you can add to the games that reflect what's happening in the game accurately as well as win celebrations, and other fun annimations to go along with everything. Just make sure everything is customizable in the settings so the user can play as preffered." (2026-10-20)
- "could you also make sure that each of the games also have a look to them so that the game (either board or card layout) looks almost identical to how the board or card layout looks like in real life, so it's easy to understand if you've already played it before, and also so it feels more like you're actually playing in real life rather than you're playing it online. Even things like how youre cards or other things are laid out infront of you, make it look like they are actual cards laid out similar to how it looks like in real life. Make the decks look like actual decks. Make the board have the same design as it does in real life with the same layouts. It should look kind of like you're looking through a camera that is connected to a user's glasses that is playing in real life (not actually, but the layout and style of everything should be similar)." (2026-10-20)
- "I've noticed the games often have good user interfaces but could be improved especially when a scenario happens that the game might've not really thought about or whatnot. Could you focus on making each game perfect especially in scenarios that the game doesn't expect or are a little weird." (2026-10-20)
- "for a lot of the games the cards or board layout is too small to easily see what's going on. Some games just need small design imporvements like filling the screen with the board view and fitting the cards and other things in the empty space, some have severe errors like TTR. Fix this so the view of what's happening and where everything is is very clear. Consider parts of the board that are dense in what's happening and if the user can reasonably see it." (2026-10-21)
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
- **online.js cache stamp (2026-10-27):** every import of `js/online.js` uses `?v=a3d0418b`, the `_online` content stamp. After a re-copy: put the new stamp from `node ../_online/tools/stamp.mjs` there, bump the importing file's `?v=` (and pwa.js `data-version`), then `node ../_online/tools/stamp.mjs --check .` must say OK.
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
- Bump `?v=N` on `css/table.css`, `css/style.css` and `js/app.js` in `index.html` when shipping CSS/JS changes (now `v=8`). `js/art.js` and `js/guards.js` are imported with `?v=8` from app.js.
- Hand card width lives in `handCardW()` (guards.js) AND `--cw` in style.css (76 phone / 68 at ≤360 / 112 laptop): change both. `handFan()` now just calls `handGeom()`.
- Felt piles/dial are sized by a size container on `.felt` (`--pw`, `--ring`, `--proom`, `--droom`); set those vars per breakpoint, not `.pile{width}` directly. `js/ui.js` is imported **unversioned** by table.js and learn.js: never add a new export to ui.js that another file needs, or a stale cached ui.js breaks the import on Pages.
- `js/guards.js` holds the pure edge rules (`seenAfterReload`, `fanWidth`, `crowded`, `keepSel`), tested in `tests/edge.test.js`. `crowded()` is width-based on laptop too (play column, 100 px per seat).
- Menu screen (`S.screen==='setup'`) pauses the computers (`step()` returns early); `resumeGame()` restarts them. A hidden tab sets `S.waitVisible` and resumes on `visibilitychange`. A second tab adopts a newer saved game (`adoptSaved`).
- Sheet tap guard: `renderPrompt` wraps `renderPromptInner` and stamps when a new sheet appears; `onClick` ignores taps inside `#sheet` for 320 ms after that.
- Hand cards get `cardSVG(t, { tight: true })` when overlapped (>8 px): icon shifts left into the visible strip. Laptop hand card width is 112 px in both `style.css` (`--cw`) and `handOverlap()` — change both together.
- `npm test` takes ~30 s (the secrecy test plays three full games).
- `js/fx.js` is a verbatim copy of `Board and Card Games/_fx/fx.js`: never edit it here. Game sounds/anims live in `js/sfx.js` (`FX.define` for snip/phew/snatch/roll/ominous).
- fx.js is 1.0.3: its "Effects speed" buttons use `data-fxspeed`, so the old `.fx-set` guard is gone. Computer speed goes through `settingsTap` (ui.js); `tests/settings.test.js` renders the real fx rows and checks they never change Computer speed (failed on fx 1.0.0 without the guard).
- `css/table.css` and `js/tablekit.js` are verbatim copies of `Board and Card Games/_table/table.css` / `table.js` (renamed to `tablekit.js` because the game's own `js/table.js` is the Table tab). Never edit them here.
- Hand fan: `handFan()` in app.js (kit's `fanLayout`); card width must match `--cw` in style.css; hand height is fixed per screen size so nothing jumps. Phone sideways (height ≤ 500) uses a two-column grid; `handFan` uses the right column's width. A resize re-renders Play.
- Played-card glide: `act()` records hand rects in `S.fromRects`; `playOnto()` animates the pile card from there (online: waits for the snapshot). Others' cards get the `land` drop only when the top card changes (`S.lastTop`).
- `html.fx-noanim` (Animations off) kills every CSS animation/transition; `html.fx-fast` shortens deal/land/sheet/boom. Set by `fxClasses()` in app.js.
- `fx.js`, `tablekit.js` are imported with `?v=8`; `sfx.js`, `ai.js`, `ekprofile.js`, `ekcoach.js`, `faces.js`, `replay.js` with `?v=10`, as are style/coach/profile css, profile/coach/pwa js and app.js in index.html (pwa.js `data-version="10"`). Bump them together.
- Kit copies (never edit here; `.gitattributes` keeps them byte-identical): `js/profile.js` + `css/profile.css` (`_profile` 1.1.0), `js/coach.js` + `css/coach.css` (`_coach` 1.2.0 since 2026-10-28), `sw.js` + `js/pwa.js` + `tools/pwa-check.mjs` (`_pwa` 1.4.0 since 2026-10-28) + `tools/make-icons.mjs`, `js/fx.js`. Re-copied 2026-10-27 (kitsweep, pwa build 11, pwa-check 18/18 WebKit); the kit now wraps the rules tabs itself, so the old style.css override is gone.
- My stats: `recordGame()` in app.js records once per game (`S.recorded`); called by `startGame` too, so leaving after your first move (`S.mine > 0`) is a loss. Hint, Undo, Study mode set `S.helped` (unrated). Guided game (`S.mode==='tutorial'`) and online never count. Daily = seed `Profile.daily.seed()`, you + 3 Medium, computers use a seeded rng (`botRng`), no Undo.
- Guided game: seed 3414, 3 players vs 2 Easy (`js/ekcoach.js`); the steps depend on that deal (See the Future shows a kitten 2nd). Change the engine's deal and re-find a seed.
- `habitOpts`: the computers model each other's hiding habit only at 3+ alive players (heads-up it cost Hard 11 points). Hard's hide mix is `HARD_HIDE` in ai.js; `placeWeights('hard')` must match it (tested).
- Replay heading carries `data-key="replay"` so stepping isn't treated as a new sheet by the 320 ms tap guard.
- Hand cards are fanned: a headless click on a card's centre lands on the next card. Tests dispatch the click event instead.
- **Never name an engine event field `n`**: `push()` sets `ev.n` = log index. A Garbage event with `n` once made `beliefFromLog` run `scrambleTop(103)` and run out of memory (2026-10-28). Streak events use `size` / `kittens`.
- Cache stamps are now `?v=13` for style.css, app.js, pwa `data-version`, and ai/art/sfx/ekcoach imports (guards.js still v12). Bump together.
- Streaking pack odds: each belief world carries `e` (kittens in the pile) and `h` (bitmask of seats secretly holding a kitten); the Streaking Kitten location is tracked approximately, so the dial shows "≈" counts in streak games. Table tab does not support the pack.
- Blind (Cursed) hand: `ownHand` returns `BACK` ids `-1-i` except Marked cards; netgame `privateView` masks a blind hand the same way.

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
- Daily = you + 3 Medium on the Original deck; level ratings Easy 1200 / Medium 1440 / Hard 1560 from the ladder; achievements and their names, cat faces, moment look and Undo icon placement are Claude's plainest picks (2026-10-27), Tim's to change.
- Streaking pack rulings (Claude's, 2026-10-28, Tim's to change): blind players can't Nope and play only one random card at a time (no combos); an Imploding Kitten's face-down draw doesn't lift the Curse; three-of-a-kind can't name an Exploding Kitten; Catomic Bomb ends one turn; Garbage Collection doesn't end the turn. Looks: Marked cards get a yellow border, a "blind" yellow tag by the seat name, original icons for the 9 new cards. House rules beyond attack stacking: none added (no reliable common one found).
- Huge hands scroll sideways rather than squeeze cards below 18 px (16 px laptop); 6+ seats on a phone (9+ players at 1280 on laptop) shrink instead of scrolling (2026-10-20, Claude's call; plainest option).

## NOT verified
- On a real iPhone (only WebKit headless at 393 px).
- Real-table look: outside reviewer ran 2026-10-20 (from memory of the real game, no photos). Fixed: Exploding Kitten card is black with a burst, card name on top, empty pile shows a worn patch (no dashed box), phone seats arc. Left for Tim: status band across the table, number boxes under the dial, sideways hand on the right, "M"/"H" level letters on plates, short card names, app-style buttons.
- Edge pass: a card stolen while selected in an **online** game only simulated locally; the sheet tap guard and double-tap guard checked with headless taps, not a real finger.
- How the sounds actually sound: headless WebKit on Windows has no Web Audio, so only the calls were checked (spy on FX.play), not the audio. Confetti seen in Chrome headless (WebKit headless too slow to draw frames).
- Sounds/animations in a live online room (mapping shares code with local play; not run with two browsers).
- Party 10 speed on a real phone: node on a busy laptop, Medium decide avg 2.3 ms, max 223 ms; dial belief max 85 ms (target was under 50 ms). WebKit headless still shows paint gaps up to ~1 s on that busy machine, though our own render work averages 42 ms.
- Online stall after a host reload (QA saw it once in ~9 runs; not reproduced).
- Online with 3+ real people or across a host drop-out (the shared module's tests cover takeover; not run with this game).
- Party Pack 10-player online free-tier cost.
- Visibility pass: still small by choice: 16+ card hands keep 18 px strips and slide sideways (edge-pass decision; taps measured 0 wrong); 320 px dial shrank 100→85–90 px because the bigger hand took its height; floating "Defused!"/"NOPE!" text briefly covers the dial/discard (shared fx.js, not edited). Tap check: the first tap round right after a deal sometimes misses in headless (same on main, element under the finger is the right card).

- Improvement pass: faces, moments and the guided game seen only in headless WebKit/Chromium screenshots; online games not in My stats (online was off limits).
- Streaking pack: seen only in headless WebKit/Chromium (393, 320, 659×393, 568×320, 1280, 1440); online streak play covered by a node test, not two browsers; dial odds are an estimate in streak games; Table tab has no streak support.

## Rejected / parked
- ~~Online turn timer~~ parked: online flows were off limits in the 2026-10-27 pass.
