// Settings: tapping the Sound & effects "Effects speed" buttons must not change
// Computer speed. Renders the real js/fx.js settings rows into a tiny fake DOM,
// then sends each of its buttons through the game's Settings tap handler.
import test from 'node:test';
import assert from 'node:assert/strict';

const el = () => {
  const e = {
    _html: '', className: '', style: {}, dataset: {}, children: [], isConnected: true,
    classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
    setAttribute() {}, addEventListener() {}, appendChild(c) { e.children.push(c); }, remove() {},
    querySelector: () => el(), querySelectorAll: () => [],
    get innerHTML() { return e._html; }, set innerHTML(v) { e._html = v; },
  };
  return e;
};
globalThis.window = globalThis;
globalThis.document = { addEventListener() {}, removeEventListener() {}, getElementById: () => null, createElement: el, body: el(), head: el() };
await import('../js/fx.js');
const { settingsTap } = await import('../js/ui.js');
const FX = globalThis.FX;
FX.init({ game: 'ek-settings-test', clicks: false });

// every <button> in the rendered fx rows, as the dataset a click would see
function fxButtons() {
  const box = el();
  FX.renderSettings(box);
  const html = box.children.map((c) => c.innerHTML).join('');
  return [...html.matchAll(/<button\b([^>]*)>([^<]*)</g)].map(([, attrs, label]) => {
    const d = {};
    for (const [, k, v] of attrs.matchAll(/data-([a-z-]+)="([^"]*)"/g)) d[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
    return { label, d };
  });
}

test('Effects speed Normal / Fast leave Computer speed alone', () => {
  const btns = fxButtons();
  const speedBtns = btns.filter((b) => /^(Normal|Fast)$/.test(b.label));
  assert.equal(speedBtns.length, 2, 'fx renders Normal and Fast');
  for (const start of ['slow', 'normal', 'fast']) {
    const settings = { speed: start };
    for (const b of btns) settingsTap(b.d, settings);
    assert.equal(settings.speed, start, `Computer speed stayed ${start} after tapping ${speedBtns.map((b) => b.label).join(' / ')}`);
  }
});

test('Computer speed buttons still work', () => {
  const settings = { speed: 'normal' };
  assert.equal(settingsTap({ speed: 'slow' }, settings), true);
  assert.equal(settings.speed, 'slow');
});
