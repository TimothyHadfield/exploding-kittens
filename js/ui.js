// Small shared UI helpers.
export const $ = (sel, root = document) => root.querySelector(sel);
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// red -> green scale with a tight range: 0% green, 35%+ red
export function pctColor(p) {
  const x = Math.max(0, Math.min(1, p / 0.35));
  return `hsl(${140 - 140 * x} 70% 58%)`;
}
export const fmtPct = (p) => (p > 0 && p < 0.005 ? '<1' : p > 0.995 && p < 1 ? '>99' : Math.round(p * 100)) + '%';

let lastToast = { msg: '', at: 0 };
export function toast(msg) {
  // fast double taps would repeat the same message; show it once
  const now = Date.now();
  if (msg === lastToast.msg && now - lastToast.at < 2000) return;
  lastToast = { msg, at: now };
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
  document.body.appendChild(t);
  setTimeout(() => t.remove(), Math.max(2200, msg.length * 45));
}

export function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
export function spotLabel(pos, N) {
  if (pos === 0) return 'Top — next card drawn';
  if (pos >= N) return 'Bottom';
  return `${ordinal(pos + 1)} from the top`;
}
// Settings tab tap (button data-* as `d`): Computer speed. Returns true if it changed something.
export function settingsTap(d, settings) {
  if (d && d.speed) { settings.speed = d.speed; return true; }
  return false;
}

export const help = (text) => `<button class="q" data-help="${esc(text)}" aria-label="Why?">?</button>`;

export function sheet(html) {
  let w = $('#sheet');
  if (!w) { w = document.createElement('div'); w.id = 'sheet'; w.className = 'sheet-wrap'; document.body.appendChild(w); }
  w.innerHTML = `<div class="sheet" role="dialog">${html}</div>`;
}
export function closeSheet() { const w = $('#sheet'); if (w) w.remove(); }

export function dialHTML(p, sub, R = 52) {
  const C = 2 * Math.PI * R;
  return `<div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${R}" stroke="#262b3c" stroke-width="10" fill="none"/>
    <circle cx="60" cy="60" r="${R}" stroke="${pctColor(p)}" stroke-width="10" fill="none" stroke-linecap="round"
      stroke-dasharray="${(C * Math.min(1, p)).toFixed(1)} ${C.toFixed(1)}" style="transition:stroke-dasharray .5s, stroke .5s"/></svg>
    <div class="pct"><b style="color:${pctColor(p)}">${fmtPct(p)}</b><small>${sub}</small></div></div>`;
}

export function futureHTML(b, n = 3) {
  if (!b) return '';
  return `<div class="future">${[...Array(Math.max(0, Math.min(n, b.N))).keys()].map((i) => {
    const k = b.known(i);
    if (k) return `<span class="${k}" title="card ${i + 1}">${k === 'S' ? '✓' : k === 'E' ? '💣' : 'IK'}</span>`;
    const p = b.prob(i, 'E') + b.prob(i, 'U');
    return `<span title="card ${i + 1}: ${Math.round(p * 100)}% kitten" style="color:${pctColor(p)}">${Math.round(p * 100)}</span>`;
  }).join('')}</div>`;
}
