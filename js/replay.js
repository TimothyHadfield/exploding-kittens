// End-of-game replay: the whole game again, move by move, with every hand
// and the top of the pile face up. Rebuilt from the deal (seed + rules) and
// the list of moves, so nothing extra is stored while playing.
import { newGame, apply } from './engine.js';

// -> { frames: [{ hands: [[type]], top: [type], deck, alive, lines: [event], cur, turns }], ok }
// lines are the public log events that move added (the caller turns them into text).
export function replaySteps(game, moves) {
  let st;
  try { st = newGame(game.cfg, game.seed); } catch { return { frames: [], ok: false }; }
  const snap = (s, from) => ({
    hands: s.hands.map((h) => h.map((c) => c.t)),
    top: s.deck.slice(0, 6).map((c) => c.t + (c.up ? '+' : '')),
    deck: s.deck.length,
    alive: s.alive.slice(),
    cur: s.cur, turns: s.turns,
    lines: s.log.slice(from).filter((e) => !e.vis && e.t !== 'turn' && e.t !== 'resolve' && e.t !== 'ikpos'),
  });
  const frames = [snap(st, 0)];
  for (const a of moves || []) {
    const from = st.log.length;
    try { st = apply(st, a, { inPlace: true }); } catch { return { frames, ok: false }; }
    const f = snap(st, from);
    if (!f.lines.length) { frames[frames.length - 1] = { ...f, lines: frames[frames.length - 1].lines }; continue; } // silent step (a pass): fold it in
    frames.push(f);
  }
  return { frames, ok: st.log.length === game.log.length };
}

// The replay sheet. sh: { frames, i, me }; name(seat); describe(event) -> html.
// plain drawn arrows (the ⏮ ⏭ characters turn into emoji tiles on iPhones)
const ico = (d) => `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="${d}" fill="currentColor"/></svg>`;
const I = { first: ico('M3 3h2v10H3zM14 3v10L6 8z'), prev: ico('M12 3v10L4 8z'), next: ico('M4 3v10l8-5z'), last: ico('M2 3v10l8-5zM11 3h2v10h-2z') };
export function replayHTML(sh, name, describe, CARD, cardSVG) {
  const n = sh.frames.length - 1;
  const f = sh.frames[sh.i];
  const chip = (t) => {
    const k = t.replace('+', '');
    return `<span class="rp-chip" style="background:${CARD[k].color}">${CARD[k].short}</span>`;
  };
  const what = f.lines.map(describe).filter(Boolean).join(' ') || (sh.i === 0 ? 'The deal.' : '');
  const seats = f.hands.map((h, s) => `<div class="rp-seat ${f.alive[s] ? '' : 'out'} ${f.cur === s ? 'cur' : ''}">
      <div class="rp-nm">${name(s)}${s === sh.me ? ' <span class="muted">(you)</span>' : ''}${f.alive[s] ? '' : ' <span class="muted">· out</span>'}</div>
      <div class="rp-hand">${h.length ? h.map(chip).join('') : '<span class="muted">no cards</span>'}</div></div>`).join('');
  const pile = `<div class="rp-pile"><span class="muted">Pile ${f.deck}:</span>${f.top.map((t) => `<span class="rp-card${/EK|IK/.test(t) ? ' hot' : ''}">${cardSVG(t.replace('+', ''), { up: t.endsWith('+') })}</span>`).join('')}${f.deck > f.top.length ? '<span class="muted">…</span>' : ''}</div>`;
  return `<h3 data-key="replay">Replay <span class="muted" style="font-weight:500;font-size:14px">move ${sh.i} of ${n}</span></h3>
    <p class="rp-what">${what}</p>
    ${pile}
    <div class="rp-seats">${seats}</div>
    <div class="rp-nav">
      <button class="btn small" data-rp="first" aria-label="Start" ${sh.i ? '' : 'disabled'}>${I.first}</button>
      <button class="btn small" data-rp="prev" aria-label="Back one move" ${sh.i ? '' : 'disabled'}>${I.prev}</button>
      <input type="range" min="0" max="${n}" value="${sh.i}" data-rpstep aria-label="Move">
      <button class="btn small" data-rp="next" aria-label="Next move" ${sh.i < n ? '' : 'disabled'}>${I.next}</button>
      <button class="btn small" data-rp="last" aria-label="End" ${sh.i < n ? '' : 'disabled'}>${I.last}</button>
    </div>
    <div class="btns"><button class="btn" data-close>Close</button></div>`;
}
