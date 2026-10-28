// The odds engine is checked against brute force: enumerate every possible
// deck order, push each through the same events, and count.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Belief } from '../js/odds.js';

// Brute-force world: list of {w, seq} with seq an array of 'E'|'I'|'U'|'S'.
function allOrders(multiset) {
  const out = new Map();
  const rec = (left, acc) => {
    if (!left.length) { const k = acc.join(''); out.set(k, (out.get(k) || 0) + 1); return; }
    const seen = new Set();
    left.forEach((x, i) => {
      if (seen.has(x)) return; seen.add(x);
      rec(left.slice(0, i).concat(left.slice(i + 1)), acc.concat(x));
    });
  };
  rec(multiset, []);
  let tot = 0; for (const v of out.values()) tot += v;
  return [...out.entries()].map(([k, v]) => ({ w: v / tot, seq: k.split('') }));
}
const brute = {
  start(N, E, I = 0) { const ms = []; for (let i = 0; i < N; i++) ms.push(i < E ? 'E' : i < E + I ? 'I' : 'S'); return allOrders(ms); },
  norm(ws) { const t = ws.reduce((a, b) => a + b.w, 0); return ws.filter((x) => x.w > 0).map((x) => ({ w: x.w / t, seq: x.seq })); },
  draw(ws, x, from = 'top') {
    return brute.norm(ws.map(({ w, seq }) => {
      const c = from === 'top' ? seq[0] : seq[seq.length - 1];
      return { w: c === x ? w : 0, seq: from === 'top' ? seq.slice(1) : seq.slice(0, -1) };
    }));
  },
  insert(ws, x, pos) {
    return ws.map(({ w, seq }) => ({ w, seq: [...seq.slice(0, pos), x, ...seq.slice(pos)] }));
  },
  insertUnknown(ws, x) {
    const out = [];
    for (const { w, seq } of ws) for (let p = 0; p <= seq.length; p++) out.push({ w: w / (seq.length + 1), seq: [...seq.slice(0, p), x, ...seq.slice(p)] });
    return out;
  },
  saw(ws, xs) { return brute.norm(ws.map(({ w, seq }) => ({ w: xs.every((x, i) => seq[i] === x) ? w : 0, seq }))); },
  shuffle(ws) {
    const out = [];
    for (const { w, seq } of ws) for (const o of allOrders(seq)) out.push({ w: w * o.w, seq: o.seq });
    return out;
  },
  scramble(ws, n = 3) {
    const out = [];
    const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    for (const { w, seq } of ws) {
      if (seq.length < 3) throw new Error('test deck too small');
      for (const pm of perms) { const s = seq.slice(); for (let i = 0; i < 3; i++) s[pm[i]] = seq[i]; out.push({ w: w / 6, seq: s }); }
    }
    return out;
  },
  prob(ws, pos, x) { return ws.reduce((a, { w, seq }) => a + (seq[pos] === x ? w : 0), 0); },
};

function same(b, ws, label) {
  for (let pos = 0; pos < Math.min(b.N, 6); pos++) for (const x of ['E', 'I', 'S']) {
    assert.ok(Math.abs(b.prob(pos, x) - brute.prob(ws, pos, x)) < 1e-9, `${label}: pos ${pos} ${x} belief ${b.prob(pos, x)} vs brute ${brute.prob(ws, pos, x)}`);
  }
}

test('no info: chance is kittens / deck size', () => {
  const b = new Belief(20, 3);
  assert.equal(b.prob(0, 'E'), 3 / 20);
});

test('safe draws raise the chance exactly (2 kittens in 8)', () => {
  const b = new Belief(8, 2); let ws = brute.start(8, 2);
  for (let i = 0; i < 4; i++) { b.draw('S'); ws = brute.draw(ws, 'S'); same(b, ws, 'draw ' + i); }
  assert.ok(Math.abs(b.prob(0, 'E') - 2 / 4) < 1e-12);
});

test('See the Future then others hide a kitten anywhere', () => {
  const b = new Belief(7, 1); let ws = brute.start(7, 1);
  b.saw(['S', 'S', 'E']); ws = brute.saw(ws, ['S', 'S', 'E']); same(b, ws, 'saw');
  b.draw('S'); ws = brute.draw(ws, 'S'); same(b, ws, 'd1');
  b.draw('S'); ws = brute.draw(ws, 'S'); same(b, ws, 'd2');
  b.draw('E'); ws = brute.draw(ws, 'E'); same(b, ws, 'd3 kitten');
  b.insertUnknown('E'); ws = brute.insertUnknown(ws, 'E'); same(b, ws, 'hidden');
  b.saw(['S']); ws = brute.saw(ws, ['S']); same(b, ws, 'saw2');
  b.draw('S'); ws = brute.draw(ws, 'S'); same(b, ws, 'd4');
});

test('known own insert, then an unknown insert on top of that knowledge', () => {
  const b = new Belief(6, 1); let ws = brute.start(6, 1);
  b.saw(['S', 'S', 'S']); ws = brute.saw(ws, ['S', 'S', 'S']);
  b.insertKnown(2, 'E'); ws = brute.insert(ws, 'E', 2); same(b, ws, 'own');
  b.insertUnknown('E'); ws = brute.insertUnknown(ws, 'E'); same(b, ws, 'other');
  b.draw('S'); ws = brute.draw(ws, 'S'); same(b, ws, 'draw');
  b.draw('S', 'bottom'); ws = brute.draw(ws, 'S', 'bottom'); same(b, ws, 'bottom');
});

test('someone else alters the future after I saw it', () => {
  const b = new Belief(6, 2); let ws = brute.start(6, 2);
  b.saw(['E', 'S', 'S']); ws = brute.saw(ws, ['E', 'S', 'S']);
  b.scrambleTop(3); ws = brute.scramble(ws); same(b, ws, 'scramble');
  assert.ok(Math.abs(b.prob(0, 'E') - 1 / 3) < 1e-12);
  b.draw('S'); ws = brute.draw(ws, 'S'); same(b, ws, 'after');
});

test('shuffle wipes what you knew', () => {
  const b = new Belief(5, 1); let ws = brute.start(5, 1);
  b.saw(['E']); ws = brute.saw(ws, ['E']);
  assert.equal(b.prob(0, 'E'), 1);
  b.shuffle(); ws = brute.shuffle(ws); same(b, ws, 'shuffle');
  assert.ok(Math.abs(b.prob(0, 'E') - 1 / 5) < 1e-12);
});

test('imploding kitten face down counts separately', () => {
  const b = new Belief(6, 1, 1); let ws = brute.start(6, 1, 1);
  same(b, ws, 'start');
  b.draw('I'); ws = brute.draw(ws, 'I');
  b.insertKnown(1, 'U'); ws = brute.insert(ws, 'U', 1);
  b.draw('S'); ws = brute.draw(ws, 'S');
  assert.equal(b.known(0), 'U');
  same(b, ws, 'face up');
});

test('two unknown inserts with known info stay exact and fast', () => {
  const b = new Belief(30, 2);
  b.saw(['S', 'S', 'S']);
  b.insertUnknown('E'); b.insertUnknown('E'); b.insertUnknown('E');
  b.draw('S');
  assert.ok(b.worlds.length < 40000);
  const tot = [0, 1, 2, 3, 4, 5].reduce((a, p) => a + b.prob(p, 'S') + b.prob(p, 'E'), 0);
  assert.ok(Math.abs(tot - 6) < 1e-9);
});

// ---- Streaking pack (wave 3). Brute-force worlds also carry h: a bit per
// seat that is secretly holding a kitten it drew with the Streaking Kitten.
const bs = {
  start(N, E) { return brute.start(N, E).map((x) => ({ ...x, h: 0 })); },
  norm(ws) { const t = ws.reduce((a, b) => a + b.w, 0); return ws.filter((x) => x.w > 0).map((x) => ({ ...x, w: x.w / t })); },
  // seat drew a card that looked safe; with chance s it was a kitten they kept
  keptOrSafe(ws, seat, s) {
    const bit = 1 << seat, out = [];
    for (const W of ws) {
      if (W.seq[0] === 'S') out.push({ w: W.w, seq: W.seq.slice(1), h: W.h });
      else if (W.seq[0] === 'E' && !(W.h & bit)) out.push({ w: W.w * s, seq: W.seq.slice(1), h: W.h | bit });
    }
    return bs.norm(out);
  },
  heldFound(ws, seat, clear) { const bit = 1 << seat; return bs.norm(ws.filter((W) => W.h & bit).map((W) => ({ ...W, h: clear ? W.h & ~bit : W.h }))); },
  map(ws, f) { return ws.map((W) => ({ ...W, seq: f(W.seq) })); },
  shuffleAll(ws) { const out = []; for (const W of ws) for (const o of allOrders(W.seq)) out.push({ w: W.w * o.w, seq: o.seq, h: W.h }); return out; },
};

test('Streaking: a safe-looking draw may be a kept kitten; a kitten going off in that hand confirms it', () => {
  const b = new Belief(7, 2); b.enableStreak(); let ws = bs.start(7, 2);
  b.keptOrSafe('top', 1, 0.4); ws = bs.keptOrSafe(ws, 1, 0.4); same(b, ws, 'kept or safe');
  b.keptOrSafe('top', 2, 0.25); ws = bs.keptOrSafe(ws, 2, 0.25); same(b, ws, 'second seat');
  b.keptOrSafe('top', 1, 0.4); ws = bs.keptOrSafe(ws, 1, 0.4); same(b, ws, 'seat 1 again (keeps at most one)');
  b.heldFound(1, true); ws = bs.heldFound(ws, 1, true); same(b, ws, 'went off in seat 1 hand');
  b.insertUnknown('E'); ws = brute.insertUnknown(ws, 'E').map((W) => ({ ...W, h: W.h ?? 0 })); same(b, ws, 'hidden again');
  b.draw('S'); ws = bs.norm(ws.map((W) => ({ ...W, w: W.seq[0] === 'S' ? W.w : 0, seq: W.seq.slice(1) }))); same(b, ws, 'my safe draw');
});

test('Streaking: marked kitten, Swap Top and Bottom, See the Future x5, others Alter x5', () => {
  const b = new Belief(8, 2); b.enableStreak(); let ws = bs.start(8, 2);
  b.keptOrSafe('top', 1, 0.5); ws = bs.keptOrSafe(ws, 1, 0.5);
  b.heldFound(1, false); ws = bs.heldFound(ws, 1, false); same(b, ws, 'marked kitten seen');
  b.saw(['S', 'E']); ws = bs.norm(ws.map((W) => ({ ...W, w: W.seq[0] === 'S' && W.seq[1] === 'E' ? W.w : 0 }))); same(b, ws, 'saw');
  b.swapEnds(); ws = bs.map(ws, (q) => { const s = q.slice(); [s[0], s[s.length - 1]] = [s[s.length - 1], s[0]]; return s; }); same(b, ws, 'swap');
  const b5 = new Belief(7, 2); b5.enableStreak(); let w5 = bs.start(7, 2);
  b5.saw(['E', 'S', 'S', 'S', 'E']); w5 = bs.norm(w5.map((W) => ({ ...W, w: W.seq.slice(0, 5).join('') === 'ESSSE' ? W.w : 0 })));
  b5.scrambleTop(5);
  const out = [];
  for (const W of w5) for (const o of allOrders(W.seq.slice(0, 5))) out.push({ w: W.w * o.w, seq: o.seq.concat(W.seq.slice(5)), h: 0 });
  same(b5, out, 'alter 5 by someone else');
});

test('Streaking: Catomic Bomb and Garbage Collection', () => {
  // seat 1 may hold a kitten; Catomic shows 1 kitten in the pile -> seat 1 has the other
  const b = new Belief(6, 2); b.enableStreak(); let ws = bs.start(6, 2);
  b.keptOrSafe('top', 1, 0.5); ws = bs.keptOrSafe(ws, 1, 0.5);
  b.catomic(1);
  ws = bs.norm(ws.filter((W) => W.seq.filter((x) => x === 'E').length === 1));
  const cat = [];
  for (const W of ws) { const rest = W.seq.filter((x) => x !== 'E'); for (const o of allOrders(rest)) cat.push({ w: W.w * o.w, seq: ['E', ...o.seq], h: W.h }); }
  same(b, cat, 'catomic');
  assert.equal(b.known(0), 'E');
  assert.ok(Math.abs(b.nE - 1) < 1e-9);
  // Garbage: seat 2 maybe held one (tau = 1/3 it was the card given), 2 cards go in, shuffle
  const g = new Belief(5, 1); g.enableStreak(); let gw = bs.start(5, 1);
  g.keptOrSafe('top', 2, 0.6); gw = bs.keptOrSafe(gw, 2, 0.6);
  g.garbage(2, [{ seat: 2, tau: 1 / 3 }]);
  const after = [];
  for (const W of gw) {
    const opts = W.h & 4 ? [[1 / 3, ['E', 'S'], 0], [2 / 3, ['S', 'S'], W.h]] : [[1, ['S', 'S'], W.h]];
    for (const [f, add, h] of opts) for (const o of allOrders(W.seq.concat(add))) after.push({ w: W.w * f * o.w, seq: o.seq, h });
  }
  same(g, after, 'garbage');
});

test('without the Streaking pack nothing changes', () => {
  const b = new Belief(8, 2);
  b.draw('S'); b.saw(['S', 'E', 'S']); b.insertUnknown('E'); b.shuffle();
  assert.equal(b.nE, 3);
  assert.equal(b.worlds.length, 1);
  assert.ok(Math.abs(b.prob(0, 'E') - 3 / 8) < 1e-12);
});
