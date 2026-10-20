// Table companion: the QA list from 2026-10-20. Each case taps the same
// buttons a person would and checks the logged events and the odds.
import test from 'node:test';
import assert from 'node:assert/strict';

// just enough DOM for toast() and the sheet helpers
const toasts = [];
globalThis.document = {
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ setAttribute() {}, remove() {}, dataset: {} }),
  body: { appendChild: (t) => toasts.push(t.textContent) },
};
globalThis.queueMicrotask = () => {};

const { tableClick, tableBelief, _test } = await import('../js/table.js');
const { futureHTML } = await import('../js/ui.js');
const tap = (k) => tableClick({ dataset: { t: k } });
const fresh = (x = {}) => _test.set({ edition: 'original', players: 4, fast: false, events: [], adj: 0, ikUp: false, ...x });

test('"One fewer" can never take the pile below the kittens in it', () => {
  fresh();
  const start = tableBelief().N; // 4 players: 43 cards, 3 kittens
  for (let i = 0; i < start + 5; i++) tap('adj:-1');
  const b = tableBelief();
  assert.equal(b.N, b.nE + b.nI, 'stops at the kitten count');
  assert.doesNotThrow(() => futureHTML(b));
  assert.doesNotThrow(() => futureHTML({ N: -2, known: () => null, prob: () => 0 }), 'future row survives a negative count');
});

test('a count change that contradicts logged events is refused, events kept', () => {
  fresh();
  for (let i = 0; i < 3; i++) tap('safe');
  tap('kittenSheet'); tap('exploded');
  const kept = JSON.stringify(_test.get().events);
  const N0 = tableBelief().N;
  for (let i = 0; i < 60; i++) tap('adj:-1');
  assert.equal(JSON.stringify(_test.get().events), kept, 'no event was dropped');
  const b = tableBelief();
  assert.equal(b.bad, undefined);
  assert.ok(b.N >= b.nE && b.N < N0);
});

test('Cancel on "I defused it" leaves the pile as it was', () => {
  fresh();
  const b0 = tableBelief();
  tap('kittenSheet'); tap('defMe'); tap('close');
  const b1 = tableBelief();
  assert.equal(_test.get().events.length, 0);
  assert.equal(b1.N, b0.N);
  assert.equal(b1.nE, b0.nE);
});

test('"I defused it" + Save logs the draw and the hiding spot together', () => {
  fresh();
  tap('kittenSheet'); tap('defMe'); tap('placeDone'); // top
  const b = tableBelief();
  assert.equal(b.known(0), 'E');
  tap('undo');
  assert.equal(_test.get().events.length, 0, 'one Undo takes back both');
});

test('one Undo after "Someone defused it" fully reverts it', () => {
  fresh();
  tap('safe');
  tap('kittenSheet'); tap('defOther');
  assert.equal(_test.get().events.length, 3);
  tap('undo');
  assert.deepEqual(_test.get().events.map((e) => e.t), ['safe']);
});

test('Imploding: "I saw the top" can record the face-up Imploding Kitten', () => {
  fresh({ edition: 'imploding', players: 4 });
  tap('ikSheet'); tap('ikFirst');
  tableClick({ dataset: { t: 'placeDone' } }); // back on top, face up
  assert.equal(tableBelief().known(0), 'U');
  tap('shuffle'); // spot forgotten
  tap('sawSheet');
  for (let i = 0; i < 3; i++) tap('sawflip:0'); // S -> E -> I -> U
  tap('sawDone');
  const ev = _test.get().events.at(-1);
  assert.deepEqual(ev.xs, ['U', 'S', 'S']);
  const b = tableBelief();
  assert.ok(!b.conflict && !b.bad);
  assert.equal(b.known(0), 'U');
  assert.equal(b.prob(0, 'U'), 1);
});
