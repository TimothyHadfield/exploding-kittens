// Measures computer strength and gathers the data shown in the Learn tab.
// Usage: node tools/sim.js [games]   -> writes data/strength.json + data/stats.json
import { writeFileSync } from 'node:fs';
import { newGame, apply, view, waitingOn } from '../js/engine.js';
import { decide, makeRng, placeWeights, habitOpts } from '../js/ai.js';
import { beliefFromLog } from '../js/odds.js';

export function playGame(cfg, levels, seed, hooks = {}) {
  let st = newGame(cfg, seed);
  const r = makeRng(seed ^ 0x5bd1e995);
  let steps = 0;
  // every computer knows the others' hiding habits (as a player learns them at a real table)
  const opts = { key: levels.map((l) => l[0]).join(''), place: (s, N, left) => placeWeights(levels[s], N, left) };
  while (st.phase !== 'over') {
    const seat = waitingOn(st)[0];
    const v = view(st, seat);
    const a = decide(v, levels[seat], r, habitOpts(v, opts));
    if (hooks.before) hooks.before(st, a);
    st = apply(st, a, { inPlace: true });
    if (++steps > 4000) throw new Error('runaway game seed ' + seed);
  }
  return st;
}

function winRates(cfg, lineup, games, seed0) {
  const P = lineup.length;
  const wins = {};
  const seats = {};
  for (let g = 0; g < games; g++) {
    // rotate the lineup so seat order doesn't bias anyone
    const rot = lineup.map((_, i) => lineup[(i + g) % P]);
    const st = playGame({ ...cfg, players: P }, rot, seed0 + g);
    const lvl = rot[st.winner];
    wins[lvl] = (wins[lvl] || 0) + 1;
    seats[st.winner] = (seats[st.winner] || 0) + 1;
  }
  const per = {};
  for (const l of new Set(lineup)) {
    const n = lineup.filter((x) => x === l).length;
    per[l] = +(((wins[l] || 0) / games / n) * 100).toFixed(1);
  }
  return per;
}

if (process.argv[1] && process.argv[1].endsWith('sim.js')) {
  const G = +process.argv[2] || 2000;
  const t0 = Date.now();
  const out = { games: G, measured: new Date().toLocaleDateString('en-CA'), heads: {}, table: {} };
  // 1v1 duels (original deck, 2 players)
  for (const [a, b] of [['hard', 'easy'], ['hard', 'medium'], ['medium', 'easy']]) {
    out.heads[`${a}-${b}`] = winRates({ edition: 'original' }, [a, b], G, 1000);
  }
  // 4-player table: one of each + a medium (fair share = 25%)
  out.table.four = winRates({ edition: 'original' }, ['hard', 'medium', 'easy', 'medium'], G, 50000);
  out.table.allHard4 = winRates({ edition: 'original' }, ['hard', 'hard', 'hard', 'hard'], Math.min(G, 1000), 90000);
  console.log(JSON.stringify(out, null, 1));

  // ---- data for the Learn tab ----
  // a) seat advantage: win rate by turn order, 4 equal medium players
  const seatWins = [0, 0, 0, 0];
  // b) what a starting card is worth: win rate when it's in your opening hand
  const cardIn = {}, cardWin = {};
  // c) danger curve: chance top card is a kitten vs cards left (4 players)
  const curve = {};
  // d) where a kitten hidden by a Defuse ends up being drawn by
  for (let g = 0; g < G; g++) {
    const seed = 200000 + g;
    const st = playGame({ edition: 'original', players: 4 }, ['medium', 'medium', 'medium', 'medium'], seed, {
      before(s, a) {
        if (a.type === 'draw' && s.cur === a.seat) {
          const n = s.deck.length;
          const k = s.deck.filter((c) => c.t === 'EK').length;
          (curve[n] = curve[n] || [0, 0]);
          curve[n][0] += k / n; curve[n][1]++;
        }
      },
    });
    const first = st.log[0].first;
    seatWins[(st.winner - first + 4) % 4]++;
    for (const e of st.log) if (e.t === 'hand') {
      const s = e.vis[0];
      // cards[0] is the Defuse everyone gets; count only the 7 dealt cards
      for (const t of new Set(e.cards.slice(1))) {
        cardIn[t] = (cardIn[t] || 0) + 1;
        if (s === st.winner) cardWin[t] = (cardWin[t] || 0) + 1;
      }
    }
  }
  const stats = {
    games: G, setup: '4 players, original deck, all Medium computers',
    seatOrder: seatWins.map((w) => +((w / G) * 100).toFixed(1)),
    cardValue: Object.fromEntries(Object.keys(cardIn).filter((t) => cardIn[t] > G / 10).map((t) => [t, +((cardWin[t] / cardIn[t]) * 100).toFixed(1)])),
    curve: Object.fromEntries(Object.entries(curve).filter(([, v]) => v[1] > 30).map(([n, v]) => [n, +((v[0] / v[1]) * 100).toFixed(1)])),
  };
  writeFileSync(new URL('../data/strength.json', import.meta.url), JSON.stringify(out, null, 1));
  writeFileSync(new URL('../data/stats.json', import.meta.url), JSON.stringify(stats, null, 1));
  console.log(JSON.stringify(stats, null, 1));
  console.log('seconds', (Date.now() - t0) / 1000);
}
