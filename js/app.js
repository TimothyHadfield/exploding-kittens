// UI for Exploding Kittens Lab. One state object, render functions writing
// template strings, data-* attributes + event delegation.
import { CARD, EDITIONS, boxFor } from './cards.js';
import { newGame, apply, view, waitingOn, comboKind } from './engine.js';
import { decide, assess } from './ai.js';
import { beliefFromLog } from './odds.js';
import { cardSVG, backSVG } from './art.js';
import { $, esc, pctColor, fmtPct, toast, spotLabel, help, sheet, closeSheet, dialHTML, futureHTML } from './ui.js';
import { renderTable, tableClick, tableInput } from './table.js';
import { renderLearn, learnClick, learnInput } from './learn.js';
import { game as NETGAME, mergeView } from './netgame.js';
import { createOnline } from './online.js';

export const VERSION = 'v1.0';
const LS = 'ek:v1';
const BOT_NAMES = ['Ada', 'Bo', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal', 'Ivy'];

// ------------------------------------------------------------------ state
const S = {
  tab: 'play',
  settings: { fast: false, stack: true, five: true, twoBoth: false, study: false, odds: true, speed: 'normal' },
  setup: { edition: 'original', players: 4, seats: null },
  game: null, seats: null, viewer: 0, shown: -1, sel: [], hint: null, review: [], seenLog: 0,
  gen: 0, sheet: null, newIds: new Set(),
  net: null, localBak: null, // online room snapshot; the local game waits in localBak
};

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(LS) || 'null');
    if (!d) return;
    Object.assign(S.settings, d.settings || {});
    if (d.setup) S.setup = d.setup;
    if (d.game && d.seats) { S.game = d.game; S.seats = d.seats; S.review = d.review || []; S.seenLog = d.game.log.length; }
    if (d.tab) S.tab = d.tab;
  } catch { /* storage blocked: start fresh */ }
}
function save() {
  try {
    const loc = S.net ? S.localBak || {} : S;
    localStorage.setItem(LS, JSON.stringify({ settings: S.settings, setup: S.setup, game: loc.game || null, seats: loc.seats || null, review: loc.review || [], tab: S.tab }));
  } catch { /* private mode: play still works, just not saved */ }
}
export const settings = () => S.settings;

function defaultSeats(n, old = []) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(old[i] || (i === 0 ? { type: 'me', name: 'You' } : { type: 'bot', level: 'medium', name: BOT_NAMES[i - 1] }));
  }
  return out;
}
if (!S.setup.seats) S.setup.seats = defaultSeats(4);

// ------------------------------------------------------------------ helpers
const name = (s) => (S.seats && S.seats[s] ? S.seats[s].name : 'Player ' + (s + 1));
const cname = (t) => (CARD[t] ? CARD[t].name : t);
const isHuman = (s) => S.seats && S.seats[s] && S.seats[s].type !== 'bot';
const humans = () => (S.seats || []).map((x, i) => (x.type !== 'bot' ? i : -1)).filter((i) => i >= 0);

// ------------------------------------------------------------------ log text
function describe(e, me) {
  const n = (s) => (s === me ? 'You' : esc(name(s)));
  switch (e.t) {
    case 'setup': return `New game: <b>${e.deck}</b> cards in the pile, <b>${e.ek + e.ik}</b> kitten${e.ek + e.ik > 1 ? 's' : ''}. ${n(e.first)} go${e.first === me ? '' : 'es'} first.`;
    case 'play': {
      const who = n(e.seat);
      if (e.kind === 'pair') return `<b>${who}</b> play${e.seat === me ? '' : 's'} a pair to steal from ${n(e.target)}.`;
      if (e.kind === 'triple') return `<b>${who}</b> play${e.seat === me ? '' : 's'} three of a kind, asking ${n(e.target)} for <b>${cname(e.name)}</b>.`;
      if (e.kind === 'five') return `<b>${who}</b> play${e.seat === me ? '' : 's'} five different cards.`;
      const tgt = e.target != null ? ` on ${n(e.target)}` : '';
      return `<b>${who}</b> play${e.seat === me ? '' : 's'} <b>${cname(e.cards[0])}</b>${tgt}.`;
    }
    case 'nope': return `<b>${n(e.seat)}</b>: ${e.nopes % 2 ? 'Nope!' : 'Nope that Nope (Yup)!'}`;
    case 'resolve': return e.ok ? '' : 'Cancelled.';
    case 'draw':
      if (e.res === 'E') return `<b>${n(e.seat)}</b> drew an <b>Exploding Kitten</b>!`;
      if (e.res === 'I') return `<b>${n(e.seat)}</b> drew the <b>Imploding Kitten</b> (face down).`;
      if (e.res === 'U') return `<b>${n(e.seat)}</b> drew the face-up <b>Imploding Kitten</b>!`;
      return `${n(e.seat)} drew a card${e.from === 'bottom' ? ' from the bottom' : ''}.`;
    case 'got': return `You got <b>${cname(e.card)}</b>.`;
    case 'defuse': return `<b>${n(e.seat)}</b> defused it.`;
    case 'insert': return e.kind === 'U' ? `${n(e.seat)} put the Imploding Kitten back face up, ${e.pos} card${e.pos === 1 ? '' : 's'} down.` : `${n(e.seat)} hid the kitten in the pile.`;
    case 'insertAt': return `You hid it: ${spotLabel(e.pos, 1e9).toLowerCase()}.`;
    case 'explode': return `💥 <b>${n(e.seat)}</b> exploded!`;
    case 'shuffle': return `${n(e.seat)} shuffled the pile.`;
    case 'saw': return `You see: ${e.cards.map((t) => '<b>' + cname(t.replace('+', '')) + '</b>').join(', ')}.`;
    case 'altered': return `You set the top: ${e.cards.map((t) => cname(t.replace('+', ''))).join(', ')}.`;
    case 'altdone': return e.seat === me ? '' : `${n(e.seat)} rearranged the top cards.`;
    case 'attack': return `<b>${n(e.to)}</b> must take <b>${e.turns}</b> turns.`;
    case 'reverse': return 'Play order reversed.';
    case 'gave': return `${n(e.from)} gave ${n(e.to)} a card.`;
    case 'stole': return `${n(e.to)} stole a card from ${n(e.from)}.`;
    case 'moved': return e.toSeat === me ? `You got <b>${cname(e.card)}</b>.` : `You lost <b>${cname(e.card)}</b>.`;
    case 'named': return e.ok ? `${n(e.from)} handed over <b>${cname(e.name)}</b>.` : `${n(e.from)} had no ${cname(e.name)}.`;
    case 'picked': return `${n(e.seat)} took <b>${cname(e.card)}</b> from the discard pile.`;
    case 'empty': return `${n(e.seat)} had no cards.`;
    case 'win': return `🏆 <b>${n(e.seat)}</b> win${e.seat === me ? '' : 's'}!`;
    default: return '';
  }
}

// ------------------------------------------------------------------ tabs
function setTab(t) {
  S.tab = t;
  closeSheet();
  document.querySelectorAll('nav.tabs button').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === t ? 'page' : 'false'));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('on', v.id === 'v-' + t));
  render();
  save();
}

function render() {
  if (S.tab === 'play') renderPlay();
  else if (S.tab === 'table') $('#v-table').innerHTML = renderTable();
  else if (S.tab === 'learn') $('#v-learn').innerHTML = renderLearn();
  else if (S.tab === 'settings') renderSettings();
}

// ------------------------------------------------------------------ setup screen
function renderSetup() {
  const su = S.setup;
  const ed = EDITIONS[su.edition];
  su.players = Math.max(ed.min, Math.min(ed.max, su.players));
  su.seats = defaultSeats(su.players, su.seats);
  const seatRow = (x, i) => `<div class="seat">
      <span class="n">${i + 1}</span>
      <input value="${esc(x.name)}" maxlength="12" data-seatname="${i}" aria-label="Name for seat ${i + 1}">
      <select data-seattype="${i}" aria-label="Who plays seat ${i + 1}">
        <option value="me" ${x.type === 'me' ? 'selected' : ''}>Human</option>
        <option value="bot:easy" ${x.type === 'bot' && x.level === 'easy' ? 'selected' : ''}>Computer · Easy</option>
        <option value="bot:medium" ${x.type === 'bot' && x.level === 'medium' ? 'selected' : ''}>Computer · Medium</option>
        <option value="bot:hard" ${x.type === 'bot' && x.level === 'hard' ? 'selected' : ''}>Computer · Hard</option>
        <option value="online" ${x.type === 'online' ? 'selected' : ''}>Online friend</option>
      </select></div>`;
  const anyOnline = su.seats.some((x) => x.type === 'online');
  const deckInfo = (() => {
    try {
      const g = newGame({ ...S.settings, edition: su.edition, players: su.players }, 1);
      const e = g.log[0];
      return `${e.deck} cards in the pile · ${e.ek + e.ik} kitten${e.ek + e.ik > 1 ? 's' : ''} · hands of 8`;
    } catch (err) { return esc(err.message); }
  })();
  $('#v-play').innerHTML = `<div class="scroll" style="flex:1"><div class="setup">
    <div class="hero"><div class="art">${cardSVG('EK')}</div>
      <div><h2>Play</h2><p>Last player not exploded wins. Odds shown as you play.</p></div></div>
    <div class="panel"><h2>Deck</h2>
      <div class="seg" role="group">${Object.entries(EDITIONS).map(([k, v]) => `<button data-edition="${k}" aria-pressed="${su.edition === k}">${v.label}</button>`).join('')}</div>
      <p class="muted" style="font-size:13px;margin:8px 0 0">${deckInfo} ${help('Original: 56 cards, 2–5 players. Imploding adds 20 cards and a 6th player. Party Pack: 2–10 players, uses paw-print cards for 2–3 players, the rest for 4–7, all of them for 8–10.')}</p>
    </div>
    <div class="panel"><div class="row" style="margin-bottom:10px"><h2 class="grow" style="margin:0">Players</h2>
      <div class="stepper"><button data-players="-1" aria-label="Fewer players">−</button><b>${su.players}</b><button data-players="1" aria-label="More players">+</button></div></div>
      <div class="seats">${su.seats.map(seatRow).join('')}</div>
      <p class="muted" style="font-size:12.5px;margin:8px 0 0">More than one human: pass the phone. Online friend: they play on their own phone. Rule switches are in Settings.</p>
    </div>
    <div class="panel"><h2>Join a friend's game ${help('Your friend sets a seat to Online friend and taps Create online room. Type the 5-letter code they see.')}</h2>
      <div class="seats">
        <div class="seat" style="grid-template-columns:1fr"><input id="joinname" value="${esc(su.myName || '')}" maxlength="12" placeholder="Your name" aria-label="Your name" data-myname></div>
        <div class="seat" style="grid-template-columns:1fr auto"><input id="joincode" maxlength="5" placeholder="Room code" autocapitalize="characters" autocomplete="off" spellcheck="false" aria-label="Room code" style="text-transform:uppercase;letter-spacing:2px"><button class="btn small" data-join>Join</button></div>
      </div>
    </div>
  </div></div>
  <div class="dealbar">${S.game && S.game.phase !== 'over' ? '<button class="btn" data-resume>Back to game</button>' : ''}${anyOnline ? '<button class="btn primary" data-create style="min-height:52px;font-size:17px">Create online room</button>' : '<button class="btn primary" data-start style="min-height:52px;font-size:17px">Deal</button>'}</div>`;
}

// ------------------------------------------------------------------ online
let net = null;
function getNet() {
  if (!net) {
    net = createOnline({ game: NETGAME, gameId: 'exploding-kittens', botDelayMs: 900 });
    net.on('change', onNet);
    net.on('error', (m) => toast(m));
  }
  return net;
}
const myName = () => {
  const su = S.setup;
  const seatName = (su.seats.find((x) => x.type === 'me') || {}).name;
  return (su.myName || (seatName && seatName !== 'You' ? seatName : '') || 'Player').slice(0, 12);
};
function leaveNet() {
  if (S.localBak) { S.game = S.localBak.game; S.seats = S.localBak.seats; S.review = S.localBak.review || []; }
  else { S.game = null; S.seats = null; S.review = []; }
  S.localBak = null; S.net = null; S.sheet = null; S.screen = 'setup';
  S.seenLog = S.game ? S.game.log.length : 0;
  closeSheet();
}
function onNet(snap) {
  if (!snap || ['none', 'closed', 'left'].includes(snap.status)) {
    if (S.net) {
      if (snap && snap.status === 'closed') toast('The host closed the room.');
      leaveNet(); render();
    }
    return;
  }
  if (!S.net) { S.localBak = { game: S.game, seats: S.seats, review: S.review }; S.game = null; S.review = []; S.gen++; clearTimeout(timer); }
  S.net = snap;
  S.screen = null;
  if (snap.pub && snap.mySeat >= 0 && snap.mine) {
    const prev = S.game;
    const g = mergeView(snap.pub, snap.mine, snap.mySeat);
    const levels = (snap.options && snap.options.levels) || [];
    S.seats = snap.seats.map((x, i) => ({
      type: i === snap.mySeat ? 'me' : x.kind === 'computer' ? 'bot' : 'remote',
      name: x.name || 'Player ' + (i + 1), level: levels[i] || 'medium', online: x.online,
    }));
    if (prev) {
      for (const e of g.log.slice(prev.log.length)) if (e.t === 'explode') boom();
      const oldIds = new Set((prev.hands[snap.mySeat] || []).map((c) => c.id));
      S.newIds = new Set((g.hands[snap.mySeat] || []).filter((c) => !oldIds.has(c.id)).map((c) => c.id));
      if (g.turnNo !== prev.turnNo || g.phase !== prev.phase) S.hint = null;
    } else S.seenLog = snap.status === 'playing' && g.turnNo > 1 ? g.log.length : 0;
    S.game = g; S.viewer = snap.mySeat;
  } else S.game = null;
  if (S.tab === 'play') render();
}

function renderLobby() {
  const n = S.net;
  const root = $('#v-play');
  if (n.status === 'joining' || !n.seats) { root.innerHTML = '<div class="cover"><h2>Joining…</h2><p class="muted">Waiting for the host to seat you.</p><button class="btn" data-leave>Cancel</button></div>'; return; }
  const seatRow = (x, i) => `<div class="seat" style="grid-template-columns:26px 1fr auto;min-height:46px">
      <span class="n">${i + 1}</span>
      <span>${x.kind === 'empty' ? '<span class="muted">Waiting for a friend…</span>' : esc(x.name)}${i === n.mySeat ? ' <span class="muted">(you)</span>' : ''}${x.isHost ? ' <span class="muted">· host</span>' : ''}${x.kind === 'computer' ? ' <span class="muted">· computer</span>' : ''}</span>
      ${n.isHost && i !== n.mySeat && x.kind !== 'human' ? `<button class="btn small" data-seatkind="${i}">${x.kind === 'empty' ? 'Use computer' : 'Open seat'}</button>` : ''}</div>`;
  root.innerHTML = `<div class="scroll" style="flex:1"><div class="setup">
    <div class="panel" style="text-align:center"><h2>Room code</h2><div class="roomcode">${esc(n.code || '')}</div>
      <p class="muted" style="font-size:13px;margin:6px 0 0">Friends open this site, tap Play, and type the code under <b>Join a friend's game</b>.</p></div>
    <div class="panel"><h2>Players</h2><div class="seats">${n.seats.map(seatRow).join('')}</div>
      <p class="muted" style="font-size:12.5px;margin:8px 0 0">${EDITIONS[(n.options && n.options.edition) || 'original'].label} deck. Empty seats become computers when the game starts.</p></div>
  </div></div>
  <div class="dealbar"><button class="btn" data-leave>Leave</button>${n.isHost ? '<button class="btn primary" data-netstart style="min-height:52px;font-size:17px">Start game</button>' : '<span class="muted" style="flex:2;align-self:center;text-align:center">Waiting for the host to start…</span>'}</div>`;
}

async function createRoom() {
  const su = S.setup;
  const seats = su.seats.map((x) => (x.type === 'bot' ? { kind: 'computer', name: x.name } : x.type === 'online' ? 'empty' : 'human'));
  const options = { edition: su.edition, fast: S.settings.fast, stack: S.settings.stack, five: S.settings.five, twoBoth: S.settings.twoBoth, levels: su.seats.map((x) => (x.type === 'bot' ? x.level : null)) };
  toast('Making a room…');
  const r = await getNet().createRoom({ name: myName(), seats, options });
  if (!r.ok) toast(r.message);
}
async function joinRoom() {
  const code = (($('#joincode') || {}).value || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{5}$/.test(code)) { toast('Type the 5-letter room code.'); return; }
  toast('Joining…');
  const r = await getNet().joinRoom(code, myName());
  if (!r.ok) { toast(r.message); if (S.net) { leaveNet(); render(); } }
}

// ------------------------------------------------------------------ game flow
function startGame() {
  const su = S.setup;
  if (!su.seats.some((x) => x.type !== 'bot')) su.seats[0] = { type: 'me', name: su.seats[0].name || 'You' };
  try {
    S.game = newGame({ edition: su.edition, players: su.players, fast: S.settings.fast, stack: S.settings.stack, five: S.settings.five, twoBoth: S.settings.twoBoth });
  } catch (e) { toast(e.message); return; }
  S.seats = su.seats.map((x) => ({ ...x }));
  S.review = []; S.sel = []; S.hint = null; S.sheet = null; S.shown = -1;
  S.seenLog = S.game.log.length;
  S.gen++;
  save();
  step();
}

const DELAY = { fast: 280, normal: 700, slow: 1200 };
let timer = null;
function step() {
  clearTimeout(timer);
  const g = S.game;
  if (S.net) { if (g) S.viewer = S.net.mySeat; render(); return; } // the host's browser runs the computers
  if (!g) { render(); return; }
  if (g.phase === 'over') { S.viewer = humans()[0] ?? 0; render(); return; }
  const gen = S.gen;
  const waiting = waitingOn(g);
  const bot = waiting.find((s) => !isHuman(s));
  // a human who must answer comes first only if no bot is pending
  if (bot != null) {
    const human = waiting.find((s) => isHuman(s));
    if (human != null) S.viewer = human;
    else if (isHuman(g.cur)) S.viewer = g.cur;
    render();
    const d = g.phase === 'nope' ? 380 : DELAY[S.settings.speed] || 700;
    timer = setTimeout(() => {
      if (gen !== S.gen || S.game !== g) return;
      const v = view(g, bot);
      const a = decide(v, S.seats[bot].level, Math.random);
      act(a, true);
    }, d);
    return;
  }
  const h = waiting[0];
  if (h != null) S.viewer = h;
  render();
}

function act(a, fromBot = false) {
  const g = S.game;
  if (!g) return;
  // review: compare a human's turn choices with the Hard computer
  if (!fromBot && g.phase === 'turn' && (a.type === 'play' || a.type === 'draw')) {
    try {
      const v = view(g, a.seat);
      const A = assess(v, 'hard');
      const best = decide(v, 'hard', () => 0.5);
      S.review.push({ turn: g.turnNo, pE: A.pDeath, mine: summarize(v, a), best: summarize(v, best), same: sameAction(a, best), hasDef: A.hasDef });
    } catch { /* review is optional */ }
  }
  if (S.net) {
    const { seat: _seat, ...move } = a;
    S.sel = []; S.hint = null;
    getNet().act(move).then((r) => { if (!r.ok) toast(r.message); });
    render();
    return;
  }
  let next;
  try { next = apply(g, a); } catch (e) { toast(e.message); return; }
  const before = g.log.length;
  S.game = next;
  const fresh = next.log.slice(before);
  S.newIds = new Set();
  for (const e of fresh) {
    if (e.t === 'explode') boom();
  }
  // new cards in the viewer's hand get the deal-in animation
  const oldIds = new Set((g.hands[S.viewer] || []).map((c) => c.id));
  for (const c of next.hands[S.viewer] || []) if (!oldIds.has(c.id)) S.newIds.add(c.id);
  S.sel = []; S.hint = null;
  save();
  step();
}

function summarize(v, a) {
  if (!a) return '';
  if (a.type === 'draw') return 'Draw';
  if (a.type !== 'play') return a.type;
  const ts = a.cards.map((id) => (v.hand.find((c) => c.id === id) || {}).t);
  if (ts.length === 1) return cname(ts[0]);
  return ts.length === 2 ? 'Pair' : ts.length === 3 ? 'Three of a kind' : 'Five different';
}
function sameAction(a, b) {
  if (a.type !== b.type) return false;
  if (a.type === 'draw') return true;
  return a.cards.length === b.cards.length;
}

function boom() {
  const d = document.createElement('div');
  d.className = 'boom';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 800);
}

// ------------------------------------------------------------------ odds helpers
function trackerRows(v, b) {
  const g = S.game;
  const box = boxFor(g.cfg.edition, g.cfg.players);
  const setup = v.log.find((e) => e.t === 'setup');
  const P = g.cfg.players;
  const inGame = { ...box };
  inGame.EK = setup.ek;
  if (box.IK) inGame.IK = setup.ik;
  inGame.DEF = g.cfg.edition === 'party' ? box.DEF : P + Math.min(2, box.DEF - P);
  const disc = {}, mine = {};
  for (const c of v.discard) disc[c.t] = (disc[c.t] || 0) + 1;
  for (const c of v.hand || []) mine[c.t] = (mine[c.t] || 0) + 1;
  return Object.keys(inGame).filter((t) => inGame[t] > 0).map((t) => {
    let unseen = inGame[t] - (disc[t] || 0) - (mine[t] || 0);
    if (t === 'EK') unseen = b ? b.nE : unseen;
    return { t, inGame: inGame[t], disc: disc[t] || 0, mine: mine[t] || 0, unseen: Math.max(0, unseen) };
  });
}

// Chance at least one other living player holds a Nope (cards treated as randomly spread).
function nopeRisk(v, rows) {
  const r = rows.find((x) => x.t === 'NOPE');
  if (!r) return 0;
  const n = r.unseen;
  const kittensInDeck = rows.filter((x) => x.t === 'EK' || x.t === 'IK').reduce((a, x) => a + x.unseen, 0);
  const H = v.handCounts.reduce((a, c, i) => a + (i !== v.me && v.alive[i] ? c : 0), 0);
  const U = v.deckCount - kittensInDeck + v.handCounts.reduce((a, c, i) => a + (i !== v.me ? c : 0), 0) + v.outCounts.reduce((a, c) => a + c, 0) + v.removedCount;
  if (n <= 0 || H <= 0) return 0;
  let none = 1;
  for (let i = 0; i < H; i++) none *= Math.max(0, (U - n - i)) / (U - i);
  return 1 - none;
}

// ------------------------------------------------------------------ in-game render
function renderPlay() {
  const root = $('#v-play');
  if (S.net && (S.net.status !== 'playing' && S.net.status !== 'finished' || !S.game)) { renderLobby(); return; }
  if (!S.net && (!S.game || S.screen === 'setup')) { renderSetup(); return; }
  const g = S.game;
  const me = S.viewer;
  const study = S.settings.study && !S.net; // never online: it would show other hands
  const v = view(g, study ? -1 : me);
  if (study) { v.me = me; v.hand = v.hands[me]; v.log = view(g, me).log; v.pending = view(g, me).pending; }
  const b = beliefFromLog(view(g, me).log, me);
  const multiHuman = !S.net && humans().length > 1;

  // pass-the-phone cover
  if (multiHuman && S.shown !== me && g.phase !== 'over') {
    root.innerHTML = `<div class="cover"><div style="width:90px">${backSVG()}</div><h2>Pass to ${esc(name(me))}</h2>
      <p class="muted">Everyone else, look away.</p><button class="btn primary" data-reveal>I'm ${esc(name(me))} — show</button></div>`;
    return;
  }

  const pE = b ? b.prob(0, 'E') : 0;
  const pU = b ? b.prob(0, 'U') : 0;
  const pDanger = pE + pU;
  const kittens = b ? b.nE + ((g.ikIn ?? g.deck.some((c) => c.t === 'IK')) ? 1 : 0) : 0;
  const dial = S.settings.odds ? `<div class="dial">${dialHTML(pDanger, 'next is a kitten')}
      <div class="cap">${kittens} kitten${kittens === 1 ? '' : 's'} · ${v.deckCount} cards ${help('Exact chance the top card is a kitten, from everything you have seen: cards drawn, See the Future, where you hid kittens. When someone else hides one, every spot counts as equally likely. Shuffles wipe what you knew. Small boxes: the next 3 cards.')}</div>
      ${futureHTML(b)}
    </div>` : '<div></div>';

  const ikPos = v.ikUp;
  const deck = `<div class="pile deck ${v.deckCount ? '' : 'empty'}"><div class="stack">${backSVG()}
      ${ikPos >= 0 ? `<div class="ikup" style="top:${Math.min(96, 4 + ikPos * 3)}%" title="Face-up Imploding Kitten, ${ikPos} cards down"></div>` : ''}</div>
      <div class="lbl">${v.deckCount} left${ikPos >= 0 ? ` · IK at ${ikPos + 1}` : ''}</div>
      ${study && v.deck ? `<div class="lbl" style="font-size:10.5px">${v.deck.slice(0, 5).map((t) => CARD[t.replace('+', '')].short).join(' · ')}</div>` : ''}</div>`;
  const top = v.discard[v.discard.length - 1];
  const discard = `<div class="pile discard ${top ? '' : 'empty'}"><div class="stack" ${top ? `data-cardinfo="${top.t}"` : ''}>${top ? cardSVG(top.t) : `<svg viewBox="0 0 100 140" class="cardsvg"><rect x="2" y="2" width="96" height="136" rx="10" fill="none" stroke="#2a3042" stroke-dasharray="6 5" stroke-width="2"/></svg>`}</div>
      <div class="lbl">Discard · ${v.discard.length}</div></div>`;

  const opps = g.hands.map((h, s) => s).filter((s) => s !== me).map((s) => {
    const turnBadge = g.cur === s && g.turns > 1 ? `<span class="badge">${g.turns}×</span>` : '';
    const lvl = S.seats[s].type === 'bot' ? S.seats[s].level[0].toUpperCase() : '';
    const away = S.net && S.seats[s].type === 'remote' && !S.seats[s].online ? ' <span class="muted" style="font-weight:500;font-size:11px">away</span>' : '';
    const peek = study && v.hands ?`<div class="peek">${v.hands[s].map((c) => `<span style="background:${CARD[c.t].color}">${CARD[c.t].short}</span>`).join('')}</div>` : '';
    return `<div class="opp ${g.cur === s && g.phase !== 'over' ? 'turn' : ''} ${g.alive[s] ? '' : 'out'}">${turnBadge}
      <div class="nm">${esc(name(s))}${lvl ? ` <span class="muted" style="font-weight:500;font-size:11px">${lvl}</span>` : ''}${away}</div>
      <div class="meta">${g.alive[s] ? `<span class="mini"></span>${v.handCounts[s]}${v.defusesUsed[s] ? ` · <span title="Defuses used">D−${v.defusesUsed[s]}</span>` : ''}` : '💥 out'}</div>
      ${peek}<div class="think"><i></i><i></i><i></i></div></div>`;
  }).join('');

  // status line: whose turn + last thing that happened
  const lastLines = v.log.map((e) => describe(e, me)).filter(Boolean);
  const myTurn = g.phase === 'turn' && g.cur === me;
  let status;
  if (g.phase === 'over') status = lastLines[lastLines.length - 1];
  else if (myTurn) status = `<b class="you">Your turn</b>${g.turns > 1 ? ` · ${g.turns} turns to take` : ''} — play cards, then draw. <span class="muted">${lastLines[lastLines.length - 1] || ''}</span>`;
  else status = lastLines[lastLines.length - 1] || '';

  const hand = (v.hand || []).slice().sort((a, b) => order(a.t) - order(b.t));
  const hintIds = S.hint && S.hint.cards ? S.hint.cards : [];
  const handHtml = hand.map((c) => `<button class="card ${S.sel.includes(c.id) ? 'sel' : ''} ${hintIds.includes(c.id) ? 'hint' : ''} ${S.newIds.has(c.id) ? 'new' : ''}" data-card="${c.id}" aria-label="${esc(cname(c.t))}">${cardSVG(c.t)}</button>`).join('');

  // play button
  const selTypes = S.sel.map((id) => (hand.find((c) => c.id === id) || {}).t).filter(Boolean);
  const kind = selTypes.length ? comboKind(selTypes, g.cfg.five) : null;
  const playLabel = !selTypes.length ? 'Play' : !kind ? 'Not a play' : kind === 'single' ? `Play ${CARD[selTypes[0]].short}` : kind === 'pair' ? 'Play pair' : kind === 'triple' ? 'Play 3 of a kind' : 'Play 5 different';
  const rows = b ? trackerRows(v, b) : [];
  const risk = kind && S.settings.odds ? nopeRisk(view(g, me), rows) : 0;

  const tracker = `<div class="panel tracker"><h2>Cards ${help('Unseen = not in the discard pile and not in your hand: somewhere in the pile or in other hands. Kittens are always in the pile.')}</h2>
    <table><tr><th>Card</th><th>Game</th><th>Played</th><th>Yours</th><th>Unseen</th></tr>
    ${rows.map((r) => `<tr><td><span class="dot" style="background:${CARD[r.t].color}"></span>${CARD[r.t].short}</td><td>${r.inGame}</td><td>${r.disc}</td><td>${r.mine}</td><td><b>${r.unseen}</b></td></tr>`).join('')}</table></div>`;
  const logHtml = `<div class="panel"><h2>Log</h2><div class="log" id="loglist">${lastLines.slice(-60).map((l) => `<div>${l}</div>`).join('')}</div></div>`;

  root.innerHTML = `<div class="ingame" style="height:100%">
    <div class="game">
      <div class="opps">${opps}</div>
      <div class="felt">${deck}${dial}${discard}</div>
      <div class="status"><div class="grow">${status}</div>
        <button class="btn small ghost phone-only" data-sheet="info" aria-label="Cards and log">Cards</button>
        <button class="btn small ghost" data-newgame>${g.phase === 'over' ? 'New' : 'Menu'}</button></div>
      <div class="hint-text">${S.hint ? esc(S.hint.text) : ''}</div>
      <div>
        <div class="hand ${myTurn ? '' : 'notmine'}" id="hand" style="--ov:${handOverlap(hand.length)}px">${handHtml || '<span class="muted" style="margin:auto">No cards</span>'}</div>
        <div class="acts">
          <button class="btn" data-hint ${myTurn ? '' : 'disabled'}>Hint</button>
          <button class="btn warm" data-play ${myTurn && kind ? '' : 'disabled'}>${playLabel}${risk ? ` <small style="font-weight:600;opacity:.75">· Nope ${Math.round(risk * 100)}%</small>` : ''}</button>
          <button class="btn primary" data-draw ${myTurn ? '' : 'disabled'}>Draw</button>
        </div>
      </div>
    </div>
    <aside class="side">${tracker}${logHtml}</aside>
  </div>`;
  const ll = $('#loglist'); if (ll) ll.scrollTop = ll.scrollHeight;
  S.newIds = new Set();
  renderPrompt(v, b, rows, lastLines);
}

// Overlap cards just enough to fit the row; past that the row scrolls.
function handOverlap(n) {
  if (n < 2) return 0;
  const lap = innerWidth >= 900;
  const cw = lap ? 92 : innerWidth <= 360 ? 58 : 66;
  const W = (lap ? Math.min(innerWidth - 200 - 320, 900) : innerWidth) - 28;
  const need = (n * cw - W) / (n - 1);
  return Math.round(Math.max(lap ? -6 : 4, Math.min(cw - 44, need)));
}

const ORDER = ['DEF', 'NOPE', 'ATK', 'TATK', 'SKIP', 'REV', 'STF', 'ALTER', 'SHUF', 'BOTTOM', 'FAV', 'FERAL', 'TACO', 'MELON', 'POTATO', 'BEARD', 'RAINBOW'];
const order = (t) => ORDER.indexOf(t);

function renderPrompt(v, b, rows, lines) {
  const g = S.game;
  const me = S.viewer;
  const p = v.pending;
  // fresh private news for the viewer (See the Future result)
  const sawNew = g.log.slice(S.seenLog).filter((e) => e.t === 'saw' && e.vis && e.vis.includes(me) && g.phase !== 'alter');
  S.seenLog = g.log.length;

  if (S.sheet === 'room' && S.net) {
    sheet(`<h3>Online room ${esc(S.net.code || '')}</h3><p>${S.net.isHost ? 'You are the host: the computers run on this phone. If you leave, another player takes over.' : 'If you leave, a computer takes your seat.'}</p>
      <div class="btns"><button class="btn danger" data-leave>Leave room</button><button class="btn" data-close>Close</button></div>`);
    return;
  }
  if (g.phase === 'over') {
    const won = S.net ? g.winner === me : isHuman(g.winner);
    const rv = S.review;
    const same = rv.filter((r) => r.same).length;
    const worst = rv.filter((r) => !r.same).sort((a, b) => b.pE - a.pE).slice(0, 4);
    const btns = S.net ? '<button class="btn primary" data-leave>Leave room</button>' : '<button class="btn" data-setup>Change setup</button><button class="btn primary" data-again>Play again</button>';
    sheet(`<h3>${won ? (!S.net && humans().length > 1 ? esc(name(g.winner)) + ' wins!' : 'You win! 🏆') : esc(name(g.winner)) + ' wins'}</h3>
      ${rv.length ? `<p>Your choices matched the Hard computer <b>${same} of ${rv.length}</b> times. ${help('After each of your turn moves we asked the Hard computer what it would do with the same cards and the same knowledge.')}</p>
      ${worst.length ? `<ul class="review">${worst.map((r) => `<li>Kitten chance <b style="color:${pctColor(r.pE)}">${fmtPct(r.pE)}</b>: you chose <b>${esc(r.mine)}</b>, Hard would <b>${esc(r.best)}</b>.</li>`).join('')}</ul>` : ''}` : ''}
      <div class="btns">${btns}</div>`);
    return;
  }
  if (S.sheet === 'info') {
    sheet(`<div style="display:flex;flex-direction:column;gap:10px">${$('.side').innerHTML}</div><div class="btns"><button class="btn" data-close>Close</button></div>`);
    return;
  }
  if (S.sheet && S.sheet.type === 'target') return promptTarget();
  if (S.sheet && S.sheet.type === 'name') return promptName();
  if (sawNew.length) {
    const cards = sawNew[sawNew.length - 1].cards;
    S.sheet = { type: 'saw', cards };
  }
  if (S.sheet && S.sheet.type === 'saw') {
    sheet(`<h3>The top ${S.sheet.cards.length} cards</h3><p>Left is the next card drawn.</p>
      <div class="cards-pick">${S.sheet.cards.map((t) => `<button tabindex="-1">${cardSVG(t.replace('+', ''), { up: t.endsWith('+') })}</button>`).join('')}</div>
      <div class="btns"><button class="btn primary" data-close>Got it</button></div>`);
    return;
  }
  if (g.phase === 'nope' && p && p.canRespond && v.hand.some((c) => c.t === 'NOPE')) {
    const what = p.kind === 'single' ? cname(p.card) : p.kind === 'pair' ? 'a pair (steal)' : p.kind === 'triple' ? `three of a kind (asking for ${cname(p.name)})` : 'five different cards';
    const on = p.target != null ? ` on ${p.target === me ? 'you' : esc(name(p.target))}` : '';
    const msg = p.nopes % 2 === 0 ? `${p.by === me ? 'Your' : esc(name(p.by)) + '’s'} <b>${what}</b>${on} is about to happen.` : `${p.by === me ? 'Your' : esc(name(p.by)) + '’s'} <b>${what}</b> has been Noped.`;
    sheet(`<h3>${p.nopes % 2 === 0 ? 'Nope it?' : 'Nope back?'}</h3><p>${msg}</p>
      <div class="btns"><button class="btn" data-pass>Let it ${p.nopes % 2 === 0 ? 'happen' : 'stay noped'}</button><button class="btn danger" data-nope>Nope!</button></div>`);
    return;
  }
  if (g.phase === 'favor' && p && p.target === me) {
    sheet(`<h3>Favor for ${esc(name(p.by))}</h3><p>Pick a card to give away.</p>
      <div class="cards-pick">${v.hand.map((c) => `<button data-give="${c.id}">${cardSVG(c.t)}</button>`).join('')}</div>`);
    return;
  }
  if ((g.phase === 'defuse' || g.phase === 'implode') && p && p.seat === me) {
    const N = v.deckCount;
    const pos = S.place != null ? Math.min(S.place, N) : 0;
    const imp = g.phase === 'implode';
    sheet(`<h3>${imp ? 'Imploding Kitten!' : 'Defused!'}</h3>
      <p>${imp ? 'Put it back <b>face up</b> — everyone will see it coming.' : 'Hide the kitten anywhere in the pile. Only you will know where.'}</p>
      <div class="spot" id="spot">${spotLabel(pos, N)}</div>
      <input type="range" class="slider" min="0" max="${N}" value="${pos}" data-place aria-label="Spot in the pile">
      <div class="row muted" style="font-size:12px;justify-content:space-between"><span>Top</span><span>${N} cards</span><span>Bottom</span></div>
      <div class="btns"><button class="btn small" data-placeat="0">Top</button><button class="btn small" data-placeat="rand">Random</button><button class="btn small" data-placeat="${N}">Bottom</button></div>
      <div class="btns"><button class="btn primary" data-insert>Hide it here</button></div>`);
    return;
  }
  if (g.phase === 'alter' && p && p.seat === me) {
    if (!S.alter || S.alter.n !== g.log.length) S.alter = { n: g.log.length, order: p.top.map((c) => c.id), pick: null };
    const byId = Object.fromEntries(p.top.map((c) => [c.id, c]));
    sheet(`<h3>Alter the Future</h3><p>Tap two cards to swap them. Left is drawn first.</p>
      <div class="cards-pick">${S.alter.order.map((id) => `<button data-swap="${id}" class="${S.alter.pick === id ? 'on' : ''}">${cardSVG(byId[id].t.replace('+', ''), { up: byId[id].t.endsWith('+') })}</button>`).join('')}</div>
      <div class="btns"><button class="btn primary" data-alterdone>Done</button></div>`);
    return;
  }
  if (g.phase === 'pick' && p && p.seat === me) {
    const ok = v.discard.filter((c) => !p.exclude.includes(c.id));
    const uniq = []; const seen = new Set();
    for (const c of ok) if (!seen.has(c.t)) { seen.add(c.t); uniq.push(c); }
    sheet(`<h3>Take a card from the discard</h3><p>Five different cards: pick any one.</p>
      <div class="cards-pick">${uniq.map((c) => `<button data-pick="${c.id}">${cardSVG(c.t)}</button>`).join('')}</div>`);
    return;
  }
  closeSheet();
}

function promptTarget() {
  const g = S.game;
  const me = S.viewer;
  const sh = S.sheet;
  const self = sh.allowSelf;
  const seats = g.alive.map((a, i) => (a && (self || i !== me) ? i : -1)).filter((i) => i >= 0);
  sheet(`<h3>${esc(sh.title)}</h3><p>Pick a player.</p>
    <div class="choices">${seats.map((s) => `<button class="btn" data-target="${s}"><b>${s === me ? 'You' : esc(name(s))}</b><small class="muted">${g.hands[s].length} cards</small></button>`).join('')}</div>
    <div class="btns"><button class="btn ghost" data-close>Cancel</button></div>`);
}
function promptName() {
  const g = S.game;
  const types = Object.keys(boxFor(g.cfg.edition, g.cfg.players)).filter((t) => t !== 'EK' && t !== 'IK');
  sheet(`<h3>Name a card</h3><p>If ${esc(name(S.sheet.target))} has one, it's yours.</p>
    <div class="choices">${types.map((t) => `<button class="btn small" data-name="${t}">${CARD[t].name}</button>`).join('')}</div>
    <div class="btns"><button class="btn ghost" data-close>Cancel</button></div>`);
}

// ------------------------------------------------------------------ settings
function renderSettings() {
  const s = S.settings;
  const sw = (k, label, sub, q) => `<div class="item"><div class="grow">${label} ${q ? help(q) : ''}<small>${sub}</small></div>
    <label class="switch"><input type="checkbox" data-set="${k}" ${s[k] ? 'checked' : ''} aria-label="${label}"><span></span></label></div>`;
  $('#v-settings').innerHTML = `<div class="scroll" style="flex:1"><div class="pad" style="max-width:560px">
    <div class="panel"><h2>Rules</h2><div class="list">
      ${sw('stack', 'Attacks stack', 'Attacked player who attacks passes on their turns + 2', 'Official rule on the current rule sheets. Off = the common house rule where the next player always takes just 2.')}
      ${sw('five', 'Five-card combo', 'Five different cards: take any card from the discard', 'In earlier printings and the Party Pack rules; the 2025 Original Edition sheet leaves it out.')}
      ${sw('fast', 'Faster game', 'Removes about a third of the deck unseen (best for 2–3 players)', 'Official variant: fewer cards means kittens come up sooner.')}
      ${sw('twoBoth', 'Two-player: both kittens', 'Imploding deck, 2 players: 1 Exploding + the Imploding Kitten', 'Official two-player variant from the Imploding Kittens rules. Whoever dies first loses.')}
    </div><p class="muted" style="font-size:12.5px;margin:6px 0 0">Rule changes apply to the next game.</p></div>
    <div class="panel"><h2>Help</h2><div class="list">
      ${sw('odds', 'Show odds', 'Kitten chance, next cards, Nope risk')}
      ${sw('study', 'Study mode', 'See every hand and the top of the pile', 'For learning: watch what the computers hold and how the odds play out.')}
    </div></div>
    <div class="panel"><h2>Computer speed</h2>
      <div class="seg">${['slow', 'normal', 'fast'].map((k) => `<button data-speed="${k}" aria-pressed="${s.speed === k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div></div>
    <div class="panel"><h2>Online play</h2><p class="muted" style="margin:0;font-size:14px">On Play, set a seat to <b>Online friend</b> and tap <b>Create online room</b>. Friends type the room code under <b>Join a friend's game</b>. Free; unused rooms vanish after two days.</p></div>
    <p class="muted" style="font-size:12px;text-align:center">Fan-made study tool. Card names are facts about the game; all art here is original. ${VERSION}</p>
  </div></div>`;
}

// ------------------------------------------------------------------ events
function onClick(e) {
  const t = e.target.closest('button, [data-cardinfo]');
  if (!t) return;
  const d = t.dataset;
  if (d.help) { toast(d.help); return; }
  if (d.tab) { setTab(d.tab); return; }
  if (S.tab === 'table') { if (tableClick(t)) { render(); } return; }
  if (S.tab === 'learn') { if (learnClick(t)) render(); return; }
  if (S.tab === 'settings') {
    if (d.speed) { S.settings.speed = d.speed; save(); render(); }
    return;
  }
  // ---- play tab
  const g = S.game;
  if (d.edition) { S.setup.edition = d.edition; save(); render(); return; }
  if (d.players) { S.setup.players += +d.players; save(); render(); return; }
  if ('start' in d) { S.screen = null; startGame(); return; }
  if ('create' in d) { createRoom(); return; }
  if ('join' in d) { joinRoom(); return; }
  if ('leave' in d) { const n = net; leaveNet(); render(); if (n) n.leave(); return; }
  if ('netstart' in d) { getNet().start().then((r) => { if (!r.ok) toast(r.message); }); return; }
  if (d.seatkind) {
    const i = +d.seatkind;
    getNet().setSeat(i, S.net.seats[i].kind === 'empty' ? 'computer' : 'empty').then((r) => { if (!r.ok) toast(r.message); });
    return;
  }
  if ('newgame' in d && S.net) { S.sheet = 'room'; render(); return; }
  if ('resume' in d) { S.screen = null; render(); return; }
  if ('reveal' in d) { S.shown = S.viewer; render(); return; }
  if ('newgame' in d) { S.screen = 'setup'; closeSheet(); render(); return; }
  if ('again' in d) { closeSheet(); startGame(); return; }
  if ('setup' in d) { S.screen = 'setup'; closeSheet(); render(); return; }
  if ('close' in d) { S.sheet = null; closeSheet(); render(); return; }
  if (d.sheet === 'info') { S.sheet = 'info'; render(); return; }
  if (!g) return;
  const me = S.viewer;
  if (d.card) {
    const id = +d.card;
    S.sel = S.sel.includes(id) ? S.sel.filter((x) => x !== id) : [...S.sel, id];
    S.hint = null;
    render(); return;
  }
  if ('hint' in d) {
    const v = view(g, me);
    const best = decide(v, 'hard', () => 0.5);
    const A = assess(v, 'hard');
    S.hint = { cards: best.type === 'play' ? best.cards : [], text: hintText(v, best, A) };
    render(); return;
  }
  if ('draw' in d) { act({ type: 'draw', seat: me }); return; }
  if ('play' in d) {
    const hand = g.hands[me];
    const types = S.sel.map((id) => hand.find((c) => c.id === id).t);
    const kind = comboKind(types, g.cfg.five);
    if (!kind) return;
    if (kind === 'pair' || kind === 'triple' || types[0] === 'FAV' || (kind === 'single' && types[0] === 'TATK')) {
      S.sheet = { type: 'target', kind, cards: S.sel.slice(), allowSelf: kind === 'single' && types[0] === 'TATK', title: kind === 'pair' ? 'Steal a random card from…' : kind === 'triple' ? 'Ask who?' : types[0] === 'FAV' ? 'Ask a Favor from…' : 'Targeted Attack on…' };
      render(); return;
    }
    act({ type: 'play', seat: me, cards: S.sel.slice() }); return;
  }
  if (d.target) {
    const sh = S.sheet; const tg = +d.target;
    if (sh.kind === 'triple') { S.sheet = { ...sh, type: 'name', target: tg }; render(); return; }
    S.sheet = null; closeSheet();
    act({ type: 'play', seat: me, cards: sh.cards, target: tg }); return;
  }
  if (d.name) {
    const sh = S.sheet; S.sheet = null; closeSheet();
    act({ type: 'play', seat: me, cards: sh.cards, target: sh.target, name: d.name }); return;
  }
  if ('pass' in d) { closeSheet(); act({ type: 'pass', seat: me }); return; }
  if ('nope' in d) { const c = g.hands[me].find((x) => x.t === 'NOPE'); closeSheet(); if (c) act({ type: 'nope', seat: me, card: c.id }); return; }
  if (d.give) { closeSheet(); act({ type: 'give', seat: me, card: +d.give }); return; }
  if (d.placeat) {
    const N = g.deck.length;
    S.place = d.placeat === 'rand' ? Math.floor(Math.random() * (N + 1)) : +d.placeat;
    render(); return;
  }
  if ('insert' in d) { const pos = S.place || 0; S.place = null; closeSheet(); act({ type: 'insert', seat: me, pos: Math.min(pos, g.deck.length) }); return; }
  if (d.swap) {
    const id = +d.swap;
    if (S.alter.pick == null) S.alter.pick = id;
    else if (S.alter.pick === id) S.alter.pick = null;
    else {
      const o = S.alter.order; const i = o.indexOf(S.alter.pick), j = o.indexOf(id);
      [o[i], o[j]] = [o[j], o[i]]; S.alter.pick = null;
    }
    render(); return;
  }
  if ('alterdone' in d) { const order = S.alter.order; S.alter = null; closeSheet(); act({ type: 'alter', seat: me, order }); return; }
  if (d.pick) { closeSheet(); act({ type: 'pick', seat: me, card: +d.pick }); return; }
  if (d.cardinfo) { toast(`${CARD[d.cardinfo].name}: ${CARD[d.cardinfo].text}`); }
}

function hintText(v, best, A) {
  const pct = fmtPct(A.pDeath);
  const known = A.top[0];
  if (best.type === 'draw') {
    if (known === 'S') return `Draw — you know the top card is safe.`;
    return `Draw — ${pct} kitten chance${A.hasDef ? ' and you hold a Defuse' : ''}. Save your cards for later.`;
  }
  const ts = best.cards.map((id) => v.hand.find((c) => c.id === id).t);
  const why = known === 'E' ? 'the top card is a kitten' : known === 'U' ? 'the Imploding Kitten is on top' : `${pct} kitten chance${A.hasDef ? '' : ' and no Defuse'}`;
  if (ts.length > 1) {
    if (best.name) return `Play three of a kind and ask for a Defuse — you don't have one.`;
    if (ts.length === 5) return `Play five different cards and take the Defuse from the discard.`;
    return A.hasDef ? 'Play your pair to steal — cat cards do nothing on their own.' : 'Play your pair to steal — you might get a Defuse.';
  }
  const t = ts[0];
  if (t === 'STF' || t === 'ALTER') return `${CARD[t].name}: ${pct} chance is high enough to look first.`;
  if (t === 'FAV') return `Favor: you have no Defuse — ask the player most likely to hold one.`;
  return `${CARD[t].name} — ${why}.`;
}

function onInput(e) {
  const t = e.target;
  if (S.tab === 'table') { if (tableInput(t)) render(); return; }
  if (S.tab === 'learn') { if (learnInput(t)) render(); return; }
  if (t.dataset.place != null) {
    S.place = +t.value;
    const sp = $('#spot'); if (sp) sp.textContent = spotLabel(S.place, S.game.deck.length);
    return;
  }
  if (t.dataset.myname != null) { S.setup.myName = t.value.slice(0, 12); save(); return; }
  if (t.dataset.seatname != null) { S.setup.seats[+t.dataset.seatname].name = t.value.slice(0, 12) || 'Player'; save(); return; }
}
function onChange(e) {
  const t = e.target;
  if (t.dataset.set) { S.settings[t.dataset.set] = t.checked; save(); render(); return; }
  if (t.dataset.seattype != null) {
    const i = +t.dataset.seattype; const [type, level] = t.value.split(':');
    const seat = S.setup.seats[i];
    S.setup.seats[i] = type === 'bot' ? { type, level, name: seat.type === 'bot' ? seat.name : BOT_NAMES[i % 9] }
      : type === 'online' ? { type, name: 'Friend' }
      : { type: 'me', name: seat.type !== 'me' ? (i === 0 ? 'You' : 'Player ' + (i + 1)) : seat.name };
    save(); render();
  }
  if (S.tab === 'table' && tableInput(t, true)) render();
  if (S.tab === 'learn' && learnInput(t, true)) render();
}

// ------------------------------------------------------------------ boot
load();
$('#ver').textContent = VERSION;
document.addEventListener('click', onClick);
document.addEventListener('input', onInput);
document.addEventListener('change', onChange);
setTab(S.tab);
if (S.game && S.game.phase !== 'over') step();
// back into an online room after a reload (loads nothing unless a room was saved)
try { if (localStorage.getItem('online.exploding-kittens')) getNet().resume(); } catch { /* storage blocked */ }

// for tests / debugging in the console
window.EK = { S, act, step, view: () => S.game && view(S.game, S.viewer), net: () => net };
