// Original card art, drawn as small SVGs. Each card: coloured band, our own
// icon, the card's name (a game fact) and a one-line summary in our words.
import { CARD } from './cards.js';

const ICON = {
  // a round black kitten-shaped bomb with a lit fuse
  EK: `<path d="M30 30l6-10 4 9" fill="#1b1b1f"/><path d="M70 30l-6-10-4 9" fill="#1b1b1f"/>
       <circle cx="50" cy="52" r="24" fill="#1b1b1f"/><circle cx="41" cy="48" r="5" fill="#ffd34d"/><circle cx="59" cy="48" r="5" fill="#ffd34d"/>
       <circle cx="41" cy="48" r="2" fill="#1b1b1f"/><circle cx="59" cy="48" r="2" fill="#1b1b1f"/>
       <path d="M44 61q6 4 12 0" stroke="#ffd34d" stroke-width="2" fill="none"/>
       <path d="M66 32q8-10 14-6" stroke="#6b5a3a" stroke-width="3" fill="none"/>
       <path d="M80 26l3-7 2 6 6-2-5 5 5 4-7-1z" fill="#ffb02e"/>`,
  // a kitten with a swirling galaxy in its face
  IK: `<path d="M30 32l6-11 4 9" fill="#16233a"/><path d="M70 32l-6-11-4 9" fill="#16233a"/>
       <circle cx="50" cy="54" r="24" fill="#16233a"/>
       <path d="M50 54m-13 0a13 13 0 1 0 26 0a9 9 0 1 0-18 0a5 5 0 1 0 10 0" stroke="#7fd0ff" stroke-width="3" fill="none"/>
       <circle cx="50" cy="54" r="2.5" fill="#fff"/>`,
  // wire cutters snipping a fuse
  DEF: `<path d="M18 66q20-4 34-20" stroke="#6b5a3a" stroke-width="4" fill="none" stroke-dasharray="2 0"/>
        <path d="M55 42l5 4" stroke="#fff" stroke-width="3"/>
        <g transform="rotate(-35 62 52)"><rect x="56" y="26" width="8" height="26" rx="3" fill="#2f3a2a"/><rect x="66" y="26" width="8" height="26" rx="3" fill="#2f3a2a"/>
        <path d="M57 52l-3 26h10l1-26zM73 52l3 26h-10l-1-26z" fill="#4c7a2c"/></g>`,
  ATK: `<path d="M56 16L30 56h16l-8 30 30-42H52z" fill="#3a2410"/><text x="74" y="84" font-size="16" font-weight="800" fill="#3a2410">2×</text>`,
  TATK: `<circle cx="50" cy="52" r="26" stroke="#3a1a0a" stroke-width="5" fill="none"/><circle cx="50" cy="52" r="13" stroke="#3a1a0a" stroke-width="5" fill="none"/>
         <path d="M50 18v16M50 70v16M16 52h16M68 52h16" stroke="#3a1a0a" stroke-width="5"/><text x="70" y="88" font-size="15" font-weight="800" fill="#3a1a0a">2×</text>`,
  SKIP: `<path d="M24 30l22 22-22 22M50 30l22 22-22 22" stroke="#0e2a40" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  FAV: `<path d="M50 80C20 60 18 40 30 32s20 0 20 8c0-8 8-16 20-8s10 28-20 48z" fill="#2a2420"/>`,
  SHUF: `<path d="M20 34h18l24 36h18M20 70h18l24-36h18" stroke="#2e2010" stroke-width="7" fill="none"/>
         <path d="M76 24l12 10-12 10zM76 60l12 10-12 10z" fill="#2e2010"/>`,
  STF: `<path d="M14 52q36-36 72 0q-36 36-72 0z" fill="#fff" stroke="#3a0f2c" stroke-width="5"/><circle cx="50" cy="52" r="12" fill="#3a0f2c"/>
        <text x="50" y="92" font-size="16" font-weight="800" fill="#3a0f2c" text-anchor="middle">3×</text>`,
  ALTER: `<path d="M14 46q36-32 72 0q-36 32-72 0z" fill="#fff" stroke="#24123f" stroke-width="5"/><circle cx="50" cy="46" r="11" fill="#24123f"/>
          <path d="M28 80h44M64 72l9 8-9 8M36 72l-9 8 9 8" stroke="#24123f" stroke-width="5" fill="none"/>`,
  NOPE: `<path d="M36 18h28l20 20v28L64 86H36L16 66V38z" fill="#fff"/><path d="M38 24h24l16 16v24L62 80H38L22 64V40z" fill="#9c1f1f"/>
         <text x="50" y="58" font-size="17" font-weight="900" fill="#fff" text-anchor="middle">NOPE</text>`,
  REV: `<path d="M26 44a24 24 0 0 1 44-8" stroke="#0b3a33" stroke-width="7" fill="none"/><path d="M74 26v16H58z" fill="#0b3a33"/>
        <path d="M74 60a24 24 0 0 1-44 8" stroke="#0b3a33" stroke-width="7" fill="none"/><path d="M26 78V62h16z" fill="#0b3a33"/>`,
  BOTTOM: `<rect x="24" y="22" width="52" height="10" rx="3" fill="#3a1210" opacity=".45"/><rect x="24" y="36" width="52" height="10" rx="3" fill="#3a1210" opacity=".6"/>
           <rect x="24" y="72" width="52" height="12" rx="3" fill="#3a1210"/><path d="M50 46v18M40 56l10 10 10-10" stroke="#fff" stroke-width="6" fill="none"/>`,
  // cat cards: each a different silly cat head
  TACO: `<path d="M16 70a34 34 0 0 1 68 0z" fill="#f5c24a" stroke="#8a5a14" stroke-width="3"/>
         <path d="M34 46l4-12 6 9M66 46l-4-12-6 9" fill="#6b4a2a"/><circle cx="50" cy="54" r="14" fill="#6b4a2a"/>
         <circle cx="45" cy="52" r="2.5" fill="#fff"/><circle cx="55" cy="52" r="2.5" fill="#fff"/><path d="M22 66q10-6 14 0q8-6 14 0q8-6 14 0q8-6 14 0" stroke="#5aa83a" stroke-width="4" fill="none"/>`,
  MELON: `<path d="M14 44a36 36 0 0 0 72 0z" fill="#3f9a3a"/><path d="M19 44a31 31 0 0 0 62 0z" fill="#e85a5a"/>
          <path d="M26 44l4-14 7 10M74 44l-4-14-7 10" fill="#3f9a3a"/>
          <circle cx="42" cy="56" r="2.5" fill="#1b1b1f"/><circle cx="58" cy="56" r="2.5" fill="#1b1b1f"/><circle cx="50" cy="66" r="1.8" fill="#1b1b1f"/><circle cx="36" cy="64" r="1.8" fill="#1b1b1f"/><circle cx="64" cy="64" r="1.8" fill="#1b1b1f"/>`,
  POTATO: `<ellipse cx="50" cy="56" rx="26" ry="22" fill="#b9874f"/><path d="M30 40l4-14 8 10M70 40l-4-14-8 10" fill="#b9874f"/>
           <path d="M32 40q4-10 8 0q4-12 10 0q4-12 10 0q4-10 8 0" stroke="#4a3018" stroke-width="3" fill="none"/>
           <circle cx="42" cy="56" r="3" fill="#2a1a0a"/><circle cx="58" cy="56" r="3" fill="#2a1a0a"/><circle cx="38" cy="68" r="2" fill="#8a5f33"/><circle cx="64" cy="66" r="2" fill="#8a5f33"/>`,
  BEARD: `<path d="M30 38l5-14 9 10M70 38l-5-14-9 10" fill="#d9d2c6"/><circle cx="50" cy="48" r="20" fill="#d9d2c6"/>
          <path d="M30 52q20 44 40 0q-6 8-20 6q-14 2-20-6z" fill="#3a2a20"/>
          <circle cx="43" cy="45" r="2.8" fill="#1b1b1f"/><circle cx="57" cy="45" r="2.8" fill="#1b1b1f"/>`,
  RAINBOW: `<path d="M30 40l5-14 9 10M70 40l-5-14-9 10" fill="#f2f2f2"/><circle cx="50" cy="48" r="18" fill="#f2f2f2"/>
            <circle cx="44" cy="45" r="2.5" fill="#1b1b1f"/><circle cx="56" cy="45" r="2.5" fill="#1b1b1f"/>
            <path d="M50 56q16 8 30 30" stroke="#e85a5a" stroke-width="4" fill="none"/><path d="M50 58q14 9 24 28" stroke="#f5c24a" stroke-width="4" fill="none"/>
            <path d="M50 60q11 10 18 26" stroke="#5aa83a" stroke-width="4" fill="none"/><path d="M50 62q8 11 12 24" stroke="#4aa8e8" stroke-width="4" fill="none"/>`,
  FERAL: `<path d="M28 38l6-16 9 12M72 38l-6-16-9 12" fill="#2a1a2a"/><circle cx="50" cy="52" r="22" fill="#2a1a2a"/>
          <circle cx="41" cy="48" r="6" fill="#fff"/><circle cx="59" cy="50" r="4" fill="#fff"/>
          <path d="M41 48m-4 0a4 4 0 1 0 8 0a2 2 0 1 0-4 0" stroke="#e070c8" stroke-width="1.6" fill="none"/>
          <text x="50" y="70" font-size="14" font-weight="900" fill="#e070c8" text-anchor="middle">?</text>`,
  // ---- Streaking pack
  // a bare kitten dashing past, speed lines behind it
  STREAK: `<path d="M12 44h18M8 54h20M14 64h16" stroke="#5a2232" stroke-width="4" stroke-linecap="round"/>
           <ellipse cx="58" cy="58" rx="22" ry="15" fill="#fbe3ea" stroke="#5a2232" stroke-width="3"/>
           <circle cx="76" cy="42" r="12" fill="#fbe3ea" stroke="#5a2232" stroke-width="3"/><path d="M68 33l2-9 6 6M80 31l4-8 3 9" fill="#fbe3ea" stroke="#5a2232" stroke-width="2.5"/>
           <circle cx="79" cy="41" r="2" fill="#5a2232"/><path d="M46 70l-4 10M68 70l4 10" stroke="#5a2232" stroke-width="4" stroke-linecap="round"/>`,
  SSKIP: `<path d="M14 30l18 22-18 22M38 30l18 22-18 22M62 30l18 22-18 22" stroke="#0b2236" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  STF5: `<path d="M14 52q36-36 72 0q-36 36-72 0z" fill="#fff" stroke="#330a26" stroke-width="5"/><circle cx="50" cy="52" r="12" fill="#330a26"/>
         <text x="50" y="92" font-size="16" font-weight="800" fill="#330a26" text-anchor="middle">5×</text>`,
  ALTER5: `<path d="M14 42q36-30 72 0q-36 30-72 0z" fill="#fff" stroke="#1e0f38" stroke-width="5"/><circle cx="50" cy="42" r="10" fill="#1e0f38"/>
           <path d="M18 72h30M42 65l8 7-8 7M82 72H52M58 65l-8 7 8 7" stroke="#1e0f38" stroke-width="4" fill="none"/>
           <text x="50" y="96" font-size="14" font-weight="800" fill="#1e0f38" text-anchor="middle">5×</text>`,
  SWAP: `<rect x="22" y="18" width="34" height="14" rx="3" fill="#0f2f30"/><rect x="22" y="76" width="34" height="14" rx="3" fill="#0f2f30" opacity=".55"/>
         <path d="M70 26v52M62 68l8 10 8-10M62 36l8-10 8 10" stroke="#0f2f30" stroke-width="5" fill="none" stroke-linejoin="round"/>
         <rect x="22" y="40" width="34" height="28" rx="3" fill="#0f2f30" opacity=".2"/>`,
  GARB: `<rect x="28" y="36" width="44" height="48" rx="5" fill="#2e2e22"/><rect x="22" y="26" width="56" height="9" rx="3" fill="#2e2e22"/><rect x="42" y="18" width="16" height="7" rx="2" fill="#2e2e22"/>
         <path d="M40 44v32M50 44v32M60 44v32" stroke="#8c8c6a" stroke-width="3.5"/>`,
  CATOMIC: `<ellipse cx="50" cy="52" rx="34" ry="12" stroke="#3a2a00" stroke-width="4" fill="none"/>
            <ellipse cx="50" cy="52" rx="34" ry="12" stroke="#3a2a00" stroke-width="4" fill="none" transform="rotate(60 50 52)"/>
            <ellipse cx="50" cy="52" rx="34" ry="12" stroke="#3a2a00" stroke-width="4" fill="none" transform="rotate(-60 50 52)"/>
            <circle cx="50" cy="52" r="10" fill="#1b1b1f"/><path d="M43 45l2-7 4 5M57 45l-2-7-4 5" fill="#1b1b1f"/>`,
  // a card held up, a spotlight on it
  MARK: `<path d="M50 14l26 70H24z" fill="#fff" opacity=".45"/><rect x="34" y="40" width="32" height="44" rx="4" fill="#fff" stroke="#3d1f0e" stroke-width="4" transform="rotate(-8 50 62)"/>
         <text x="50" y="72" font-size="22" font-weight="900" fill="#3d1f0e" text-anchor="middle" transform="rotate(-8 50 62)">!</text>`,
  // a cat face with a blindfold over its eyes
  CURSE: `<path d="M30 36l6-14 9 11M70 36l-6-14-9 11" fill="#2a2238"/><circle cx="50" cy="54" r="24" fill="#2a2238"/>
          <rect x="22" y="44" width="56" height="12" rx="5" fill="#d9d2e8"/><path d="M78 50q8 2 10 10M78 48q10-2 12 4" stroke="#d9d2e8" stroke-width="3" fill="none"/>
          <path d="M44 66q6 4 12 0" stroke="#d9d2e8" stroke-width="2.5" fill="none"/>`,
};

const textColor = (t) => (['EK', 'IK', 'NOPE'].includes(t) ? '#fff' : '#17130f');

// Shared gradients (identical in every card, so repeated ids are harmless).
const SHINE = `<defs><linearGradient id="ekShine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".10"/></linearGradient></defs>`;

// The real Exploding Kitten card is black: ours is a black card with the
// kitten-bomb going off in front of a burst.
const BAND = { EK: '#141418' };
const BURST = '<path d="M50 14l7 18 18-9-7 19 20 2-17 11 14 15-20-3 2 20-15-13-9 18-5-19-18 9 7-19-20-2 17-11-14-15 20 3-2-20 15 13z" fill="#e0523f"/><circle cx="50" cy="52" r="20" fill="#ffb02e" opacity=".55"/>';

// Full card face. w = rendered width in px (height is 1.4×).
// Like a real card, the name sits at the top: in a held fan the top-left
// corner is the part that stays visible. opts.tight: the card sits
// overlapped in a hand, so the icon shifts left into the visible strip too.
export function cardSVG(t, opts = {}) {
  const c = CARD[t] || CARD.TACO;
  const up = opts.up ? '<rect x="3" y="3" width="94" height="134" rx="9" fill="none" stroke="#fff" stroke-width="5"/>' : '';
  const dark = ['EK', 'IK'].includes(t);
  const bg = dark ? '#24242a' : '#fbf7ef';
  const band = BAND[t] || c.color;
  const iconAt = opts.tight ? 'translate(-4,44) scale(.8)' : 'translate(4,38) scale(.92)';
  const fs = c.short.length > 7 ? 15 : 16; // = nameUnits in guards.js
  // opts.edge {fu, bx}: a tightly overlapped card in a held fan. Only a thin
  // left strip shows, so the name runs down that strip and a small icon sits
  // in the top corner (instead of a name cut to "Def").
  const e = opts.edge;
  const art = e
    ? `<g transform="translate(${(e.bx + 0.36 * e.fu - 13).toFixed(1)},4.5) scale(.26)">${ICON[t] || ''}</g>
    <text transform="translate(${e.bx},42) rotate(90)" font-size="${e.fu}" font-weight="800" fill="${t === 'EK' || t === 'IK' || t === 'NOPE' ? '#fff' : '#17130f'}" font-family="system-ui,sans-serif">${c.short}</text>`
    : `<g transform="${iconAt}">${t === 'EK' ? BURST : ''}${ICON[t] || ''}</g>
    <text x="8" y="24" font-size="${fs}" font-weight="800" fill="${dark ? '#fff' : '#1b1712'}" font-family="system-ui,sans-serif">${c.short}</text>`;
  return `<svg viewBox="0 0 100 140" class="cardsvg" role="img" aria-label="${c.name}">${SHINE}
    <rect x="1" y="1" width="98" height="138" rx="10" fill="${bg}" stroke="#00000033"/>
    <rect x="1" y="35" width="98" height="104" rx="10" fill="${band}"/>
    <rect x="1" y="35" width="98" height="11" fill="${band}"/>
    <rect x="1" y="35" width="98" height="104" rx="10" fill="url(#ekShine)"/>
    <rect x="1" y="34" width="98" height="1.5" fill="#000" opacity=".18"/>
    ${art}
    <rect x="4" y="4" width="92" height="132" rx="7.5" fill="none" stroke="#fff" stroke-opacity="${dark ? '.14' : '.4'}" stroke-width="1"/>
    ${up}</svg>`;
}

export function backSVG() {
  return `<svg viewBox="0 0 100 140" class="cardsvg" role="img" aria-label="card back">
    <defs><pattern id="ekBackDots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="1.1" fill="#e8b45a" opacity=".22"/></pattern>
    <radialGradient id="ekBackGlow" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#7a2a2e"/><stop offset="1" stop-color="#4a181b"/></radialGradient></defs>
    <rect x="1" y="1" width="98" height="138" rx="10" fill="url(#ekBackGlow)" stroke="#00000055"/>
    <rect x="7" y="7" width="86" height="126" rx="7" fill="url(#ekBackDots)"/>
    <rect x="7" y="7" width="86" height="126" rx="7" fill="none" stroke="#e8b45a" stroke-width="2" opacity=".7"/>
    <circle cx="50" cy="70" r="24" fill="#4a181b" stroke="#e8b45a" stroke-opacity=".35" stroke-width="1.2"/>
    <g fill="#e8b45a" opacity=".85" transform="translate(50 70)">
      <path d="M-14-6l4-12 6 8M14-6l-4-12-6 8"/><circle r="15"/>
      <circle cx="-5" cy="-2" r="2.6" fill="#5a1f22"/><circle cx="5" cy="-2" r="2.6" fill="#5a1f22"/>
      <path d="M12-12q8-10 14-4" stroke="#e8b45a" stroke-width="2.5" fill="none"/>
    </g></svg>`;
}

export const iconSVG = (t, size = 22) => `<svg viewBox="10 10 80 80" width="${size}" height="${size}" aria-hidden="true">${ICON[t] || ''}</svg>`;
export { textColor };
