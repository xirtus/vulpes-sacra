// morph.js — the author-facing vocabulary.
//
// A species spec never touches the field engine directly. It calls the verbs
// below, all of which take dimensions in ANCHOR UNITS (multiples of the one
// measured number), so a spec is scale-free: change the anchor and the whole
// animal grows without a single other edit.

import * as THREE from 'three';
import { Field } from './field.js';
import { PHI, PI, TAU, GOLDEN_ANGLE, GOLDEN_B, p, fib, clamp, mix } from './sacred.js';

export const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

export class Morph {
  constructor(W, g) {
    this.W = W;              // the anchor, in metres
    this.g = g;              // the live parameters (lean, coat, …)
    this.f = new Field();
    this.bones = [];         // named limb segments — the coat reads these
    this.curves = {};        // named centrelines (tail, mane crest, …)
    this.marks = {};         // named landmarks
    this.frames = {};        // named local frames (the head)
    this.underline = null;   // set by trunk(); the coat's ventral boundary
  }

  // ---- landmarks --------------------------------------------------------
  /** A point, from anchor units. Everything a spec writes goes through this. */
  p(x, y, z = 0) { return V(x * this.W, y * this.W, z * this.W); }

  at(name, x, y, z = 0) { const v = V(x * this.W, y * this.W, z * this.W); this.marks[name] = v; return v; }
  get(name) { return this.marks[name]; }

  // ---- a local frame, e.g. the head ------------------------------------
  // Everything downstream can then be written as (along, up, across) in units
  // of the frame's own length, which is how a face is actually described.
  frame(name, from, to) {
    const fwd = to.clone().sub(from).normalize();
    const right = new THREE.Vector3(0, 1, 0).cross(fwd).normalize().negate();
    const up = fwd.clone().cross(right).normalize().negate();
    const len = from.distanceTo(to);
    const fr = { origin: from.clone(), fwd, up, right, len,
      at: (a, b, c) => from.clone().addScaledVector(fwd, a * len)
        .addScaledVector(up, b * len).addScaledVector(right, c * len) };
    this.frames[name] = fr;
    return fr;
  }

  // ---- volumes -----------------------------------------------------------
  // The trunk, as a table of stations: [x, topline, underline, half-width,
  // superellipse exponent], all in anchor units. Catmull-Rom is run through
  // them so the body is one swept surface with no visible joins.
  trunk(table, k = 0.0125, per = 7, orient = {}) {
    const W = this.W, lean = this.g.lean ?? 1;
    // The animal's own frame: long runs toward the head, vent points out of
    // the belly, lat completes the triple. A quadruped's trunk runs along +x
    // with its belly down; an upright biped's runs along +y with its belly
    // forward. This is the only place the rig needs to know the difference.
    const axis = orient.axis === 'y' ? 'y' : 'x';
    this.axisLong = axis === 'y' ? [0, 1, 0] : [1, 0, 0];
    this.axisVent = axis === 'y' ? [1, 0, 0] : [0, -1, 0];
    this.axisLat  = axis === 'y' ? [0, 0, 1] : [0, 0, -1];
    const st = table.map(([s, a, b, hw, n]) => axis === 'y'
      ? { c: V((a + b) * 0.5 * W, s * W), r1: hw * W / lean, r2: (a - b) * 0.5 * W, n }
      : { c: V(s * W, (a + b) * 0.5 * W), r1: hw * W / lean, r2: (a - b) * 0.5 * W, n });
    this.chain(st, k, per);
    // The belly and back lines, in the animal's own ventral coordinate, are
    // what every marking in the coat hangs off.
    const bellyCol = axis === 'y' ? 1 : 2, backCol = axis === 'y' ? 2 : 1;
    this.bellyLine = u => sampleTable(table, u, bellyCol) * (axis === 'y' ? 1 : -1) * W;
    this.backLine  = u => sampleTable(table, u, backCol) * (axis === 'y' ? 1 : -1) * W;
    this.underline = x => this.bellyLine(x / W);
    this.topline = x => this.backLine(x / W);
    this._trunk = st;
    return st;
  }

  // A chain of stations {c, r1, r2, n} swept as one smooth tube.
  // `k` — the width of the weld — is in anchor units, like everything else.
  chain(stations, k = 0.0125, per = 6) {
    const S = resample(stations, per);
    // A weld wider than the spacing between stations bulges at every one of
    // them, and the animal comes out ribbed like a caterpillar. Clamp it, so
    // no spec can make that mistake.
    let span = 0;
    for (let i = 0; i < S.length - 1; i++) span += S[i].c.distanceTo(S[i + 1].c);
    span /= Math.max(1, S.length - 1);
    const kk = Math.min(k * this.W, span * 0.40);
    for (let i = 0; i < S.length - 1; i++) {
      const A = S[i], B = S[i + 1];
      this.f.seg(A.c, B.c, A.r1, A.r2, B.r1, B.r2, (A.n + B.n) * 0.5, kk);
    }
    return stations;
  }

  // Station helper so specs read as tables rather than object literals.
  st(x, y, r1, r2, n = 2.5) { const W = this.W; return { c: V(x * W, y * W), r1: r1 * W, r2: r2 * W, n }; }
  stAt(v, r1, r2, n = 2.5) { const W = this.W; return { c: v.clone(), r1: r1 * W, r2: r2 * W, n }; }

  // A single tapered superelliptic tube between two points.
  tube(a, b, r1a, r2a, r1b, r2b, n = 2.4, k = 0.03) {
    const W = this.W;
    this.f.seg(a, b, r1a * W, r2a * W, r1b * W, r2b * W, n, k * W);
  }

  // A soft mass. Radii in anchor units.
  blob(c, rx, ry, rz, k = 0.08) {
    const W = this.W;
    this.f.ell(c, rx * W, ry * W, rz * W, k * W);
  }

  // ---- limbs -------------------------------------------------------------
  // joints: ordered [name, x, y, z] in anchor units. segs: per-gap radii.
  // Registering the chain as bones is what lets the coat put stockings on it.
  limb(side, joints, segs, opts = {}) {
    const W = this.W, pts = {}, order = [];
    for (const [name, x, y, z] of joints) {
      pts[name] = V(x * W, y * W, (z ?? 0) * side * W);
      order.push(name);
    }
    for (const s of segs) {
      const a = pts[s.from], b = pts[s.to];
      this.tube(a, b, s.r1a, s.r2a, s.r1b, s.r2b, s.n ?? 2.4, s.k ?? 0.06);
      this.bones.push([a, b]);
    }
    if (opts.mass) for (const m of opts.mass) {
      const a = pts[m.at] ?? pts[m.from];
      const c = m.to ? a.clone().lerp(pts[m.to], m.t ?? 0.4) : a.clone();
      if (m.off) c.add(V(m.off[0] * W, m.off[1] * W, (m.off[2] ?? 0) * side * W));
      this.blob(c, m.rx, m.ry, m.rz, m.k ?? 0.10);
    }
    if (opts.foot) {
      const c = pts[opts.foot.at].clone()
        .add(V(opts.foot.off[0] * W, opts.foot.off[1] * W, (opts.foot.off[2] ?? 0) * side * W));
      this.blob(c, opts.foot.rx, opts.foot.ry, opts.foot.rz, opts.foot.k ?? 0.03);
    }
    return pts;
  }

  // ---- curves ------------------------------------------------------------
  // A tail as an arc of the golden logarithmic spiral r = a·e^(bθ): its radius
  // of curvature multiplies by φ every quarter turn. Lateral sway is stepped
  // by the golden angle. `turns` is the sweep in units of π.
  goldenCurve(name, { from, length, turns = 0.30, launch = [-1, -0.10, 0], sway = p(-6), stations = fib(8) }) {
    const N = stations, th0 = PI * 0.05, th1 = th0 + PI * turns;
    const raw = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), th = th0 + (th1 - th0) * t, r = Math.exp(GOLDEN_B * th);
      raw.push(V(r * Math.cos(th), r * Math.sin(th), Math.sin(t * GOLDEN_ANGLE) * r * sway));
    }
    let L = 0; for (let i = 1; i < N; i++) L += raw[i].distanceTo(raw[i - 1]);
    const s = (length * this.W) / L;
    for (const v of raw) v.multiplyScalar(s);
    const o = raw[0].clone(); for (const v of raw) v.sub(o);
    const q = new THREE.Quaternion().setFromUnitVectors(
      raw[1].clone().normalize(), new THREE.Vector3(...launch).normalize());
    const pts = raw.map(v => v.applyQuaternion(q).add(from));
    this.curves[name] = pts;
    return pts;
  }

  // A plain polyline curve (a mane crest, a dorsal ridge).
  curve(name, pts) { this.curves[name] = pts.map(v => v.clone()); return this.curves[name]; }

  // Sweep a curve as flesh — the dock of a tail, a trunk, a horn core.
  sweep(name, radius, { n = 2.2, k = 0.015, per = 3 } = {}) {
    const pts = this.curves[name], W = this.W;
    const st = pts.map((c, i) => {
      const t = i / (pts.length - 1);
      const r = typeof radius === 'function' ? radius(t) : radius;
      return { c, r1: r * W, r2: r * W * 1.05, n };
    });
    this.chain(st, k, per);
    return st;
  }

  bake() { return this.f.bake(0.05); }
}

// ---------------------------------------------------------------------------
function sampleTable(T, u, col) {
  if (u >= T[0][0]) return T[0][col];
  const n = T.length;
  if (u <= T[n - 1][0]) return T[n - 1][col];
  for (let i = 0; i < n - 1; i++) {
    if (u <= T[i][0] && u >= T[i + 1][0]) {
      const t = (T[i][0] - u) / (T[i][0] - T[i + 1][0]);
      return mix(T[i][col], T[i + 1][col], t * t * (3 - 2 * t));
    }
  }
  return T[n - 1][col];
}

const cr = (a, b, c, d, t) => {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
};

function resample(st, per) {
  const n = st.length, out = [];
  const at = i => st[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const a = at(i - 1), b = at(i), c = at(i + 1), d = at(i + 2);
    for (let s = 0; s < per; s++) {
      const t = s / per;
      out.push({
        c: V(cr(a.c.x, b.c.x, c.c.x, d.c.x, t), cr(a.c.y, b.c.y, c.c.y, d.c.y, t), cr(a.c.z, b.c.z, c.c.z, d.c.z, t)),
        r1: cr(a.r1, b.r1, c.r1, d.r1, t),
        r2: cr(a.r2, b.r2, c.r2, d.r2, t),
        n: cr(a.n, b.n, c.n, d.n, t)
      });
    }
  }
  out.push(st[n - 1]);
  return out;
}
