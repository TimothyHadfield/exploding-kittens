// Card facts for Exploding Kittens. Names and counts are game facts, checked
// against the publisher's rule sheets (see docs/rules-check.md). All wording
// here is our own summary, not rulebook text.

export const CARD = {
  EK:      { name: 'Exploding Kitten', short: 'Kitten',  kind: 'kitten', color: '#e0523f', text: 'Show it. Defuse it or you are out.' },
  IK:      { name: 'Imploding Kitten', short: 'Imploder', kind: 'kitten', color: '#3f8ee0', text: 'First draw: put it back face up. Second draw: you are out.' },
  DEF:     { name: 'Defuse',           short: 'Defuse',  kind: 'defuse', color: '#8fd14f', text: 'Saves you from an Exploding Kitten. Hide it back in the deck.' },
  ATK:     { name: 'Attack',           short: 'Attack',  kind: 'action', color: '#f0a03c', text: 'End your turn, no draw. Next player takes 2 turns.' },
  SKIP:    { name: 'Skip',             short: 'Skip',    kind: 'action', color: '#4aa8e8', text: 'End one turn without drawing.' },
  FAV:     { name: 'Favor',            short: 'Favor',   kind: 'action', color: '#9a8f86', text: 'A player of your choice gives you a card they pick.' },
  SHUF:    { name: 'Shuffle',          short: 'Shuffle', kind: 'action', color: '#b39066', text: 'Shuffle the draw pile.' },
  STF:     { name: 'See the Future',   short: 'Future',  kind: 'action', color: '#e45fb0', text: 'Secretly look at the top 3 cards.' },
  NOPE:    { name: 'Nope',             short: 'Nope',    kind: 'nope',   color: '#d64545', text: 'Cancel any action except a kitten or Defuse. Any time.' },
  TACO:    { name: 'Tacocat',          short: 'Tacocat', kind: 'cat',    color: '#e8c547', text: 'Cat card. Pair it up to steal.' },
  MELON:   { name: 'Cattermelon',      short: 'Melon',   kind: 'cat',    color: '#5cbf6a', text: 'Cat card. Pair it up to steal.' },
  POTATO:  { name: 'Hairy Potato Cat', short: 'Potato',  kind: 'cat',    color: '#b5865a', text: 'Cat card. Pair it up to steal.' },
  BEARD:   { name: 'Beard Cat',        short: 'Beard',   kind: 'cat',    color: '#8a6d5a', text: 'Cat card. Pair it up to steal.' },
  RAINBOW: { name: 'Rainbow-Ralphing Cat', short: 'Rainbow', kind: 'cat', color: '#b07ce8', text: 'Cat card. Pair it up to steal.' },
  FERAL:   { name: 'Feral Cat',        short: 'Feral',   kind: 'cat',    color: '#e070c8', text: 'Counts as any cat card in a combo.' },
  TATK:    { name: 'Targeted Attack',  short: 'Target',  kind: 'action', color: '#f07a3c', text: 'End your turn, no draw. Any player you pick takes 2 turns.' },
  REV:     { name: 'Reverse',          short: 'Reverse', kind: 'action', color: '#3cc0a8', text: 'Reverse play order and end one turn. With 2 players: a Skip.' },
  BOTTOM:  { name: 'Draw from the Bottom', short: 'Bottom', kind: 'action', color: '#c0504a', text: 'End your turn by drawing the bottom card.' },
  ALTER:   { name: 'Alter the Future', short: 'Alter',   kind: 'action', color: '#8f5fd6', text: 'Look at the top 3 and put them back in any order.' },
};

export const CAT_TYPES = ['TACO', 'MELON', 'POTATO', 'BEARD', 'RAINBOW'];

// Original Edition, 56 cards (publisher rule sheet, 2025 print, "Field guide").
export const ORIGINAL = {
  EK: 4, DEF: 6, ATK: 4, SKIP: 4, FAV: 4, SHUF: 4, STF: 5, NOPE: 5,
  TACO: 4, MELON: 4, POTATO: 4, BEARD: 4, RAINBOW: 4,
};

// Imploding Kittens expansion, 20 cards (publisher rule sheet, 2023 print).
export const IMPLODING = { IK: 1, FERAL: 4, TATK: 3, REV: 4, BOTTOM: 4, ALTER: 4 };

// Party Pack, 2-10 players. Cards marked with a paw print are used for 2-3
// players, cards without for 4-7, all of them for 8-10. The 9 Exploding
// Kittens carry no paw print and are counted separately.
export const PARTY_PAW = {
  DEF: 3, ATK: 4, SKIP: 4, STF: 3, ALTER: 2, SHUF: 2, BOTTOM: 3, FAV: 2, NOPE: 4, FERAL: 2,
  TACO: 3, MELON: 3, POTATO: 3, BEARD: 3, RAINBOW: 3,
};
export const PARTY_NOPAW = {
  DEF: 7, ATK: 7, SKIP: 6, STF: 3, ALTER: 4, SHUF: 4, BOTTOM: 4, FAV: 4, NOPE: 6, FERAL: 4,
  TACO: 4, MELON: 4, POTATO: 4, BEARD: 4, RAINBOW: 4,
};
export const PARTY_KITTENS = 9;

export const EDITIONS = {
  original:  { label: 'Original', min: 2, max: 5 },
  imploding: { label: 'Original + Imploding', min: 2, max: 6 },
  party:     { label: 'Party Pack', min: 2, max: 10 },
};

export const sumCounts = (o) => Object.values(o).reduce((a, b) => a + b, 0);

export function addCounts(...objs) {
  const out = {};
  for (const o of objs) for (const [k, v] of Object.entries(o)) out[k] = (out[k] || 0) + v;
  return out;
}

// Everything that goes in the box for a given setup, before any dealing.
export function boxFor(edition, players) {
  if (edition === 'original') return { ...ORIGINAL };
  if (edition === 'imploding') return addCounts(ORIGINAL, IMPLODING);
  if (edition === 'party') {
    let base;
    if (players <= 3) base = { ...PARTY_PAW };
    else if (players <= 7) base = { ...PARTY_NOPAW };
    else base = addCounts(PARTY_PAW, PARTY_NOPAW);
    base.EK = PARTY_KITTENS;
    return base;
  }
  throw new Error('unknown edition ' + edition);
}

export const isCat = (t) => CARD[t] && CARD[t].kind === 'cat';
export const isKitten = (t) => t === 'EK' || t === 'IK';
// Cards you can play on your own turn as a single card.
export const PLAYABLE_SINGLE = new Set(['ATK', 'SKIP', 'FAV', 'SHUF', 'STF', 'TATK', 'REV', 'BOTTOM', 'ALTER']);
