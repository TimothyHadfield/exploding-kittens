// Sounds, celebrations and animations: the event -> sound map, the settings
// switches (using the real js/fx.js with a fake AudioContext), and game over.
import test from 'node:test';
import assert from 'node:assert/strict';

// ---- just enough browser for js/fx.js (fake Web Audio counts what starts)
const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
let started = 0;
const node = () => ({ connect() {}, start() { started++; }, stop() {}, gain: param(), frequency: param(), Q: param(), pan: param() });
class FakeAC {
  constructor() { this.state = 'running'; this.currentTime = 1; this.sampleRate = 8000; this.destination = node(); }
  createGain() { return node(); }
  createOscillator() { return node(); }
  createBiquadFilter() { return node(); }
  createBufferSource() { return node(); }
  createDynamicsCompressor() { return node(); }
  createStereoPanner() { return node(); }
  createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
  resume() { return Promise.resolve(); }
}
let animated = 0;
const fakeEl = () => ({
  animate() { animated++; const a = { onfinish: null }; setTimeout(() => a.onfinish && a.onfinish(), 0); return a; },
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 50, height: 70 }),
  cloneNode() { return fakeEl(); }, removeAttribute() {}, remove() {}, style: {}, isConnected: true,
});
globalThis.window = globalThis;
globalThis.AudioContext = FakeAC;
globalThis.document = {
  addEventListener() {}, removeEventListener() {}, getElementById: () => null,
  createElement: () => ({ ...fakeEl(), getContext: () => null, setAttribute() {} }),
  body: { appendChild() {} }, head: { appendChild() {} },
};
globalThis.innerWidth = 393; globalThis.innerHeight = 659;
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 0);

await import('../js/fx.js');
const FX = globalThis.FX;
const { cuesFor, runCues, defineSounds, tensionOn, tableCues, DANGER } = await import('../js/sfx.js');
const { newGame, apply, waitingOn } = await import('../js/engine.js');
const { decide } = await import('../js/ai.js');
const { view } = await import('../js/engine.js');

FX.init({ game: 'ek-test', clicks: false });
defineSounds(FX);
FX.unlock();

// spy FX: records names instead of making sound
function spy() {
  const r = { sounds: [], anims: [], celebs: [], settings: { sound: true, animations: true, animSpeed: 'normal', moves: true } };
  r.play = (n, o) => { r.sounds.push(n); return true; };
  r.celebrate = (o) => { r.celebs.push(o.kind); return Promise.resolve(); };
  for (const k of ['shake', 'pop', 'pulse', 'flash', 'flyTo', 'floatText']) r[k] = () => { r.anims.push(k); return Promise.resolve(); };
  return r;
}
const now = (f) => f(); // run every cue at once
const dom = (log = []) => ({ el: () => fakeEl(), boom: () => log.push('boom') });
const soundsOf = (events, me = 0, cur = 1) => {
  const s = spy();
  runCues(cuesFor(events, { mine: (x) => x === me, cur }), s, dom(), { schedule: now });
  return s;
};

test('each game event fires its own sound', () => {
  const cases = [
    [[{ t: 'draw', seat: 1, from: 'top', res: 'S' }], ['cardDeal']],
    [[{ t: 'play', seat: 1, cards: ['ATK'], kind: 'single' }], ['cardFlip']],
    [[{ t: 'nope', seat: 1, nopes: 1 }], ['stamp']],
    [[{ t: 'shuffle', seat: 1 }], ['shuffle']],
    [[{ t: 'resolve', ok: true, by: 1, card: 'STF', kind: 'single' }], ['whoosh']],
    [[{ t: 'resolve', ok: true, by: 1, card: 'SKIP', kind: 'single' }], ['whoosh']],
    [[{ t: 'attack', from: 1, to: 0, turns: 2 }], ['hit']],
    [[{ t: 'stole', from: 0, to: 1 }], ['snatch']],
    [[{ t: 'gave', from: 0, to: 1 }], ['cardDeal']],
    [[{ t: 'named', from: 0, to: 1, name: 'DEF', ok: false }], ['miss']],
    [[{ t: 'draw', seat: 1, from: 'top', res: 'E' }, { t: 'defuse', seat: 1 }], ['cardDeal', 'snip', 'phew']],
    [[{ t: 'draw', seat: 1, from: 'top', res: 'E' }, { t: 'explode', seat: 1, kitten: 'EK' }], ['cardDeal', 'explosion']],
    [[{ t: 'insert', seat: 1, kind: 'E', left: 0 }], ['cardSlide']],
  ];
  for (const [evs, want] of cases) assert.deepEqual(soundsOf(evs).sounds, want, JSON.stringify(evs));
});

test('your-turn chime only when the turn becomes yours', () => {
  assert.deepEqual(soundsOf([{ t: 'turn', seat: 0, turns: 1 }], 0, 1).sounds, ['turn'], 'computer -> you');
  assert.deepEqual(soundsOf([{ t: 'turn', seat: 0, turns: 1 }], 0, 0).sounds, [], 'your second attacked turn');
  assert.deepEqual(soundsOf([{ t: 'turn', seat: 2, turns: 1 }], 0, 1).sounds, [], 'computer -> computer');
});

test('a whole scripted game maps every draw, explosion and the end', () => {
  let g = newGame({ edition: 'original', players: 3 }, 12345);
  const s = spy();
  const ctx = { mine: (x) => x === 0, cur: undefined };
  runCues(cuesFor(g.log, ctx), s, dom(), { schedule: now });
  assert.ok(s.sounds.includes('shuffle') && s.sounds.includes('cardDeal'), 'deal');
  let n = 0;
  while (g.phase !== 'over' && n++ < 2000) {
    const seat = waitingOn(g)[0];
    const a = decide(view(g, seat), 'medium', () => 0.3);
    const before = g.log.length;
    ctx.cur = g.cur;
    g = apply(g, a);
    runCues(cuesFor(g.log.slice(before).filter((e) => !e.vis || e.vis.includes(0)), ctx), s, dom(), { schedule: now });
  }
  const count = (t) => g.log.filter((e) => e.t === t).length;
  const said = (n) => s.sounds.filter((x) => x === n).length;
  assert.equal(said('cardDeal') >= count('draw'), true, 'every draw is a card sound');
  assert.equal(said('explosion'), count('explode'), 'one explosion per exploded player');
  assert.equal(said('snip'), count('defuse'));
  assert.equal(said('stamp'), count('nope'));
  const ends = s.celebs.filter((k) => k !== 'big');
  assert.equal(ends.length, 1, 'one win/lose celebration at the end');
  assert.equal(ends[0], g.winner === 0 ? 'win' : 'lose');
  assert.equal(s.celebs.filter((k) => k === 'big').length, g.log.filter((e) => (e.t === 'defuse' && e.seat === 0) || (e.t === 'moved' && e.toSeat === 0 && e.card === 'DEF')).length, 'a sparkle for each of your defuses and stolen Defuses');
});

test('game over celebrates with the right kind', () => {
  const end = (seat) => [{ t: 'explode', seat: seat === 0 ? 1 : 0, kitten: 'EK' }, { t: 'win', seat }];
  assert.deepEqual(soundsOf(end(0)).celebs, ['win']);
  assert.deepEqual(soundsOf(end(1)).celebs, ['lose']);
  // pass-the-phone: any person at the table winning is a win
  const s = spy();
  runCues(cuesFor(end(1), { mine: (x) => x === 0 || x === 1 }), s, dom(), { schedule: now });
  assert.deepEqual(s.celebs, ['win']);
});

test('Sound off: no sound starts; Animations off: nothing animates', async () => {
  const cues = cuesFor([{ t: 'draw', seat: 1, from: 'top', res: 'E' }, { t: 'explode', seat: 1, kitten: 'EK' }, { t: 'nope', seat: 1, nopes: 1 }, { t: 'attack', from: 1, to: 0, turns: 2 }], { mine: (x) => x === 0, cur: 1 });
  FX.set('sound', true); FX.set('animations', true);
  let s0 = started, a0 = animated; const booms = [];
  runCues(cues, FX, dom(booms), { schedule: now });
  await new Promise((r) => setTimeout(r, 20));
  assert.ok(started > s0, 'sound on: audio starts');
  assert.ok(animated > a0 && booms.length === 1, 'animations on: things move');

  FX.set('sound', false); FX.set('animations', false);
  s0 = started; a0 = animated; booms.length = 0;
  runCues(cues, FX, dom(booms), { schedule: now });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(started, s0, 'sound off: nothing starts');
  assert.equal(animated, a0, 'animations off: nothing animates');
  assert.equal(booms.length, 0, 'no explosion flash');

  FX.set('sound', true); FX.set('moves', false);
  s0 = started;
  runCues(cues, FX, dom(), { schedule: now });
  assert.equal(started, s0, 'Game sounds off: game events are silent');
  FX.reset();
});

test('draw tension only when the odds are high, shown, and effects are on', () => {
  const on = { sound: true, moves: true, animations: true };
  assert.equal(tensionOn(on, DANGER + 0.05, true), true);
  assert.equal(tensionOn(on, DANGER - 0.05, true), false);
  assert.equal(tensionOn(on, 0.9, false), false, 'odds hidden: no hint through sound');
  assert.equal(tensionOn({ sound: false, moves: true, animations: false }, 0.9, true), false);
});

test('Table taps make the matching sound', () => {
  const names = (evs) => tableCues(evs).map((c) => c.s).filter(Boolean);
  assert.deepEqual(names([{ t: 'safe' }]), ['cardDeal']);
  assert.deepEqual(names([{ t: 'kitten' }]), ['cardDeal', 'explosion']);
  assert.deepEqual(names([{ t: 'kitten' }, { t: 'insertOther' }]), ['cardDeal', 'snip', 'phew', 'cardSlide']);
  assert.deepEqual(names([{ t: 'shuffle' }]), ['shuffle']);
});
