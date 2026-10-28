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
