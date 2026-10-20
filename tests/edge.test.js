// Odd moments on the Play screen (edge pass 2026-10-20): big hands, crowded
// tables, reloads, stale picks. The browser checks live in the manager's
// scratchpad (edge/exploding-kittens/ui.mjs); these pin the rules behind them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { seenAfterReload, fanWidth, crowded, keepSel } from '../js/guards.js';
import { newGame, apply, waitingOn } from '../js/engine.js';

// the table kit's fanLayout, as the Play screen calls it
globalThis.window = globalThis;
await import('../js/tablekit.js');
const T = globalThis.TABLE;
const PHONE = { cw: 66, ch: 66 * 1.4, maxRot: 14, minStep: 18 };
const SE = { cw: 58, ch: 58 * 1.4, maxRot: 14, minStep: 18 };
const LAP = { cw: 112, ch: 112 * 1.4, maxRot: 10, minStep: 16 };
function minStrip(n, dev, width) {
  const { W } = fanWidth({ n, width, ...dev });
  const L = T.fanLayout(n, { width: W, cardW: dev.cw, cardH: dev.ch, spread: dev === LAP ? 0.8 : 0.62, maxRot: dev.maxRot });
  return Math.min(...L.slice(1).map((p, i) => p.x - L[i].x));
}

test('a hand of 15, 25 or 40 cards never squeezes a card below a finger width', () => {
  for (const [dev, width] of [[SE, 304], [PHONE, 377], [PHONE, 329], [LAP, 728]]) {
    for (const n of [8, 15, 25, 35, 40]) {
      const s = minStrip(n, dev, width);
      assert.ok(s >= dev.minStep - 0.01, `${n} cards in ${width}px: ${s.toFixed(1)}px strip`);
    }
  }
  // a normal hand still fits the screen without sliding
  assert.equal(fanWidth({ n: 8, width: 377, ...PHONE }).scrolls, false);
  assert.equal(fanWidth({ n: 40, width: 377, ...PHONE }).scrolls, true);
});

test('6+ players on a phone: seats shrink instead of running off screen', () => {
  assert.equal(crowded(3, 393, false), false);
  assert.equal(crowded(9, 393, false), true);
  assert.equal(crowded(5, 320, false), true);
  // laptop: the width is the play column (about 760px at 1280); 9 big seats don't fit
  assert.equal(crowded(4, 760, true), false, 'laptop has room for a normal table');
  assert.equal(crowded(9, 760, true), true, 'Party 10 on a laptop: seats were cut off at both ends');
  // every crowded seat gets at least 30px at the narrowest phone
  assert.ok((320 - 12 - 8 * 3) / 9 >= 30);
});

test('reload right after See the Future shows what you saw again, never stale', () => {
  const log = [{ t: 'setup' }, { t: 'turn', seat: 0 }, { t: 'play', seat: 0 }, { t: 'resolve', ok: true }, { t: 'saw', vis: [0], cards: ['EK', 'TACO', 'SKIP'] }];
  assert.equal(seenAfterReload(log), 4, 'the saw event counts as new');
  assert.equal(seenAfterReload([...log, { t: 'shuffle', seat: 1 }]), 6, 'a shuffle since: nothing to re-show');
  assert.equal(seenAfterReload([...log, { t: 'draw', seat: 0 }, { t: 'turn', seat: 1 }]), 7);
  assert.equal(seenAfterReload([{ t: 'setup' }, { t: 'turn' }]), 2);
});

test('a picked card that was stolen is dropped from the pick', () => {
  let g = newGame({ players: 3 }, 4);
  g.cur = 1; g.phase = 'turn';
  const mine = g.hands[0];
  // seat 1 steals with a pair (random card)
  g.hands[1].push({ id: 9001, t: 'TACO' }, { id: 9002, t: 'TACO' });
  const sel = mine.map((c) => c.id);
  g = apply(g, { type: 'play', seat: 1, cards: [9001, 9002], target: 0 });
  while (g.phase === 'nope') g = apply(g, { type: 'pass', seat: waitingOn(g)[0] });
  const kept = keepSel(sel, g.hands[0]);
  assert.equal(kept.length, sel.length - 1);
  assert.ok(kept.every((id) => g.hands[0].some((c) => c.id === id)));
});
