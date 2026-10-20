// Learn tab: measured computer strength, simulation data, an odds drill and
// the rules in our own words.
import { CARD } from './cards.js';
import { esc, help, pctColor, fmtPct } from './ui.js';

let data = { strength: null, stats: null, loading: false, failed: false };
let drill = null;
let score = { n: 0, err: 0 };

function loadData(rerender) {
  if (data.loading || data.strength) return;
  data.loading = true;
  Promise.all(['data/strength.json', 'data/stats.json'].map((u) => fetch(u).then((r) => (r.ok ? r.json() : null))))
    .then(([a, b]) => { data.strength = a; data.stats = b; })
    .catch(() => { data.failed = true; })
    .finally(() => { data.loading = false; rerender(); });
}

// ---------- charts: one series each, plain SVG, hover via <title>
function lineChart(points, { yMax = 100, xLabel = '', yLabel = '' } = {}) {
  const W = 340, H = 182, L = 34, B = 36, T = 8, R = 10;
  const xs = points.map((p) => p[0]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const X = (x) => L + ((x1 - x) / (x1 - x0 || 1)) * (W - L - R); // more cards on the left
  const Y = (y) => T + (1 - y / yMax) * (H - T - B);
  const grid = [0, 25, 50, 75, 100].filter((g) => g <= yMax).map((g) => `<line x1="${L}" x2="${W - R}" y1="${Y(g)}" y2="${Y(g)}" stroke="#2a3042" stroke-width="1"/><text x="${L - 6}" y="${Y(g) + 4}" text-anchor="end">${g}%</text>`).join('');
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
  const dots = points.map((p) => `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="7" fill="transparent"><title>${p[0]} cards left: ${p[1]}%</title></circle>`).join('');
  const ticks = [x1, Math.round((x0 + x1) / 2), x0].map((x) => `<text x="${X(x)}" y="${H - 20}" text-anchor="middle">${x}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(yLabel)} by ${esc(xLabel)}">${grid}${ticks}
    <path d="${path}" fill="none" stroke="#6ea8fe" stroke-width="2"/>${dots}
    <text x="${(L + W - R) / 2}" y="${H - 3}" text-anchor="middle" style="font-size:10px">${esc(xLabel)}</text></svg>`;
}

function barChart(items, { max = null, unit = '%', ref = null } = {}) {
  const W = 340, rowH = 22, L = 70, R = 44;
  const H = items.length * rowH + 6;
  const m = max ?? Math.max(...items.map((i) => i[1])) * 1.1;
  const X = (v) => L + (v / m) * (W - L - R);
  const bars = items.map(([label, v], i) => {
    const y = 3 + i * rowH;
    return `<g><text x="${L - 6}" y="${y + 14}" text-anchor="end">${esc(label)}</text>
      <rect x="${L}" y="${y + 3}" width="${Math.max(2, X(v) - L).toFixed(1)}" height="${rowH - 8}" rx="4" fill="#6ea8fe"><title>${esc(label)}: ${v}${unit}</title></rect>
      <text x="${X(v) + 5}" y="${y + 14}" style="fill:#e8eaf0">${v}${unit}</text></g>`;
  }).join('');
  const refLine = ref != null ? `<line x1="${X(ref)}" x2="${X(ref)}" y1="0" y2="${H}" stroke="#969db4" stroke-dasharray="3 3"/>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${refLine}${bars}</svg>`;
}

// ---------- odds drill
const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
function newDrill() {
  const kind = r(0, 3);
  const N = r(6, 36), K = r(1, Math.min(4, N - 3));
  if (kind === 0) return { q: `${N} cards left, ${K} kitten${K > 1 ? 's' : ''}. Chance the next card is a kitten?`, a: K / N, why: `${K} ÷ ${N}` };
  if (kind === 1) return { q: `${N} cards, ${K} kitten${K > 1 ? 's' : ''}. You saw the top 3: all safe. Chance the 4th card is a kitten?`, a: K / (N - 3), why: `The 3 known cards are safe, so ${K} kittens hide in the other ${N - 3}: ${K} ÷ ${N - 3}` };
  if (kind === 2) {
    const a = 1 - ((N - K) / N) * ((N - K - 1) / (N - 1));
    return { q: `You were attacked: 2 turns. ${N} cards, ${K} kitten${K > 1 ? 's' : ''}, you play nothing. Chance you hit a kitten?`, a, why: `1 − (${N - K}/${N}) × (${N - K - 1}/${N - 1}) — both draws must be safe` };
  }
  return { q: `Someone defused the only kitten and hid it in a pile of ${N} cards (${N + 1} possible spots). If every spot is equally likely, chance it's on top?`, a: 1 / (N + 1), why: `1 ÷ ${N + 1} spots. Real players often put it right on top, so be careful` };
}

export function renderLearn() {
  loadData(() => { const v = document.querySelector('#v-learn.on'); if (v) v.innerHTML = renderLearn(); });
  if (!drill) drill = { ...newDrill(), guess: 20, shown: false };
  const st = data.strength, sx = data.stats;
  const strength = st ? `<div class="kv">
      <span>Hard vs Easy (1 on 1)</span><b>${st.heads['hard-easy'].hard}%</b>
      <span>Hard vs Medium</span><b>${st.heads['hard-medium'].hard}%</b>
      <span>Medium vs Easy</span><b>${st.heads['medium-easy'].medium}%</b>
      <span>4 players: Hard / Medium / Easy</span><b>${st.table.four.hard}% · ${st.table.four.medium}% · ${st.table.four.easy}%</b>
    </div><p class="muted" style="font-size:12.5px;margin:8px 0 0">Win rates from ${st.games.toLocaleString()} simulated games per matchup, seats rotated. Fair share: 50% heads-up, 25% at 4 players. Measured ${st.measured}.</p>` : `<p class="muted">${data.failed ? 'Could not load the numbers.' : 'Loading…'}</p>`;
  const curve = sx ? lineChart(Object.entries(sx.curve).map(([n, p]) => [+n, p]).sort((a, b) => b[0] - a[0]), { xLabel: 'cards left in the pile', yLabel: 'kitten chance' }) : '';
  const seats = sx ? barChart(sx.seatOrder.map((v, i) => [['1st', '2nd', '3rd', '4th'][i], v]), { max: 40, ref: 25 }) : '';
  const cards = sx ? barChart(Object.entries(sx.cardValue).sort((a, b) => b[1] - a[1]).map(([t, v]) => [CARD[t].short, v]), { max: 40, ref: 25 }) : '';
  const d = drill;
  const err = d.shown ? Math.abs(d.guess / 100 - d.a) : 0;
  return `<div class="scroll" style="flex:1"><div class="pad wide">
    <div style="display:flex;flex-direction:column;gap:10px">
      <div class="panel drill"><h2>Odds drill ${help('Practice the math you need at a real table. Your average miss is tracked below.')}</h2>
        <p style="margin:0 0 8px">${esc(d.q)}</p>
        <div class="row"><input type="range" class="slider grow" min="0" max="100" value="${d.guess}" data-guess aria-label="Your guess"><b style="width:52px;text-align:right" id="guessv">${d.guess}%</b></div>
        ${d.shown ? `<div class="ans" style="color:${pctColor(err * 2)}">${fmtPct(d.a)}</div><p class="muted" style="font-size:13px;text-align:center;margin:0">${esc(d.why)} · you were off by ${Math.round(err * 100)} points</p>` : ''}
        <div class="btns" style="display:flex;gap:8px;margin-top:10px">${d.shown ? '<button class="btn primary" data-l="next" style="flex:1">Next</button>' : '<button class="btn primary" data-l="check" style="flex:1">Check</button>'}</div>
        ${score.n ? `<p class="muted" style="font-size:12.5px;margin:8px 0 0">${score.n} answered · average miss ${Math.round((score.err / score.n) * 100)} points</p>` : ''}
      </div>
      <div class="panel"><h2>How strong? ${help('We play the computers against each other thousands of times. Hard counts every card it has seen and uses the exact odds; Medium uses kittens ÷ cards; Easy plays at random.')}</h2>${strength}</div>
      <div class="panel"><h2>Rules in short</h2>
        <details class="rules"><summary>Turn</summary><p>Play as many cards as you like (or none), then draw one. Drawing ends your turn. Draw an Exploding Kitten and you are out — unless you play a Defuse and secretly hide the kitten back anywhere in the pile.</p></details>
        <details class="rules"><summary>Setup</summary><p>Everyone gets 1 Defuse and 7 cards. Two spare Defuses go in the pile (only 1 with 5 players; Party Pack: all spares). Kittens: one fewer than players.</p></details>
        <details class="rules"><summary>Combos</summary><ul><li>Two of a kind: steal a random card.</li><li>Three of a kind: name a card; if they have it, it's yours.</li><li>Five different: take any card from the discard pile.</li><li>Any matching titles count, not only cats. Feral Cat stands in for any cat.</li></ul></details>
        <details class="rules"><summary>Attacks, Skips, Nopes</summary><p>Attack: end your turn without drawing; the next player takes 2 turns. Attacked and attacking back passes your remaining turns + 2. Skip ends one turn. Nope cancels any action except a kitten or Defuse, any time; a Nope can be Noped.</p></details>
        <details class="rules"><summary>Imploding Kittens</summary><p>First draw: put it back face up anywhere (no Defuse). Drawn face up: you're out, nothing saves you. Reverse flips play order and ends a turn. Targeted Attack picks the victim. Alter the Future reorders the top 3. Draw from the Bottom ends your turn with the bottom card.</p></details>
        <p class="muted" style="font-size:12.5px">Sources for every number: <a href="https://github.com/TimothyHadfield/exploding-kittens/blob/main/docs/rules-check.md" target="_blank" rel="noopener">rules check</a>.</p>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <div class="panel chart"><h2>Danger rises as the pile shrinks ${help('Average chance the top card is a kitten at the moment someone draws, by cards left. 4 players, Medium computers. Few cards left = big danger: save your Skips and Attacks for the end.')}</h2>${curve || '<p class="muted">Loading…</p>'}</div>
      <div class="panel chart"><h2>Does going first matter? ${help('Win rate by turn order, 4 equal Medium computers. Dashed line = fair share (25%).')}</h2>${seats}</div>
      <div class="panel chart"><h2>Best opening cards ${help('Win rate when the card was in your 7 dealt cards (on top of your Defuse). 4 equal Medium computers; dashed = 25%. An extra Defuse is the big one.')}</h2>${cards}</div>
    </div>
  </div></div>`;
}

export function learnClick(btn) {
  const k = btn.dataset.l;
  if (!k) return false;
  if (k === 'check') { drill.shown = true; score.n++; score.err += Math.abs(drill.guess / 100 - drill.a); }
  if (k === 'next') drill = { ...newDrill(), guess: drill.guess, shown: false };
  return true;
}

export function learnInput(t) {
  if (t.dataset.guess != null) {
    drill.guess = +t.value;
    const g = document.querySelector('#guessv'); if (g) g.textContent = t.value + '%';
    return false;
  }
  return false;
}
