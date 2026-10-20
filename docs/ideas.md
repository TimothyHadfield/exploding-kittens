# Ideas — Exploding Kittens Lab

Our own data / theory ideas. **Build** = in the site now. **Skip** = not built, with the reason.

| # | Idea | Verdict | Where / why |
|---|---|---|---|
| 1 | **Exact kitten odds**: chance the top card is a kitten from everything you know (draws, See the Future, where you hid kittens, unknown re-inserts, shuffles) | Build | Play dial; `js/odds.js`, checked against brute force in `tests/odds.test.js` |
| 2 | **Next-3 boxes**: kitten chance for each of the next 3 cards | Build | Under the dial |
| 3 | **Card tracker**: in game / played / yours / unseen per card | Build | Side panel (laptop), "Cards" sheet (phone) |
| 4 | **Nope risk** on the Play button: chance someone holds a Nope | Build | Play button label |
| 5 | **Hint**: what the Hard computer would do, and why, in one line | Build | Hint button |
| 6 | **After-game review**: how often your moves matched Hard, and the riskiest disagreements | Build | Game-over sheet |
| 7 | **Study mode**: see every hand and the top of the pile | Build | Settings (local games only) |
| 8 | **Real-table companion**: tap what happens at a real table, get the bomb odds | Build | Table tab |
| 9 | **Odds drill**: practice table math, average miss tracked | Build | Learn tab |
| 10 | **Danger curve**: average kitten chance by cards left (2,000 simulated games) | Build | Learn tab |
| 11 | **Does seat order matter?** win rate by turn order | Build | Learn tab (answer: barely, 24–26%) |
| 12 | **Best opening cards**: win rate when a card was dealt to you | Build | Learn tab (an extra Defuse is worth +13 points) |
| 13 | **Measured computer strength** (Easy / Medium / Hard) | Build | Learn tab, `tools/sim.js` |
| 14 | Hard computer hides a defused kitten exactly where the next player draws it | Build | `js/ai.js` |
| 15 | Rule switches for disputed rules (attack stacking, five-card combo, faster game, 2-player Imploding) | Build | Settings, sourced in `docs/rules-check.md` |
| 16 | Opponent profiling: learn where *you* tend to hide kittens and weight the odds | Skip | Needs many games from one person; the uniform assumption is the honest default |
| 17 | Other expansions (Streaking, Barking, Zombie) | Skip | Many new card rules; Imploding + Party Pack cover the asked variants |
| 18 | Sound effects | Skip | Tim's call (look and feel); off by default anyway on phones |
| 19 | "Expected turns survived" for each possible play | Skip | Hint + odds already answer "what should I do"; a table of numbers would crowd the phone screen |
