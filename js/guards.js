// Small pure rules for the Play screen's odd moments (tested in
// tests/edge.test.js): reloads, big hands, crowded tables, stale picks.

// After a reload, a See the Future you just played is shown again, as long as
// nothing has changed the top of the pile since. Returns the log index from
// which "new" private news is read.
export function seenAfterReload(log) {
  for (let i = log.length - 1; i >= 0; i--) {
    const t = log[i].t;
    if (t === 'saw') return i;
    if (['draw', 'shuffle', 'insert', 'altered', 'altdone', 'turn', 'setup'].includes(t)) break;
  }
  return log.length;
}

// Width of the held fan. A huge hand (Party Pack, lots of steals) never
// squeezes a card below a finger's width: the fan gets wider than the screen
// and slides sideways. pad matches the table kit's fanLayout edge room.
export function fanWidth({ n, cw, ch, width, maxRot, minStep }) {
  const pad = ch * Math.sin((maxRot * Math.PI) / 180) * 0.85;
  const need = Math.ceil(cw + (n - 1) * minStep + 2 * pad + 2);
  const scrolls = n > 1 && need > width;
  return { W: scrolls ? need : width, scrolls };
}

// More opponents than fit at their normal size (about 80 px each on a phone,
// 100 px each in a laptop's play column).
export const crowded = (nOpps, width, laptop) => nOpps > Math.max(1, Math.floor((width - 20) / (laptop ? 100 : 80)));

// Hand card width (px) for a screen; must match --cw in style.css. Big enough
// that a card's name prints at 10 px or more on every phone.
export function handCardW(w, h) {
  if (w >= 900) return 112;
  if (h <= 500 && w > h) return 76; // phone sideways
  return w <= 360 ? 68 : 76;
}
// The held fan for n cards on a w×h screen (fanLayout = the table kit's).
// H is fixed per screen size, so the hand never changes height.
export function handGeom(w, h, n, fanLayout) {
  const lap = w >= 900;
  const cw = handCardW(w, h), ch = cw * 1.4;
  const side = !lap && h <= 500 && w > h; // phone sideways: hand gets the right column
  const W0 = Math.round(lap ? Math.min(w - 200 - 320, 1200) - 32 : side ? (w * 1.1) / 2.1 - 16 : w - 16);
  const maxRot = lap ? 10 : 14;
  // a huge hand never squeezes a card below a finger's width: the fan gets
  // wider than the screen and slides sideways
  const { W, scrolls } = fanWidth({ n, cw, ch, width: W0, maxRot, minStep: lap ? 16 : 18 });
  const L = fanLayout(n, { width: W, cardW: cw, cardH: ch, spread: lap ? 0.8 : 0.62, maxRot });
  const drop = L.length ? Math.max(...L.map((p) => p.y)) : 0;
  const maxDrop = (1 - Math.cos((maxRot * Math.PI) / 180)) * ch * 3;
  return { L, cw, ch, W, drop, scrolls, H: Math.ceil(ch + maxDrop + 22) };
}
// Card-name size in card units (a card is 100 wide, 140 tall).
export const nameUnits = (short) => (short.length > 7 ? 15 : 16);
const GLYPH = 0.64; // average width of a bold glyph, in font sizes

// How the held fan shows card names. 'top': each card's name across its top
// still shows past the next card. 'edge': too tight for that, so every card
// but the last writes its name down the visible left strip instead.
// L = fanLayout output; shorts = the cards' short names, in fan order.
export function nameMode(L, cw, ch, shorts) {
  if (L.length < 2) return { mode: 'top' };
  const step = L[1].x - L[0].x;
  let fits = true;
  for (let i = 0; i < L.length - 1; i++) {
    const dr = ((L[i + 1].r - L[i].r) * Math.PI) / 180;
    const visible = step + 0.83 * ch * Math.sin(dr); // the next card leans away near the top
    const need = ((8 + GLYPH * nameUnits(shorts[i]) * shorts[i].length) * cw) / 100;
    if (visible < need) { fits = false; break; }
  }
  if (fits) return { mode: 'top' };
  const stripU = (step * 100) / cw; // visible strip, card units
  const fu = Math.min(16, ((step - 5) * 100) / cw); // font, card units
  const bx = Math.max(2, (stripU - 0.72 * fu) / 2); // baseline: glyphs stand to its right
  return { mode: 'edge', fu: +fu.toFixed(2), bx: +bx.toFixed(2), px: +((fu * cw) / 100).toFixed(1), stripPx: +step.toFixed(1) };
}
// Vertical length of an edge name, card units (room: y 40..136).
export const edgeLen = (short, fu) => GLYPH * fu * short.length;

// Picked cards that are no longer in the hand (stolen, given) are dropped.
export const keepSel = (sel, hand) => sel.filter((id) => hand.some((c) => c.id === id));
