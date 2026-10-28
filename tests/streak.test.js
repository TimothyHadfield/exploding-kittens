// Streaking pack (wave 3): one test per new card, from the 2022 rule sheet
// (docs/rules-check.md), plus a random-play check that no card is ever lost.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as cards from '../js/cards.js';
import { newGame, apply, legalActions, view, waitingOn } from '../js/engine.js';

const { sumCounts, boxFor } = cards;
const STREAKING = cards.STREAKING || {}; // (so these tests run, and fail, on the code before the pack)
const count = (cards, t) => cards.filter((c) => c.t === t).length;
const allCards = (st) => [
  ...st.deck, ...st.hands.flat(), ...st.out.flat(), ...st.discard, ...st.gone, ...st.removed,
  ...(st.trashBin || []).map((x) => x.c),
  ...(st.pending && st.pending.card && st.pending.card.id ? [st.pending.card] : []),
  ...(st.pending && st.pending.queue ? st.pending.queue : []),
];
const card = (st, t) => ({ id: st.nextId++, t });
// a 3-player Streaking game with hands and the top of the pile set by hand
function game({ hands = [[], [], []], top = [], seed = 5 } = {}) {
  const st = newGame({ players: hands.length, streak: true }, seed);
  st.hands = hands.map((h) => h.map((t) => card(st, t)));
  st.deck = top.map((t) => card(st, t)).concat(Array.from({ length: 10 }, () => card(st, 'TACO')));
  st.cur = 0; st.log = [];
  return st;
}
const id = (st, seat, t) => st.hands[seat].find((c) => c.t === t).id;
const play = (st, seat, t, extra = {}) => apply(st, { type: 'play', seat, cards: [id(st, seat, t)], ...extra });

test('setup: the pack adds 15 cards and one kitten per player; never with the Party Pack', () => {
  assert.equal(sumCounts(STREAKING), 15);
  assert.equal(sumCounts(boxFor('original', 4, true)), 71);
  for (const P of [2, 3, 5]) {
    const st = newGame({ players: P, streak: true }, 11);
    assert.equal(count(st.deck, 'EK'), P);
    assert.equal(count(st.deck, 'STREAK') + count(st.hands.flat(), 'STREAK'), 1);
    assert.equal(allCards(st).length, 71);
  }
  const im = newGame({ edition: 'imploding', players: 4, streak: true }, 3);
  assert.equal(count(im.deck, 'EK') + count(im.deck, 'IK'), 4);
  assert.equal(newGame({ edition: 'party', players: 4, streak: true }, 3).cfg.streak, false);
});

test('Streaking Kitten: a drawn kitten is kept in secret; everyone else sees a safe draw', () => {
  let st = game({ hands: [['STREAK'], ['TACO'], ['TACO']], top: ['EK'] });
  st = apply(st, { type: 'draw', seat: 0 });
  assert.equal(count(st.hands[0], 'EK'), 1);
  assert.equal(st.cur, 1);
  assert.ok(st.alive[0]);
  const theirs = view(st, 1).log;
  assert.equal(theirs.find((e) => e.t === 'draw').res, 'S');
  assert.ok(!theirs.some((e) => e.t === 'kept'));
  assert.ok(view(st, 0).log.some((e) => e.t === 'kept'));
});

test('Streaking Kitten taken away while you hold a kitten: you explode, or Defuse and carry on', () => {
  // Bo holds the Streaking Kitten, a kitten and a Defuse; you take the Streaking Kitten with three of a kind
  let st = game({ hands: [['TACO', 'TACO', 'TACO'], ['STREAK', 'EK', 'DEF'], ['BEARD']] });
  const ids = st.hands[0].map((c) => c.id);
  st = apply(st, { type: 'play', seat: 0, cards: ids, target: 1, name: 'STREAK' });
  assert.equal(count(st.hands[0], 'STREAK'), 1);
  assert.equal(st.phase, 'defuse');
  assert.equal(st.pending.seat, 1);
  assert.deepEqual(waitingOn(st), [1]);
  st = apply(st, { type: 'insert', seat: 1, pos: 0 });
  assert.equal(st.cur, 0, 'still your turn');
  assert.equal(st.phase, 'turn');
  // with no Defuse Bo is out, and it is still your turn
  let s2 = game({ hands: [['TACO', 'TACO', 'TACO'], ['STREAK', 'EK'], ['BEARD']] });
  const gone0 = count(s2.gone, 'EK');
  s2 = apply(s2, { type: 'play', seat: 0, cards: s2.hands[0].map((c) => c.id), target: 1, name: 'STREAK' });
  assert.equal(s2.alive[1], false);
  assert.equal(s2.cur, 0);
  assert.equal(count(s2.gone, 'EK'), gone0 + 1);
});

test('getting an Exploding Kitten from a hand (Favor) makes you explode unless you Defuse', () => {
  let st = game({ hands: [['FAV', 'DEF'], ['EK', 'STREAK'], ['BEARD']] });
  st = play(st, 0, 'FAV', { target: 1 });
  assert.equal(st.phase, 'favor');
  st = apply(st, { type: 'give', seat: 1, card: id(st, 1, 'EK') });
  assert.equal(st.phase, 'defuse');
  assert.equal(st.pending.seat, 0);
  assert.equal(view(st, 0).pending.keep, true);
  st = apply(st, { type: 'insert', seat: 0, pos: 3 });
  assert.equal(st.cur, 0, 'you still finish your turn');
  assert.equal(st.deck[3].t, 'EK');
});

test('Super Skip ends every turn you owe', () => {
  let st = game({ hands: [['SSKIP'], ['TACO'], ['TACO']] });
  st.turns = 4; st.attacked = true;
  st = play(st, 0, 'SSKIP');
  assert.equal(st.cur, 1);
  assert.equal(st.turns, 1);
});

test('See the Future x5 shows the top five, only to you', () => {
  let st = game({ hands: [['STF5'], ['TACO'], ['TACO']], top: ['EK', 'DEF', 'NOPE', 'SKIP', 'ATK', 'FAV'] });
  st = play(st, 0, 'STF5');
  assert.deepEqual(view(st, 0).log.find((e) => e.t === 'saw').cards, ['EK', 'DEF', 'NOPE', 'SKIP', 'ATK']);
  assert.ok(!view(st, 1).log.some((e) => e.t === 'saw'));
});

test('Alter the Future x5 reorders the top five', () => {
  let st = game({ hands: [['ALTER5'], ['TACO'], ['TACO']], top: ['EK', 'DEF', 'NOPE', 'SKIP', 'ATK', 'FAV'] });
  st = play(st, 0, 'ALTER5');
  assert.equal(st.phase, 'alter');
  const top = view(st, 0).pending.top;
  assert.equal(top.length, 5);
  assert.equal(view(st, 1).pending.top, null);
  st = apply(st, { type: 'alter', seat: 0, order: top.map((c) => c.id).reverse() });
  assert.deepEqual(st.deck.slice(0, 6).map((c) => c.t), ['ATK', 'SKIP', 'NOPE', 'DEF', 'EK', 'FAV']);
  assert.equal(st.cur, 0);
});

test('Swap Top and Bottom swaps them', () => {
  let st = game({ hands: [['SWAP'], ['TACO'], ['TACO']], top: ['EK'] });
  st.deck.push(card(st, 'DEF'));
  st = play(st, 0, 'SWAP');
  assert.equal(st.deck[0].t, 'DEF');
  assert.equal(st.deck[st.deck.length - 1].t, 'EK');
  assert.equal(st.cur, 0);
});

test('Catomic Bomb: every kitten goes on top, the count is public, your turn ends', () => {
  let st = game({ hands: [['CATOMIC'], ['TACO'], ['TACO']] });
  st.deck.splice(4, 0, card(st, 'EK'));
  st.deck.push(card(st, 'EK'));
  const n = st.deck.length;
  st = play(st, 0, 'CATOMIC');
  assert.deepEqual(st.deck.slice(0, 2).map((c) => c.t), ['EK', 'EK']);
  assert.equal(count(st.deck.slice(2), 'EK'), 0);
  assert.equal(st.deck.length, n);
  assert.equal(view(st, 1).log.find((e) => e.t === 'catomic').n, 2);
  assert.equal(st.cur, 1);
});

test('Garbage Collection: everyone hides a card in the pile, then it is shuffled', () => {
  let st = game({ hands: [['GARB', 'TACO'], ['BEARD', 'MELON'], ['NOPE']] });
  const n = st.deck.length;
  st = play(st, 0, 'GARB'); // Bo's Nope isn't played: Bo passes
  if (st.phase === 'nope') st = apply(st, { type: 'pass', seat: 2 });
  assert.equal(st.phase, 'garbage');
  assert.deepEqual(waitingOn(st).sort(), [0, 1, 2]);
  st = apply(st, { type: 'trash', seat: 1, card: id(st, 1, 'MELON') });
  st = apply(st, { type: 'trash', seat: 2, card: id(st, 2, 'NOPE') });
  assert.equal(st.phase, 'garbage');
  st = apply(st, { type: 'trash', seat: 0, card: id(st, 0, 'TACO') });
  assert.equal(st.phase, 'turn');
  assert.equal(st.deck.length, n + 3);
  assert.equal(count(st.deck, 'MELON'), 1);
  assert.equal(st.cur, 0);
  assert.equal(view(st, 1).log.filter((e) => e.t === 'trashed').length, 1, 'you only see your own card');
});

test('giving the Streaking Kitten to Garbage Collection while holding a kitten sets it off', () => {
  let st = game({ hands: [['GARB', 'TACO'], ['STREAK', 'EK'], ['BEARD']] });
  st = play(st, 0, 'GARB');
  st = apply(st, { type: 'trash', seat: 0, card: id(st, 0, 'TACO') });
  st = apply(st, { type: 'trash', seat: 2, card: id(st, 2, 'BEARD') });
  st = apply(st, { type: 'trash', seat: 1, card: id(st, 1, 'STREAK') });
  assert.equal(st.alive[1], false);
  assert.equal(st.cur, 0);
});

test('Mark: a random card of theirs is face up for everyone until it leaves their hand', () => {
  let st = game({ hands: [['MARK', 'TACO', 'TACO'], ['BEARD'], ['MELON']] });
  st = play(st, 0, 'MARK', { target: 1 });
  assert.deepEqual(view(st, 2).marks[1].map((c) => c.t), ['BEARD']);
  assert.equal(view(st, 1).hand[0].mk, true);
  st = apply(st, { type: 'play', seat: 0, cards: st.hands[0].map((c) => c.id), target: 1 });
  assert.equal(count(st.hands[0], 'BEARD'), 1);
  assert.deepEqual(view(st, 2).marks[1], []);
  assert.ok(!st.hands[0].some((c) => c.mk), 'unmarked once it changes hands');
  assert.equal(view(st, 2).log.find((e) => e.t === 'stole').mk, 'BEARD');
});

test('Curse of the Cat Butt: blind until a safe draw, cards played at random', () => {
  let st = game({ hands: [['CURSE', 'TACO'], ['SKIP', 'BEARD', 'DEF'], ['MELON']] });
  st = play(st, 0, 'CURSE', { target: 1 });
  assert.equal(st.blind[1], true);
  assert.ok(view(st, 1).hand.every((c) => c.t === 'BACK'));
  st = apply(st, { type: 'draw', seat: 0 });
  assert.equal(st.cur, 1);
  assert.deepEqual(legalActions(st, 1).map((a) => a.type).sort(), ['blind', 'draw']);
  assert.throws(() => apply(st, { type: 'play', seat: 1, cards: [id(st, 1, 'SKIP')] }));
  st = apply(st, { type: 'blind', seat: 1 });
  assert.ok(st.log.some((e) => e.t === 'flip' && e.seat === 1));
  // a safe draw ends it
  let s2 = game({ hands: [['TACO'], ['BEARD'], ['MELON']] });
  s2.blind[0] = true;
  s2 = apply(s2, { type: 'draw', seat: 0 });
  assert.equal(s2.blind[0], false);
});

test('Curse: a blind kitten draw turns cards over until a Defuse; the rest are lost', () => {
  for (let seed = 1; seed < 30; seed++) {
    let st = game({ hands: [['TACO', 'BEARD', 'DEF', 'MELON'], ['SKIP'], ['TACO']], top: ['EK'], seed });
    st.blind[0] = true;
    st = apply(st, { type: 'draw', seat: 0 });
    assert.equal(st.phase, 'defuse');
    assert.equal(st.blind[0], false);
    assert.equal(count(st.hands[0], 'DEF'), 0);
    const lost = st.log.filter((e) => e.t === 'lost').length;
    assert.equal(st.hands[0].length, 3 - lost);
  }
  let st = game({ hands: [['TACO', 'BEARD'], ['SKIP'], ['TACO']], top: ['EK'] });
  st.blind[0] = true;
  st = apply(st, { type: 'draw', seat: 0 });
  assert.equal(st.alive[0], false);
});

test('blind players cannot Nope, and the Streaking Kitten never comes back from the discard', () => {
  let st = game({ hands: [['SKIP'], ['NOPE'], ['TACO']] });
  st.blind[1] = true;
  st = play(st, 0, 'SKIP');
  assert.equal(st.cur, 1, 'resolved without waiting on a blind Nope');
  let s2 = game({ hands: [['TACO', 'BEARD', 'MELON', 'POTATO', 'RAINBOW'], [], []] });
  s2.discard.push(card(s2, 'STREAK'));
  s2 = apply(s2, { type: 'play', seat: 0, cards: s2.hands[0].map((c) => c.id) });
  assert.notEqual(s2.phase, 'pick');
});

test('random play with the pack: every game ends, no card is ever lost or copied', () => {
  for (const edition of ['original', 'imploding']) {
    for (let seed = 1; seed <= 40; seed++) {
      const P = 2 + (seed % 4);
      let st = newGame({ edition, players: P, streak: true }, seed * 7919);
      const total = allCards(st).length;
      let r = seed;
      const rnd = (n) => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r % n; };
      for (let i = 0; i < 3000 && st.phase !== 'over'; i++) {
        const seat = waitingOn(st)[0];
        const acts = legalActions(st, seat);
        assert.ok(acts.length, `${edition} seed ${seed}: no moves in ${st.phase}`);
        st = apply(st, acts[rnd(acts.length)]);
        assert.equal(allCards(st).length, total, `${edition} seed ${seed} step ${i}`);
      }
      assert.equal(st.phase, 'over', `${edition} seed ${seed} never ended`);
    }
  }
});
