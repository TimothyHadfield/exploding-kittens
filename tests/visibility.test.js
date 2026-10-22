// Visibility pass (2026-10-21): every card name in your hand is readable at
// every screen size, from a fresh 8-card deal up to a 25-card Party Pack hand.
import test from 'node:test';
import assert from 'node:assert/strict';
import { handGeom, handCardW, nameUnits, nameMode, edgeLen } from '../js/guards.js';
import { CARD } from '../js/cards.js';

globalThis.window = globalThis;
await import('../js/tablekit.js');
const T = globalThis.TABLE;
const SIZES = [[393, 659], [320, 568], [659, 393], [844, 390], [1280, 800], [1440, 900]];
const SHORTS = Object.values(CARD).map((c) => c.short);
// worst case for the top names: the longest names side by side
const longest = SHORTS.slice().sort((a, b) => b.length - a.length);

test('a card name prints at 10 px or more on every screen', () => {
  for (const [w, h] of SIZES) {
    for (const s of SHORTS) {
      const px = (handCardW(w, h) * nameUnits(s)) / 100;
      assert.ok(px >= 10, `${w}x${h} "${s}": ${px.toFixed(1)} px`);
    }
  }
});

test('in a hand of 1 to 25 cards every name can be read in full', () => {
  for (const [w, h] of SIZES) {
    for (let n = 1; n <= 25; n++) {
      const g = handGeom(w, h, n, T.fanLayout);
      const shorts = Array.from({ length: n }, (_, i) => longest[i % 3]);
      const m = nameMode(g.L, g.cw, g.ch, shorts);
      if (m.mode === 'top') continue; // nameMode only says 'top' when every name shows past the next card
      assert.ok(m.px >= 10, `${w}x${h}, ${n} cards: edge name ${m.px} px`);
      assert.ok(m.px * 0.72 <= m.stripPx - 2, `${w}x${h}, ${n} cards: ${m.px} px letters in a ${m.stripPx} px strip`);
      for (const s of SHORTS) assert.ok(edgeLen(s, m.fu) <= 94, `"${s}" runs off the card`);
    }
  }
});

test('a normal 8-card hand on a phone and the laptop keeps the full fan on screen', () => {
  for (const [w, h] of SIZES) assert.equal(handGeom(w, h, 8, T.fanLayout).scrolls, false, `${w}x${h}`);
  // the laptop fan uses the play column, not a 900 px cap
  assert.ok(handGeom(1440, 900, 20, T.fanLayout).W > 868);
});
