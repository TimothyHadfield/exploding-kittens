// Computer players. Each one sees only view(state, seat) — no peeking.
//   easy   : plays cards at random, hides kittens anywhere
//   medium : simple rules of thumb using kittens / cards left
//   hard   : exact odds from everything it has seen, card counting,
//            hides kittens where the next player gets them
// Strength is measured by tools/sim.js; numbers live in data/strength.json.
import { beliefFromLog } from './odds.js';
import { comboKind } from './engine.js';
import { CARD, isCat } from './cards.js';

export const LEVELS = ['easy', 'medium', 'hard'];

const VALUE = { DEF: 100, NOPE: 45, ATK: 40, TATK: 42, SKIP: 35, REV: 30, ALTER: 28, STF: 25, BOTTOM: 22, SHUF: 20, FAV: 15, FERAL: 12 };
export const cardValue = (t) => VALUE[t] ?? 6;

// Small seeded rng so bots are repeatable inside a seeded game.
export function makeRng(seed) {
  let s = seed | 0;
  return () => {
    let t = (s = (s + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (arr, r) => arr[Math.floor(r() * arr.length)];

// Shared numbers a bot (or the hint button) reasons with.
export function assess(v, level = 'hard') {
  const me = v.me;
  const b = beliefFromLog(v.log, me);
  const N = v.deckCount;
  const kittensLeft = b ? b.nE : 0;
  const naive = N ? kittensLeft / N : 0;
  const pE = level === 'hard' && b ? b.prob(0, 'E') : naive;
  const pU = b ? b.prob(0, 'U') : 0;
  const top = b ? [0, 1, 2].map((i) => b.known(i)) : [null, null, null];
  const bottomE = b && level === 'hard' ? b.prob(N - 1, 'E') + b.prob(N - 1, 'U') : naive;
  const hand = v.hand || [];
  const has = (t) => hand.filter((c) => c.t === t);
  const others = v.alive.map((a, i) => (a && i !== me ? i : -1)).filter((i) => i >= 0);
  return { b, N, pE, pDeath: pE + pU, pU, naive, top, bottomE, hand, has, others, hasDef: has('DEF').length > 0 };
}

export function decide(v, level = 'medium', r = Math.random) {
  const me = v.me;
  if (v.phase === 'nope') return decideNope(v, level, r);
  if (v.phase === 'favor') {
    const hand = v.hand.slice();
    if (level === 'easy') return { type: 'give', seat: me, card: pick(hand, r).id };
    hand.sort((a, b) => cardValue(a.t) - cardValue(b.t));
    return { type: 'give', seat: me, card: hand[0].id };
  }
  if (v.phase === 'defuse' || v.phase === 'implode') return { type: 'insert', seat: me, pos: placeKitten(v, level, r) };
  if (v.phase === 'alter') return { type: 'alter', seat: me, order: alterOrder(v, level) };
  if (v.phase === 'pick') {
    const ok = v.discard.filter((c) => !v.pending.exclude.includes(c.id));
    ok.sort((a, b) => cardValue(b.t) - cardValue(a.t));
    return { type: 'pick', seat: me, card: (level === 'easy' ? pick(ok, r) : ok[0]).id };
  }
  return decideTurn(v, level, r);
}

function nextSeat(v, from, dir = v.dir) {
  const P = v.alive.length;
  for (let k = 1; k <= P; k++) { const s = (((from + dir * k) % P) + P) % P; if (v.alive[s]) return s; }
  return from;
}

// --------------------------------------------------------------- turn
function decideTurn(v, level, r) {
  const me = v.me;
  const A = assess(v, level);
  const { has, others, hasDef } = A;
  const play = (c, extra = {}) => ({ type: 'play', seat: me, cards: [c.id], ...extra });
  const draw = { type: 'draw', seat: me };
  const richest = () => others.slice().sort((a, b) => v.handCounts[b] - v.handCounts[a])[0];

  if (level === 'easy') {
    const singles = A.hand.filter((c) => ['ATK', 'SKIP', 'SHUF', 'STF', 'FAV', 'TATK', 'REV', 'BOTTOM', 'ALTER'].includes(c.t));
    if (singles.length && r() < 0.3) {
      const c = pick(singles, r);
      if (c.t === 'FAV') return play(c, { target: pick(others, r) });
      if (c.t === 'TATK') return play(c, { target: pick(others, r) });
      return play(c);
    }
    return draw;
  }

  // Danger: chance this draw ends the game for me (or costs my Defuse).
  const threshold = hasDef ? (level === 'hard' ? 0.5 : 0.4) : (level === 'hard' ? 0.12 : 0.25);
  const topKnown = A.top[0];
  const danger = topKnown === 'E' ? (hasDef ? 0.9 : 1) : topKnown === 'U' ? 1 : topKnown === 'S' ? 0 : A.pDeath;
  const dodge = () => {
    // cheapest way out first; Attack beats Skip when I have several turns
    if (v.turns > 1 && has('ATK').length) return play(has('ATK')[0]);
    if (v.turns > 1 && has('TATK').length) return play(has('TATK')[0], { target: nextSeat(v, me) });
    if (has('SKIP').length) return play(has('SKIP')[0]);
    if (has('REV').length) return play(has('REV')[0]);
    if (has('ATK').length) return play(has('ATK')[0]);
    if (has('TATK').length) return play(has('TATK')[0], { target: nextSeat(v, me) });
    if (has('BOTTOM').length && (level !== 'hard' || A.bottomE < danger)) return play(has('BOTTOM')[0]);
    if (has('SHUF').length && (topKnown === 'E' || topKnown === 'U')) return play(has('SHUF')[0]);
    if (has('ALTER').length && topKnown !== 'S') return play(has('ALTER')[0]);
    return null;
  };

  // 1) look before leaping
  if (danger > threshold * 0.6 && topKnown == null && v.deckCount > 1) {
    if (has('STF').length) return play(has('STF')[0]);
    if (has('ALTER').length) return play(has('ALTER')[0]);
  }
  // 2) no Defuse? try to get one (hard: before it gets dangerous)
  if (!hasDef && others.length && (level === 'hard' || danger > threshold)) {
    const target = level === 'hard' ? bestDefuseTarget(v, others) : richest();
    if (target != null && v.handCounts[target] > 0) {
      const combo = findCombo(A.hand, 3);
      if (combo && level === 'hard') return { type: 'play', seat: me, cards: combo, target, name: 'DEF' };
      const pair = findCombo(A.hand, 2, true);
      if (pair) return { type: 'play', seat: me, cards: pair, target };
      if (has('FAV').length) return play(has('FAV')[0], { target });
    }
    if (v.cfg.five && level === 'hard' && v.discard.some((c) => c.t === 'DEF')) {
      const five = findFive(A.hand);
      if (five) return { type: 'play', seat: me, cards: five };
    }
  }
  // 3) dodge a dangerous draw
  if (danger > threshold) {
    const d = dodge();
    if (d) return d;
  }
  // 4) hard: spend spare cat pairs to drain the richest hand
  if (level === 'hard' && others.length) {
    const pair = findCombo(A.hand, 2, true);
    if (pair && A.hand.length > 5) return { type: 'play', seat: me, cards: pair, target: richest() };
  }
  return draw;
}

// Who most likely still holds a Defuse: started with one, hasn't used it.
function bestDefuseTarget(v, others) {
  let best = null, score = -1;
  for (const s of others) {
    if (v.handCounts[s] === 0) continue;
    const sc = (v.defusesUsed[s] === 0 ? 10 : 0) + v.handCounts[s];
    if (sc > score) { score = sc; best = s; }
  }
  return best;
}

// Cards for an n-of-a-kind combo, preferring cat cards (they do nothing alone).
function findCombo(hand, n, catsOnly = false) {
  const by = {};
  for (const c of hand) (by[c.t] = by[c.t] || []).push(c);
  const ferals = by.FERAL || [];
  const cands = [];
  for (const [t, cs] of Object.entries(by)) {
    if (t === 'FERAL' || t === 'DEF' || t === 'NOPE') continue;
    if (catsOnly && !isCat(t)) continue;
    const pool = isCat(t) ? cs.concat(ferals) : cs;
    if (pool.length >= n) cands.push({ ids: pool.slice(0, n).map((c) => c.id), cost: pool.slice(0, n).reduce((a, c) => a + cardValue(c.t), 0) });
  }
  if (ferals.length >= n) cands.push({ ids: ferals.slice(0, n).map((c) => c.id), cost: n * cardValue('FERAL') });
  cands.sort((a, b) => a.cost - b.cost);
  return cands.length ? cands[0].ids : null;
}

function findFive(hand) {
  const seen = new Map();
  for (const c of hand.slice().sort((a, b) => cardValue(a.t) - cardValue(b.t))) if (!seen.has(c.t) && c.t !== 'DEF') seen.set(c.t, c);
  const cs = [...seen.values()].slice(0, 5);
  if (cs.length < 5 || !comboKind(cs.map((c) => c.t))) return null;
  return cs.map((c) => c.id);
}

// --------------------------------------------------------------- nope
function decideNope(v, level, r) {
  const me = v.me;
  const pass = { type: 'pass', seat: me };
  if (!v.pending.canRespond) return pass;
  const nope = v.hand.find((c) => c.t === 'NOPE');
  if (!nope) return pass;
  const p = v.pending;
  const yes = { type: 'nope', seat: me, card: nope.id };
  if (level === 'easy') return r() < 0.15 ? yes : pass;
  const cancelling = p.nopes % 2 === 1; // currently the action is cancelled
  const mine = p.by === me;
  // Re-nope to save my own action when it matters.
  if (mine) return cancelling && ['ATK', 'TATK', 'SKIP', 'REV'].includes(p.card) ? yes : pass;
  if (cancelling) return pass; // happy it's stopped
  const A = assess(v, level);
  const hitsMe = p.target === me || (p.card === 'ATK' && nextSeat(v, p.by) === me);
  if (p.kind === 'triple' && p.target === me && p.name === 'DEF' && A.hasDef) return yes;
  if ((p.kind === 'pair' || p.card === 'FAV') && p.target === me && A.hasDef && v.hand.length <= 4) return yes;
  if ((p.card === 'ATK' || p.card === 'TATK') && hitsMe && (A.pDeath > 0.15 || !A.hasDef)) return yes;
  // Hard: I know the top is a kitten and they're trying to dodge it.
  if (level === 'hard' && A.top[0] === 'E' && ['SKIP', 'ATK', 'TATK', 'REV', 'SHUF', 'BOTTOM'].includes(p.card) && p.by === v.cur && !hitsMe) return yes;
  return pass;
}

// --------------------------------------------------------------- kitten spot
function placeKitten(v, level, r) {
  const N = v.deckCount;
  if (level === 'easy') return Math.floor(r() * (N + 1));
  // After my defuse my turn ends; v.turns counts this turn still.
  const mineLeft = Math.max(0, v.turns - 1);
  if (level === 'medium') return Math.min(N, mineLeft + Math.floor(r() * 3));
  // hard: right where the next player draws it, unless that's me again
  const pos = mineLeft;
  return Math.min(N, pos);
}

function alterOrder(v, level) {
  const top = v.pending.top;
  const safe = top.filter((c) => c.t !== 'EK' && c.t !== 'IK+');
  const bad = top.filter((c) => c.t === 'EK' || c.t === 'IK+');
  if (level === 'easy') return top.map((c) => c.id);
  // I still draw first: safe card on top, kittens right after (for the next player)
  return [...safe.slice(0, 1), ...bad, ...safe.slice(1)].map((c) => c.id);
}

// Plain-English reason for the hint button.
export function explain(v, action) {
  if (!action) return '';
  if (action.type === 'draw') return 'Draw: the risk is low enough — save your cards.';
  if (action.type === 'play') {
    const names = action.cards.map((id) => CARD[v.hand.find((c) => c.id === id).t].name);
    if (names.length === 1) return `Play ${names[0]}.`;
    return `Play ${names.length} cards as a combo.`;
  }
  return '';
}
