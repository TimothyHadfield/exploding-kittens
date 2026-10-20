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
