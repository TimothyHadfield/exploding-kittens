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

// Picked cards that are no longer in the hand (stolen, given) are dropped.
export const keepSel = (sel, hand) => sel.filter((id) => hand.some((c) => c.id === id));
