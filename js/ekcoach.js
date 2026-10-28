// Exploding Kittens' part of the shared coach kit (js/coach.js, never edit
// that one here): the rules sheet and the guided first game.
//   SEED, CFG, NAMES  the guided game's deal: you go first holding See the
//                     Future, two Skips and two Cattermelons; the 2nd card
//                     in the pile is a kitten (tools: scratch seed search)
//   steps(ctx)        ctx: { game() -> engine state or null, me: 0, sheet() -> the open sheet's heading or '' }
//   RULES             COACH.rules() options

export const ID = 'ek-first-game';
export const SEED = 3414;
export const CFG = { edition: 'original', players: 3, fast: false, stack: true, five: true, twoBoth: false };
export const NAMES = ['Ada', 'Bo'];

export function steps(ctx) {
  const g = () => ctx.game();
  const me = 0;
  const myTurn = () => { const s = g(); return !!s && s.phase === 'turn' && s.cur === me; };
  const did = (f) => { const s = g(); return !!s && s.log.some((e) => f(e)); };
  const sawIt = () => did((e) => e.t === 'resolve' && e.by === me && e.card === 'STF' && e.ok);
  const pairDone = () => did((e) => e.t === 'play' && e.seat === me && e.kind === 'pair');
  const drew = () => did((e) => e.t === 'draw' && e.seat === me);
  const sheetIs = (h) => (ctx.sheet() || '').startsWith(h);
  return [
    { title: 'Your first game', html: 'You against two Easy computers. The pile hides <b>Exploding Kittens</b>. Draw one and you are out, unless you have a <b>Defuse</b>. The last player not exploded wins.' },
    { target: '#p-felt .dial', title: 'The kitten chance', html: 'This dial is the exact chance the next card is a kitten, from everything you have seen. Right now it is low.', skipIf: () => drew() },
    { target: '#hand .card[aria-label="Defuse"]', title: 'Your Defuse', html: 'Everyone starts with one. If you draw a kitten, it saves you, and you hide the kitten back anywhere in the pile.', skipIf: () => drew() },
    { target: ['#hand .card[aria-label="See the Future"]', '#p-acts [data-play]'], title: 'Look first', html: 'Tap <b>See the Future</b>, then <b>Play</b>. You will see the top 3 cards; nobody else will.',
      when: () => myTurn() && !sawIt(), until: () => sawIt(), skipIf: () => sawIt() || drew() },
    { target: '#sheet .sheet', title: 'Now you know', html: 'The top card is safe and the <b>second</b> is a kitten. Whoever draws after you gets it. Tap <b>Got it</b>.',
      when: () => sheetIs('The top'), until: () => !sheetIs('The top'), skipIf: () => drew() },
    { target: '#hand', title: 'Steal with a pair', html: 'Two matching cat cards steal a random card from a player. Tap both <b>Cattermelons</b>, then <b>Play pair</b>, and pick who to rob.',
      when: () => myTurn() && !ctx.sheet(), until: () => pairDone(), skipIf: () => pairDone() || drew() },
    { target: '#p-acts [data-draw]', title: 'End your turn: draw', html: 'Every turn ends with a draw. The top card is safe, so tap <b>Draw</b>.',
      when: () => myTurn() && !ctx.sheet(), until: () => drew(), skipIf: () => drew() },
    { target: '#p-opps', title: 'Their turn', html: 'Now Ada faces the kitten. Watch the dial: when a computer hides a kitten again, the dial knows its habit.', next: true },
    { target: ['#p-acts [data-hint]', '#p-acts [data-undo]'], title: 'Help when you want it', html: '<b>Hint</b> shows what the Hard computer would do. <b>Undo</b> takes back your last move. Either one makes the game count as "with help" in My stats.', when: () => myTurn() && !ctx.sheet() },
    { title: 'You have got it', html: 'Skip and Attack end your turn without drawing: save them for when the dial turns red. A <b>Nope</b> cancels any card. The full rules are on the Play menu and in Settings.' },
  ];
}

// Learn videos on YouTube. Each id checked with YouTube's oembed (200 + this
// title) on 2026-10-28.
export const VIDEOS = [
  { id: 'kAkRKuv5Rts', title: 'How to play Exploding Kittens', who: 'Matthew Inman (the game’s creator)', what: 'how to play, 3 min' },
  { id: '4osKpgjvdYo', title: 'A Sample Round of Exploding Kittens', who: 'Exploding Kittens', what: 'a real round, played through' },
  { id: 'kV_vAisKd1A', title: 'How to CRUSH Your Friends CONSISTENTLY at Exploding Kittens!', who: 'PD Reviews', what: 'strategy' },
  { id: 'txHH2TvIXn8', title: 'how to play Exploding Kittens - Imploding Kittens', who: 'The Game Reporter', what: 'the Imploding expansion' },
  { id: 'Em80PxR9tnU', title: 'how to play Exploding Kittens - Streaking Kittens', who: 'The Game Reporter', what: 'the Streaking expansion' },
];

export const RULES = {
  title: 'How to play Exploding Kittens',
  sections: [
    { id: 'goal', short: 'Goal', title: 'Goal', html: '<p>The pile hides Exploding Kittens. Draw one without a Defuse and you are out. The last player left wins.</p><p class="tip">2 to 5 players with the Original deck, up to 6 with Imploding, 2 to 10 with the Party Pack.</p>' },
    { id: 'setup', short: 'Setup', title: 'Setup', html: '<ul><li>Everyone gets 1 Defuse and 7 other cards.</li><li>Put spare Defuses back in the pile (2 of them; 1 with 5 players), then one fewer Exploding Kittens than players.</li><li>Shuffle. That is the draw pile.</li></ul>' },
    { id: 'turn', short: 'Turn', title: 'Your turn', html: '<ol><li>Play as many cards as you like, one at a time, or none.</li><li>End your turn by drawing the top card of the pile.</li></ol><p>Skip and Attack end your turn <b>without</b> drawing.</p>' },
    { id: 'cards', short: 'Cards', title: 'The cards', html: '<table><tr><td><b>Defuse</b></td><td>Saves you from a kitten. Hide the kitten back anywhere, in secret.</td></tr><tr><td><b>Attack</b></td><td>End your turn, no draw. The next player takes 2 turns.</td></tr><tr><td><b>Skip</b></td><td>End one turn without drawing.</td></tr><tr><td><b>See the Future</b></td><td>Look at the top 3 cards.</td></tr><tr><td><b>Shuffle</b></td><td>Shuffle the pile.</td></tr><tr><td><b>Favor</b></td><td>A player gives you a card of their choice.</td></tr><tr><td><b>Nope</b></td><td>Cancel any action except a kitten or a Defuse, at any time. A Nope can be Noped.</td></tr><tr><td><b>Cat cards</b></td><td>Do nothing alone. Play them in combos.</td></tr></table>' },
    { id: 'combos', short: 'Combos', title: 'Combos', html: '<ul><li><b>Two of a kind</b>: steal a random card from a player.</li><li><b>Three of a kind</b>: name a card; if that player has it, they must give it to you.</li><li><b>Five different cards</b>: take any card from the discard pile (a Settings switch).</li></ul>' },
    { id: 'attack', short: 'Attacks', title: 'Attacks', html: '<p>An attacked player takes 2 turns, drawing each time. If they Attack back, the next player takes their remaining turns plus 2 (the current official rule). Settings has the house rule where it is always just 2.</p>' },
    { id: 'options', short: 'Options', title: 'Decks and options', html: '<ul><li><b>Imploding Kittens</b>: adds 20 cards, including Reverse, Targeted Attack, Draw from the Bottom, Alter the Future, Feral Cat and the Imploding Kitten (first draw: put it back face up; second draw: you are out, no Defuse).</li><li><b>Party Pack</b>: 2 to 10 players.</li><li><b>Faster game</b>: removes about a third of the pile unseen.</li><li><b>Streaking pack</b> (a Settings switch, not with the Party Pack): adds 15 cards and one more Exploding Kitten. <b>Streaking Kitten</b>: keep it secret; while you hold it, a kitten you draw stays in your hand, but lose the Streaking Kitten and the kitten goes off. Getting a kitten from someone’s hand sets it off too. <b>Super Skip</b> ends all your turns. <b>See / Alter the Future 5x</b>. <b>Swap Top and Bottom</b>. <b>Garbage Collection</b>: everyone hides a card in the pile, then shuffle. <b>Catomic Bomb</b>: every kitten goes on top, then your turn ends. <b>Mark</b>: a random card in someone’s hand is shown to all. <b>Curse of the Cat Butt</b>: that player plays blind (random cards, face up; unplayable ones are lost) until a safe draw.</li></ul>' },
    { id: 'videos', short: 'Videos', title: 'Videos', html: VIDEOS.map((x) => `<p><a href="https://www.youtube.com/watch?v=${x.id}" target="_blank" rel="noopener"><b>${x.title}</b></a><br><small class="vid-by">${x.who} · ${x.what}</small></p>`).join('') },
  ],
};
