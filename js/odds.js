// Exact "is the next card a kitten?" odds from one player's point of view.
//
// The deck is a sequence of E (Exploding Kitten), I (face-down Imploding
// Kitten), U (face-up Imploding Kitten) and S (anything safe). We keep a
// weighted list of "worlds"; in each world some positions are known exactly
// (from See the Future, your own Defuse, a face-up Imploding Kitten) and every
// other position is an unbiased shuffle of what's left. Every event updates
// the worlds by Bayes' rule, so the numbers are exact under one assumption:
// when someone else hides a kitten, or alters the future, we don't know where
// it went, so every spot is equally likely.

// Above this many worlds we keep the heaviest ones (a tiny approximation,
// flagged by .approx). Big Party Pack games need it to stay fast on a phone.
const MAX_WORLDS = 1500;
const EXPAND_BUDGET = 8000;

export class Belief {
  constructor(N = 0, nE = 0, nI = 0, lite = false) {
    this.max = lite ? 300 : MAX_WORLDS; this.budget = lite ? 2000 : EXPAND_BUDGET; this.lite = lite;
    this.N = N; this.nE = nE; this.nI = nI;
    this.worlds = [{ w: 1, k: [] }]; // k: sorted [{p, x}]
  }

  clone() {
    const b = new Belief(this.N, this.nE, this.nI, this.lite);
    b.worlds = this.worlds.map((W) => ({ w: W.w, k: W.k.map((e) => ({ ...e })) }));
    return b;
  }

  _pool(W) {
    let e = 0, i = 0;
    for (const { x } of W.k) { if (x === 'E') e++; else if (x === 'I') i++; }
    const Nu = this.N - W.k.length;
    return { Nu, Eu: this.nE - e, Iu: this.nI - i, Su: Nu - (this.nE - e) - (this.nI - i) };
  }

  _probUnknown(W, x) {
    const { Nu, Eu, Iu, Su } = this._pool(W);
    if (Nu <= 0) return 0;
    if (x === 'E') return Eu / Nu;
    if (x === 'I') return Iu / Nu;
    if (x === 'S') return Su / Nu;
    return 0; // a face-up kitten is never unknown
  }

  _normalize() {
    let tot = 0;
    for (const W of this.worlds) tot += W.w;
    if (tot <= 0) { // inconsistent info (should not happen) -> start fresh
      this.worlds = [{ w: 1, k: [] }];
      this.conflict = true;
      return;
    }
    this.worlds = this.worlds.filter((W) => W.w > 1e-15);
    for (const W of this.worlds) W.w /= tot;
  }

  _merge() {
    const m = new Map();
    for (const W of this.worlds) {
      const k = W.k;
      let sorted = true;
      for (let i = 1; i < k.length; i++) if (k[i - 1].p > k[i].p) { sorted = false; break; }
      if (!sorted) k.sort((a, b) => a.p - b.p);
      let key = '';
      for (let i = 0; i < k.length; i++) key += k[i].p + k[i].x;
      const o = m.get(key);
      if (o) o.w += W.w; else m.set(key, W);
    }
    this.worlds = [...m.values()];
    if (this.worlds.length > this.max) {
      // keep the heaviest worlds; tiny loss of exactness, flagged by .approx
      this.worlds.sort((a, b) => b.w - a.w);
      this.worlds.length = this.max;
      this.approx = true;
    }
    this._normalize();
  }

  // A card left the top (or bottom) of the deck and everyone saw what kind.
  draw(x, from = 'top') {
    const pos = from === 'top' ? 0 : this.N - 1;
    for (const W of this.worlds) {
      const e = W.k.find((q) => q.p === pos);
      // a face-up kitten is in plain sight: drawing it only rules out worlds that put it elsewhere
      if (!e && x === 'U') W.w *= W.k.some((q) => q.x === 'U') ? 0 : 1;
      else W.w *= e ? (e.x === x ? 1 : 0) : this._probUnknown(W, x);
      W.k = W.k.filter((q) => q.p !== pos);
      if (from === 'top') for (const q of W.k) q.p--;
    }
    this.N--;
    if (x === 'E') this.nE--;
    if (x === 'I') this.nI--;
    this._normalize();
  }

  // A card went in at a position we know.
  insertKnown(pos, x) {
    for (const W of this.worlds) {
      for (const q of W.k) if (q.p >= pos) q.p++;
      W.k.push({ p: pos, x });
    }
    this.N++;
    if (x === 'E') this.nE++;
    this._merge();
  }

  // Someone else hid a kitten somewhere we didn't see. weights[pos] (length
  // N+1, any scale) = how likely the hider picks each spot; null = uniform.
  insertUnknown(x = 'E', weights = null) {
    const out = [];
    const N = this.N;
    // each world splits into up to N+1; keep the work bounded on a phone
    const room = Math.max(50, Math.floor(this.budget / (N + 1)));
    if (this.worlds.length > room) {
      this.worlds.sort((a, b) => b.w - a.w);
      this.worlds.length = room;
      this.approx = true;
    }
    let wt = null;
    if (weights) {
      const tot = weights.reduce((a, c) => a + c, 0);
      if (tot > 0) wt = weights.map((c) => c / tot);
    }
    for (const W of this.worlds) {
      if (!wt && W.k.length === 0) { out.push(W); continue; } // stays an unbiased shuffle
      for (let pos = 0; pos <= N; pos++) {
        const f = wt ? wt[pos] || 0 : 1 / (N + 1);
        if (!f) continue;
        // W.k is sorted by p; build the new list already sorted
        const k = [];
        let put = false;
        for (const q of W.k) {
          if (!put && q.p >= pos) { k.push({ p: pos, x }); put = true; }
          k.push({ p: q.p >= pos ? q.p + 1 : q.p, x: q.x }); // fresh objects: later steps edit p in place
        }
        if (!put) k.push({ p: pos, x });
        out.push({ w: W.w * f, k });
      }
    }
    this.worlds = out;
    this.N++;
    if (x === 'E') this.nE++;
    this._merge();
  }

  shuffle() { this.worlds = [{ w: 1, k: [] }]; }

  // The face-up Imploding Kitten is visible at depth pos (its white edge).
  faceUpAt(pos) {
    for (const W of this.worlds) {
      const e = W.k.find((q) => q.x === 'U');
      if (e) W.w *= e.p === pos ? 1 : 0;
      else if (W.k.some((q) => q.p === pos)) W.w = 0;
      else W.k.push({ p: pos, x: 'U' });
    }
    this._merge();
  }

  // You looked at the top cards (See the Future / Alter the Future).
  saw(xs) {
    for (const W of this.worlds) {
      let w = W.w;
      for (let p = 0; p < xs.length && w > 0; p++) {
        const e = W.k.find((q) => q.p === p);
        if (e) { if (e.x !== xs[p]) w = 0; continue; }
        if (xs[p] === 'U') { if (W.k.some((q) => q.x === 'U')) w = 0; else W.k.push({ p, x: 'U' }); continue; }
        w *= this._probUnknown(W, xs[p]);
        W.k.push({ p, x: xs[p] });
      }
      W.w = w;
    }
    this._merge();
  }

  // You re-ordered the top cards yourself: you know the new order.
  setTop(xs) {
    for (const W of this.worlds) {
      W.k = W.k.filter((q) => q.p >= xs.length);
      xs.forEach((x, p) => W.k.push({ p, x }));
    }
    this._merge();
  }

  // Someone else re-ordered the top 3 without showing us.
  scrambleTop(n = 3) {
    n = Math.min(n, this.N);
    const perms = permutations([...Array(n).keys()]);
    const out = [];
    for (const W of this.worlds) {
      if (!W.k.some((q) => q.p < n)) { out.push(W); continue; }
      for (const pm of perms) {
        const k = W.k.map((q) => ({ p: q.p < n ? pm[q.p] : q.p, x: q.x }));
        out.push({ w: W.w / perms.length, k });
      }
    }
    this.worlds = out;
    this._merge();
  }

  // Chance that position pos holds kind x.
  prob(pos = 0, x = 'E') {
    if (pos >= this.N || pos < 0) return 0;
    let s = 0;
    for (const W of this.worlds) {
      const e = W.k.find((q) => q.p === pos);
      s += W.w * (e ? (e.x === x ? 1 : 0) : this._probUnknown(W, x));
    }
    return s;
  }

  // Is this position certain? Returns 'E'|'I'|'U'|'S' or null.
  known(pos) {
    let first = null;
    for (const W of this.worlds) {
      const e = W.k.find((q) => q.p === pos);
      if (!e) return null;
      if (first === null) first = e.x;
      else if (first !== e.x) return null;
    }
    return first;
  }
}

function permutations(a) {
  if (a.length <= 1) return [a.slice()];
  const out = [];
  a.forEach((v, i) => {
    for (const r of permutations(a.slice(0, i).concat(a.slice(i + 1)))) out.push([v, ...r]);
  });
  return out;
}

export const kindOf = (t) => (t === 'EK' ? 'E' : t === 'IK' ? 'I' : t === 'IK+' ? 'U' : 'S');

// Build a seat's belief from the log it can see (view(state, seat).log).
// opts.place(seat, N, left) -> weights over the N+1 spots when we know how
// that player hides kittens (a computer), or null for "any spot" (a person).
// opts.key names that policy for the cache.
//
// Logs only grow, so we cache the belief per (seat, policy) and replay just
// the new events. A fingerprint of the replayed prefix guards against a
// different game that happens to start the same way.
const cache = [];
const CACHE_MAX = 48; // 10 seats x a couple of policies
const fp = (h, e) => {
  const s = JSON.stringify(e);
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h;
};

export function beliefFromLog(log, me, opts = {}) {
  const key = me + '|' + (opts.key || 'u') + (opts.lite ? '|lite' : '');
  let c = cache.find((x) => x.key === key && x.len <= log.length);
  if (c) {
    let h = 7;
    for (let i = 0; i < c.len; i++) h = fp(h, log[i]);
    if (h !== c.h) c = null;
  }
  if (!c) {
    c = { key, len: 0, h: 7, b: null, pending: false };
    const i = cache.findIndex((x) => x.key === key);
    if (i >= 0) cache.splice(i, 1);
    cache.unshift(c);
    if (cache.length > CACHE_MAX) cache.pop();
  }
  for (let i = c.len; i < log.length; i++) {
    const e = log[i];
    c.h = fp(c.h, e);
    const b = c.b;
    switch (e.t) {
      case 'setup': c.b = new Belief(e.deck, e.ek, e.ik, !!opts.lite); c.pending = false; break;
      case 'draw': b.draw(e.res, e.from); break;
      case 'insert':
        if (e.kind === 'U') b.insertKnown(e.pos, 'U');
        else if (e.seat === me) c.pending = true;
        else b.insertUnknown('E', opts.place ? opts.place(e.seat, b.N, e.left || 0) : null);
        break;
      case 'insertAt': if (c.pending) { b.insertKnown(e.pos, 'E'); c.pending = false; } break;
      case 'shuffle': b.shuffle(); break;
      case 'ikpos': b.faceUpAt(e.pos); break;
      case 'saw': b.saw(e.cards.map(kindOf)); break;
      case 'altered': b.setTop(e.cards.map(kindOf)); break;
      case 'altdone': if (e.seat !== me) b.scrambleTop(3); break;
    }
  }
  c.len = log.length;
  return c.b;
}
