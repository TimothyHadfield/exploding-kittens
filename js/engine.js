// Exploding Kittens rules engine. Pure: apply(state, action) returns a new
// state; view(state, seat) hides everything that seat can't see. Every rule
// here is checked in docs/rules-check.md and asserted in tests/.
import { CARD, CAT_TYPES, boxFor, EDITIONS, isCat, PLAYABLE_SINGLE } from './cards.js';

// ---------------------------------------------------------------- rng
// mulberry32, kept as a number inside the state so games replay exactly.
export function rngNext(st) {
  let t = (st.rng = (st.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rint = (st, n) => Math.floor(rngNext(st) * n);
function shuffleIn(st, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rint(st, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const DEFAULTS = {
  edition: 'original', players: 4, fast: false, stack: true, five: true, twoBoth: false,
};

// ---------------------------------------------------------------- setup
export function newGame(cfgIn = {}, seed = (Math.random() * 2 ** 31) | 0) {
  const cfg = { ...DEFAULTS, ...cfgIn };
  const ed = EDITIONS[cfg.edition];
  if (!ed) throw new Error('bad edition');
  const P = cfg.players;
  if (P < ed.min || P > ed.max) throw new Error(`${ed.label} is for ${ed.min}-${ed.max} players`);
  const st = {
    v: 1, cfg, rng: seed | 0, seed: seed | 0, nextId: 1,
    deck: [], hands: [], out: [], alive: [], discard: [], gone: [], removed: [],
    cur: 0, dir: 1, turns: 1, attacked: false, phase: 'turn', pending: null,
    log: [], turnNo: 1, winner: -1, defusesUsed: Array(P).fill(0),
  };
  const box = boxFor(cfg.edition, P);
  const make = (t) => ({ id: st.nextId++, t });
  const pile = [];
  for (const [t, n] of Object.entries(box)) {
    if (t === 'EK' || t === 'IK' || t === 'DEF') continue;
    for (let i = 0; i < n; i++) pile.push(make(t));
  }
  // 1) every player gets one Defuse
  const defuses = [];
  for (let i = 0; i < box.DEF; i++) defuses.push(make('DEF'));
  for (let s = 0; s < P; s++) { st.hands.push([defuses.pop()]); st.out.push([]); st.alive.push(true); }
  // 2) spare Defuses back in. Original/Imploding: 2 of the extras (5 players
  //    leaves only 1). Party Pack: all the extras.
  const back = cfg.edition === 'party' ? defuses.length : Math.min(2, defuses.length);
  for (let i = 0; i < back; i++) pile.push(defuses.pop());
  st.gone.push(...defuses); // spare Defuses go back in the box
  shuffleIn(st, pile);
  // 3) deal 7 each -> hands of 8
  for (let r = 0; r < 7; r++) for (let s = 0; s < P; s++) st.hands[s].push(pile.shift());
  // faster-game variant (2-3 players): remove about a third, unseen
  if (cfg.fast) {
    const n = Math.round(pile.length / 3);
    st.removed = pile.splice(0, n);
  }
  // 4) kittens: one fewer than players in total
  let ek = P - 1, ik = 0;
  if (cfg.edition === 'imploding') {
    ik = 1;
    ek = cfg.twoBoth && P === 2 ? 1 : P - 2;
  }
  for (let i = 0; i < (box.EK || 0); i++) (i < ek ? pile : st.gone).push(make('EK'));
  if (ik) pile.push({ ...make('IK'), up: false });
  shuffleIn(st, pile);
  st.deck = pile;
  st.cur = rint(st, P);
  push(st, { t: 'setup', players: P, deck: pile.length, ek, ik, removed: st.removed.length, first: st.cur });
  for (let s = 0; s < P; s++) push(st, { t: 'hand', vis: [s], cards: st.hands[s].map((c) => c.t) });
  push(st, { t: 'turn', seat: st.cur, turns: 1 });
  return st;
}

function push(st, ev) { ev.n = st.log.length; st.log.push(ev); }

// ---------------------------------------------------------------- helpers
export const aliveSeats = (st) => st.alive.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
export function nextAlive(st, from, dir = st.dir) {
  const P = st.alive.length;
  for (let k = 1; k <= P; k++) {
    const s = (((from + dir * k) % P) + P) % P;
    if (st.alive[s]) return s;
  }
  return from;
}
const hasType = (hand, t) => hand.some((c) => c.t === t);
const takeType = (hand, t) => { const i = hand.findIndex((c) => c.t === t); return i < 0 ? null : hand.splice(i, 1)[0]; };
const takeId = (hand, id) => { const i = hand.findIndex((c) => c.id === id); return i < 0 ? null : hand.splice(i, 1)[0]; };
const kindOfDraw = (c) => (c.t === 'EK' ? 'E' : c.t === 'IK' ? (c.up ? 'U' : 'I') : 'S');
export const ikUpPos = (st) => st.deck.findIndex((c) => c.t === 'IK' && c.up);

// Classify a set of cards played together. Returns null if illegal.
export function comboKind(types, five = true) {
  const n = types.length;
  if (n === 1) return PLAYABLE_SINGLE.has(types[0]) ? 'single' : null;
  if (types.some((t) => t === 'EK' || t === 'IK')) return null;
  const ferals = types.filter((t) => t === 'FERAL').length;
  const rest = types.filter((t) => t !== 'FERAL');
  if (n === 2 || n === 3) {
    const kind = n === 2 ? 'pair' : 'triple';
    if (ferals === 0) return rest.every((t) => t === rest[0]) ? kind : null;
    // Feral Cat stands in for any cat card (not for action cards)
    if (rest.length === 0) return kind;
    return rest.every((t) => t === rest[0]) && isCat(rest[0]) ? kind : null;
  }
  if (n === 5 && five) {
    if (new Set(rest).size !== rest.length) return null;
    const usedCats = rest.filter((t) => CAT_TYPES.includes(t)).length;
    return ferals <= CAT_TYPES.length - usedCats ? 'five' : null;
  }
  return null;
}

// ---------------------------------------------------------------- legal moves
export function legalActions(st, seat) {
  const out = [];
  if (st.phase === 'over' || !st.alive[seat]) return out;
  const hand = st.hands[seat];
  const p = st.pending;
  if (st.phase === 'turn' && seat === st.cur) {
    out.push({ type: 'draw', seat });
    const others = aliveSeats(st).filter((s) => s !== seat);
    for (const c of hand) {
      if (!PLAYABLE_SINGLE.has(c.t)) continue;
      if (c.t === 'FAV') for (const tg of others) out.push({ type: 'play', seat, cards: [c.id], target: tg });
      else if (c.t === 'TATK') for (const tg of aliveSeats(st)) out.push({ type: 'play', seat, cards: [c.id], target: tg });
      else out.push({ type: 'play', seat, cards: [c.id] });
    }
    // combos: one representative per distinct type set
    const byType = {};
    for (const c of hand) (byType[c.t] = byType[c.t] || []).push(c);
    const types = Object.keys(byType);
    const ferals = byType.FERAL || [];
    for (const t of types) {
      const same = byType[t];
      const pool = t !== 'FERAL' && isCat(t) ? same.concat(ferals) : same;
      for (const n of [2, 3]) {
        if (pool.length < n) continue;
        const ids = pool.slice(0, n).map((c) => c.id);
        const names = Object.keys(CARD).filter((x) => x !== 'EK' && x !== 'IK');
        for (const tg of others) {
          if (n === 2) out.push({ type: 'play', seat, cards: ids, target: tg });
          else for (const nm of names) out.push({ type: 'play', seat, cards: ids, target: tg, name: nm });
        }
      }
    }
    if (st.cfg.five) {
      const nonFeral = types.filter((t) => t !== 'FERAL');
      if (nonFeral.length + Math.min(ferals.length, 5) >= 5) {
        const ids = nonFeral.slice(0, 5).map((t) => byType[t][0].id);
        for (let i = 0; ids.length < 5 && i < ferals.length; i++) ids.push(ferals[i].id);
        if (comboKind(ids.map((id) => hand.find((c) => c.id === id).t), true) && st.discard.length) out.push({ type: 'play', seat, cards: ids });
      }
    }
  } else if (st.phase === 'nope') {
    if (!p.passed.includes(seat)) {
      out.push({ type: 'pass', seat });
      const n = hand.find((c) => c.t === 'NOPE');
      if (n) out.push({ type: 'nope', seat, card: n.id });
    }
  } else if (st.phase === 'favor' && p.target === seat) {
    for (const c of hand) out.push({ type: 'give', seat, card: c.id });
  } else if ((st.phase === 'defuse' || st.phase === 'implode') && p.seat === seat) {
    for (let i = 0; i <= st.deck.length; i++) out.push({ type: 'insert', seat, pos: i });
  } else if (st.phase === 'alter' && p.seat === seat) {
    out.push({ type: 'alter', seat, order: st.deck.slice(0, 3).map((c) => c.id) });
  } else if (st.phase === 'pick' && p.seat === seat) {
    for (const c of st.discard) if (!p.exclude.includes(c.id)) out.push({ type: 'pick', seat, card: c.id });
  }
  return out;
}

// Who the game is waiting on right now (one or more seats).
export function waitingOn(st) {
  if (st.phase === 'over') return [];
  const p = st.pending;
  if (st.phase === 'turn') return [st.cur];
  if (st.phase === 'nope') return aliveSeats(st).filter((s) => !p.passed.includes(s));
  if (st.phase === 'favor') return [p.target];
  return [p.seat];
}

// ---------------------------------------------------------------- apply
export function apply(stIn, a, opts = {}) {
  const st = opts.inPlace ? stIn : structuredClone(stIn);
  const err = (m) => { throw new Error(m); };
  if (st.phase === 'over') err('game over');
  if (!st.alive[a.seat]) err('seat is out');
  const hand = st.hands[a.seat];
  const p = st.pending;

  switch (a.type) {
    case 'draw': {
      if (st.phase !== 'turn' || a.seat !== st.cur) err('not your turn');
      drawCard(st, a.seat, 'top');
      break;
    }
    case 'play': {
      if (st.phase !== 'turn' || a.seat !== st.cur) err('not your turn');
      const ids = a.cards || [];
      if (new Set(ids).size !== ids.length) err('duplicate card');
      const cards = ids.map((id) => hand.find((c) => c.id === id) || err('card not in hand'));
      const types = cards.map((c) => c.t);
      const kind = comboKind(types, st.cfg.five);
      if (!kind) err('not a legal play');
      const t0 = types[0];
      const others = aliveSeats(st).filter((s) => s !== a.seat);
      let target = null, name = null;
      if (kind === 'pair' || kind === 'triple' || (kind === 'single' && t0 === 'FAV')) {
        if (!others.includes(a.target)) err('pick another player');
        target = a.target;
      }
      if (kind === 'single' && t0 === 'TATK') {
        if (!st.alive[a.target]) err('pick a player');
        target = a.target;
      }
      if (kind === 'triple') {
        if (!CARD[a.name] || a.name === 'EK' || a.name === 'IK') err('name a card');
        name = a.name;
      }
      if (kind === 'five' && st.discard.length === 0) err('discard pile is empty');
      for (const id of ids) st.discard.push(takeId(hand, id));
      push(st, { t: 'play', seat: a.seat, cards: types, kind, target, name });
      // The player who just played doesn't get asked to Nope their own card.
      st.pending = { kind, card: t0, by: a.seat, target, name, ids, nopes: 0, passed: [a.seat] };
      st.phase = 'nope';
      autoPass(st);
      maybeResolve(st);
      break;
    }
    case 'nope': {
      if (st.phase !== 'nope') err('nothing to nope');
      if (p.passed.includes(a.seat)) err('already passed');
      const c = takeId(hand, a.card);
      if (!c || c.t !== 'NOPE') (c && hand.push(c), err('no Nope'));
      st.discard.push(c);
      p.nopes++;
      p.passed = [a.seat]; // everyone else may answer, including the original player
      push(st, { t: 'nope', seat: a.seat, nopes: p.nopes });
      autoPass(st);
      maybeResolve(st);
      break;
    }
    case 'pass': {
      if (st.phase !== 'nope') err('nothing to pass on');
      if (!p.passed.includes(a.seat)) p.passed.push(a.seat);
      maybeResolve(st);
      break;
    }
    case 'give': {
      if (st.phase !== 'favor' || p.target !== a.seat) err('not asked for a card');
      const c = takeId(hand, a.card) || err('card not in hand');
      st.hands[p.by].push(c);
      push(st, { t: 'gave', from: a.seat, to: p.by });
      push(st, { t: 'moved', vis: [a.seat, p.by], from: a.seat, toSeat: p.by, card: c.t });
      backToTurn(st);
      break;
    }
    case 'insert': {
      if ((st.phase !== 'defuse' && st.phase !== 'implode') || p.seat !== a.seat) err('nothing to place');
      const pos = a.pos | 0;
      if (pos < 0 || pos > st.deck.length) err('bad spot');
      const c = p.card;
      if (st.phase === 'implode') c.up = true;
      st.deck.splice(pos, 0, c);
      if (c.t === 'EK') {
        // left = the hider's own turns still to come (public; computers hide by it)
        push(st, { t: 'insert', seat: a.seat, kind: 'E', left: Math.max(0, st.turns - 1) });
        push(st, { t: 'insertAt', vis: [a.seat], pos });
        pushIkPos(st); // the face-up Imploding Kitten's visible depth may move
      } else {
        push(st, { t: 'insert', seat: a.seat, kind: 'U', pos });
      }
      st.pending = null;
      st.phase = 'turn';
      endTurn(st);
      break;
    }
    case 'alter': {
      if (st.phase !== 'alter' || p.seat !== a.seat) err('not altering');
      const top = st.deck.slice(0, 3);
      const order = a.order || [];
      if (order.length !== top.length || !top.every((c) => order.includes(c.id))) err('bad order');
      const re = order.map((id) => top.find((c) => c.id === id));
      st.deck.splice(0, top.length, ...re);
      push(st, { t: 'altered', vis: [a.seat], cards: re.map((c) => c.t + (c.up ? '+' : '')) });
      push(st, { t: 'altdone', seat: a.seat });
      pushIkPos(st);
      backToTurn(st);
      break;
    }
    case 'pick': {
      if (st.phase !== 'pick' || p.seat !== a.seat) err('not picking');
      if (p.exclude.includes(a.card)) err('pick an older card');
      const i = st.discard.findIndex((c) => c.id === a.card);
      if (i < 0) err('not in discard');
      const c = st.discard.splice(i, 1)[0];
      hand.push(c);
      push(st, { t: 'picked', seat: a.seat, card: c.t });
      backToTurn(st);
      break;
    }
    default: err('unknown action');
  }
  return st;
}

function autoPass(st) {
  // Seats with no Nope can't respond; the UI still pauses so this leaks nothing.
  const p = st.pending;
  for (const s of aliveSeats(st)) if (!hasType(st.hands[s], 'NOPE') && !p.passed.includes(s)) p.passed.push(s);
}

function maybeResolve(st) {
  const p = st.pending;
  if (aliveSeats(st).some((s) => !p.passed.includes(s))) return;
  const ok = p.nopes % 2 === 0;
  push(st, { t: 'resolve', ok, by: p.by, card: p.card, kind: p.kind });
  st.pending = null;
  st.phase = 'turn';
  if (ok) resolve(st, p);
}

function backToTurn(st) { st.pending = null; st.phase = 'turn'; }

function resolve(st, p) {
  const me = p.by;
  if (p.kind === 'single') {
    switch (p.card) {
      case 'ATK': attackTo(st, nextAlive(st, me)); break;
      case 'TATK': attackTo(st, p.target); break;
      case 'SKIP': endTurn(st); break;
      case 'REV':
        if (aliveSeats(st).length > 2) { st.dir *= -1; push(st, { t: 'reverse', dir: st.dir }); }
        endTurn(st); break;
      case 'SHUF':
        shuffleIn(st, st.deck);
        push(st, { t: 'shuffle', seat: me });
        pushIkPos(st);
        break;
      case 'STF':
        push(st, { t: 'saw', vis: [me], cards: st.deck.slice(0, 3).map((c) => c.t + (c.up ? '+' : '')) });
        break;
      case 'ALTER':
        if (st.deck.length === 0) break;
        push(st, { t: 'saw', vis: [me], cards: st.deck.slice(0, 3).map((c) => c.t + (c.up ? '+' : '')) });
        st.phase = 'alter'; st.pending = { seat: me };
        break;
      case 'BOTTOM': drawCard(st, me, 'bottom'); break;
      case 'FAV':
        if (st.hands[p.target].length === 0) { push(st, { t: 'empty', seat: p.target }); break; }
        st.phase = 'favor'; st.pending = { by: me, target: p.target };
        break;
    }
  } else if (p.kind === 'pair') {
    const th = st.hands[p.target];
    if (th.length === 0) { push(st, { t: 'empty', seat: p.target }); return; }
    const c = th.splice(rint(st, th.length), 1)[0];
    st.hands[me].push(c);
    push(st, { t: 'stole', from: p.target, to: me });
    push(st, { t: 'moved', vis: [p.target, me], from: p.target, toSeat: me, card: c.t });
  } else if (p.kind === 'triple') {
    const c = takeType(st.hands[p.target], p.name);
    push(st, { t: 'named', from: p.target, to: me, name: p.name, ok: !!c });
    if (c) st.hands[me].push(c);
  } else if (p.kind === 'five') {
    const exclude = p.ids;
    if (st.discard.some((c) => !exclude.includes(c.id))) { st.phase = 'pick'; st.pending = { seat: me, exclude }; }
  }
}

function pushIkPos(st) {
  const i = ikUpPos(st);
  if (i >= 0) push(st, { t: 'ikpos', pos: i });
}

function attackTo(st, target) {
  const n = st.cfg.stack && st.attacked ? st.turns + 2 : 2;
  push(st, { t: 'attack', from: st.cur, to: target, turns: n });
  st.cur = target; st.turns = n; st.attacked = true;
  push(st, { t: 'turn', seat: st.cur, turns: n });
  st.turnNo++;
}

function endTurn(st) {
  st.turns--;
  if (st.turns > 0 && st.alive[st.cur]) {
    push(st, { t: 'turn', seat: st.cur, turns: st.turns });
    st.turnNo++;
    return;
  }
  st.cur = nextAlive(st, st.cur);
  st.turns = 1; st.attacked = false;
  push(st, { t: 'turn', seat: st.cur, turns: 1 });
  st.turnNo++;
}

function drawCard(st, seat, from) {
  if (st.deck.length === 0) throw new Error('draw pile is empty');
  const c = from === 'bottom' ? st.deck.pop() : st.deck.shift();
  const res = kindOfDraw(c);
  push(st, { t: 'draw', seat, from, res });
  if (c.t === 'EK') {
    const d = takeType(st.hands[seat], 'DEF');
    if (d) {
      st.discard.push(d);
      st.defusesUsed[seat]++;
      push(st, { t: 'defuse', seat });
      st.phase = 'defuse'; st.pending = { seat, card: c };
    } else {
      explode(st, seat, c);
    }
    return;
  }
  if (c.t === 'IK') {
    if (c.up) { explode(st, seat, c); return; }
    st.phase = 'implode'; st.pending = { seat, card: c };
    return;
  }
  st.hands[seat].push(c);
  push(st, { t: 'got', vis: [seat], card: c.t });
  endTurn(st);
}

function explode(st, seat, kitten) {
  st.alive[seat] = false;
  st.out[seat] = st.hands[seat];
  st.hands[seat] = [];
  st.gone.push(kitten);
  push(st, { t: 'explode', seat, kitten: kitten.t });
  const left = aliveSeats(st);
  // Two-player Imploding variant: whoever dies first loses -> same thing.
  if (left.length === 1) {
    st.winner = left[0]; st.phase = 'over'; st.pending = null;
    push(st, { t: 'win', seat: left[0] });
    return;
  }
  st.cur = nextAlive(st, seat);
  st.turns = 1; st.attacked = false;
  push(st, { t: 'turn', seat: st.cur, turns: 1 });
  st.turnNo++;
}

// ---------------------------------------------------------------- view
// What one seat may see. seat = -1 gives the full "study" view.
export function view(st, seat) {
  const all = seat === -1;
  const v = {
    cfg: st.cfg, me: seat, cur: st.cur, dir: st.dir, turns: st.turns, attacked: st.attacked,
    phase: st.phase, winner: st.winner, alive: st.alive.slice(), turnNo: st.turnNo,
    deckCount: st.deck.length, ikUp: ikUpPos(st), discard: st.discard.map((c) => ({ id: c.id, t: c.t })),
    handCounts: st.hands.map((h) => h.length), outCounts: st.out.map((h) => h.length),
    defusesUsed: st.defusesUsed.slice(),
    hand: seat >= 0 ? st.hands[seat].map((c) => ({ id: c.id, t: c.t })) : null,
    hands: all ? st.hands.map((h) => h.map((c) => ({ id: c.id, t: c.t }))) : null,
    deck: all ? st.deck.map((c) => c.t + (c.up ? '+' : '')) : null,
    removedCount: st.removed.length,
    waiting: waitingOn(st),
    pending: null,
    log: st.log.filter((e) => !e.vis || all || e.vis.includes(seat)),
  };
  const p = st.pending;
  if (p) {
    if (st.phase === 'nope') v.pending = { by: p.by, kind: p.kind, card: p.card, target: p.target, name: p.name, nopes: p.nopes, canRespond: seat >= 0 && !p.passed.includes(seat) };
    else if (st.phase === 'favor') v.pending = { by: p.by, target: p.target };
    else if (st.phase === 'pick') v.pending = { seat: p.seat, exclude: p.exclude };
    else if (st.phase === 'alter') v.pending = { seat: p.seat, top: p.seat === seat || all ? st.deck.slice(0, 3).map((c) => ({ id: c.id, t: c.t + (c.up ? '+' : '') })) : null };
    else v.pending = { seat: p.seat, card: p.card.t };
  }
  return v;
}
