// My stats results, the replay and the Daily, on real self-play games.
import test from 'node:test';
import assert from 'node:assert/strict';
import { playGame } from '../tools/sim.js';
import { newGame, apply, view, waitingOn } from '../js/engine.js';
import { decide, makeRng } from '../js/ai.js';
import { result, summary, tableLevel, dailyCfg, LEVELS, ACH } from '../js/ekprofile.js';
import { replaySteps } from '../js/replay.js';

const CFG = { edition: 'original', players: 4, fast: false, stack: true, five: true, twoBoth: false };
const seats = [{ type: 'me' }, { type: 'bot', level: 'easy' }, { type: 'bot', level: 'hard' }, { type: 'bot', level: 'medium' }];

// a whole game with the list of moves, as app.js keeps it (S.moves)
function recorded(cfg, levels, seed) {
  const moves = [];
  const st = playGame(cfg, levels, seed, { before: (_, a) => moves.push(a) });
  return { st, moves };
}

test('a finished game vs computers is rated at the strongest computer; help makes it unrated', () => {
  const { st } = recorded(CFG, ['medium', 'easy', 'hard', 'medium'], 11);
  const r = result(st, seats);
  assert.equal(r.mode, 'computer');
  assert.equal(r.level, 'hard');
  assert.equal(r.won, st.winner === 0);
  assert.ok(!r.extra.quit);
  const h = result(st, seats, { helped: true });
  assert.equal(h.mode, 'help');
  assert.equal(h.level, null);
});

test('leaving after your first move counts as a loss', () => {
  let st = newGame(CFG, 5);
  const r = makeRng(1);
  while (!(waitingOn(st)[0] === 0 && st.phase === 'turn' && st.log.some((e) => e.seat === 0 && e.t === 'draw'))) {
    const s = waitingOn(st)[0];
    st = apply(st, decide(view(st, s), 'medium', r));
    if (st.phase === 'over') break;
  }
  assert.notEqual(st.phase, 'over');
  const res = result(st, seats);
  assert.equal(res.won, false);
  assert.equal(res.extra.quit, true);
  assert.equal(res.mode, 'computer');
});

test('pass-the-phone games count as played with no winner of mine', () => {
  const { st } = recorded(CFG, ['medium', 'medium', 'medium', 'medium'], 3);
  const r = result(st, [{ type: 'me' }, { type: 'me' }, { type: 'bot', level: 'easy' }, { type: 'bot', level: 'easy' }]);
  assert.equal(r.mode, 'friends');
  assert.equal(r.won, null);
});

test('summary counts kittens, defuses and players from the log', () => {
  let any = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const { st } = recorded(CFG, ['hard', 'medium', 'medium', 'medium'], seed);
    for (let me = 0; me < 4; me++) {
      const s = summary(st.log, me);
      assert.equal(s.players, 4);
      const kit = st.log.filter((e) => e.t === 'draw' && e.seat === me && e.res === 'E').length;
      assert.equal(s.kittens, kit);
      assert.ok(s.defuses <= s.kittens);
      any += s.defuses;
    }
  }
  assert.ok(any > 0);
});

test('tableLevel and the level ladder are in order', () => {
  assert.equal(tableLevel(['easy', 'medium']), 'medium');
  assert.equal(tableLevel([]), null);
  assert.ok(LEVELS[0].rating < LEVELS[1].rating && LEVELS[1].rating < LEVELS[2].rating);
  assert.equal(new Set(ACH.map((a) => a.id)).size, ACH.length);
});

test('the replay rebuilds every game exactly from the deal and the moves', () => {
  for (let seed = 1; seed <= 40; seed++) {
    for (const cfg of [CFG, { ...CFG, edition: 'imploding', players: 5 }, { ...CFG, edition: 'party', players: 7 }, { ...CFG, players: 2, fast: true }]) {
      const levels = Array.from({ length: cfg.players }, (_, i) => ['easy', 'medium', 'hard'][(i + seed) % 3]);
      const { st, moves } = recorded(cfg, levels, seed);
      const r = replaySteps(st, moves);
      assert.ok(r.ok, `seed ${seed} ${cfg.edition}`);
      const last = r.frames[r.frames.length - 1];
      assert.deepEqual(last.alive, st.alive);
      assert.ok(r.frames.length > 2);
    }
  }
});

test('the Daily deal is the same for everyone with the same seed', () => {
  const a = newGame(dailyCfg(), 20261027), b = newGame(dailyCfg(), 20261027);
  assert.deepEqual(a.deck.map((c) => c.t), b.deck.map((c) => c.t));
  assert.equal(a.hands.length, 4);
});
