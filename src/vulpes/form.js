// form.js — the skeleton. Every landmark is a power of phi times a single
// empirical anchor: the withers height. Nothing else is measured.
//
//   W                  withers height              (the one anchor)
//   L = W*phi          head + body length
//   T = L/phi = W      tail length
//   H = L/phi^3        head length (nose -> occiput)
//   E = W/phi^3        ear height
//
// Longitudinal stations are the golden partition of L; joint heights are the
// golden partition of W. Front axis is +X (the nose), up is +Y, right is +Z.

import * as THREE from 'three';
import { PHI, PI, TAU, GOLDEN_ANGLE, GOLDEN_B, p, fib } from './sacred.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

export function buildForm(g = {}) {
  const W = g.withers ?? 0.400;          // metres — an adult vixen
  const lean = g.lean ?? 1.0;
  const coat = g.coat ?? 0.55;

  const L = W * PHI;                      // 0.6472  head+body
  const T = L / PHI;                      // 0.4000  tail  == W
  const H = L * p(-3);                    // 0.1528  head
  const E = W * p(-3);                    // 0.0944  ear

  // ---- longitudinal stations: the golden partition of the body length ------
  const X = {
    nose:      L * p(-1),                 //  0.4000
    rhinarium: L * p(-1) - L * p(-7),     //
    stop:      L * p(-1) - L * p(-4),     //  0.3055 bridge of the muzzle
    occiput:   L * p(-2),                 //  0.2472
    atlas:     L * p(-2) - L * p(-5),     //
    crest:     L * p(-3),                 //  0.1528 base of neck
    withers:   L * p(-4),                 //  0.0944
    back:      0,                         //  0
    loin:     -L * p(-4),                 // -0.0944
    croup:    -L * p(-3),                 // -0.1528
    sacrum:   -L * p(-2),                 // -0.2472  (so sacrum->nose == L)
    shoulder:  L * p(-5),
    elbow:     L * p(-6),
    carpus:    L * p(-7),
    fore:      L * p(-8),
    hip:      -L * p(-3),
    stifle:   -L * p(-5),
    hock:     -L * p(-3) - L * p(-6),
    hind:     -L * p(-3) + L * p(-8)
  };

  // ---- heights: the golden partition of the withers ------------------------
  const Y = {
    withers: W,
    back:    W * (1 - p(-6)),
    loin:    W * (1 - p(-5)),
    croup:   W * (1 - p(-4)),
    sacrum:  W * (1 - p(-4)) - W * p(-7),
    crest:   W * (1 + p(-5)),             // neck rises above the withers
    occiput: W * (1 + p(-4)),
    stop:    W * (1 + p(-5)),
    nose:    W * (1 + p(-6)),
    brisket: W * p(-1),                   // 0.2472 — brisket line sits on the elbow
    shoulder:W * (1 - p(-3)),
    elbow:   W * p(-1),
    carpus:  W * p(-3),
    hip:     W * (1 - p(-3)) - W * p(-7),
    stifle:  W * p(-1) + W * p(-6),
    hock:    W * p(-3) * PHI * 0.82,
    ground:  0
  };

  // ---- half widths ---------------------------------------------------------
  const Z = {
    chest:  W * p(-4) / lean,
    waist:  W * p(-5) * PHI * 0.92 / lean,
    hip:    W * p(-4) * 1.02 / lean,
    neck:   W * p(-5) * PHI * 0.86,
    skull:  W * p(-5) * PHI * 0.80,
    muzzle: W * p(-7) * PHI,
    foreLeg:W * p(-5) * PHI * 0.70,
    hindLeg:W * p(-4) * 0.86
  };

  // ---- midline chain -------------------------------------------------------
  const spine = {
    nose:    V(X.nose,      Y.nose),
    stop:    V(X.stop,      Y.stop),
    occiput: V(X.occiput,   Y.occiput),
    atlas:   V(X.atlas,     Y.occiput - W * p(-6)),
    crest:   V(X.crest,     Y.crest),
    withers: V(X.withers,   Y.withers),
    back:    V(X.back,      Y.back),
    loin:    V(X.loin,      Y.loin),
    croup:   V(X.croup,     Y.croup),
    sacrum:  V(X.sacrum,    Y.sacrum)
  };

  // ---- head frame ----------------------------------------------------------
  const fwd = spine.nose.clone().sub(spine.occiput).normalize();
  const right = new THREE.Vector3(0, 1, 0).cross(fwd).normalize().negate();
  const up = fwd.clone().cross(right).normalize().negate();
  // the head unit is the true occiput-to-nose distance, so head(1,0,0) is the nose
  const HL = spine.nose.distanceTo(spine.occiput);
  const head = (a, b, c) => spine.occiput.clone()
    .addScaledVector(fwd, a * HL).addScaledVector(up, b * HL).addScaledVector(right, c * HL);

  const face = {
    cranium:  head(0.30,  0.02, 0),
    forehead: head(0.44,  0.15, 0),
    stopPt:   head(0.55, -0.02, 0),
    muzzle:   head(0.80, -0.13, 0),
    nose:     head(1.02, -0.20, 0),
    chin:     head(0.86, -0.32, 0),
    jaw:      head(0.46, -0.34, 0),
    throat:   head(0.10, -0.52, 0),
    eyeL:     head(0.52,  0.10, -0.235),
    eyeR:     head(0.52,  0.10,  0.235),
    browL:    head(0.50,  0.22, -0.24),
    browR:    head(0.50,  0.22,  0.24),
    cheekL:   head(0.26, -0.16, -0.40),
    cheekR:   head(0.26, -0.16,  0.40),
    ruffL:    head(0.02, -0.34, -0.46),
    ruffR:    head(0.02, -0.34,  0.46),
    fwd, up, right, H: HL, Hphi: H
  };

  // ---- ears: golden-angle splay, height E ---------------------------------
  const earTilt = GOLDEN_ANGLE / 8;               // 17.19 deg outward
  const ears = [-1, 1].map(s => {
    const root = head(0.150, 0.150, s * 0.180);
    const dir = up.clone()
      .addScaledVector(right, s * Math.sin(earTilt))
      .addScaledVector(fwd, Math.sin(GOLDEN_ANGLE / 7))
      .normalize();
    return { side: s, root, dir, tip: root.clone().addScaledVector(dir, E), height: E,
             width: E / PHI, thick: E * p(-4) };
  });

  // ---- limbs ---------------------------------------------------------------
  const leg = s => ({
    side: s,
    scapula: V(X.withers - L * p(-7), Y.withers - W * p(-5), s * Z.chest * 0.80),
    shoulder:V(X.shoulder,  Y.shoulder, s * Z.chest * 0.92),
    elbow:   V(X.elbow,     Y.elbow,    s * Z.chest * 0.90),
    carpus:  V(X.carpus,    Y.carpus,   s * Z.foreLeg * 0.94),
    fore:    V(X.fore,      Y.ground,   s * Z.foreLeg * 0.92),
    hip:     V(X.hip,       Y.hip,      s * Z.hip * 0.86),
    stifle:  V(X.stifle,    Y.stifle,   s * Z.hip * 0.92),
    hock:    V(X.hock,      Y.hock,     s * Z.hindLeg * 0.86),
    hind:    V(X.hind,      Y.ground,   s * Z.hindLeg * 0.84)
  });
  const legs = [leg(-1), leg(1)];

  // ---- tail: a golden logarithmic spiral, r = a*e^(b*theta) ---------------
  // The tail leaves the sacrum along the croup tangent and opens through
  // rather more than a quarter turn, so its radius of curvature multiplies
  // by phi over the sweep. Lateral sway is stepped by the golden angle.
  const tail = goldenSpiralTail(spine.sacrum, T, coat);

  return { g: { withers: W, lean, coat }, W, L, T, H, E, X, Y, Z, spine, face, ears, legs, tail };
}

function goldenSpiralTail(root, T, coat) {
  const N = fib(8);                      // 21 stations
  const th0 = PI * 0.05, th1 = th0 + PI * 0.26;
  const raw = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const th = th0 + (th1 - th0) * t;
    const r = Math.exp(GOLDEN_B * th);
    raw.push(new THREE.Vector3(r * Math.cos(th), r * Math.sin(th),
      Math.sin(t * GOLDEN_ANGLE) * r * p(-6)));
  }
  // normalise arc length to T
  let len = 0;
  for (let i = 1; i < N; i++) len += raw[i].distanceTo(raw[i - 1]);
  const k = T / len;
  for (const v of raw) v.multiplyScalar(k);
  const o = raw[0].clone();
  for (const v of raw) v.sub(o);

  // rotate so the tail leaves the croup going back and slightly down
  const t0 = raw[1].clone().normalize();
  const want = new THREE.Vector3(-1, -0.09, 0).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(t0, want);
  const pts = raw.map(v => v.applyQuaternion(q).add(root));

  // skin radius along the tail — the brush is fur, not flesh
  const rad = pts.map((_, i) => {
    const t = i / (N - 1);
    const bell = Math.pow(Math.sin(PI * Math.pow(t, 0.72)), 0.62);
    return (0.0175 + 0.0165 * bell) * (0.94 + 0.16 * coat);
  });
  return { pts, rad, length: T };
}
