// Game events -> sounds and animations. Pure mapping (cuesFor / tableCues)
// plus a small runner that hands each cue to FX (js/fx.js, the shared
// library) after the screen has been drawn. Every sound and animation goes
// through FX, so the Sound & effects switches in Settings gate all of it.

export const DANGER = 0.3; // kitten chance that counts as "high" (drumroll on draw)

// Our own sounds, synthesised like the rest of the library.
export function defineSounds(FX) {
  // two quick scissor blades
  FX.define('snip', (k) => {
    for (const at of [0, 0.09]) { k.noise({ f: 5200, q: 4, dur: 0.035, vol: 0.4, at }); k.tone({ f: 2600, f2: 1900, dur: 0.03, vol: 0.06, type: 'triangle', at }); }
  });
  // relief: a soft falling breath and a warm low note
  FX.define('phew', (k) => { k.noise({ f: 1400, f2: 450, filter: 'lowpass', q: 0.6, dur: 0.5, a: 0.06, vol: 0.28 }); k.tone({ f: 523, f2: 392, dur: 0.5, a: 0.05, vol: 0.07, type: 'triangle' }); });
  // a card snatched out of someone's hand
  FX.define('snatch', (k) => { k.noise({ f: 2400, f2: 5200, q: 1.2, dur: 0.09, vol: 0.4 }); k.tone({ f: 500, f2: 1100, dur: 0.06, vol: 0.12, at: 0.07 }); });
  // short drumroll before a risky draw (no closing hit: the card is the hit)
  FX.define('roll', (k) => { for (let t = 0, i = 0; t < 0.34; t += 0.03, i++) k.noise({ f: 1500, q: 0.8, dur: 0.026, vol: 0.07 + t * 0.6 + (i % 2) * 0.03, at: t }); });
  // the face-down Imploding Kitten: a low warning note
  FX.define('ominous', (k) => { k.tone({ f: 196, f2: 147, dur: 0.6, a: 0.04, vol: 0.2, type: 'triangle', lp: 900 }); k.tone({ f: 98, dur: 0.6, vol: 0.12 }); });
}

// events: fresh log events the viewer may see, in order.
// ctx.mine(seat): true for the person holding this screen (any person in
// pass-the-phone). ctx.cur: whose turn it was before these events.
// Returns cues: { at (ms), s (sound), o (play options), a (animation), c (celebrate) }.
export function cuesFor(events, ctx) {
  const mine = ctx.mine || (() => false);
  const out = [];
  let t = 0;
  let cur = ctx.cur;
  const vol = (seat) => (seat != null && !mine(seat) ? { vol: 0.75 } : undefined); // others' moves a bit quieter
  const S = (s, seat, extra) => out.push({ at: t, s, o: { ...(vol(seat) || {}), ...(extra || {}) } });
  const A = (a, dt = 0) => out.push({ at: t + dt, a });
  const seatEl = (s) => ({ seat: s });
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    switch (e.t) {
      case 'setup':
        S('shuffle');
        A({ fx: 'shake', el: 'deck' });
        t += 480;
        for (let k = 0; k < 3; k++) { S('cardDeal', null, { vol: 0.7 }); t += 90; }
        break;
      case 'turn':
        if (mine(e.seat) && e.seat !== cur) {
          out.push({ at: t + 150, s: 'turn' });
          A({ fx: 'pop', el: 'turn' }, 200);
          A({ fx: 'pulse', el: 'dialHot' }, 200);
        }
        cur = e.seat;
        break;
      case 'play':
        S('cardFlip', e.seat);
        if (!mine(e.seat)) A({ fx: 'fly', from: seatEl(e.seat), to: 'discard' });
        t += 160;
        break;
      case 'nope': {
        S('stamp', e.seat, e.nopes % 2 ? undefined : { pitch: 1.25 });
        A({ fx: 'pop', el: 'discard' });
        A({ fx: 'float', el: 'discard', text: e.nopes % 2 ? 'NOPE!' : 'YUP!', color: e.nopes % 2 ? 'var(--bad)' : 'var(--good)' });
        t += 260;
        break;
      }
      case 'resolve':
        if (!e.ok) break;
        if (e.card === 'STF' || e.card === 'ALTER') { S('whoosh', e.by); A({ fx: 'flash', el: 'deck', color: 'var(--accent)' }); t += 300; }
        else if (e.card === 'SKIP') { S('whoosh', e.by, { pitch: 1.6 }); t += 200; }
        break;
      case 'draw': {
        S('cardDeal', e.seat);
        if (!mine(e.seat)) A({ fx: 'fly', from: 'deck', to: seatEl(e.seat) });
        t += 200;
        if (e.res === 'I') { S('ominous', e.seat); A({ fx: 'shake', el: 'deck' }); t += 300; }
        break;
      }
      case 'defuse':
        S('snip', e.seat);
        A({ fx: 'flash', el: 'felt', color: 'var(--good)' });
        A({ fx: 'float', el: 'felt', text: 'Defused!', color: 'var(--good)' });
        t += 250;
        S('phew', e.seat);
        if (mine(e.seat)) out.push({ at: t, c: { kind: 'big', el: 'felt' } });
        t += 300;
        break;
      case 'insert':
        S('cardSlide', e.seat);
        if (e.kind === 'U') { t += 150; S('ominous', e.seat); }
        t += 250;
        break;
      case 'explode':
        S('explosion', e.seat);
        A({ fx: 'boom' });
        A({ fx: 'shake', el: 'game' });
        if (!mine(e.seat)) A({ fx: 'flash', el: seatEl(e.seat), color: 'var(--bad)' }, 100);
        t += 700;
        break;
      case 'shuffle':
        S('shuffle', e.seat);
        A({ fx: 'shake', el: 'deck' });
        t += 520;
        break;
      case 'altdone':
        S('cardSlide', e.seat);
        t += 200;
        break;
      case 'attack':
        S('hit', e.from);
        A({ fx: 'shake', el: seatEl(e.to) });
        A({ fx: 'float', el: seatEl(e.to), text: `${e.turns} turns`, color: 'var(--warm)' });
        t += 350;
        break;
      case 'reverse':
        S('slide');
        t += 200;
        break;
      case 'gave':
        S('cardDeal', e.from);
        A({ fx: 'fly', from: seatEl(e.from), to: seatEl(e.to) });
        t += 250;
        break;
      case 'stole':
        S('snatch', e.to);
        A({ fx: 'fly', from: seatEl(e.from), to: seatEl(e.to) });
        t += 250;
        break;
      case 'named':
        if (e.ok) { S('snatch', e.to); A({ fx: 'fly', from: seatEl(e.from), to: seatEl(e.to) }); }
        else { S('miss', e.to); A({ fx: 'shake', el: seatEl(e.from) }); }
        t += 250;
        break;
      case 'moved':
        // a Defuse landing in your hand is worth a sparkle
        if (e.card === 'DEF' && mine(e.toSeat)) out.push({ at: t, c: { kind: 'big', el: 'hand' } });
        break;
      case 'picked':
        S('cardDeal', e.seat);
        A({ fx: 'fly', from: 'discard', to: seatEl(e.seat) });
        t += 250;
        break;
      case 'empty':
        S('miss');
        t += 200;
        break;
      case 'win':
        out.push({ at: t + 300, c: { kind: mine(e.seat) ? 'win' : 'lose' } });
        break;
      default:
        break;
    }
  }
  return out;
}

// Table tab (real game on a real table): one tap can log one or two events.
export function tableCues(events) {
  const out = [];
  let t = 0;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const next = events[i + 1];
    switch (e.t) {
      case 'safe': out.push({ at: t, s: 'cardDeal' }); t += 200; break;
      case 'kitten':
        out.push({ at: t, s: 'cardDeal' }); t += 200;
        if (next && (next.t === 'insertMe' || next.t === 'insertOther')) { out.push({ at: t, s: 'snip' }); t += 250; out.push({ at: t, s: 'phew' }); t += 300; }
        else { out.push({ at: t, s: 'explosion' }, { at: t, a: { fx: 'shake', el: 'game' } }); t += 600; }
        break;
      case 'insertMe': case 'insertOther': out.push({ at: t, s: 'cardSlide' }); t += 250; break;
      case 'ikDraw': out.push({ at: t, s: 'cardDeal' }, { at: t + 200, s: 'ominous' }); t += 500; break;
      case 'ikBack': out.push({ at: t, s: 'cardSlide' }); t += 250; break;
      case 'ikDead': out.push({ at: t, s: 'explosion' }, { at: t, a: { fx: 'shake', el: 'game' } }); t += 600; break;
      case 'shuffle': out.push({ at: t, s: 'shuffle' }); t += 500; break;
      case 'saw': out.push({ at: t, s: 'whoosh' }); t += 300; break;
      case 'scramble': out.push({ at: t, s: 'cardSlide' }); t += 250; break;
      default: break;
    }
  }
  return out;
}

// Drumroll before a draw: only when the odds are shown (it would hint them
// otherwise), the chance is high, and there is something to hear or see.
export function tensionOn(fx, danger, oddsShown) {
  if (!oddsShown || !(danger >= DANGER)) return false;
  return !!((fx.sound && fx.moves !== false) || fx.animations);
}

// Hand each cue to FX at its time. dom.el(spec) finds the element for a cue
// ('deck', 'discard', 'felt', 'hand', 'game', 'turn', 'dialHot', {seat}),
// dom.boom() shows the explosion flash. opts.schedule(fn, ms) for tests.
export function runCues(cues, FX, dom, opts = {}) {
  if (!FX || !cues || !cues.length) return;
  const set = FX.settings || {};
  const k = (set.animSpeed === 'fast' ? 0.55 : 1) * (opts.pace || 1);
  const schedule = opts.schedule || ((f, ms) => (ms > 0 ? setTimeout(f, ms) : f()));
  for (const cue of cues) schedule(() => fire(cue, FX, dom), Math.round(cue.at * k));
}

function fire(cue, FX, dom) {
  try {
    if (cue.s) FX.play(cue.s, cue.o);
    if (cue.c) FX.celebrate({ kind: cue.c.kind, at: cue.c.el ? dom.el(cue.c.el) : undefined, colors: cue.c.kind === 'win' ? ['#f0b354', '#e0523f', '#6ea8fe', '#6ee7a8', '#e8eaf0'] : undefined });
    const a = cue.a;
    if (!a) return;
    if (!(FX.settings || {}).animations) return; // Animations off: nothing moves
    if (a.fx === 'boom') { if (dom.boom) dom.boom(); return; }
    if (a.fx === 'fly') {
      const from = dom.el(a.from, 'from'), to = dom.el(a.to);
      if (from && to) FX.flyTo(from, to, { duration: 380, fade: true });
      return;
    }
    const el = dom.el(a.el);
    if (!el) return;
    if (a.fx === 'float') FX.floatText(el, a.text, a.color);
    else if (a.fx === 'flash') FX.flash(el, a.color);
    else if (typeof FX[a.fx] === 'function') FX[a.fx](el);
  } catch { /* effects never break the game */ }
}
