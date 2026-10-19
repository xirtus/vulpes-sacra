// vulpes.js — the animal itself, written as one implicit volume.
// Every dimension traces back to phi times the withers height (see form.js).

import * as THREE from 'three';
import { Field } from './field.js';
import { PHI, PI, p } from './sacred.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

// The trunk, as a table of (station, topline, underline, half-width, exponent),
// all in units of the withers height. The same table gives the coat its
// ventral boundary, so belly white and belly geometry can never disagree.
export const TORSO = [
  [ 0.400, 0.964, 0.700, 0.080, 2.4],   // point of shoulder
  [ 0.238, 1.000, 0.618, 0.113, 2.6],   // withers
  [ 0.088, 0.992, 0.582, 0.126, 2.8],   // deepest rib
  [-0.063, 0.978, 0.626, 0.116, 2.7],   // last rib
  [-0.200, 0.960, 0.696, 0.090, 2.5],   // waist
  [-0.338, 0.946, 0.642, 0.120, 2.6],   // flank over the hip
  [-0.488, 0.924, 0.640, 0.126, 2.8],   // croup
  [-0.625, 0.888, 0.676, 0.104, 2.8],   // rump
  [-0.700, 0.852, 0.716, 0.066, 2.5]    // root of the tail
];
export const UNDERLINE = TORSO.map(([x, t, b]) => [x, b]);

export function buildBody(F) {
  const { W, spine, face, legs, tail, g } = F;
  const lean = g.lean, coat = g.coat;
  const f = new Field();

  // ---------------- torso -------------------------------------------------
  // (x, topline, underline, half-width, superellipse exponent)
  const T = TORSO.map(([x, t, b, hw, n]) => ({
    c: V(x * W, (t + b) * 0.5 * W),
    r1: hw * W / lean, r2: (t - b) * 0.5 * W, n
  }));
  chain(f, T, 0.005, 7);

  // ---------------- neck --------------------------------------------------
  const neckA = { c: V(0.428 * W, 0.848 * W), r1: 0.118 * W, r2: 0.152 * W, n: 2.6 };
  const neckB = { c: V(0.510 * W, 0.948 * W), r1: 0.102 * W, r2: 0.130 * W, n: 2.5 };
  const neckC = { c: V(0.580 * W, 1.050 * W), r1: 0.086 * W, r2: 0.104 * W, n: 2.4 };
  chain(f, [T[0], neckA, neckB, neckC], 0.010, 8);
  // crest of the neck — a fox carries a heavy mane behind the skull
  f.ell(V(0.522 * W, 1.020 * W, 0), 0.118 * W, 0.092 * W, 0.100 * W, 0.042);

  // ---------------- skull, muzzle, jaw ------------------------------------
  const H = face.H;
  const h = (a, b, c) => spine.occiput.clone()
    .addScaledVector(face.fwd, a * H).addScaledVector(face.up, b * H).addScaledVector(face.right, c * H);

  // braincase
  f.ell(h(0.20, 0.03, 0), 0.30 * H, 0.235 * H, 0.226 * H, 0.030);
  f.ell(h(0.02, -0.02, 0), 0.24 * H, 0.216 * H, 0.206 * H, 0.034);
  // zygomatic arches / cheekbones — the wide part of a fox's face
  for (const s of [-1, 1]) f.ell(h(0.24, -0.088, s * 0.156), 0.25 * H, 0.146 * H, 0.106 * H, 0.026);
  // brow ridges
  for (const s of [-1, 1]) f.ell(h(0.42, 0.108, s * 0.152), 0.135 * H, 0.078 * H, 0.090 * H, 0.020);
  // orbits — the eyeball itself makes the skin stand proud
  for (const s of [-1, 1]) f.ell(h(0.468, 0.052, s * 0.156), 0.104 * H, 0.098 * H, 0.112 * H, 0.018);

  // muzzle: a long narrow superelliptic wedge
  const M = [
    { c: h(0.40, 0.018, 0), r1: 0.158 * H, r2: 0.184 * H, n: 2.6 },
    { c: h(0.53, -0.018, 0), r1: 0.112 * H, r2: 0.140 * H, n: 2.5 },  // the stop
    { c: h(0.70, -0.048, 0), r1: 0.088 * H, r2: 0.110 * H, n: 2.4 },
    { c: h(0.85, -0.072, 0), r1: 0.072 * H, r2: 0.088 * H, n: 2.3 },
    { c: h(0.955, -0.090, 0), r1: 0.060 * H, r2: 0.070 * H, n: 2.3 }
  ];
  chain(f, M, 0.006, 7);
  // nose leather
  f.ell(h(0.978, -0.096, 0), 0.056 * H, 0.048 * H, 0.062 * H, 0.010);
  // lower jaw and chin
  chain(f, [
    { c: h(0.18, -0.208, 0), r1: 0.150 * H, r2: 0.104 * H, n: 2.6 },
    { c: h(0.50, -0.194, 0), r1: 0.106 * H, r2: 0.084 * H, n: 2.4 },
    { c: h(0.83, -0.172, 0), r1: 0.068 * H, r2: 0.060 * H, n: 2.3 }
  ], 0.010, 6);
  // throat into the neck
  f.ell(h(-0.05, -0.30, 0), 0.24 * H, 0.160 * H, 0.170 * H, 0.036);

  // cheek ruff — the flare that makes a fox a fox
  for (const s of [-1, 1]) {
    f.ell(h(0.03, -0.19, s * 0.300), 0.30 * H, 0.255 * H, 0.144 * H, 0.032);
    f.ell(h(-0.15, -0.29, s * 0.262), 0.24 * H, 0.218 * H, 0.130 * H, 0.034);
  }

  // ---------------- limbs -------------------------------------------------
  for (const L of legs) {
    const s = L.side;
    // shoulder blade + upper arm
    f.ell(L.scapula, 0.058 * W, 0.084 * W, 0.028 * W, 0.052);
    seg(f, L.shoulder, L.elbow, 0.084 * W, 0.114 * W, 0.046 * W, 0.070 * W, 2.4, 0.052);
    f.ell(L.shoulder.clone().lerp(L.elbow, 0.30), 0.058 * W, 0.078 * W, 0.046 * W, 0.036);
    // forearm, pastern, front paw
    seg(f, L.elbow, L.carpus, 0.050 * W, 0.072 * W, 0.029 * W, 0.035 * W, 2.3, 0.026);
    seg(f, L.carpus, L.fore.clone().setY(L.fore.y + 0.012 * W), 0.029 * W, 0.034 * W, 0.030 * W, 0.034 * W, 2.4, 0.014);
    f.ell(L.fore.clone().add(V(0.016 * W, 0.026 * W, 0)), 0.062 * W, 0.030 * W, 0.038 * W, 0.012);
    // haunch, thigh, gaskin, hock, hind paw
    f.ell(L.hip.clone().add(V(-0.040 * W, -0.026 * W, s * 0.008 * W)), 0.140 * W, 0.136 * W, 0.070 * W, 0.058);
    seg(f, L.hip, L.stifle, 0.106 * W, 0.158 * W, 0.055 * W, 0.086 * W, 2.5, 0.062);
    // flank fold — ties the thigh into the body instead of leaving it a limb
    f.ell(L.stifle.clone().add(V(0.010 * W, 0.030 * W, s * 0.006 * W)), 0.105 * W, 0.100 * W, 0.062 * W, 0.060);
    seg(f, L.stifle, L.hock, 0.052 * W, 0.082 * W, 0.029 * W, 0.035 * W, 2.3, 0.038);
    seg(f, L.hock, L.hind.clone().setY(L.hind.y + 0.012 * W), 0.029 * W, 0.033 * W, 0.028 * W, 0.032 * W, 2.4, 0.014);
    f.ell(L.hind.clone().add(V(0.014 * W, 0.026 * W, 0)), 0.058 * W, 0.028 * W, 0.036 * W, 0.012);
  }

  // ---------------- tail --------------------------------------------------
  const tp = tail.pts, tr = tail.rad;
  chain(f, tp.map((c, i) => ({ c, r1: tr[i], r2: tr[i] * 1.06, n: 2.2 })), 0.006, 3);
  f.ell(tp[0], 0.072 * W, 0.072 * W, 0.060 * W, 0.062);   // weld the root to the croup
  f.ell(tp[0].clone().lerp(tp[2], 0.55), 0.066 * W, 0.062 * W, 0.054 * W, 0.050);
  f.ell(tp[0].clone().lerp(T[T.length - 1].c, 0.55), 0.070 * W, 0.070 * W, 0.058 * W, 0.058);

  return f.bake(0.05);
}

function seg(f, a, b, r1a, r2a, r1b, r2b, n, k) { f.seg(a, b, r1a, r2a, r1b, r2b, n, k); }

// Catmull-Rom through the stations, so the trunk is one smooth swept surface
// instead of a row of cones with visible joints.
function chain(f, stations, k, per = 4) {
  const S = resample(stations, per);
  for (let i = 0; i < S.length - 1; i++) {
    const A = S[i], B = S[i + 1];
    f.seg(A.c, B.c, A.r1, A.r2, B.r1, B.r2, (A.n + B.n) * 0.5, k);
  }
}

const cr = (p0, p1, p2, p3, t) => {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};

function resample(st, per) {
  const n = st.length, out = [];
  const at = i => st[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const a = at(i - 1), b = at(i), c = at(i + 1), d = at(i + 2);
    const steps = i === n - 2 ? per : per;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
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
