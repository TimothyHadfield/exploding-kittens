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

const VALUE = { DEF: 100, NOPE: 45, ATK: 40, TATK: 42, SKIP: 35, REV: 30, ALTER: 28, STF: 25, BOTTOM: 22, SHUF: 20, FAV: 15, FERAL: 12,
  // Streaking pack
  STREAK: 60, SSKIP: 45, CATOMIC: 38, ALTER5: 30, STF5: 27, SWAP: 22, CURSE: 18, GARB: 16, MARK: 10 };
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
export function assess(v, level = 'hard', opts = {}) {
  const me = v.me;
  // Easy/Medium only use what's certain (seen cards, counts): a small belief is plenty
  const b = beliefFromLog(v.log, me, level === 'hard' ? opts : { ...opts, lite: true });
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
  // Streaking Kitten in hand and no kitten yet: an Exploding Kitten drawn now is kept, safely
  const keeps = has('STREAK').length > 0 && has('EK').length === 0;
  const blind = !!(v.blind && v.blind[me]);
  return { b, N, pE, pDeath: keeps ? pU : pE + pU, pU, naive, top, bottomE, hand, has, others, hasDef: has('DEF').length > 0, keeps, blind };
}

export function decide(v, level = 'medium', r = Math.random, opts = {}) {
  const me = v.me;
  if (v.phase === 'nope') return decideNope(v, level, r);
  if (v.phase === 'favor' || v.phase === 'garbage') {
    const type = v.phase === 'favor' ? 'give' : 'trash';
    if (v.blind && v.blind[me]) return { type, seat: me, card: null }; // blind: a random card goes
    const hand = v.hand.slice();
    if (level === 'easy') return { type, seat: me, card: pick(hand, r).id };
    // a kept Exploding Kitten is the best gift (it goes off in their hand)
    hand.sort((a, b) => cardValue(a.t) - cardValue(b.t) - (a.t === 'EK' ? 1000 : 0) + (b.t === 'EK' ? 1000 : 0));
    return { type, seat: me, card: hand[0].id };
  }
  if (v.phase === 'btarget') {
    const others = v.alive.map((a, i) => (a && i !== me ? i : -1)).filter((i) => i >= 0);
    const tg = level === 'easy' ? pick(others, r) : v.pending.card === 'TATK' || v.pending.card === 'CURSE' ? nextSeat(v, me) : others.slice().sort((a, b) => v.handCounts[b] - v.handCounts[a])[0];
    return { type: 'btarget', seat: me, target: tg };
  }
  if (v.phase === 'defuse' || v.phase === 'implode') return { type: 'insert', seat: me, pos: placeKitten(v, level, r) };
  if (v.phase === 'alter') return { type: 'alter', seat: me, order: alterOrder(v, level) };
  if (v.phase === 'pick') {
    const ok = v.discard.filter((c) => !v.pending.exclude.includes(c.id) && c.t !== 'STREAK');
    ok.sort((a, b) => cardValue(b.t) - cardValue(a.t));
    return { type: 'pick', seat: me, card: (level === 'easy' ? pick(ok, r) : ok[0]).id };
  }
  return decideTurn(v, level, r, opts);
}

function nextSeat(v, from, dir = v.dir) {
  const P = v.alive.length;
  for (let k = 1; k <= P; k++) { const s = (((from + dir * k) % P) + P) % P; if (v.alive[s]) return s; }
  return from;
}

// --------------------------------------------------------------- turn
function decideTurn(v, level, r, opts = {}) {
  const me = v.me;
  const A = assess(v, level, opts);
  const { has, others, hasDef } = A;
  const play = (c, extra = {}) => ({ type: 'play', seat: me, cards: [c.id], ...extra });
  const draw = { type: 'draw', seat: me };
  const richest = () => others.slice().sort((a, b) => v.handCounts[b] - v.handCounts[a])[0];
  const blindPlay = { type: 'blind', seat: me };

  if (level === 'easy') {
    if (A.blind) return v.hand.length && r() < 0.3 ? blindPlay : draw;
    const singles = A.hand.filter((c) => ['ATK', 'SKIP', 'SHUF', 'STF', 'FAV', 'TATK', 'REV', 'BOTTOM', 'ALTER',
      'SSKIP', 'STF5', 'ALTER5', 'SWAP', 'GARB', 'CATOMIC', 'MARK', 'CURSE'].includes(c.t));
    if (singles.length && r() < 0.3) {
      const c = pick(singles, r);
      if (c.t === 'FAV' || c.t === 'MARK' || c.t === 'CURSE') return play(c, { target: pick(others, r) });
      if (c.t === 'TATK') return play(c, { target: pick(others, r) });
      return play(c);
    }
    return draw;
  }

  // Danger: chance this draw ends the game for me (or costs my Defuse).
  // Hard's numbers tuned by self-play 2026-10-27 (were 0.5 / 0.12)
  const threshold = hasDef ? (level === 'hard' ? 0.35 : 0.4) : (level === 'hard' ? 0.25 : 0.25);
  const topKnown = A.top[0];
  const danger = topKnown === 'E' ? (A.keeps ? 0 : hasDef ? 0.9 : 1) : topKnown === 'U' ? 1 : topKnown === 'S' ? 0 : A.pDeath;
  // Curse of the Cat Butt: I can't see my cards. Turn one over at random (it
  // may dodge) when the draw looks bad, else draw (a safe draw ends the curse).
  if (A.blind) return danger > threshold && v.hand.length > 1 ? blindPlay : draw;
  const dodge = () => {
    // cheapest way out first; Attack beats Skip when I have several turns
    if (v.turns > 1 && has('ATK').length) return play(has('ATK')[0]);
    if (v.turns > 1 && has('TATK').length) return play(has('TATK')[0], { target: nextSeat(v, me) });
    if (v.turns > 1 && has('SSKIP').length) return play(has('SSKIP')[0]);
    if (topKnown === 'E' && has('CATOMIC').length) return play(has('CATOMIC')[0]); // the kittens go to whoever is next
    if (has('SKIP').length) return play(has('SKIP')[0]);
    if (has('SSKIP').length) return play(has('SSKIP')[0]);
    if (has('CATOMIC').length && A.pE < 0.5) return play(has('CATOMIC')[0]);
    if (has('REV').length) return play(has('REV')[0]);
    if (has('ATK').length) return play(has('ATK')[0]);
    if (has('TATK').length) return play(has('TATK')[0], { target: nextSeat(v, me) });
    if (has('BOTTOM').length && (level !== 'hard' || A.bottomE < danger)) return play(has('BOTTOM')[0]);
    if (has('SWAP').length && (level !== 'hard' || A.bottomE < danger)) return play(has('SWAP')[0]);
    if (has('SHUF').length && (topKnown === 'E' || topKnown === 'U')) return play(has('SHUF')[0]);
    if (has('GARB').length && (topKnown === 'E' || topKnown === 'U')) return play(has('GARB')[0]);
    if (has('ALTER').length && topKnown !== 'S') return play(has('ALTER')[0]);
    if (has('ALTER5').length && topKnown !== 'S') return play(has('ALTER5')[0]);
    return null;
  };

  // 1) look before leaping
  if (danger > threshold * 0.6 && topKnown == null && v.deckCount > 1) {
    if (has('STF').length) return play(has('STF')[0]);
    if (has('STF5').length) return play(has('STF5')[0]);
    if (has('ALTER').length) return play(has('ALTER')[0]);
    if (has('ALTER5').length) return play(has('ALTER5')[0]);
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
  // 5) Streaking pack, on a calm turn: blind the next player, Mark the richest
  if (others.length) {
    const next = nextSeat(v, me);
    if (has('CURSE').length && !(v.blind && v.blind[next])) return play(has('CURSE')[0], { target: next });
    if (level === 'hard' && has('MARK').length && v.handCounts[richest()] > 2) return play(has('MARK')[0], { target: richest() });
  }
  return draw;
}

// Who most likely still holds a Defuse: started with one, hasn't used it.
function bestDefuseTarget(v, others) {
  let best = null, score = -1;
  for (const s of others) {
    if (v.handCounts[s] === 0) continue;
    // a Marked Defuse is in plain sight
    const shown = v.marks && v.marks[s] && v.marks[s].some((c) => c.t === 'DEF') ? 20 : 0;
    const sc = (v.defusesUsed[s] === 0 ? 10 : 0) + v.handCounts[s] + shown;
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
    if (t === 'FERAL' || t === 'DEF' || t === 'NOPE' || t === 'EK' || t === 'STREAK') continue;
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
  for (const c of hand.slice().sort((a, b) => cardValue(a.t) - cardValue(b.t))) if (!seen.has(c.t) && c.t !== 'DEF' && c.t !== 'EK' && c.t !== 'STREAK') seen.set(c.t, c);
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
  // Streaking pack: don't get blinded; don't take a pile of kittens on top
  if (p.card === 'CURSE' && p.target === me) return yes;
  if (p.card === 'CATOMIC' && nextSeat(v, p.by) === me && !A.keeps) return yes;
  // Hard: I know the top is a kitten and they're trying to dodge it.
  if (level === 'hard' && A.top[0] === 'E' && ['SKIP', 'ATK', 'TATK', 'REV', 'SHUF', 'BOTTOM', 'SSKIP', 'SWAP', 'GARB', 'CATOMIC'].includes(p.card) && p.by === v.cur && !hitsMe) return yes;
  return pass;
}

// --------------------------------------------------------------- kitten spot
function placeKitten(v, level, r) {
  const N = v.deckCount;
  if (level === 'easy') return Math.floor(r() * (N + 1));
  // After my defuse my turn ends; v.turns counts this turn still. A kitten
  // that went off in a hand (Streaking pack) doesn't end the turn.
  const keep = v.pending && v.pending.keep;
  const mineLeft = keep ? (v.cur === v.me ? v.turns : 0) : Math.max(0, v.turns - 1);
  if (level === 'medium') return Math.min(N, mineLeft + Math.floor(r() * 3));
  // hard: usually right where the next player draws it, but not always, so a
  // player who knows the habit can't be sure the top card is the kitten
  return pickWeighted(placeWeights('hard', N, mineLeft), r);
}

// A computer reads the others' hiding habits (opts.place) only at a table of
// 3+; heads-up it made Hard dodge too often (self-play 2026-10-27: H vs M
// 1v1 74% -> 63% with it, while 3+ players gained).
export const habitOpts = (v, opts) => (v.alive.filter(Boolean).length >= 3 ? opts || {} : {});

// Hard's mix: next player's draw most of the time, one or two cards deeper
// sometimes, now and then anywhere in the top half.
export const HARD_HIDE = { top: 0.55, second: 0.15, third: 0.1, spread: 0.2 };

function pickWeighted(w, r) {
  const sum = w.reduce((a, x) => a + x, 0);
  let x = r() * sum;
  for (let i = 0; i < w.length; i++) { x -= w[i]; if (x < 0) return i; }
  return w.length - 1;
}

// The same habit as weights over the N+1 spots, so a player who knows which
// computer hid the kitten can use it. Easy = any spot (null).
export function placeWeights(level, N, left) {
  if (level !== 'medium' && level !== 'hard') return null;
  const w = Array(N + 1).fill(0);
  if (level === 'hard') {
    const H = HARD_HIDE;
    w[Math.min(N, left)] += H.top;
    w[Math.min(N, left + 1)] += H.second;
    w[Math.min(N, left + 2)] += H.third;
    const half = Math.max(0, Math.ceil(N / 2));
    for (let j = 0; j <= half; j++) w[j] += H.spread / (half + 1);
  } else for (let j = 0; j < 3; j++) w[Math.min(N, left + j)] += 1;
  return w;
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
  if (action.type === 'blind') return 'Play a random card: the draw looks risky, and it might be one that gets you out of it.';
  if (action.type === 'play') {
    const names = action.cards.map((id) => CARD[v.hand.find((c) => c.id === id).t].name);
    if (names.length === 1) return `Play ${names[0]}.`;
    return `Play ${names.length} cards as a combo.`;
  }
  return '';
}
