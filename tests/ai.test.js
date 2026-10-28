// Computer habits a repeat player could learn, and the hiding model the odds use.
import test from 'node:test';
import assert from 'node:assert/strict';
import { decide, placeWeights, makeRng, habitOpts } from '../js/ai.js';

// Hard has just defused with 20 cards in the pile and one turn (its last).
const defuseView = () => ({ me: 0, phase: 'defuse', deckCount: 20, turns: 1, hand: [], alive: [true, true, true], log: [] });

test('Hard does not always hide a defused kitten on top for the next player', () => {
  const spots = new Map();
  for (let s = 1; s <= 400; s++) {
    const a = decide(defuseView(), 'hard', makeRng(s));
    spots.set(a.pos, (spots.get(a.pos) || 0) + 1);
  }
  const top = (spots.get(0) || 0) / 400;
  assert.ok(top > 0.4 && top < 0.75, `top share ${top}`); // still its favourite spot, but not a sure thing
  assert.ok(spots.size >= 5, `only ${spots.size} different spots`);
});

test('Hard hiding spots follow the weights the odds model uses', () => {
  const w = placeWeights('hard', 20, 0);
  const sum = w.reduce((a, x) => a + x, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  const n = 4000, count = Array(21).fill(0);
  for (let s = 1; s <= n; s++) count[decide(defuseView(), 'hard', makeRng(s * 7)).pos]++;
  for (let i = 0; i <= 20; i++) assert.ok(Math.abs(count[i] / n - w[i]) < 0.03, `spot ${i}: ${count[i] / n} vs ${w[i]}`);
});

test('habit reading only at a table of three or more', () => {
  const o = { place: () => null };
  assert.equal(habitOpts({ alive: [true, true] }, o).place, undefined);
  assert.equal(habitOpts({ alive: [true, true, false, true] }, o), o);
});

// ---- Streaking pack (wave 3)
import { newGame, apply, view, waitingOn, legalActions } from '../js/engine.js';
import { playGame } from '../tools/sim.js';

const sgame = (hands, top = []) => {
  const st = newGame({ players: 3, streak: true }, 9);
  let id = 1000;
  st.hands = hands.map((h) => h.map((t) => ({ id: id++, t })));
  st.deck = top.map((t) => ({ id: id++, t })).concat(Array.from({ length: 8 }, () => ({ id: id++, t: 'TACO' })));
  st.cur = 0;
  return st;
};
const legal = (st, a) => legalActions(st, a.seat).some((x) => JSON.stringify({ ...x, card: x.card ?? null }) === JSON.stringify({ ...x, ...a, card: a.card ?? null }));

test('Streaking: every level plays every new card legally, to the end of the game', () => {
  for (const edition of ['original', 'imploding']) {
    for (let g = 0; g < 40; g++) {
      const lv = [['easy', 'medium', 'hard'], ['hard', 'hard', 'easy', 'medium'], ['medium', 'easy']][g % 3];
      const st = playGame({ edition, players: lv.length, streak: true }, lv, 7000 + g);
      assert.equal(st.phase, 'over');
    }
  }
});

test('Streaking: Medium and Hard hand a kept kitten over when asked for a Favor', () => {
  let st = sgame([['FAV', 'DEF'], ['TACO', 'EK', 'STREAK', 'SKIP'], ['BEARD']]);
  st = apply(st, { type: 'play', seat: 0, cards: [st.hands[0][0].id], target: 1 });
  for (const lv of ['medium', 'hard']) {
    const a = decide(view(st, 1), lv, makeRng(1));
    assert.equal(st.hands[1].find((c) => c.id === a.card).t, 'EK', lv);
  }
});

test('Streaking: a blind computer only draws or turns over a random card', () => {
  const st = sgame([['TACO', 'SKIP', 'DEF'], ['BEARD'], ['MELON']], ['EK']);
  st.blind[0] = true;
  for (const lv of ['easy', 'medium', 'hard']) for (let s = 1; s < 20; s++) {
    const a = decide(view(st, 0), lv, makeRng(s));
    assert.ok(['draw', 'blind'].includes(a.type), `${lv}: ${a.type}`);
  }
});

test('Streaking: holding the Streaking Kitten, a likely kitten is no reason to dodge', () => {
  // 2 cards left, 1 a kitten; Hard holds a Skip, a Defuse and the Streaking Kitten
  const v = {
    me: 0, phase: 'turn', cur: 0, dir: 1, turns: 1, deckCount: 2, alive: [true, true, true], handCounts: [3, 4, 4],
    defusesUsed: [0, 0, 0], discard: [], cfg: { five: true, streak: true }, blind: [false, false, false],
    hand: [{ id: 1, t: 'STREAK' }, { id: 2, t: 'SKIP' }, { id: 3, t: 'DEF' }],
    log: [{ t: 'setup', players: 3, deck: 2, ek: 1, ik: 0, removed: 0, streak: true }, { t: 'hand', vis: [0], cards: ['STREAK', 'SKIP', 'DEF'] }],
  };
  assert.equal(decide(v, 'hard', makeRng(3)).type, 'draw');
  // without it, Hard skips
  const v2 = { ...v, hand: v.hand.slice(1), log: [v.log[0], { t: 'hand', vis: [0], cards: ['SKIP', 'DEF'] }] };
  assert.equal(decide(v2, 'hard', makeRng(3)).type, 'play');
});
