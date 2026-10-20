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

const MAX_WORLDS = 40000;

export class Belief {
  constructor(N = 0, nE = 0, nI = 0) {
    this.N = N; this.nE = nE; this.nI = nI;
    this.worlds = [{ w: 1, k: [] }]; // k: sorted [{p, x}]
  }

  clone() {
    const b = new Belief(this.N, this.nE, this.nI);
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
      W.k.sort((a, b) => a.p - b.p);
      const key = W.k.map((e) => e.p + e.x).join(',');
      const o = m.get(key);
      if (o) o.w += W.w; else m.set(key, W);
    }
    this.worlds = [...m.values()];
    if (this.worlds.length > MAX_WORLDS) {
      // keep the heaviest worlds; tiny loss of exactness, flagged by .approx
      this.worlds.sort((a, b) => b.w - a.w);
      this.worlds.length = MAX_WORLDS;
      this.approx = true;
    }
    this._normalize();
  }

  // A card left the top (or bottom) of the deck and everyone saw what kind.
  draw(x, from = 'top') {
    const pos = from === 'top' ? 0 : this.N - 1;
    for (const W of this.worlds) {
      const e = W.k.find((q) => q.p === pos);
      W.w *= e ? (e.x === x ? 1 : 0) : this._probUnknown(W, x);
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

  // Someone else hid a kitten somewhere we didn't see.
  insertUnknown(x = 'E') {
    const out = [];
    const N = this.N;
    for (const W of this.worlds) {
      if (W.k.length === 0) { out.push(W); continue; } // stays an unbiased shuffle
      for (let pos = 0; pos <= N; pos++) {
        const k = W.k.map((q) => ({ p: q.p >= pos ? q.p + 1 : q.p, x: q.x }));
        k.push({ p: pos, x });
        out.push({ w: W.w / (N + 1), k });
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
export function beliefFromLog(log, me) {
  let b = null;
  let pendingOwnInsert = false;
  for (const e of log) {
    switch (e.t) {
      case 'setup': b = new Belief(e.deck, e.ek, e.ik); break;
      case 'draw': b.draw(e.res, e.from); break;
      case 'insert':
        if (e.kind === 'U') b.insertKnown(e.pos, 'U');
        else if (e.seat === me) pendingOwnInsert = true;
        else b.insertUnknown('E');
        break;
      case 'insertAt': if (pendingOwnInsert) { b.insertKnown(e.pos, 'E'); pendingOwnInsert = false; } break;
      case 'shuffle': b.shuffle(); break;
      case 'ikpos': b.faceUpAt(e.pos); break;
      case 'saw': b.saw(e.cards.map(kindOf)); break;
      case 'altered': b.setTop(e.cards.map(kindOf)); break;
      case 'altdone': if (e.seat !== me) b.scrambleTop(3); break;
    }
  }
  return b;
}
