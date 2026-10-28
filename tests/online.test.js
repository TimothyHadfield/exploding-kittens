// Online adapter: secrets stay secret, the merged view equals the local view,
// and a local room of computers plays to the end through js/online.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { game, mergeView } from '../js/netgame.js';
import { view } from '../js/engine.js';
import { createLocal } from '../js/online.js';

function seeded(seed) {
  let t = seed | 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// Play random bot games, calling check(state) after every move.
function playThrough(seed, opts, check) {
  const rng = seeded(seed);
  let s = game.setup(opts.players, { ...opts, levels: Array(opts.players).fill(opts.level || 'medium') }, rng);
  let moves = 0;
  while (!game.isOver(s) && moves < 4000) {
    check(s);
    const seat = game.toAct(s)[0];
    const a = game.bot({ state: s }, seat, rng);
    s = game.apply(JSON.parse(JSON.stringify(s)), seat, a, rng);
    moves++;
  }
  check(s);
  return s;
}

test('state survives JSON and publicView hides every secret', () => {
  for (const [i, opts] of [{ edition: 'original', players: 4 }, { edition: 'imploding', players: 5 }, { edition: 'party', players: 8 }].entries()) {
    const end = playThrough(100 + i, opts, (s) => {
      assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
      const pub = game.publicView(s);
      const js = JSON.stringify(pub);
      assert.ok(!('rng' in pub) && !('seed' in pub), 'rng would let a player predict shuffles');
      for (const h of pub.hands) for (const c of h) assert.equal(c.t, '?');
      for (const c of pub.deck) assert.ok(c.t === '?' || (c.t === 'IK' && c.up));
      assert.ok(!js.includes('"vis"'), 'private log events must not be public');
      for (let j = 0; j < s.hands.length; j++) {
        const mine = game.privateView(s, j);
        for (const e of mine.plog) assert.ok(e.vis.includes(j));
        if (mine.top) assert.equal(s.pending.seat, j);
      }
    });
    assert.equal(end.phase, 'over');
  }
});

test('merged online view equals the local view for every seat', () => {
  let checked = 0;
  playThrough(7, { edition: 'imploding', players: 4, level: 'hard' }, (s) => {
    const pub = game.publicView(s);
    for (let me = 0; me < s.hands.length; me++) {
      const g = mergeView(pub, game.privateView(s, me), me);
      assert.deepEqual(view(g, me), view(s, me));
      checked++;
    }
  });
  assert.ok(checked > 100);
});

test('a local room of computers plays to the end', async () => {
  const room = createLocal({ game, seats: ['computer', 'computer', 'computer'], options: { edition: 'original' }, botDelayMs: 0, rng: seeded(3) });
  const done = new Promise((res) => room.on('change', (snap) => { if (snap.status === 'finished') res(snap); }));
  room.start();
  let to;
  const snap = await Promise.race([done, new Promise((_, rej) => { to = setTimeout(() => rej(new Error('timeout')), 20000); })]);
  clearTimeout(to);
  room.close();
  assert.equal(snap.pub.phase, 'over');
  assert.ok(snap.pub.winner >= 0);
});

test('Streaking pack online: only Marked cards show, a blind player sees only backs, views match', () => {
  let marked = 0, blindSeen = 0, checked = 0;
  for (const [i, opts] of [{ edition: 'original', players: 4, streak: true }, { edition: 'imploding', players: 5, streak: true, level: 'hard' }].entries()) {
    for (let k = 0; k < 4; k++) {
      const end = playThrough(300 + i * 10 + k, opts, (s) => {
        assert.equal(s.cfg.streak, true);
        const pub = game.publicView(s);
        assert.ok(!('trashBin' in pub), 'Garbage Collection cards stay secret');
        for (let j = 0; j < s.hands.length; j++) {
          for (const c of pub.hands[j]) {
            if (c.t === '?') continue;
            assert.equal(c.mk, true); marked++;
            assert.ok(s.hands[j].some((x) => x.id === c.id && x.mk));
          }
          const mine = game.privateView(s, j);
          if (s.blind[j]) { blindSeen++; for (const c of mine.hand) assert.ok(c.t === '?' || c.mk); }
          const g = mergeView(pub, mine, j);
          assert.deepEqual(view(g, j), view(s, j));
          checked++;
        }
      });
      assert.equal(end.phase, 'over');
    }
  }
  assert.ok(marked > 0 && blindSeen > 0 && checked > 500, `marked ${marked}, blind ${blindSeen}, checked ${checked}`);
});
