# Rules check — Exploding Kittens

Every rule and number the engine uses, with the source it was checked against. Checked 2026-10-19.

**Sources**
- **[A]** Publisher rule sheet, *Exploding Kittens — Original Edition* (2025 print, LONS-202504-79): https://cdn.shopify.com/s/files/1/0345/9180/1483/files/ekoe-instructions-english.pdf (linked from https://www.explodingkittens.com/pages/rules-kittens)
- **[B]** Publisher rule sheet, *Imploding Kittens* expansion (2023 print, LONS-202310-79): https://cdn.shopify.com/s/files/1/0345/9180/1483/files/imploding-english.pdf
- **[C]** University of Waterloo quick-start summary of the Original Edition: https://uwaterloo.ca/childrens-communication-lab/sites/default/files/uploads/documents/exploding-kittens.pdf
- **[D]** RulesPal Party Pack rulebook transcription: https://rulespal.com/exploding-kittens-party-pack/rulebook
- **[E]** Library catalogue record, Party Pack, "122 cards": https://lexington.minlib.net/Record/.b41025969
- **[F]** Third-party rule summaries: https://www.wargamer.com/exploding-kittens/rules , https://gamerules.com/rules/exploding-kittens-rules/ , https://qcsalon.net/en/exploding-kittens

Status: ✅ two sources agree · ☑️ one official source · ⚠️ interpretation / not fully confirmed.

## Original Edition (56 cards, 2–5 players)
| Fact | Value in engine | Source | Status | Test |
|---|---|---|---|---|
| Exploding Kitten | 4 | A (field guide), C | ✅ | `box counts` |
| Defuse | 6 | A, C | ✅ | |
| Attack | 4 | A | ☑️ | |
| Skip | 4 | A | ☑️ | |
| Favor | 4 | A | ☑️ | |
| Shuffle | 4 | A | ☑️ | |
| See the Future | 5 | A | ☑️ | |
| Nope | 5 | A | ☑️ | |
| Cat cards: Tacocat, Cattermelon, Hairy Potato Cat, Beard Cat, Rainbow-Ralphing Cat | 4 each (20) | A ("4 of each") | ☑️ | |
| Total | 56 | A (cover), C, sum of the above | ✅ | |

## Setup
| Rule | Engine | Source | Status |
|---|---|---|---|
| Remove kittens and Defuses, deal 1 Defuse to each player | yes | A, C | ✅ |
| Spare Defuses: shuffle **2** back in, remove the rest; with 5 players only 1 is left to put back | `min(2, spares)` | A | ☑️ (C says "return all unused" — older/simplified wording; A is the publisher's own sheet, so we follow A) |
| Deal 7 cards each → hands of 8 | yes | A, C, F (Asmodee, RulesPal) | ✅ (some sites say 4 dealt, hands of 5 — that is an older printing; not offered) |
| Kittens inserted = players − 1, extras removed | yes | A, C | ✅ |
| Faster game (recommended for 2–3 players): randomly remove about ⅓ of the deck before inserting kittens | Settings switch; we remove round(⅓) | A, B | ✅ |
| Pick a first player | random seat | A | ☑️ |

## Turn & cards
| Rule | Engine | Source | Status |
|---|---|---|---|
| Play any number of cards (or none), then draw one to end the turn | yes | A, C | ✅ |
| No hand limit; empty hand is fine | yes | A | ☑️ |
| Exploding Kitten: show it; Defuse or you're out. Out player's kitten face up, rest of hand face down (not to discard) | `out[seat]`, not discard | A | ☑️ |
| Defuse: discard it, put the kitten back anywhere in secret, turn over | `insert` action, ends one turn | A, C | ✅ |
| Attack: end turn without drawing; next player takes 2 turns | yes | A, C | ✅ |
| Attacks stack: victim who plays Attack passes current + remaining turns **+ 2** (4, then 6…); after finishing 1 of 2 turns, attacking passes 3 | `turns + 2` when attacked | A (with worked example), B (same text), F (Wargamer, RulesPal) | ✅ — test `attack … stack to 4` and `passes 3` |
| "Attacks stack" off | next player always takes 2 | house rule, offered as a switch | ⚠️ not an official rule; labelled as such |
| Skip: end turn without drawing; vs an Attack ends only 1 of the 2 turns | yes | A | ☑️ — test |
| Favor: target gives you a card **they** choose | `give` action by target | A, C | ✅ |
| Shuffle: shuffle the draw pile | yes | A, C | ✅ |
| See the Future: privately view top 3, put back in the same order | yes | A, C | ✅ |
| Nope: stop any action except Exploding Kitten or Defuse; any time, even off-turn; Nope a Nope = Yup; Noped cards stay in discard; can Nope a combo | yes | A, C (C omits Defuse) | ✅ |
| Last player left wins | yes | A, C | ✅ |

## Special combos
| Rule | Engine | Source | Status |
|---|---|---|---|
| Two of a kind: any 2 cards with the same title (not only cats) → steal a **random** card | `pair` | A, D | ✅ |
| Three of a kind: name a card; get it if they have it, else nothing | `triple` | A, D | ✅ |
| Five different cards: take any card from the discard pile | `five`, Settings switch (default on) | D, F (Wargamer, gamerules, qcsalon) | ✅ — **note:** the 2025 Original Edition sheet [A] no longer prints this combo; earlier printings and the Party Pack do |
| Card text is ignored when played as a combo | yes | A, D | ✅ |
| Five-different: you can't take back one of the 5 cards you just played | engine excludes them | — | ⚠️ our reading (the rule says "from the discard pile"; taking back your own just-played card would make the combo free) |

## Imploding Kittens expansion (20 cards; 2–6 players with the base game)
| Fact / rule | Engine | Source | Status |
|---|---|---|---|
| Imploding Kitten 1, Feral Cat 4, Targeted Attack 3, Reverse 4, Draw from the Bottom 4, Alter the Future 4 = 20 | yes | B (field guide + "20 cards") | ☑️ — test asserts 20 |
| Up to 6 players | edition max 6 | B box/BGG listing | ⚠️ the rule sheet itself doesn't print a player count; 6 = 6 Defuses, one each |
| Setup: total kittens (Imploding + Exploding) = players − 1 → Exploding = players − 2; 2 spare Defuses back | yes | B | ☑️ |
| Two-player variant: 1 Exploding + the Imploding Kitten; first to die loses | Settings switch | B | ☑️ |
| Imploding Kitten: first draw → put back **face up** anywhere (no Defuse); drawn face up → out; can't be Defused or Noped | yes | B | ☑️ |
| Face-up Imploding Kitten has a white border "so everyone can see it coming" | we show its depth to everyone | B | ⚠️ interpretation: we treat its position in the pile as visible |
| Feral Cat: any cat card, never a non-cat card | `comboKind` | B | ☑️ |
| Targeted Attack: any player incl. yourself takes 2 turns; stacks like Attack | yes | B | ☑️ |
| Reverse: reverse order + end turn without drawing; with 2 players = Skip; vs attack ends 1 of 2 turns | yes | B | ☑️ |
| Draw from the Bottom: end turn by drawing the bottom card | yes | B | ☑️ |
| Alter the Future: view top 3, rearrange in any order, continue | yes | B | ☑️ |

## Party Pack (2–10 players)
| Fact | Engine | Source | Status |
|---|---|---|---|
| Paw-print cards: Defuse 3, Attack 4, Skip 4, See the Future 3, Alter the Future 2, Shuffle 2, Draw from the Bottom 3, Favor 2, Nope 4, Feral Cat 2, each cat 3 | `PARTY_PAW` | D | ☑️ |
| No-paw cards: Defuse 7, Attack 7, Skip 6, See the Future 3, Alter 4, Shuffle 4, Bottom 4, Favor 4, Nope 6, Feral 4, each cat 4 | `PARTY_NOPAW` | D | ☑️ |
| 9 Exploding Kittens | 9 | D | ☑️ |
| Total 122 | 44 + 69 + 9 = 122 | D (sum), E (catalogue "122 cards") | ✅ (some retailers say 120) |
| 2–3 players: paw cards only; 4–7: no-paw cards only; 8–10: all | `boxFor` | D, F (Wargamer) | ✅ |
| Deal 1 Defuse each, **all** spare Defuses back; deal 7 each; kittens = players − 1 | yes | D | ☑️ |

## Engine choices that the rules leave open
- The player who just played a card isn't asked whether to Nope it (pointless); they are asked again if someone Nopes them.
- Pair steal is random (the engine picks); the real-table "pick a face-down card" is equivalent.
- When a Defused kitten goes back, the slider offers every spot from top to bottom.
