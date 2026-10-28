// Bridge between our engine and the shared online module (js/online.js).
// The host's browser holds the full state; everyone else gets publicView
// (all secrets masked) plus their own privateView, and mergeView() rebuilds
// a state that the normal UI can draw as if it were local.
import { newGame, apply, view, waitingOn } from './engine.js';
import { decide } from './ai.js';

const HIDDEN = () => ({ id: 0, t: '?' });

export const game = {
  id: 'exploding-kittens',
  minSeats: 2,
  maxSeats: 10,
  setup(n, options = {}, rng = Math.random) {
    return newGame({ ...options, players: n }, Math.floor(rng() * 2 ** 31));
  },
  toAct: (s) => waitingOn(s),
  apply(s, seat, action) {
    if (!action || typeof action !== 'object') throw new Error('bad move');
    return apply(s, { ...action, seat }, { inPlace: true });
  },
  publicView(s) {
    return {
      v: s.v, cfg: s.cfg,
      // Streaking pack: a Marked card is face out for everyone
      hands: s.hands.map((h) => h.map((c) => (c.mk ? { id: c.id, t: c.t, mk: true } : HIDDEN()))),
      out: s.out.map((h) => h.map(HIDDEN)),
      // only the face-up Imploding Kitten is visible in the pile
      deck: s.deck.map((c) => (c.t === 'IK' && c.up ? { id: 0, t: 'IK', up: true } : HIDDEN())),
      ikIn: s.deck.some((c) => c.t === 'IK'),
      alive: s.alive, discard: s.discard, gone: [], removed: s.removed.map(HIDDEN),
      cur: s.cur, dir: s.dir, turns: s.turns, attacked: s.attacked, phase: s.phase,
      pending: s.pending, turnNo: s.turnNo, winner: s.winner, defusesUsed: s.defusesUsed,
      ...(s.blind ? { blind: s.blind } : {}),
      log: s.log.filter((e) => !e.vis),
    };
  },
  privateView(s, seat) {
    if (seat == null || seat < 0 || !s.hands[seat]) return null;
    const p = s.pending;
    // cursed (blind): even your own cards stay face down, apart from Marked ones
    const blind = !!(s.blind && s.blind[seat]);
    return {
      hand: blind ? s.hands[seat].map((c) => (c.mk ? c : HIDDEN())) : s.hands[seat],
      plog: s.log.filter((e) => e.vis && e.vis.includes(seat)),
      top: s.phase === 'alter' && p && p.seat === seat ? s.deck.slice(0, p.n || 3) : null,
    };
  },
  bot(ctx, seat, rng = Math.random) {
    const st = ctx.state;
    const level = (st.cfg.levels && st.cfg.levels[seat]) || 'medium';
    const { seat: _s, ...a } = decide(view(st, seat), level, rng);
    return a;
  },
  isOver: (s) => s.phase === 'over',
};

// Rebuild a drawable state for seat `me` from a snapshot.
export function mergeView(pub, mine, me) {
  const g = JSON.parse(JSON.stringify(pub));
  if (mine && me >= 0) {
    g.hands[me] = mine.hand;
    g.log = g.log.concat(mine.plog).sort((a, b) => a.n - b.n);
    if (mine.top) g.deck.splice(0, mine.top.length, ...mine.top);
  }
  return g;
}
