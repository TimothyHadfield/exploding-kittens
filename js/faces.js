// Original cartoon cats: a face for each computer player with a few moods,
// and the big full-screen moments (a kitten's fuse burning down to a boom,
// or getting snipped). Plain SVG strings; the moving parts are CSS classes
// in style.css (.mo-*), so "Animations off" and reduced motion stop them.

const FUR = ['#e8a25a', '#9aa0a8', '#3d3a40', '#efe2c8', '#c4835a', '#e9e9ec', '#7d6a5c', '#d9b26a', '#a9b4c9'];
const INNER = ['#f6c99a', '#c9cdd3', '#6a6470', '#fff4e0', '#e3ab86', '#fafafa', '#a8968a', '#f0d59a', '#d3dbe8'];
const DARK = new Set([2, 6]);
export const furOf = (k) => FUR[((k % FUR.length) + FUR.length) % FUR.length];

// mood: calm | smug | panic | relieved | happy | annoyed | out
export function faceSVG(k, mood = 'calm', size = 22) {
  const i = ((k % FUR.length) + FUR.length) % FUR.length;
  const fur = FUR[i], inner = INNER[i];
  const ink = DARK.has(i) ? '#f4ead2' : '#2a2018';
  const eyeFill = DARK.has(i) ? '#ffd34d' : '#2a2018';
  let eyes = '', mouth = '', extra = '';
  switch (mood) {
    case 'smug':
      eyes = `<path d="M11.5 20.5h6M22.5 20.5h6" stroke="${ink}" stroke-width="2" stroke-linecap="round"/><path d="M12 22.2q2.5 1.6 5 0M23 22.2q2.5 1.6 5 0" fill="${eyeFill}"/>`;
      mouth = `<path d="M16.5 28q3.5 2.2 8-1.2" stroke="${ink}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
      break;
    case 'panic':
      eyes = `<circle cx="14.5" cy="21" r="4" fill="#fff" stroke="${ink}" stroke-width="1"/><circle cx="25.5" cy="21" r="4" fill="#fff" stroke="${ink}" stroke-width="1"/><circle cx="14.5" cy="21" r="1.4" fill="#2a2018"/><circle cx="25.5" cy="21" r="1.4" fill="#2a2018"/>`;
      mouth = `<ellipse cx="20" cy="29.5" rx="2.4" ry="3" fill="#5a1d1d"/>`;
      extra = `<path d="M32 12q2.5 3.5 0 5q-2.5-1.5 0-5z" fill="#7fd0ff"/>`;
      break;
    case 'relieved':
      eyes = `<path d="M11.5 21q3-2.5 6 0M22.5 21q3-2.5 6 0" stroke="${ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      mouth = `<path d="M17.5 28q2.5 1.8 5 0" stroke="${ink}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
      break;
    case 'happy':
      eyes = `<path d="M11.5 22l3-3 3 3M22.5 22l3-3 3 3" stroke="${ink}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      mouth = `<path d="M16 27h8q-1 4.5-4 4.5t-4-4.5z" fill="#5a1d1d"/>`;
      break;
    case 'annoyed':
      eyes = `<path d="M11 17.5l6 2M29 17.5l-6 2" stroke="${ink}" stroke-width="1.8" stroke-linecap="round"/><circle cx="14.5" cy="21.5" r="1.9" fill="${eyeFill}"/><circle cx="25.5" cy="21.5" r="1.9" fill="${eyeFill}"/>`;
      mouth = `<path d="M17 29h6" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>`;
      break;
    case 'out':
      eyes = `<path d="M12 19l5 5M17 19l-5 5M23 19l5 5M28 19l-5 5" stroke="${ink}" stroke-width="1.8" stroke-linecap="round"/>`;
      mouth = `<path d="M16.5 29q3.5-2 7 0" stroke="${ink}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
      extra = `<circle cx="11" cy="27" r="2.6" fill="#1b1714" opacity=".45"/><circle cx="30" cy="14" r="2.2" fill="#1b1714" opacity=".4"/><path d="M8 8q2-3 0-5M33 6q2-2 0-4" stroke="#8a8a8a" stroke-width="1.3" fill="none" opacity=".8"/>`;
      break;
    default:
      eyes = `<ellipse cx="14.5" cy="21" rx="2.1" ry="2.7" fill="${eyeFill}"/><ellipse cx="25.5" cy="21" rx="2.1" ry="2.7" fill="${eyeFill}"/><circle cx="15.2" cy="20" r=".8" fill="#fff"/><circle cx="26.2" cy="20" r=".8" fill="#fff"/>`;
      mouth = `<path d="M17.5 28q1.25 1.4 2.5 0q1.25 1.4 2.5 0" stroke="${ink}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  }
  return `<svg class="face mood-${mood}" viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true">
    <path d="M6 18L8 3l11 9zM34 18L32 3l-11 9z" fill="${fur}"/><path d="M9 13l1-6 5 4zM31 13l-1-6-5 4z" fill="${inner}"/>
    <ellipse cx="20" cy="23" rx="15" ry="13.5" fill="${fur}"/>
    <ellipse cx="20" cy="28" rx="7.5" ry="5" fill="${inner}" opacity=".85"/>
    ${eyes}<path d="M18.6 25.2h2.8L20 26.8z" fill="#e88a9a"/>${mouth}
    <path d="M7 25.5l6 .8M7 28.5l6-.6M33 25.5l-6 .8M33 28.5l-6-.6" stroke="${ink}" stroke-width=".7" opacity=".55"/>${extra}</svg>`;
}

// The big moment. kind: 'boom' (fuse burns down, then it blows) or 'defuse'
// (the fuse is snipped). Timings live in style.css (.moment.boom / .defuse).
export function momentSVG(kind) {
  const burst = '<path class="mo-burst" d="M100 18l14 36 36-18-14 38 40 4-34 22 28 30-40-6 4 40-30-26-18 36-10-38-36 18 14-38-40-4 34-22-28-30 40 6-4-40 30 26z" fill="#e0523f"/><circle class="mo-burst" cx="100" cy="104" r="40" fill="#ffb02e" opacity=".8"/>';
  const cutters = `<g class="mo-cut"><g class="mo-blade a"><rect x="138" y="20" width="9" height="42" rx="4" fill="#2f3a2a" transform="rotate(30 142 58)"/><path d="M139 58l-4 34h12l1-34z" fill="#4c7a2c" transform="rotate(30 142 58)"/></g>
      <g class="mo-blade b"><rect x="138" y="20" width="9" height="42" rx="4" fill="#2f3a2a" transform="rotate(-30 142 58)"/><path d="M139 58l-4 34h12l1-34z" fill="#4c7a2c" transform="rotate(-30 142 58)"/></g></g>`;
  return `<svg viewBox="0 0 200 200" class="mo-svg" aria-hidden="true">
    ${kind === 'boom' ? burst : ''}
    <g class="mo-cat">
      <path d="M58 70l10-30 18 22zM142 70l-10-30-18 22z" fill="#17161b"/><path d="M64 62l5-14 8 10zM136 62l-5-14-8 10z" fill="#3a2b2b"/>
      <circle cx="100" cy="110" r="52" fill="#17161b"/>
      <ellipse cx="86" cy="86" rx="16" ry="9" fill="#fff" opacity=".07"/>
      <g class="mo-eyes-open"><circle cx="81" cy="104" r="11" fill="#ffd34d"/><circle cx="119" cy="104" r="11" fill="#ffd34d"/><circle class="mo-pupil" cx="81" cy="104" r="4.5" fill="#17161b"/><circle class="mo-pupil" cx="119" cy="104" r="4.5" fill="#17161b"/></g>
      <g class="mo-eyes-shut"><path d="M70 106q11-9 22 0M108 106q11-9 22 0" stroke="#ffd34d" stroke-width="5" fill="none" stroke-linecap="round"/></g>
      <path d="M95 121h10l-5 6z" fill="#e88a9a"/>
      <path class="mo-mouth" d="M90 132q10 8 20 0" stroke="#ffd34d" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M58 122l22 3M58 132l22-2M142 122l-22 3M142 132l-22-2" stroke="#4a4550" stroke-width="2"/>
    </g>
    <path class="mo-fuse" d="M134 70q14-24 34-32" stroke="#8a6d3a" stroke-width="6" fill="none" stroke-linecap="round" pathLength="100"/>
    <g class="mo-tip"><path class="mo-fuse-end" d="M150 50q8-8 18-12" stroke="#8a6d3a" stroke-width="6" fill="none" stroke-linecap="round"/>
      <g class="mo-spark"><circle cx="168" cy="38" r="9" fill="#ffb02e"/><path d="M168 22l3 10 10-4-7 8 9 6-11-1 1 11-6-9-7 7 2-10-10-2 10-4-6-9 9 5z" fill="#ffd34d"/></g></g>
    ${kind === 'defuse' ? cutters : ''}
    ${kind === 'boom' ? '<text class="mo-word" x="100" y="190" text-anchor="middle" font-size="40" font-weight="900" fill="#ffd34d" stroke="#5a1d1d" stroke-width="3" paint-order="stroke">BOOM!</text>' : '<text class="mo-word" x="100" y="190" text-anchor="middle" font-size="34" font-weight="900" fill="#8fd14f" stroke="#1f3a12" stroke-width="3" paint-order="stroke">Phew!</text>'}
  </svg>`;
}
