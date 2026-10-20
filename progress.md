# Exploding Kittens Lab — progress

## START HERE
Read order: this file → `CLAUDE.md` → `docs/rules-check.md` → `docs/ideas.md` → `chat.md`.
Last updated: 2026-10-19 (first build, phase 2 brief).

## Goal right now
Tim (via the manager): "Also add ... Exploading kittens to the list" — a study site with the deck exactly right, variants, play vs computers / online, exact kitten odds, card tracker, hint, study mode, real-table companion, own data ideas. First version is done and live; next is whatever Tim says after he tries it.

## Status
| Part | State |
|---|---|
| Rules engine: Original 56 cards, Imploding (+20), Party Pack (122, paw/no-paw by player count), combos 2/3/5, Nope chains, attack stacking | Done, 20 engine tests incl. a 3000 random-game card-count check |
| Exact odds (`js/odds.js`): weighted "worlds", brute-force-checked | Done, 8 odds tests |
| Computers Easy / Medium / Hard | Done. 2,000 games each (`tools/sim.js`, 2026-10-19): Hard beats Medium 78.1%, Easy 99.3% heads-up; Medium beats Easy 91.6%; 4-player table Hard 44.5% / Medium 24.9% / Easy 5.8% (fair 25%) |
| Play tab: dial, next-3, tracker, Nope risk, hint, review vs Hard, study mode, pass-the-phone | Done |
| Online rooms (shared `_online` module) | Done; two headless browsers played a full game on the real Firebase project, secrecy checked |
| Table tab (real-table companion) | Done |
| Learn tab: drill, strength, danger curve, seat order, opening cards | Done |
| QA by a fresh agent | Run 2026-10-19 — see chat.md for result |

## Standing instructions (Tim's words)
- "Also add ... Exploading kittens to the list" (the game request).
- Global: never ask permission; $0; background-only testing; Tim owns looks/wording/names.

## Traps
- `js/online.js` is a verbatim copy of the shared module. Don't edit it here.
- Online `publicView` masks hands, pile, out piles and **the rng** (the rng would let a player predict shuffles). `tests/online.test.js` guards this; keep it passing.
- Online play disables Study mode (it would show other hands).
- Card ids are assigned by type order at setup, so an id reveals a card's type: never send other players' ids.
- Hard computer in Party Pack 8–10 players can take ~0.4 s per move late in the game (many unknown kitten re-inserts).
- Bump `?v=N` on `css/style.css` and `js/app.js` in `index.html` when shipping CSS/JS changes.
- `npm test` takes ~30 s (the secrecy test plays three full games).

## Decisions
- Spare Defuses: 2 back in (1 with 5 players), per the 2025 publisher sheet; Party Pack: all.
- Five-card combo on by default (Settings switch), since the 2025 sheet dropped it but earlier printings and Party Pack have it.
- Attack stacking = official "+2" rule; "off" is a labelled house rule.
- Face-up Imploding Kitten's depth is public (our reading of "everyone can see it coming").
- Player isn't asked to Nope their own fresh play.
- Online: each friend's seat is "Online friend" in the normal seat list; joining is a code box on the Play screen.

## NOT verified
- On a real iPhone (only WebKit headless at 393 px).
- Online with 3+ real people or across a host drop-out (the shared module's tests cover takeover; not run with this game).
- Party Pack 10-player online free-tier cost.

## Rejected / parked
(none yet)
