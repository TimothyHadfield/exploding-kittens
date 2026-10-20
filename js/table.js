// Real-table companion: tap what happens at a physical game and see the exact
// chance the next card is a kitten. Same odds engine as the Play tab.
import { EDITIONS } from './cards.js';
import { newGame } from './engine.js';
import { Belief } from './odds.js';
import { esc, help, sheet, closeSheet, dialHTML, futureHTML, spotLabel, fmtPct, toast } from './ui.js';

const KEY = 'ek:table:v1';
let T = { edition: 'original', players: 4, fast: false, events: [], adj: 0 };
let ui = { sheet: null, saw: ['S', 'S', 'S'], place: 0, bottom: false };
try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d) T = { ...T, ...d }; } catch { /* fresh */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(T)); } catch { /* not saved */ } };

function base() {
  const ed = EDITIONS[T.edition];
  T.players = Math.max(ed.min, Math.min(ed.max, T.players));
  const g = newGame({ edition: T.edition, players: T.players, fast: T.fast }, 1);
  return g.log[0]; // {deck, ek, ik}
}

// Rebuild the belief from the event list (so Undo is just "drop the last one").
export function tableBelief(t = T) {
  const s = (() => { const ed = EDITIONS[t.edition]; const P = Math.max(ed.min, Math.min(ed.max, t.players)); return newGame({ edition: t.edition, players: P, fast: t.fast }, 1).log[0]; })();
  const b = new Belief(s.deck + (t.adj || 0), s.ek, s.ik);
  for (const e of t.events) {
    if (b.N <= 0 && e.t !== 'insertMe' && e.t !== 'insertOther' && e.t !== 'ikBack') continue;
    switch (e.t) {
      case 'safe': b.draw('S', e.from || 'top'); break;
      case 'kitten': b.draw('E', e.from || 'top'); break;
      case 'ikDraw': b.draw('I', e.from || 'top'); break;
      case 'ikDead': b.draw('U', e.from || 'top'); break;
      case 'insertMe': b.insertKnown(Math.min(e.pos, b.N), 'E'); break;
      case 'insertOther': b.insertUnknown('E'); break;
      case 'ikBack': b.insertKnown(Math.min(e.pos, b.N), 'U'); break;
      case 'shuffle': b.shuffle(); break;
      case 'saw': b.saw(e.xs.slice(0, b.N)); break;
      case 'scramble': b.scrambleTop(3); break;
      case 'ikpos': b.faceUpAt(e.pos); break;
    }
  }
  return b;
}

const LABEL = {
  safe: 'Safe draw', kitten: 'Kitten drawn', insertMe: 'You hid it', insertOther: 'Someone hid it', shuffle: 'Shuffle',
  saw: 'You saw the top', scramble: 'Top cards rearranged', ikDraw: 'Imploding drawn', ikBack: 'Imploding back face up', ikDead: 'Imploding: out', ikpos: 'Imploding seen',
};

export function renderTable() {
  let s;
  try { s = base(); } catch (e) { return `<div class="pad">${esc(e.message)}</div>`; }
  const b = tableBelief();
  const p = b.N > 0 ? b.prob(0, 'E') + b.prob(0, 'U') : 0;
  const imp = T.edition === 'imploding';
  const expDraws = b.N > 0 && b.nE > 0 ? (b.N + 1) / (b.nE + 1) : null;
  queueMicrotask(renderTableSheet);
  return `<div class="scroll" style="flex:1"><div class="pad wide">
    <div style="display:flex;flex-direction:column;gap:10px">
      <div class="panel"><div class="bigodds"><div class="dial">${dialHTML(p, 'next is a kitten')}</div>
        <div class="kv" style="flex:1"><span>Kittens left</span><b>${b.nE}</b><span>Cards left</span><b>${b.N}</b>
          <span>Avg. draws to a kitten ${help('With k kittens spread at random in n cards, the first one sits on average at spot (n+1)/(k+1).')}</span><b>${expDraws ? expDraws.toFixed(1) : '—'}</b>
          <span>Next 3</span><span>${futureHTML(b)}</span></div></div></div>
      <div class="grid2">
        <button class="btn primary" data-t="safe" style="min-height:56px">Safe draw</button>
        <button class="btn danger" data-t="kittenSheet" style="min-height:56px">Kitten drawn</button>
        <button class="btn" data-t="shuffle">Shuffle</button>
        <button class="btn" data-t="sawSheet">I saw the top</button>
        <button class="btn" data-t="bottomSheet">Drawn from bottom</button>
        <button class="btn" data-t="scramble">Someone altered</button>
        ${imp ? '<button class="btn" data-t="ikSheet">Imploding drawn</button><button class="btn" data-t="ikposSheet">Imploding seen at…</button>' : ''}
        <button class="btn ghost" data-t="undo" ${T.events.length ? '' : 'disabled'}>Undo</button>
        <button class="btn ghost" data-t="adjSheet">Fix count</button>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <div class="panel"><h2>Game ${help('Set this to match your table. The pile size and kitten count come from the official setup for that deck and player count.')}</h2>
        <div class="seg">${Object.entries(EDITIONS).map(([k, v]) => `<button data-t="ed:${k}" aria-pressed="${T.edition === k}">${v.label}</button>`).join('')}</div>
        <div class="row" style="margin-top:10px"><span class="grow">Players</span>
          <div class="stepper"><button data-t="pl:-1" aria-label="Fewer players">−</button><b>${T.players}</b><button data-t="pl:1" aria-label="More players">+</button></div></div>
        <div class="row" style="margin-top:10px"><span class="grow">Faster game (⅓ removed)</span>
          <label class="switch"><input type="checkbox" data-tset="fast" ${T.fast ? 'checked' : ''} aria-label="Faster game"><span></span></label></div>
        <p class="muted" style="font-size:12.5px;margin:8px 0 0">Start: ${s.deck} cards, ${s.ek + s.ik} kitten${s.ek + s.ik > 1 ? 's' : ''}. Changing this restarts.</p>
      </div>
      <div class="panel"><h2>What happened</h2>
        <div class="log" style="max-height:200px;overflow-y:auto">${T.events.length ? T.events.map((e, i) => `<div>${i + 1}. <b>${LABEL[e.t] || e.t}</b>${e.pos != null ? ' · ' + spotLabel(e.pos, 1e9).toLowerCase() : ''}${e.xs ? ' · ' + e.xs.map((x) => (x === 'E' ? 'kitten' : x === 'I' ? 'imploding' : 'safe')).join(', ') : ''}${e.from === 'bottom' ? ' (bottom)' : ''}</div>`).join('') : '<div>Nothing yet. Tap what happens at your table.</div>'}</div>
        <button class="btn small ghost" data-t="reset" style="margin-top:8px">New game</button>
      </div>
    </div>
  </div></div>`;
}

function renderTableSheet() {
  const b = tableBelief();
  const sh = ui.sheet;
  if (!sh) { if (document.querySelector('#sheet[data-owner="table"]')) closeSheet(); return; }
  const cancel = '<button class="btn ghost" data-t="close">Cancel</button>';
  if (sh === 'kitten' || sh === 'bottom') {
    const bottom = sh === 'bottom';
    sheet(`<h3>${bottom ? 'Drawn from the bottom' : 'Exploding Kitten drawn'}</h3><p>What happened next?</p>
      <div class="choices">
        ${bottom ? '<button class="btn primary" data-t="safeBottom">Safe card</button>' : ''}
        <button class="btn" data-t="defMe${bottom ? 'B' : ''}">I defused it</button>
        <button class="btn" data-t="defOther${bottom ? 'B' : ''}">Someone defused it</button>
        <button class="btn danger" data-t="exploded${bottom ? 'B' : ''}">They exploded</button>
      </div><div class="btns">${cancel}</div>`);
  } else if (sh === 'place' || sh === 'ikplace' || sh === 'ikpos') {
    const N = b.N + (sh === 'ikpos' ? -1 : 0);
    const pos = Math.min(ui.place, Math.max(0, N));
    sheet(`<h3>${sh === 'place' ? 'Where did you hide it?' : sh === 'ikplace' ? 'Where did it go back (face up)?' : 'How deep is the face-up Imploding Kitten?'}</h3>
      <div class="spot" id="tspot">${spotLabel(pos, N)}</div>
      <input type="range" class="slider" min="0" max="${Math.max(0, N)}" value="${pos}" data-tplace aria-label="Spot in the pile">
      <div class="btns">${cancel}<button class="btn primary" data-t="placeDone">Save</button></div>`);
  } else if (sh === 'saw') {
    const n = Math.min(3, b.N);
    sheet(`<h3>You saw the top ${n}</h3><p>Tap a card to switch safe / kitten. Left = next card.</p>
      <div class="grid3">${ui.saw.slice(0, n).map((x, i) => `<button class="btn ${x === 'E' ? 'danger' : x === 'I' ? 'primary' : ''}" data-t="sawflip:${i}" style="min-height:64px">${x === 'E' ? 'Kitten' : x === 'I' ? 'Imploding' : 'Safe'}</button>`).join('')}</div>
      <div class="btns">${cancel}<button class="btn primary" data-t="sawDone">Save</button></div>`);
  } else if (sh === 'ik') {
    sheet(`<h3>Imploding Kitten drawn</h3>
      <div class="choices"><button class="btn" data-t="ikFirst">Face down: went back face up</button><button class="btn danger" data-t="ikDeadBtn">Face up: player is out</button></div>
      <div class="btns">${cancel}</div>`);
  } else if (sh === 'adj') {
    sheet(`<h3>Fix the card count</h3><p>If your pile has a different number of cards than shown (${b.N}), adjust it here.</p>
      <div class="btns"><button class="btn" data-t="adj:-1">One fewer</button><button class="btn" data-t="adj:1">One more</button></div>
      <div class="btns"><button class="btn primary" data-t="close">Done</button></div>`);
  }
  const w = document.querySelector('#sheet'); if (w) w.dataset.owner = 'table';
}

function add(e) { T.events.push(e); save(); }

export function tableClick(btn) {
  const k = btn.dataset.t;
  if (!k) return false;
  const b = tableBelief();
  if (b.N <= 0 && ['safe', 'kittenSheet', 'sawSheet', 'bottomSheet', 'scramble', 'shuffle'].includes(k)) { toast('The pile is empty — fix the count or start a new game.'); return false; }
  const [cmd, arg] = k.split(':');
  switch (cmd) {
    case 'safe': add({ t: 'safe' }); break;
    case 'safeBottom': add({ t: 'safe', from: 'bottom' }); ui.sheet = null; break;
    case 'kittenSheet': ui.sheet = 'kitten'; break;
    case 'bottomSheet': ui.sheet = 'bottom'; break;
    case 'defMe': case 'defMeB':
      add({ t: 'kitten', from: cmd.endsWith('B') ? 'bottom' : 'top' }); ui.sheet = 'place'; ui.place = 0; ui.placeKind = 'insertMe'; break;
    case 'defOther': case 'defOtherB':
      add({ t: 'kitten', from: cmd.endsWith('B') ? 'bottom' : 'top' }); add({ t: 'insertOther' }); ui.sheet = null; break;
    case 'exploded': case 'explodedB':
      add({ t: 'kitten', from: cmd.endsWith('B') ? 'bottom' : 'top' }); ui.sheet = null; break;
    case 'shuffle': add({ t: 'shuffle' }); if (T.ikUp) toast('Tap "Imploding seen at…" once you can see where it landed.'); break;
    case 'sawSheet': ui.sheet = 'saw'; ui.saw = ['S', 'S', 'S']; break;
    case 'sawflip': { const i = +arg; const cyc = T.edition === 'imploding' ? ['S', 'E', 'I'] : ['S', 'E']; ui.saw[i] = cyc[(cyc.indexOf(ui.saw[i]) + 1) % cyc.length]; break; }
    case 'sawDone': add({ t: 'saw', xs: ui.saw.slice(0, Math.min(3, b.N)) }); ui.sheet = null; break;
    case 'scramble': add({ t: 'scramble' }); break;
    case 'ikSheet': ui.sheet = 'ik'; break;
    case 'ikFirst': add({ t: 'ikDraw' }); ui.sheet = 'ikplace'; ui.place = 0; ui.placeKind = 'ikBack'; T.ikUp = true; break;
    case 'ikDeadBtn': add({ t: 'ikDead' }); T.ikUp = false; ui.sheet = null; break;
    case 'ikposSheet': ui.sheet = 'ikpos'; ui.place = 0; ui.placeKind = 'ikpos'; break;
    case 'placeDone': add({ t: ui.placeKind, pos: ui.place }); ui.sheet = null; break;
    case 'adjSheet': ui.sheet = 'adj'; break;
    case 'adj': T.adj = (T.adj || 0) + +arg; save(); break;
    case 'undo': T.events.pop(); save(); break;
    case 'reset': T.events = []; T.adj = 0; T.ikUp = false; save(); break;
    case 'ed': T.edition = arg; T.events = []; T.adj = 0; save(); break;
    case 'pl': T.players += +arg; T.events = []; T.adj = 0; save(); break;
    case 'close': ui.sheet = null; break;
    default: return false;
  }
  // test hook: is the belief still consistent?
  const nb = tableBelief();
  if (nb.conflict) { T.events.pop(); save(); toast("That doesn't fit what you saw before — undone."); }
  return true;
}

export function tableInput(t, isChange = false) {
  if (t.dataset.tplace != null) {
    ui.place = +t.value;
    const sp = document.querySelector('#tspot');
    if (sp) sp.textContent = spotLabel(ui.place, +t.max);
    return false;
  }
  if (isChange && t.dataset.tset) { T[t.dataset.tset] = t.checked; T.events = []; T.adj = 0; save(); return true; }
  return false;
}

export const _test = { set: (x) => { T = { ...T, ...x }; }, get: () => T };
