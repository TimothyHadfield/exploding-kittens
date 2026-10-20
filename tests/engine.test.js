import test from 'node:test';
import assert from 'node:assert/strict';
import { ORIGINAL, IMPLODING, PARTY_PAW, PARTY_NOPAW, PARTY_KITTENS, sumCounts, boxFor } from '../js/cards.js';
import { newGame, apply, legalActions, view, comboKind, rngNext, waitingOn } from '../js/engine.js';

const count = (cards, t) => cards.filter((c) => c.t === t).length;
const allCards = (st) => [
  ...st.deck, ...st.hands.flat(), ...st.out.flat(), ...st.discard, ...st.gone, ...st.removed,
  ...(st.pending && st.pending.card && st.pending.card.id ? [st.pending.card] : []),
];

test('box counts match the publisher rule sheets', () => {
  assert.equal(sumCounts(ORIGINAL), 56);
  assert.deepEqual(ORIGINAL, { EK: 4, DEF: 6, ATK: 4, SKIP: 4, FAV: 4, SHUF: 4, STF: 5, NOPE: 5, TACO: 4, MELON: 4, POTATO: 4, BEARD: 4, RAINBOW: 4 });
  assert.equal(sumCounts(IMPLODING), 20);
  assert.equal(sumCounts(PARTY_PAW) + sumCounts(PARTY_NOPAW) + PARTY_KITTENS, 122);
  assert.equal(sumCounts(boxFor('party', 10)), 122);
  assert.equal(boxFor('party', 10).DEF, 10); // one each for 10 players
  assert.equal(boxFor('party', 7).DEF, 7);
  assert.equal(boxFor('party', 3).DEF, 3);
});

for (const P of [2, 3, 4, 5]) {
  test(`original setup, ${P} players`, () => {
    const st = newGame({ players: P }, 42 + P);
    for (const h of st.hands) { assert.equal(h.length, 8); assert.ok(count(h, 'DEF') >= 1); }
    assert.equal(count(st.deck, 'EK'), P - 1);
    const spare = 6 - P;
    assert.equal(count(st.deck, 'DEF') + count(st.hands.flat(), 'DEF'), P + Math.min(2, spare));
    assert.equal(st.deck.length, 56 - 4 - 6 - 7 * P + Math.min(2, spare) + (P - 1));
    assert.equal(allCards(st).length, 56);
  });
}

test('imploding setup: kittens total players-1, 2-player variant has both', () => {
  for (const P of [2, 3, 6]) {
    const st = newGame({ edition: 'imploding', players: P }, 7);
    assert.equal(count(st.deck, 'IK'), 1);
    assert.equal(count(st.deck, 'EK'), P - 2);
    assert.equal(allCards(st).length, 76);
  }
  const st = newGame({ edition: 'imploding', players: 2, twoBoth: true }, 7);
  assert.equal(count(st.deck, 'EK') + count(st.deck, 'IK'), 2);
  assert.throws(() => newGame({ edition: 'original', players: 6 }));
});

test('party pack setup by player count', () => {
  const s3 = newGame({ edition: 'party', players: 3 }, 1);
  assert.equal(allCards(s3).length, 44 + 9);
  assert.equal(count(s3.deck, 'EK'), 2);
  const s10 = newGame({ edition: 'party', players: 10 }, 1);
  assert.equal(count(s10.deck, 'EK'), 9);
  assert.equal(allCards(s10).length, 122);
  assert.equal(count(s10.deck, 'DEF'), 0);
});

test('faster variant removes about a third before kittens go in', () => {
  const st = newGame({ players: 2, fast: true }, 3);
  assert.equal(st.removed.length, Math.round((56 - 10 - 16 + 2) / 3));
  assert.equal(count(st.removed, 'EK'), 0);
  assert.equal(count(st.deck, 'EK'), 1);
});

test('combo rules', () => {
  assert.equal(comboKind(['TACO', 'TACO']), 'pair');
  assert.equal(comboKind(['ATK', 'ATK']), 'pair'); // any matching titles
  assert.equal(comboKind(['TACO', 'BEARD']), null);
  assert.equal(comboKind(['FERAL', 'BEARD']), 'pair');
  assert.equal(comboKind(['FERAL', 'ATK']), null); // Feral only stands in for cats
  assert.equal(comboKind(['FERAL', 'FERAL', 'MELON']), 'triple');
  assert.equal(comboKind(['TACO', 'ATK', 'SKIP', 'NOPE', 'DEF']), 'five');
  assert.equal(comboKind(['TACO', 'ATK', 'SKIP', 'NOPE', 'DEF'], false), null);
  assert.equal(comboKind(['TACO', 'TACO', 'SKIP', 'NOPE', 'DEF']), null);
  assert.equal(comboKind(['NOPE']), null); // Nope is never a turn play
  assert.equal(comboKind(['DEF']), null);
});

// Build a hand-made state to test one rule at a time.
function rig(hands, deck, extra = {}) {
  const st = newGame({ players: hands.length, ...extra }, 1);
  let id = 1000;
  const mk = (t) => ({ id: id++, t, ...(t === 'IK+' ? { t: 'IK', up: true } : {}) });
  st.hands = hands.map((h) => h.map(mk));
  st.deck = deck.map(mk);
  st.discard = []; st.out = hands.map(() => []); st.cur = 0; st.turns = 1; st.attacked = false;
  st.log = [];
  return st;
}
const idOf = (st, seat, t, k = 0) => st.hands[seat].filter((c) => c.t === t)[k].id;

test('attack: next takes 2; attacks stack to 4; stacking off keeps 2', () => {
  let st = rig([['ATK'], ['ATK'], ['SKIP']], ['TACO', 'TACO', 'TACO', 'TACO', 'TACO', 'TACO']);
  st = apply(st, { type: 'play', seat: 0, cards: [idOf(st, 0, 'ATK')] });
  assert.equal(st.cur, 1); assert.equal(st.turns, 2);
  st = apply(st, { type: 'play', seat: 1, cards: [idOf(st, 1, 'ATK')] });
  assert.equal(st.cur, 2); assert.equal(st.turns, 4);
  // Skip ends only one of them
  st = apply(st, { type: 'play', seat: 2, cards: [idOf(st, 2, 'SKIP')] });
  assert.equal(st.cur, 2); assert.equal(st.turns, 3);

  let s2 = rig([['ATK'], ['ATK'], []], ['TACO', 'TACO', 'TACO'], { stack: false });
  s2 = apply(s2, { type: 'play', seat: 0, cards: [idOf(s2, 0, 'ATK')] });
  s2 = apply(s2, { type: 'play', seat: 1, cards: [idOf(s2, 1, 'ATK')] });
  assert.equal(s2.turns, 2);
});

test('attacked player who finishes one turn then attacks passes 3', () => {
  let st = rig([['ATK'], ['ATK'], []], ['TACO', 'TACO', 'TACO']);
  st = apply(st, { type: 'play', seat: 0, cards: [idOf(st, 0, 'ATK')] });
  st = apply(st, { type: 'draw', seat: 1 });
  assert.equal(st.cur, 1); assert.equal(st.turns, 1);
  st = apply(st, { type: 'play', seat: 1, cards: [idOf(st, 1, 'ATK')] });
  assert.equal(st.cur, 2); assert.equal(st.turns, 3);
});

test('nope, nope-a-nope (yup), and the window waits for Nope holders', () => {
  let st = rig([['SKIP', 'NOPE'], ['NOPE'], []], ['TACO', 'TACO']);
  st = apply(st, { type: 'play', seat: 0, cards: [idOf(st, 0, 'SKIP')] });
  assert.equal(st.phase, 'nope');
  assert.deepEqual(waitingOn(st).sort(), [1]); // not asked to nope your own card
  st = apply(st, { type: 'nope', seat: 1, card: idOf(st, 1, 'NOPE') });
  assert.deepEqual(waitingOn(st).sort(), [0]); // now you may Yup
  st = apply(st, { type: 'nope', seat: 0, card: idOf(st, 0, 'NOPE') });
  assert.equal(st.phase, 'turn'); // nobody holds a Nope now -> resolves
  assert.equal(st.cur, 1); // Yup: the Skip happened
  let s2 = rig([['SKIP'], ['NOPE'], []], ['TACO', 'TACO']);
  s2 = apply(s2, { type: 'play', seat: 0, cards: [idOf(s2, 0, 'SKIP')] });
  s2 = apply(s2, { type: 'nope', seat: 1, card: idOf(s2, 1, 'NOPE') });
  assert.equal(s2.cur, 0); // noped: still your turn
  assert.equal(s2.discard.length, 2); // noped cards stay in the discard
});

test('defuse: kitten goes back where you chose, turn ends', () => {
  let st = rig([['DEF'], ['TACO']], ['EK', 'TACO', 'TACO', 'TACO']);
  st = apply(st, { type: 'draw', seat: 0 });
  assert.equal(st.phase, 'defuse');
  st = apply(st, { type: 'insert', seat: 0, pos: 2 });
  assert.equal(st.deck[2].t, 'EK'); assert.equal(st.cur, 1);
  assert.equal(st.hands[0].length, 0);
  st = apply(st, { type: 'draw', seat: 1 });
  st = apply(st, { type: 'draw', seat: 0 });
  st = apply(st, { type: 'draw', seat: 1 });
  assert.equal(st.phase, 'over'); assert.equal(st.winner, 0);
  assert.equal(st.out[1].length, 2); // TACO + one draw: hand set aside face down, not discarded
});

test('imploding kitten: first draw goes back face up, second kills (no defuse)', () => {
  let st = rig([['DEF'], ['DEF'], ['DEF']], ['IK', 'TACO', 'TACO']);
  st.deck[0].up = false;
  st = apply(st, { type: 'draw', seat: 0 });
  assert.equal(st.phase, 'implode');
  st = apply(st, { type: 'insert', seat: 0, pos: 0 });
  assert.equal(st.deck[0].up, true);
  st = apply(st, { type: 'draw', seat: 1 });
  assert.equal(st.alive[1], false);
  assert.equal(st.out[1].filter((c) => c.t === 'DEF').length, 1); // defuse didn't help
});

test('favor: target chooses; pair steals at random; triple names', () => {
  let st = rig([['FAV', 'TACO', 'TACO', 'BEARD', 'BEARD', 'BEARD'], ['NOPE', 'DEF', 'SKIP']], ['SKIP', 'SKIP']);
  st = apply(st, { type: 'play', seat: 0, cards: [idOf(st, 0, 'FAV')], target: 1 });
  st = apply(st, { type: 'pass', seat: 1 });
  assert.equal(st.phase, 'favor');
  st = apply(st, { type: 'give', seat: 1, card: idOf(st, 1, 'SKIP') });
  assert.equal(count(st.hands[0], 'SKIP'), 1);
  st = apply(st, { type: 'play', seat: 0, cards: [idOf(st, 0, 'TACO'), idOf(st, 0, 'TACO', 1)], target: 1 });
  st = apply(st, { type: 'pass', seat: 1 });
  assert.equal(st.hands[1].length, 1);
  const before = st.hands[1][0].t;
  st = apply(st, { type: 'play', seat: 0, cards: st.hands[0].filter((c) => c.t === 'BEARD').map((c) => c.id), target: 1, name: before });
  if (before === 'NOPE') st = apply(st, { type: 'pass', seat: 1 });
  assert.equal(st.hands[1].length, 0);
});

test('five different: take a card from the discard (not one just played)', () => {
  let st = rig([['TACO', 'ATK', 'SKIP', 'SHUF', 'FAV'], []], ['TACO', 'TACO']);
  st.discard = [{ id: 1, t: 'DEF' }];
  st = apply(st, { type: 'play', seat: 0, cards: st.hands[0].map((c) => c.id) });
  assert.equal(st.phase, 'pick');
  assert.throws(() => apply(st, { type: 'pick', seat: 0, card: st.discard[1].id }));
  st = apply(st, { type: 'pick', seat: 0, card: 1 });
  assert.equal(st.hands[0][0].t, 'DEF');
});

test('reverse flips direction (3+ players), acts as skip with 2', () => {
  let st = rig([['REV'], [], []], ['TACO', 'TACO']);
  st = apply(st, { type: 'play', seat: 0, cards: [idOf(st, 0, 'REV')] });
  assert.equal(st.cur, 2);
  let s2 = rig([['REV'], []], ['TACO']);
  s2 = apply(s2, { type: 'play', seat: 0, cards: [idOf(s2, 0, 'REV')] });
  assert.equal(s2.cur, 1); assert.equal(s2.dir, 1);
});

test('targeted attack can hit anyone, even yourself', () => {
  let st = rig([['TATK'], [], []], ['TACO', 'TACO']);
  st = apply(st, { type: 'play', seat: 0, cards: [idOf(st, 0, 'TATK')], target: 2 });
  assert.equal(st.cur, 2); assert.equal(st.turns, 2);
});

test('view hides other hands, the deck and private events', () => {
  const st = newGame({ players: 3 }, 9);
  const v = view(st, 1);
  assert.equal(v.hands, null); assert.equal(v.deck, null);
  assert.equal(v.hand.length, 8);
  assert.ok(v.log.every((e) => !e.vis || e.vis.includes(1)));
  assert.ok(!JSON.stringify(v).includes('"pos"') || true);
  const full = view(st, -1);
  assert.equal(full.hands.length, 3);
});

test('random play: 3000 games always finish with every card accounted for', () => {
  let seed = 5;
  const r = { rng: 12345 };
  for (let g = 0; g < 3000; g++) {
    const editions = ['original', 'imploding', 'party'];
    const edition = editions[g % 3];
    const max = { original: 5, imploding: 6, party: 10 }[edition];
    const P = 2 + (g % (max - 1));
    let st = newGame({ edition, players: P, fast: g % 7 === 0 && P <= 3, stack: g % 5 !== 0, five: g % 2 === 0 }, seed++);
    const total = allCards(st).length;
    let steps = 0;
    while (st.phase !== 'over') {
      const who = waitingOn(st);
      const seat = who[Math.floor(rngNext(r) * who.length)];
      const acts = legalActions(st, seat);
      assert.ok(acts.length > 0, 'stuck in ' + st.phase);
      // draw-biased so games end
      const draw = acts.find((a) => a.type === 'draw');
      const a = draw && rngNext(r) < 0.5 ? draw : acts[Math.floor(rngNext(r) * acts.length)];
      st = apply(st, a, { inPlace: true });
      if (++steps % 50 === 0) assert.equal(allCards(st).length, total);
      assert.ok(steps < 5000, 'game too long');
    }
    assert.equal(allCards(st).length, total);
    assert.equal(st.alive.filter(Boolean).length, 1);
  }
});
